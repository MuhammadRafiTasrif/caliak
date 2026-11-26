-- CALIAK: Row Level Security dan hak akses tabel.
-- Jalankan setelah functions.sql (policy memakai is_admin()).
--
-- Prinsip:
--   - Semua tabel memakai RLS.
--   - Pengguna anonim (belum login) tidak bisa membaca apa pun.
--   - Penulisan permintaan, status, dan stok hanya lewat fungsi RPC.
--   - Riwayat (stock_movements, request_status_logs) tidak bisa
--     diubah atau dihapus oleh siapa pun dari aplikasi.

ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE items               ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests            ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements     ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_counters    ENABLE ROW LEVEL SECURITY;

-- Hak dasar tabel. Supabase memberi semua hak ke anon dan authenticated
-- secara bawaan, jadi dicabut dulu lalu diberikan seperlunya.
REVOKE ALL ON profiles, categories, items, requests, request_items,
              request_status_logs, stock_movements, request_counters
FROM anon, authenticated;

GRANT SELECT ON profiles, categories, items, requests, request_items,
                request_status_logs, stock_movements
TO authenticated;

-- Admin boleh mengubah data profil (verifikasi, role), tetapi tidak id.
GRANT UPDATE (nip, nama, unit_kerja, role, is_verified) ON profiles TO authenticated;

GRANT INSERT, UPDATE ON categories TO authenticated;

-- Kolom stok sengaja tidak disebut: tidak bisa diisi atau diubah dari
-- frontend. Stok awal dicatat lewat tambah_barang_masuk().
GRANT INSERT (kode_unik, kode_bmn, nup, nama, category_id, satuan, stok_minimum,
              lokasi, deskripsi, foto_url, is_active)
    ON items TO authenticated;
GRANT UPDATE (kode_unik, kode_bmn, nup, nama, category_id, satuan, stok_minimum,
              lokasi, deskripsi, foto_url, is_active)
    ON items TO authenticated;

-- profiles
CREATE POLICY "profil: baca milik sendiri atau admin"
    ON profiles FOR SELECT TO authenticated
    USING (id = auth.uid() OR is_admin());

-- Pemohon tidak bisa mengubah profilnya sendiri, supaya tidak bisa
-- mengganti role atau status verifikasinya.
CREATE POLICY "profil: hanya admin yang mengubah"
    ON profiles FOR UPDATE TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- categories
CREATE POLICY "kategori: semua pengguna login bisa membaca"
    ON categories FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "kategori: admin menambah"
    ON categories FOR INSERT TO authenticated
    WITH CHECK (is_admin());

CREATE POLICY "kategori: admin mengubah"
    ON categories FOR UPDATE TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- items
CREATE POLICY "barang: pemohon lihat yang aktif, admin lihat semua"
    ON items FOR SELECT TO authenticated
    USING (is_active OR is_admin());

CREATE POLICY "barang: admin menambah"
    ON items FOR INSERT TO authenticated
    WITH CHECK (is_admin());

CREATE POLICY "barang: admin mengubah"
    ON items FOR UPDATE TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- Tidak ada policy DELETE: barang dinonaktifkan, bukan dihapus.

-- requests, request_items, request_status_logs
-- Pembuatan dan perubahan lewat buat_permintaan(), batalkan_permintaan(),
-- ubah_status_permintaan(), dan selesaikan_permintaan().
CREATE POLICY "permintaan: pemohon lihat miliknya, admin lihat semua"
    ON requests FOR SELECT TO authenticated
    USING (requester_id = auth.uid() OR is_admin());

CREATE POLICY "rincian permintaan: ikut hak baca permintaannya"
    ON request_items FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM requests r
        WHERE r.id = request_items.request_id
          AND (r.requester_id = auth.uid() OR is_admin())
    ));

CREATE POLICY "log status: ikut hak baca permintaannya"
    ON request_status_logs FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM requests r
        WHERE r.id = request_status_logs.request_id
          AND (r.requester_id = auth.uid() OR is_admin())
    ));

-- stock_movements: admin lihat semua, pemohon hanya mutasi keluar
-- yang terkait permintaannya sendiri.
CREATE POLICY "mutasi: admin semua, pemohon miliknya"
    ON stock_movements FOR SELECT TO authenticated
    USING (
        is_admin()
        OR EXISTS (
            SELECT 1 FROM requests r
            WHERE r.id = stock_movements.request_id
              AND r.requester_id = auth.uid()
        )
    );

-- request_counters tidak punya policy: hanya bisa diakses lewat fungsi.

-- Storage: bucket "foto-barang"
--   - foto barang disimpan di folder  barang/
--   - foto bukti barang masuk di      bukti/
-- Bucket publik agar foto tampil lewat URL biasa. Tulis hanya admin.
-- Batas 2 MB dan tipe file juga dicek di sisi server.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('foto-barang', 'foto-barang', true, 2097152,
        ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "foto-barang: baca publik"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'foto-barang');

CREATE POLICY "foto-barang: admin mengunggah"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'foto-barang' AND public.is_admin());

CREATE POLICY "foto-barang: admin mengganti"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'foto-barang' AND public.is_admin())
    WITH CHECK (bucket_id = 'foto-barang' AND public.is_admin());

CREATE POLICY "foto-barang: admin menghapus"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'foto-barang' AND public.is_admin());
