import "dotenv/config";
import { hashPassword } from "../app/lib/auth/password";
import { prisma } from "../app/lib/prisma";

const roles = [
	{ role_id: "R01", nama_role: "Admin" },
	{ role_id: "R02", nama_role: "Manajer Produksi" },
	{ role_id: "R03", nama_role: "Operator Jahit" },
	{ role_id: "R04", nama_role: "Staf Order" },
];

const users = [
	{
		user_id: "U001",
		nama: "Administrator",
		username: "admin",
		password: "admin123",
		role_id: "R01",
	},
	{
		user_id: "U002",
		nama: "Manajer Produksi",
		username: "manager",
		password: "manager123",
		role_id: "R02",
	},
	{
		user_id: "U003",
		nama: "Operator Jahit",
		username: "operator",
		password: "operator123",
		role_id: "R03",
	},
	{
		user_id: "U004",
		nama: "Staf Order",
		username: "staff",
		password: "staff123",
		role_id: "R04",
	},
];

async function main() {
	const usersWithHashes = await Promise.all(
		users.map(async ({ password, ...user }) => ({
			...user,
			password: await hashPassword(password),
		})),
	);

	await prisma.$transaction(async (tx) => {
		for (const role of roles) {
			await tx.role.upsert({
				where: { role_id: role.role_id },
				create: role,
				update: { nama_role: role.nama_role },
			});
		}

		for (const user of usersWithHashes) {
			await tx.user.upsert({
				where: { user_id: user.user_id },
				create: user,
				update: {
					nama: user.nama,
					username: user.username,
					password: user.password,
					role_id: user.role_id,
				},
			});
		}
	});

	console.log("Seed authentication selesai: 4 role dan 4 user siap digunakan.");
}

main()
	.catch((error) => {
		console.error("Seed authentication gagal:", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
