-- Migrasi untuk database yang sudah dibuat sebelum fitur impor Excel.
-- Database baru tidak perlu file ini (kolomnya sudah ada di schema.sql).
-- Aman dijalankan ulang.

-- Kode barang 10 digit dari SAKTI (misalnya 1010301001) sebagai penanda
-- kategori, supaya impor berikutnya memakai kategori yang sama.
ALTER TABLE categories ADD COLUMN IF NOT EXISTS kode TEXT UNIQUE;
