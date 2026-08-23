"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CurrentUser = {
  user_id: string;
  nama: string;
  role: string;
};

const productionRoles = ["Admin", "Manajer Produksi", "Operator Jahit"];

type PeringatanStok = {
  bahan_id: string;
  nama_bahan: string;
  satuan: string;
  stok: string | number;
  stok_minimum: string | number;
};

export default function ProduksiPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [tahap, setTahap] = useState("");
  const [status, setStatus] = useState("Proses");
  const [jumlahDiproses, setJumlahDiproses] = useState("");
  const [bahanId, setBahanId] = useState("");
  const [jumlahPakai, setJumlahPakai] = useState("");

  const [pesanBerhasil, setPesanBerhasil] = useState("");
  const [peringatanStok, setPeringatanStok] = useState<PeringatanStok[]>([]);
  const [pesanError, setPesanError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCurrentUser() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        if (response.status === 403) {
          router.replace("/403");
          return;
        }

        if (!response.ok) {
          throw new Error("Gagal memeriksa session.");
        }

        const result = (await response.json()) as { data?: CurrentUser };

        if (active && result.data) {
          if (!productionRoles.includes(result.data.role)) {
            router.replace("/403");
            return;
          }

          setCurrentUser(result.data);
        }
      } catch {
        if (active) {
          setPesanError("Tidak dapat memeriksa session.");
        }
      } finally {
        if (active) {
          setSessionLoading(false);
        }
      }
    }

    void loadCurrentUser();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleLogout() {
    setLogoutLoading(true);

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });

      if (response.ok) {
        router.replace("/login");
        return;
      }

      setPesanError("Logout gagal. Silakan coba lagi.");
    } catch {
      setPesanError("Tidak dapat terhubung ke server.");
    } finally {
      setLogoutLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Bersihkan pesan sebelumnya
    setPesanBerhasil("");
    setPeringatanStok([]);
    setPesanError("");
    setLoading(true);

    const data = {
      order_id: orderId,
      tahap,
      status,
      jumlah_diproses: Number(jumlahDiproses),
      pemakaian_bahan: [
        {
          bahan_id: bahanId,
          jumlah_pakai: Number(jumlahPakai),
        },
      ],
    };

    try {
      const response = await fetch("/api/produksi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      console.log("Response API:", result);

      if (!response.ok) {
        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        if (response.status === 403) {
          setPesanError("Anda tidak memiliki akses untuk mencatat produksi.");
          return;
        }

        setPesanError(result.error ?? "Gagal mencatat produksi.");
        return;
      }

      // Produksi berhasil
      setPesanBerhasil("Produksi berhasil dicatat.");

      // Simpan warning stok dari API
      setPeringatanStok(result.peringatan_stok_rendah ?? []);

      // Kosongkan input setelah berhasil
      setOrderId("");
      setTahap("");
      setStatus("Proses");
      setJumlahDiproses("");
      setBahanId("");
      setJumlahPakai("");
    } catch (error) {
      console.error("Gagal menghubungi API:", error);
      setPesanError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  if (sessionLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 p-8">
        <p role="status" className="text-gray-700">Memeriksa session...</p>
      </main>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-2xl rounded-xl bg-white p-8 shadow">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Catat Produksi</h1>
          <p className="mt-1 text-sm text-gray-600">
            {currentUser.nama} · {currentUser.role}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={logoutLoading}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {logoutLoading ? "Keluar..." : "Logout"}
        </button>
      </div>

        {/* Pesan berhasil */}
        {pesanBerhasil && (
          <div className="mb-5 rounded-lg border border-green-300 bg-green-50 p-4 text-green-800">
            <p className="font-semibold">
              ✓ {pesanBerhasil}
            </p>
          </div>
        )}

        {/* Peringatan stok */}
        {peringatanStok.length > 0 && (
          <div className="mb-5 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-yellow-900">
            <h2 className="mb-2 font-bold">
              ⚠ Peringatan Stok Rendah
            </h2>

            <p className="mb-3 text-sm">
              Produksi berhasil dicatat, tetapi stok bahan berikut
              berada di bawah batas minimum:
            </p>

            <div className="space-y-2">
              {peringatanStok.map((bahan) => (
                <div
                  key={bahan.bahan_id}
                  className="rounded-md bg-yellow-100 p-3"
                >
                  <p className="font-semibold">
                    {bahan.nama_bahan}
                  </p>

                  <p className="text-sm">
                    Stok sekarang:{" "}
                    <strong>
                      {bahan.stok} {bahan.satuan}
                    </strong>
                  </p>

                  <p className="text-sm">
                    Stok minimum:{" "}
                    <strong>
                      {bahan.stok_minimum} {bahan.satuan}
                    </strong>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pesan error */}
        {pesanError && (
          <div className="mb-5 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
            <p className="font-semibold">
              ✕ Gagal mencatat produksi
            </p>

            <p className="mt-1 text-sm">
              {pesanError}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Order */}
          <div>
            <label className="mb-2 block font-medium">
              Order
            </label>

            <input
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="Contoh: ORD001"
              className="w-full rounded-lg border p-3"
              required
            />
          </div>

          {/* Tahap */}
          <div>
            <label className="mb-2 block font-medium">
              Tahap
            </label>

            <select
              value={tahap}
              onChange={(e) => setTahap(e.target.value)}
              className="w-full rounded-lg border p-3"
              required
            >
              <option value="">Pilih tahap</option>
              <option value="Potong">Potong</option>
              <option value="Jahit">Jahit</option>
              <option value="Finishing">Finishing</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="mb-2 block font-medium">
              Status
            </label>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border p-3"
            >
              <option value="Proses">Proses</option>
              <option value="Selesai">Selesai</option>
            </select>
          </div>

          {/* Jumlah Diproses */}
          <div>
            <label className="mb-2 block font-medium">
              Jumlah Diproses
            </label>

            <input
              type="number"
              min="1"
              value={jumlahDiproses}
              onChange={(e) => setJumlahDiproses(e.target.value)}
              placeholder="Contoh: 50"
              className="w-full rounded-lg border p-3"
              required
            />
          </div>

          {/* Pemakaian Bahan */}
          <div className="border-t pt-5">
            <h2 className="mb-4 text-lg font-semibold">
              Pemakaian Bahan
            </h2>

            <div className="space-y-4">

              {/* Bahan ID */}
              <div>
                <label className="mb-2 block font-medium">
                  Bahan ID
                </label>

                <input
                  type="text"
                  value={bahanId}
                  onChange={(e) => setBahanId(e.target.value)}
                  placeholder="Contoh: BHN001"
                  className="w-full rounded-lg border p-3"
                  required
                />
              </div>

              {/* Jumlah Dipakai */}
              <div>
                <label className="mb-2 block font-medium">
                  Jumlah Dipakai
                </label>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={jumlahPakai}
                  onChange={(e) => setJumlahPakai(e.target.value)}
                  placeholder="Contoh: 25"
                  className="w-full rounded-lg border p-3"
                  required
                />
              </div>

            </div>
          </div>

          {/* Tombol */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black p-3 font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {loading ? "Menyimpan..." : "Simpan Produksi"}
          </button>

        </form>
      </div>
    </main>
  );
}