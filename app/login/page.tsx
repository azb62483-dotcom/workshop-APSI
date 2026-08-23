"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
	const router = useRouter();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError("");
		setLoading(true);

		try {
			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ username, password }),
			});
			const result = await response.json();

			if (!response.ok) {
				setError(result.error ?? "Login gagal.");
				return;
			}

			router.push("/");
			router.refresh();
		} catch {
			setError("Tidak dapat terhubung ke server.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
			<form
				onSubmit={handleSubmit}
				className="w-full max-w-md space-y-5 rounded-xl bg-white p-8 shadow"
			>
				<div>
					<h1 className="text-2xl font-bold">Login</h1>
					<p className="mt-1 text-sm text-gray-600">Busana Andalas</p>
				</div>

				{error && (
					<div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
						{error}
					</div>
				)}

				<label className="block">
					<span className="mb-2 block font-medium">Username</span>
					<input
						type="text"
						value={username}
						onChange={(event) => setUsername(event.target.value)}
						className="w-full rounded-lg border p-3"
						autoComplete="username"
						required
					/>
				</label>

				<label className="block">
					<span className="mb-2 block font-medium">Password</span>
					<input
						type="password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						className="w-full rounded-lg border p-3"
						autoComplete="current-password"
						required
					/>
				</label>

				<button
					type="submit"
					disabled={loading}
					className="w-full rounded-lg bg-black p-3 font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-400"
				>
					{loading ? "Memproses..." : "Login"}
				</button>
			</form>
		</main>
	);
}
