import {
	createHmac,
	timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "../prisma";

export const SESSION_COOKIE_NAME = "ba_session";
const SESSION_MAX_AGE = 60 * 60 * 8;

type SessionPayload = {
	user_id: string;
	expires_at: number;
};

export type CurrentUser = {
	user_id: string;
	nama: string;
	role: {
		nama_role: string;
	};
};

function getAuthSecret(): string {
	const secret = process.env.AUTH_SECRET;

	if (!secret || secret.length < 32) {
		throw new Error("AUTH_SECRET harus dikonfigurasi dan minimal 32 karakter.");
	}

	return secret;
}

function encode(value: string): string {
	return Buffer.from(value, "utf8").toString("base64url");
}

function sign(value: string): string {
	return createHmac("sha256", getAuthSecret()).update(value).digest("base64url");
}

function createSessionValue(payload: SessionPayload): string {
	const encodedPayload = encode(JSON.stringify(payload));
	return `${encodedPayload}.${sign(encodedPayload)}`;
}

function readSessionValue(value: string): SessionPayload | null {
	const [encodedPayload, encodedSignature] = value.split(".");

	if (!encodedPayload || !encodedSignature) {
		return null;
	}

	const expectedSignature = sign(encodedPayload);
	const actualBuffer = Buffer.from(encodedSignature);
	const expectedBuffer = Buffer.from(expectedSignature);

	if (
		actualBuffer.length !== expectedBuffer.length ||
		!timingSafeEqual(actualBuffer, expectedBuffer)
	) {
		return null;
	}

	try {
		const payload = JSON.parse(
			Buffer.from(encodedPayload, "base64url").toString("utf8"),
		) as SessionPayload;

		if (
			typeof payload.user_id !== "string" ||
			typeof payload.expires_at !== "number" ||
			payload.expires_at <= Date.now()
		) {
			return null;
		}

		return payload;
	} catch {
		return null;
	}
}

export async function createSession(userId: string): Promise<void> {
	const cookieStore = await cookies();
	const expires = new Date(Date.now() + SESSION_MAX_AGE * 1000);
	const value = createSessionValue({
		user_id: userId,
		expires_at: expires.getTime(),
	});

	cookieStore.set(SESSION_COOKIE_NAME, value, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		expires,
		maxAge: SESSION_MAX_AGE,
	});
}

export async function destroySession(): Promise<void> {
	const cookieStore = await cookies();
	cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
	const cookieStore = await cookies();
	const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

	if (!sessionCookie) {
		return null;
	}

	const session = readSessionValue(sessionCookie.value);

	if (!session) {
		return null;
	}

	return prisma.user.findUnique({
		where: { user_id: session.user_id },
		select: {
			user_id: true,
			nama: true,
			role: {
				select: { nama_role: true },
			},
		},
	});
}
