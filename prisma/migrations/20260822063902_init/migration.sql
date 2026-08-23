-- CreateTable
CREATE TABLE "user" (
    "user_id" VARCHAR(10) NOT NULL,
    "nama" VARCHAR(100) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role_id" VARCHAR(10) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "role" (
    "role_id" VARCHAR(10) NOT NULL,
    "nama_role" VARCHAR(50) NOT NULL,

    CONSTRAINT "role_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "model" (
    "model_id" VARCHAR(10) NOT NULL,
    "nama_model" VARCHAR(100) NOT NULL,
    "deskripsi" TEXT,

    CONSTRAINT "model_pkey" PRIMARY KEY ("model_id")
);

-- CreateTable
CREATE TABLE "order" (
    "order_id" VARCHAR(10) NOT NULL,
    "model_id" VARCHAR(10) NOT NULL,
    "tanggal_order" DATE NOT NULL,
    "status_order" VARCHAR(20) NOT NULL,

    CONSTRAINT "order_pkey" PRIMARY KEY ("order_id")
);

-- CreateTable
CREATE TABLE "detail_order" (
    "detail_order_id" VARCHAR(10) NOT NULL,
    "order_id" VARCHAR(10) NOT NULL,
    "ukuran" VARCHAR(10) NOT NULL,
    "jumlah" INTEGER NOT NULL,

    CONSTRAINT "detail_order_pkey" PRIMARY KEY ("detail_order_id")
);

-- CreateTable
CREATE TABLE "bahan" (
    "bahan_id" VARCHAR(10) NOT NULL,
    "nama_bahan" VARCHAR(100) NOT NULL,
    "satuan" VARCHAR(10) NOT NULL,
    "stok" DECIMAL(10,2) NOT NULL,
    "stok_minimum" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "bahan_pkey" PRIMARY KEY ("bahan_id")
);

-- CreateTable
CREATE TABLE "bom" (
    "bom_id" VARCHAR(10) NOT NULL,
    "model_id" VARCHAR(10) NOT NULL,
    "bahan_id" VARCHAR(10) NOT NULL,
    "jumlah_kebutuhan" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "bom_pkey" PRIMARY KEY ("bom_id")
);

-- CreateTable
CREATE TABLE "produksi" (
    "produksi_id" VARCHAR(10) NOT NULL,
    "order_id" VARCHAR(10) NOT NULL,
    "tahap" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "jumlah_diproses" INTEGER NOT NULL,
    "tanggal_mulai" TIMESTAMP(3) NOT NULL,
    "tanggal_selesai" TIMESTAMP(3),

    CONSTRAINT "produksi_pkey" PRIMARY KEY ("produksi_id")
);

-- CreateTable
CREATE TABLE "pemakaian_bahan" (
    "pemakaian_id" VARCHAR(10) NOT NULL,
    "produksi_id" VARCHAR(10) NOT NULL,
    "bahan_id" VARCHAR(10) NOT NULL,
    "jumlah_pakai" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "pemakaian_bahan_pkey" PRIMARY KEY ("pemakaian_id")
);

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("role_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "model"("model_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detail_order" ADD CONSTRAINT "detail_order_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("order_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom" ADD CONSTRAINT "bom_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "model"("model_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom" ADD CONSTRAINT "bom_bahan_id_fkey" FOREIGN KEY ("bahan_id") REFERENCES "bahan"("bahan_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produksi" ADD CONSTRAINT "produksi_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("order_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pemakaian_bahan" ADD CONSTRAINT "pemakaian_bahan_produksi_id_fkey" FOREIGN KEY ("produksi_id") REFERENCES "produksi"("produksi_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pemakaian_bahan" ADD CONSTRAINT "pemakaian_bahan_bahan_id_fkey" FOREIGN KEY ("bahan_id") REFERENCES "bahan"("bahan_id") ON DELETE RESTRICT ON UPDATE CASCADE;
