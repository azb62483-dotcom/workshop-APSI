"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CurrentUser = {
	nama: string;
	role: string;
};

type ReportRow = {
	model_id: string;
	nama_model: string;
	bahan_id: string;
	nama_bahan: string;
	satuan: string;
	total_jumlah_pakai: string;
	jumlah_aktivitas_produksi: number;
};

type LowStock = {
	bahan_id: string;
	nama_bahan: string;
	satuan: string;
	stok: string;
	stok_minimum: string;
};

const reportRoles = ["Admin", "Manajer Produksi", "Staf Order"];

export default function LaporanPage() {
	const router = useRouter();
	const [user, setUser] = useState<CurrentUser | null>(null);
	const [sessionLoading, setSessionLoading] = useState(true);
	const [mulai, setMulai] = useState("");
	const [selesai, setSelesai] = useState("");
	const [rows, setRows] = useState<ReportRow[]>([]);
	const [lowStock, setLowStock] = useState<LowStock[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		let active = true;

		async function loadSession() {
			try {
				const response = await fetch("/api/auth/me", { cache: "no-store" });
				if (response.status === 401) {
					router.replace("/login");
					return;
				}
				if (!response.ok) {
					throw new Error("Session tidak dapat diperiksa.");
				}

				const result = (await response.json()) as { data?: CurrentUser };
				if (!result.data || !reportRoles.includes(result.data.role)) {
					router.replace("/403");
					return;
				}
				if (active) {
					setUser(result.data);
				}
			} catch {
				if (active) {
					setError("Tidak dapat memeriksa session.");
				}
			} finally {
				if (active) {
					setSessionLoading(false);
				}
			}
		}

		void loadSession();
		return () => {
			active = false;
		};
	}, [router]);

	async function loadReport(event?: FormEvent<HTMLFormElement>) {
		event?.preventDefault();
		setLoading(true);
		setError("");

		const params = new URLSearchParams();
		if (mulai) params.set("mulai", mulai);
		if (selesai) params.set("selesai", selesai);

		try {
			const response = await fetch(`/api/laporan/penggunaan-bahan?${params}`);
			const result = await response.json();

			if (response.status === 401) {
				router.replace("/login");
				return;
			}
			if (response.status === 403) {
				router.replace("/403");
				return;
			}
			if (!response.ok) {
				setError(result.error ?? "Laporan gagal dimuat.");
				return;
			}

			setRows(result.data ?? []);
			setLowStock(result.peringatan_stok_rendah ?? []);
		} catch {
			setError("Tidak dapat menghubungi server.");
		} finally {
			setLoading(false);
		}
	}

	function exportCsv() {
		const params = new URLSearchParams({ format: "csv" });
		if (mulai) params.set("mulai", mulai);
		if (selesai) params.set("selesai", selesai);
		window.location.assign(`/api/laporan/penggunaan-bahan?${params}`);
	}

	if (sessionLoading) {
		return <main className="p-8">Memeriksa session...</main>;
	}
	if (!user) return null;

	return (
		<main className="min-h-screen bg-gray-100 p-8">
			<div className="mx-auto max-w-6xl space-y-6">
				<header className="flex flex-wrap items-start justify-between gap-4 rounded-xl bg-white p-6 shadow">
					<div>
						<h1 className="text-2xl font-bold">Laporan Penggunaan Bahan</h1>
						<p className="mt-1 text-sm text-gray-600">{user.nama} · {user.role}</p>
					</div>
					<div className="flex gap-3">
						<button type="button" onClick={() => router.push("/produksi")} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50">
							Produksi
						</button>
						<button type="button" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/login"); }} className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white">
							Logout
						</button>
					</div>
				</header>

				<section className="rounded-xl bg-white p-6 shadow">
					<form onSubmit={loadReport} className="flex flex-wrap items-end gap-4">
						<label className="block">
							<span className="mb-2 block text-sm font-medium">Mulai</span>
							<input type="date" value={mulai} onChange={(event) => setMulai(event.target.value)} className="rounded-lg border p-2" />
						</label>
						<label className="block">
							<span className="mb-2 block text-sm font-medium">Selesai</span>
							<input type="date" value={selesai} onChange={(event) => setSelesai(event.target.value)} className="rounded-lg border p-2" />
						</label>
						<button type="submit" disabled={loading} className="rounded-lg bg-black px-4 py-2 font-medium text-white disabled:opacity-50">
							{loading ? "Memuat..." : "Tampilkan"}
						</button>
						<button type="button" onClick={exportCsv} className="rounded-lg border px-4 py-2 font-medium hover:bg-gray-50">
							Export CSV
						</button>
					</form>
					{error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
				</section>

				{lowStock.length > 0 && (
					<section className="rounded-xl border border-yellow-300 bg-yellow-50 p-6 text-yellow-950 shadow">
						<h2 className="font-bold">Peringatan Stok Rendah</h2>
						<p className="mt-1 text-sm">Stok aktual berada di bawah stok minimum.</p>
						<div className="mt-4 grid gap-3 md:grid-cols-2">
							{lowStock.map((bahan) => (
								<div key={bahan.bahan_id} className="rounded-lg bg-yellow-100 p-3">
									<strong>{bahan.nama_bahan}</strong>
									<p className="text-sm">Stok: {bahan.stok} {bahan.satuan} · Minimum: {bahan.stok_minimum} {bahan.satuan}</p>
								</div>
							))}
						</div>
					</section>
				)}

				<section className="overflow-x-auto rounded-xl bg-white shadow">
					<table className="min-w-full text-left text-sm">
						<thead className="border-b bg-gray-50">
							<tr><th className="p-4">Model</th><th className="p-4">Bahan</th><th className="p-4">Total Dipakai</th><th className="p-4">Aktivitas Produksi</th></tr>
						</thead>
						<tbody>
							{rows.length === 0 ? <tr><td colSpan={4} className="p-6 text-center text-gray-500">Belum ada data laporan.</td></tr> : rows.map((row) => <tr key={`${row.model_id}-${row.bahan_id}`} className="border-b last:border-0"><td className="p-4">{row.nama_model}</td><td className="p-4">{row.nama_bahan} ({row.satuan})</td><td className="p-4">{row.total_jumlah_pakai} {row.satuan}</td><td className="p-4">{row.jumlah_aktivitas_produksi}</td></tr>)}
						</tbody>
					</table>
				</section>
			</div>
		</main>
	);
}
