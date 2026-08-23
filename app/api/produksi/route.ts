import { randomUUID } from "node:crypto";
import { Prisma } from "../../generated/prisma/client";
import { NextResponse } from "next/server";
import {
	AuthorizationError,
	requireAnyRole,
} from "../../lib/auth/authorization";
import { prisma } from "../../lib/prisma";

type PemakaianBahanInput = {
	bahan_id: unknown;
	jumlah_pakai: unknown;
};

type ProduksiInput = {
	order_id: unknown;
	tahap: unknown;
	status: unknown;
	jumlah_diproses: unknown;
	pemakaian_bahan: unknown;
};

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

function isPositiveNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function createId(): string {
	return randomUUID().replaceAll("-", "").slice(0, 10);
}

export async function POST(request: Request) {
	try {
		await requireAnyRole("Admin", "Manajer Produksi", "Operator Jahit");
	} catch (error) {
		if (error instanceof AuthorizationError) {
			return NextResponse.json(
				{ error: error.message },
				{ status: error.status },
			);
		}

		console.error("Gagal memeriksa authorization produksi:", error);
		return NextResponse.json(
			{ error: "Terjadi kesalahan pada server." },
			{ status: 500 },
		);
	}

	let body: ProduksiInput;

	try {
		body = (await request.json()) as ProduksiInput;
	} catch {
		return NextResponse.json(
			{ error: "Body request harus berupa JSON yang valid." },
			{ status: 400 },
		);
	}

	if (body === null || typeof body !== "object" || Array.isArray(body)) {
		return NextResponse.json(
			{ error: "Body request harus berupa object." },
			{ status: 400 },
		);
	}

	const { order_id, tahap, status, jumlah_diproses, pemakaian_bahan } = body;

	if (!isNonEmptyString(order_id)) {
		return NextResponse.json({ error: "order_id wajib diisi." }, { status: 400 });
	}

	if (!isNonEmptyString(tahap)) {
		return NextResponse.json({ error: "tahap wajib diisi." }, { status: 400 });
	}

	if (!isNonEmptyString(status)) {
		return NextResponse.json({ error: "status wajib diisi." }, { status: 400 });
	}

	if (
		typeof jumlah_diproses !== "number" ||
		!Number.isSafeInteger(jumlah_diproses) ||
		jumlah_diproses <= 0
	) {
		return NextResponse.json(
			{ error: "jumlah_diproses harus bilangan bulat lebih dari 0." },
			{ status: 400 },
		);
	}

	if (!Array.isArray(pemakaian_bahan) || pemakaian_bahan.length === 0) {
		return NextResponse.json(
			{ error: "pemakaian_bahan tidak boleh kosong." },
			{ status: 400 },
		);
	}

	const bahanIds = new Set<string>();
	const pemakaian = [] as Array<{ bahan_id: string; jumlah_pakai: number }>;

	for (const item of pemakaian_bahan as PemakaianBahanInput[]) {
		if (
			item === null ||
			typeof item !== "object" ||
			!isNonEmptyString(item.bahan_id)
		) {
			return NextResponse.json(
				{ error: "Setiap pemakaian harus memiliki bahan_id yang valid." },
				{ status: 400 },
			);
		}

		if (bahanIds.has(item.bahan_id)) {
			return NextResponse.json(
				{ error: `bahan_id ${item.bahan_id} tidak boleh muncul dua kali.` },
				{ status: 400 },
			);
		}

		if (!isPositiveNumber(item.jumlah_pakai)) {
			return NextResponse.json(
				{ error: `jumlah_pakai untuk bahan ${item.bahan_id} harus lebih dari 0.` },
				{ status: 400 },
			);
		}

		bahanIds.add(item.bahan_id);
		pemakaian.push({
			bahan_id: item.bahan_id,
			jumlah_pakai: item.jumlah_pakai,
		});
	}

	try {
		const result = await prisma.$transaction(async (tx) => {
			const order = await tx.order.findUnique({
				where: { order_id },
				select: { order_id: true },
			});

			if (!order) {
				throw new Error("ORDER_NOT_FOUND");
			}

			const bahan = await tx.bahan.findMany({
				where: { bahan_id: { in: [...bahanIds] } },
				select: { bahan_id: true, stok: true },
			});
			const bahanById = new Map(bahan.map((item) => [item.bahan_id, item]));

			for (const item of pemakaian) {
				const currentBahan = bahanById.get(item.bahan_id);

				if (!currentBahan) {
					throw new Error("BAHAN_NOT_FOUND");
				}

				if (currentBahan.stok.lt(new Prisma.Decimal(item.jumlah_pakai))) {
					throw new Error(`INSUFFICIENT_STOCK:${item.bahan_id}`);
				}
			}

			const produksi = await tx.produksi.create({
				data: {
					produksi_id: createId(),
					order_id,
					tahap: tahap.trim(),
					status: status.trim(),
					jumlah_diproses,
					tanggal_mulai: new Date(),
				},
			});

			for (const item of pemakaian) {
				await tx.pemakaianBahan.create({
					data: {
						pemakaian_id: createId(),
						produksi_id: produksi.produksi_id,
						bahan_id: item.bahan_id,
						jumlah_pakai: item.jumlah_pakai,
					},
				});

				const updated = await tx.bahan.updateMany({
					where: {
						bahan_id: item.bahan_id,
						stok: { gte: item.jumlah_pakai },
					},
					data: { stok: { decrement: item.jumlah_pakai } },
				});

				if (updated.count !== 1) {
					throw new Error(`INSUFFICIENT_STOCK:${item.bahan_id}`);
				}
			}

			return produksi;
		});

		const lowStock = await prisma.bahan.findMany({
			where: {
				bahan_id: { in: [...bahanIds] },
			},
			select: {
				bahan_id: true,
				nama_bahan: true,
				satuan: true,
				stok: true,
				stok_minimum: true,
			},
		});
		const lowStockWarnings = lowStock.filter((item) =>
			item.stok.lt(item.stok_minimum),
		);

		return NextResponse.json(
				{ data: result, peringatan_stok_rendah: lowStockWarnings },
			{ status: 201 },
		);
	} catch (error) {
		if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
			return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });
		}

		if (error instanceof Error && error.message === "BAHAN_NOT_FOUND") {
			return NextResponse.json({ error: "Bahan tidak ditemukan." }, { status: 404 });
		}

		if (error instanceof Error && error.message.startsWith("INSUFFICIENT_STOCK:")) {
			return NextResponse.json(
				{ error: `Stok bahan ${error.message.slice("INSUFFICIENT_STOCK:".length)} tidak mencukupi.` },
				{ status: 409 },
			);
		}

		console.error("Gagal mencatat produksi:", error);
		return NextResponse.json(
			{ error: "Terjadi kesalahan pada server." },
			{ status: 500 },
		);
	}
}
