# Project Context — Sistem Produksi Konveksi Busana Andalas

## 1. Produk Sistem

Sistem informasi produksi garmen untuk Konveksi "Busana Andalas".

Sistem digunakan untuk:
- mencatat order produksi pakaian,
- mencatat rincian order berdasarkan ukuran,
- mengelola model garmen,
- mengelola Bill of Materials (BoM),
- mengelola stok bahan,
- mencatat progres produksi,
- mencatat pemakaian bahan,
- memberikan peringatan ketika stok bahan berada di bawah stok minimum.

## 2. Tech Stack

- Next.js
- TypeScript
- PostgreSQL
- Prisma ORM
- Docker
- GitHub Copilot
- Prisma Studio

Database PostgreSQL berjalan dalam Docker container bernama:
`pg-produksi`

Database:
`produksi`

Database URL disimpan dalam environment variable `DATABASE_URL`.
Jangan menuliskan kredensial database secara langsung di source code.

## 3. Entitas Database

Sistem memiliki 9 entitas utama:

1. ROLE
2. USER
3. MODEL
4. ORDER
5. DETAIL_ORDER
6. BAHAN
7. BOM
8. PRODUKSI
9. PEMAKAIAN_BAHAN

## 4. Relasi Database

ROLE 1:N USER

MODEL 1:N ORDER

ORDER 1:N DETAIL_ORDER

MODEL 1:N BOM

BAHAN 1:N BOM

MODEL M:N BAHAN melalui BOM

ORDER 1:N PRODUKSI

PRODUKSI 1:N PEMAKAIAN_BAHAN

BAHAN 1:N PEMAKAIAN_BAHAN

PRODUKSI M:N BAHAN melalui PEMAKAIAN_BAHAN.

## 5. Fungsi Entitas

### ROLE
Menyimpan peran pengguna.

Role yang tersedia:
- Admin
- Manajer Produksi
- Operator Jahit
- Staf Order

### USER
Menyimpan pengguna sistem dan role yang dimilikinya.

### MODEL
Menyimpan model garmen yang dapat dipesan.

### ORDER
Menyimpan informasi utama order produksi dan model yang dipesan.

### DETAIL_ORDER
Menyimpan rincian ukuran dan jumlah produk dalam sebuah order.

Ukuran harus direpresentasikan sebagai baris/detail order, bukan kolom berulang.

Contoh:

| ukuran | jumlah |
|---|---:|
| S | 10 |
| M | 20 |
| L | 15 |

### BAHAN
Menyimpan bahan produksi beserta:
- nama bahan,
- satuan,
- stok saat ini,
- stok minimum.

Bahan dapat berupa kain, benang, aksesori, dan bahan produksi lainnya.

### BOM
Menghubungkan MODEL dengan BAHAN dan menyimpan jumlah kebutuhan bahan.

Satu model dapat membutuhkan banyak bahan.
Satu bahan dapat digunakan oleh banyak model.

### PRODUKSI
Menyimpan progres produksi berdasarkan tahap:
- Potong
- Jahit
- Finishing

Satu order dapat memiliki beberapa aktivitas/tahap produksi.

### PEMAKAIAN_BAHAN
Mencatat bahan yang digunakan dalam aktivitas produksi dan jumlah yang digunakan.

## 6. Aturan Bisnis

### BR-01 — BoM
Satu model dapat menggunakan banyak bahan dan satu bahan dapat digunakan oleh banyak model.

Hubungan M:N direalisasikan melalui tabel BOM.

### BR-02 — Stok Minimum
Jika stok bahan setelah pemakaian berada di bawah stok minimum, sistem harus memberikan peringatan/notifikasi stok rendah.

### BR-03 — Penyelesaian Order
Hanya Manajer Produksi yang boleh menutup atau menyelesaikan order.

### BR-04 — Ukuran
Ukuran produk disimpan sebagai detail order sehingga satu order dapat memiliki beberapa ukuran dengan jumlah berbeda.

### BR-05 — Konsistensi Stok
Penyimpanan data produksi dan perubahan stok bahan yang berkaitan harus dilakukan dalam SATU transaksi database.

Jika salah satu operasi gagal, seluruh transaksi harus dibatalkan.

## 7. Fitur Utama yang Sedang Dibangun

Fitur inti Modul 3 adalah:

"Catat Produksi"

Fitur harus memungkinkan pengguna mencatat aktivitas produksi beserta pemakaian bahan.

Alur konseptual:

1. Pengguna memilih order.
2. Pengguna memilih tahap produksi.
3. Pengguna memasukkan jumlah yang diproses.
4. Pengguna mencatat bahan yang digunakan.
5. Sistem menyimpan data PRODUKSI.
6. Sistem menyimpan PEMAKAIAN_BAHAN.
7. Sistem mengurangi stok BAHAN.
8. Semua operasi database dilakukan dalam satu transaksi.
9. Sistem memeriksa stok minimum.
10. Jika stok < stok_minimum, sistem mengembalikan peringatan.

## 8. API yang Akan Dibangun

Fitur utama menggunakan:

POST /api/produksi

API harus:
- memvalidasi input,
- menyimpan data produksi,
- menyimpan pemakaian bahan,
- mengurangi stok bahan,
- menggunakan transaksi Prisma,
- memberikan informasi bahan yang stoknya berada di bawah stok minimum.

Jangan menganggap input dari client valid.

## 9. Prinsip Implementasi

- Gunakan TypeScript.
- Gunakan Prisma untuk akses database.
- Gunakan Prisma transaction untuk operasi yang saling bergantung.
- Jangan menaruh password database atau credential di source code.
- Gunakan `DATABASE_URL` dari environment variable.
- Validasi input sebelum melakukan perubahan database.
- Jangan membuat tabel database secara manual jika perubahan berasal dari schema Prisma.
- Jangan mengubah struktur database tanpa mempertimbangkan `schema.prisma` dan migration.
- Jangan membuat entitas atau field baru yang tidak diperlukan tanpa alasan yang jelas.

## 10. Prinsip Review Kode AI

Setiap kode yang dihasilkan AI harus ditinjau sebelum digunakan.

Periksa terutama:
- apakah import benar-benar tersedia,
- apakah nama model Prisma sesuai schema,
- apakah nama field sesuai schema,
- apakah relasi Prisma digunakan dengan benar,
- apakah transaksi digunakan,
- apakah stok dapat menjadi tidak konsisten,
- apakah input divalidasi,
- apakah credential terekspos,
- apakah error ditangani dengan benar.

Jangan menerima kode AI hanya karena kode tersebut terlihat benar.