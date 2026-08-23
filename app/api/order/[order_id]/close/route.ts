import { NextResponse } from "next/server";
import {
	AuthorizationError,
	requireRole,
} from "../../../../lib/auth/authorization";
import { prisma } from "../../../../lib/prisma";

const STATUS_SELESAI = "Selesai";

type RouteContext = {
	params: Promise<{ order_id: string }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
	try {
		await requireRole("Manajer Produksi");
	} catch (error) {
		if (error instanceof AuthorizationError) {
			return NextResponse.json(
				{ error: error.message },
				{ status: error.status },
			);
		}

		console.error("Gagal memeriksa authorization penutupan order:", error);
		return NextResponse.json(
			{ error: "Terjadi kesalahan pada server." },
			{ status: 500 },
		);
	}

	const { order_id: orderId } = await context.params;
	const normalizedOrderId = orderId?.trim();

	if (!normalizedOrderId || normalizedOrderId.length > 10) {
		return NextResponse.json(
			{ error: "order_id tidak valid." },
			{ status: 400 },
		);
	}

	try {
		const order = await prisma.order.findUnique({
			where: { order_id: normalizedOrderId },
			select: { order_id: true, status_order: true },
		});

		if (!order) {
			return NextResponse.json(
				{ error: "Order tidak ditemukan." },
				{ status: 404 },
			);
		}

		if (order.status_order === STATUS_SELESAI) {
			return NextResponse.json({
				message: "Order sudah selesai.",
				data: order,
				updated: false,
			});
		}

		const updatedOrder = await prisma.order.update({
			where: { order_id: normalizedOrderId },
			data: { status_order: STATUS_SELESAI },
			select: { order_id: true, status_order: true },
		});

		return NextResponse.json({
			message: "Order berhasil diselesaikan.",
			data: updatedOrder,
			updated: true,
		});
	} catch (error) {
		console.error("Gagal menutup order:", error);
		return NextResponse.json(
			{ error: "Terjadi kesalahan pada server." },
			{ status: 500 },
		);
	}
}
