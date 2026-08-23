import { NextResponse } from "next/server";
import {
	AuthorizationError,
	requireAnyRole,
} from "../../../lib/auth/authorization";
import { prisma } from "../../../lib/prisma";

const REPORT_ROLES = ["Admin", "Manajer Produksi", "Staf Order"];

type ReportRow = {
	model_id: string;
	nama_model: string;
	bahan_id: string;
	nama_bahan: string;
	satuan: string;
	total_jumlah_pakai: string;
	jumlah_aktivitas_produksi: number;
};

function parseDate(value: string | null): Date | null {
	if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return null;
	}

	const date = new Date(`${value}T00:00:00.000Z`);
	return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
		? null
		: date;
}

function escapeCsv(value: string | number): string {
	const text = String(value);
	return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows: ReportRow[]): string {
	const header = [
		"model_id",
		"nama_model",
		"bahan_id",
		"nama_bahan",
		"satuan",
		"total_jumlah_pakai",
		"jumlah_aktivitas_produksi",
	];
	const lines = rows.map((row) =>
		[
			row.model_id,
			row.nama_model,
			row.bahan_id,
			row.nama_bahan,
			row.satuan,
			row.total_jumlah_pakai,
			row.jumlah_aktivitas_produksi,
		]
			.map(escapeCsv)
			.join(","),
	);

	return [header.join(","), ...lines].join("\r\n");
}

export async function GET(request: Request) {
	try {
		await requireAnyRole(...REPORT_ROLES);
	} catch (error) {
		if (error instanceof AuthorizationError) {
			return NextResponse.json(
				{ error: error.message },
				{ status: error.status },
			);
		}

		console.error("Gagal memeriksa authorization laporan:", error);
		return NextResponse.json(
			{ error: "Terjadi kesalahan pada server." },
			{ status: 500 },
		);
	}

	const searchParams = new URL(request.url).searchParams;
	const startValue = searchParams.get("mulai");
	const endValue = searchParams.get("selesai");
	const format = searchParams.get("format");
	const startDate = parseDate(startValue);
	const endDate = parseDate(endValue);

	if ((startValue && !startDate) || (endValue && !endDate)) {
		return NextResponse.json(
			{ error: "Format tanggal harus YYYY-MM-DD dan merupakan tanggal valid." },
			{ status: 400 },
		);
	}

	if (startDate && endDate && startDate > endDate) {
		return NextResponse.json(
			{ error: "Tanggal mulai tidak boleh setelah tanggal selesai." },
			{ status: 400 },
		);
	}

	try {
		const tanggalMulai: { gte?: Date; lt?: Date } = {};
		if (startDate) {
			tanggalMulai.gte = startDate;
		}
		if (endDate) {
			tanggalMulai.lt = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
		}

		const produksis = await prisma.produksi.findMany({
			where: Object.keys(tanggalMulai).length > 0 ? { tanggal_mulai: tanggalMulai } : undefined,
			select: {
				produksi_id: true,
				order: {
					select: {
						model: {
							select: { model_id: true, nama_model: true },
						},
					},
				},
				pemakaian_bahans: {
					select: {
						jumlah_pakai: true,
						bahan: {
							select: {
								bahan_id: true,
								nama_bahan: true,
								satuan: true,
							},
						},
					},
				},
			},
		});

		const grouped = new Map<string, {
			model_id: string;
			nama_model: string;
			bahan_id: string;
			nama_bahan: string;
			satuan: string;
			total: import("../../../generated/prisma/client").Prisma.Decimal;
			produksiIds: Set<string>;
		}>();

		for (const produksi of produksis) {
			for (const pemakaian of produksi.pemakaian_bahans) {
				const model = produksi.order.model;
				const key = `${model.model_id}:${pemakaian.bahan.bahan_id}`;
				const existing = grouped.get(key);

				if (existing) {
					existing.total = existing.total.add(pemakaian.jumlah_pakai);
					existing.produksiIds.add(produksi.produksi_id);
					continue;
				}

				grouped.set(key, {
					model_id: model.model_id,
					nama_model: model.nama_model,
					bahan_id: pemakaian.bahan.bahan_id,
					nama_bahan: pemakaian.bahan.nama_bahan,
					satuan: pemakaian.bahan.satuan,
					total: pemakaian.jumlah_pakai,
					produksiIds: new Set([produksi.produksi_id]),
				});
			}
		}

		const rows: ReportRow[] = [...grouped.values()]
			.sort((left, right) =>
				`${left.nama_model}:${left.nama_bahan}`.localeCompare(
					`${right.nama_model}:${right.nama_bahan}`,
				),
			)
			.map((row) => ({
				model_id: row.model_id,
				nama_model: row.nama_model,
				bahan_id: row.bahan_id,
				nama_bahan: row.nama_bahan,
				satuan: row.satuan,
				total_jumlah_pakai: row.total.toString(),
				jumlah_aktivitas_produksi: row.produksiIds.size,
			}));

		const lowStock = await prisma.bahan.findMany({
			select: {
				bahan_id: true,
				nama_bahan: true,
				satuan: true,
				stok: true,
				stok_minimum: true,
			},
		});
		const peringatanStokRendah = lowStock
			.filter((bahan) => bahan.stok.lt(bahan.stok_minimum))
			.map((bahan) => ({
				...bahan,
				stok: bahan.stok.toString(),
				stok_minimum: bahan.stok_minimum.toString(),
			}));

		if (format === "csv") {
			return new NextResponse(toCsv(rows), {
				status: 200,
				headers: {
					"Content-Type": "text/csv; charset=utf-8",
					"Content-Disposition": "attachment; filename=laporan-penggunaan-bahan.csv",
				},
			});
		}

		return NextResponse.json({
			filter: { mulai: startValue, selesai: endValue },
			data: rows,
			peringatan_stok_rendah: peringatanStokRendah,
		});
	} catch (error) {
		console.error("Gagal mengambil laporan penggunaan bahan:", error);
		return NextResponse.json(
			{ error: "Terjadi kesalahan pada server." },
			{ status: 500 },
		);
	}
}
