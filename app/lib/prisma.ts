import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error("DATABASE_URL belum dikonfigurasi.");
}

const runtimeDatabaseUrl: string = databaseUrl;

const globalForPrisma = globalThis as unknown as {
	prisma?: PrismaClient;
};

export function createPrismaClient(
	connectionString = runtimeDatabaseUrl,
): PrismaClient {
	return new PrismaClient({ adapter: new PrismaPg(connectionString) });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
	globalForPrisma.prisma = prisma;
}
