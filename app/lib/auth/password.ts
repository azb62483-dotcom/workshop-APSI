import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const SALT_BYTES = 16;
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(SALT_BYTES).toString("hex");
	const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;

	return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
	password: string,
	storedHash: string,
): Promise<boolean> {
	const [salt, storedKey] = storedHash.split(":");

	if (!salt || !storedKey || !/^[0-9a-f]+$/i.test(storedKey)) {
		return false;
	}

	const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
	const expectedKey = Buffer.from(storedKey, "hex");

	return (
		expectedKey.length === derivedKey.length &&
		timingSafeEqual(expectedKey, derivedKey)
	);
}
