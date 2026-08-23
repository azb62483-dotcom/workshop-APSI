import Link from "next/link";

export default function ForbiddenPage() {
	return (
		<main className="flex min-h-screen items-center justify-center bg-gray-100 p-8">
			<div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow">
				<p className="text-sm font-semibold uppercase tracking-wide text-red-600">
					403
				</p>
				<h1 className="mt-2 text-2xl font-bold">Akses Ditolak</h1>
				<p className="mt-3 text-gray-600">
					Anda tidak memiliki izin untuk mengakses halaman ini.
				</p>
				<Link
					href="/login"
					className="mt-6 inline-block rounded-lg bg-black px-4 py-2 font-medium text-white"
				>
					Ke halaman login
				</Link>
			</div>
		</main>
	);
}