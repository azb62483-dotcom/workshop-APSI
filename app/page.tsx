"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CurrentUser = {
  nama: string;
  role: string;
};

const featureAccess: Record<string, Array<{ label: string; href: string }>> = {
  Admin: [
    { label: "Produksi", href: "/produksi" },
    { label: "Laporan", href: "/laporan" },
  ],
  "Manajer Produksi": [
    { label: "Produksi", href: "/produksi" },
    { label: "Laporan", href: "/laporan" },
  ],
  "Operator Jahit": [{ label: "Produksi", href: "/produksi" }],
  "Staf Order": [{ label: "Laporan", href: "/laporan" }],
};

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

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
        if (active && result.data && featureAccess[result.data.role]) {
          setUser(result.data);
        }
      } catch {
        if (active) {
          router.replace("/login");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadSession();
    return () => {
      active = false;
    };
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 p-8">
        <p role="status" className="text-gray-700">Memeriksa session...</p>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4 rounded-xl bg-white p-8 shadow">
          <div>
            <p className="text-sm font-medium text-gray-500">Busana Andalas</p>
            <h1 className="mt-1 text-3xl font-bold">Dashboard</h1>
            <p className="mt-2 text-gray-600">{user.nama} · {user.role}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Logout
          </button>
        </header>

        <section className="rounded-xl bg-white p-8 shadow">
          <h2 className="text-lg font-semibold">Pilih fitur</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {featureAccess[user.role].map((feature) => (
              <button
                key={feature.href}
                type="button"
                onClick={() => router.push(feature.href)}
                className="rounded-lg bg-black px-5 py-4 text-left font-medium text-white hover:bg-gray-800"
              >
                {feature.label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
