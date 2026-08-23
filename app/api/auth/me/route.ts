import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/auth/session";

export async function GET() {
	try {
		const user = await getCurrentUser();

		if (!user) {
			return NextResponse.json(
				{ error: "Anda belum login." },
				{ status: 401 },
			);
		}

		return NextResponse.json({
			data: {
				user_id: user.user_id,
				nama: user.nama,
				role: user.role.nama_role,
			},
		});
	} catch (error) {
		console.error("Gagal memeriksa session:", error);
		return NextResponse.json(
			{ error: "Terjadi kesalahan pada server." },
			{ status: 500 },
		);
	}
}
