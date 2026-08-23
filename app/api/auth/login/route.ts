import { NextResponse } from "next/server";
import { verifyPassword } from "../../../lib/auth/password";
import { createSession } from "../../../lib/auth/session";
import { prisma } from "../../../lib/prisma";

export async function POST(request: Request) {
	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ error: "Body request harus berupa JSON yang valid." },
			{ status: 400 },
		);
	}

	if (
		body === null ||
		typeof body !== "object" ||
		Array.isArray(body) ||
		typeof (body as { username?: unknown }).username !== "string" ||
		typeof (body as { password?: unknown }).password !== "string" ||
		(body as { username: string }).username.trim().length === 0 ||
		(body as { password: string }).password.length === 0
	) {
		return NextResponse.json(
			{ error: "Username dan password wajib diisi." },
			{ status: 400 },
		);
	}

	const { username, password } = body as {
		username: string;
		password: string;
	};

	try {
		const user = await prisma.user.findFirst({
			where: { username: username.trim() },
			select: {
				user_id: true,
				nama: true,
				password: true,
				role: {
					select: { nama_role: true },
				},
			},
		});

		const passwordValid = user
			? await verifyPassword(password, user.password)
			: false;

		if (!user || !passwordValid) {
			return NextResponse.json(
				{ error: "Username atau password tidak valid." },
				{ status: 401 },
			);
		}

		await createSession(user.user_id);

		return NextResponse.json({
			data: {
				user_id: user.user_id,
				nama: user.nama,
				role: user.role.nama_role,
			},
		});
	} catch (error) {
		console.error("Gagal melakukan login:", error);
		return NextResponse.json(
			{ error: "Terjadi kesalahan pada server." },
			{ status: 500 },
		);
	}
}
