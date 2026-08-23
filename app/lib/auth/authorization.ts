import { getCurrentUser, type CurrentUser } from "./session";

export class AuthorizationError extends Error {
	constructor(public readonly status: 401 | 403, message: string) {
		super(message);
		this.name = "AuthorizationError";
	}
}

export async function requireUser(): Promise<CurrentUser> {
	const user = await getCurrentUser();

	if (!user) {
		throw new AuthorizationError(401, "Anda harus login terlebih dahulu.");
	}

	return user;
}

export async function requireRole(
	role: string,
): Promise<CurrentUser> {
	return requireAnyRole(role);
}

export async function requireAnyRole(
	...roles: string[]
): Promise<CurrentUser> {
	const user = await requireUser();

	if (!roles.includes(user.role.nama_role)) {
		throw new AuthorizationError(403, "Anda tidak memiliki akses untuk aksi ini.");
	}

	return user;
}
