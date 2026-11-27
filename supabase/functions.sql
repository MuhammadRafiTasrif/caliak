-- CALIAK: fungsi RPC untuk logika stok dan status permintaan.
-- Jalankan setelah schema.sql.
--
-- Semua perubahan stok dan status lewat fungsi di file ini, supaya:
--   1. stok tidak pernah dobel dikurangi (baris barang dikunci FOR UPDATE),
--   2. setiap perubahan stok selalu punya baris di stock_movements,
--   3. hak akses dicek di dalam fungsi, bukan hanya di frontend.
--
-- Fungsi memakai SECURITY DEFINER agar bisa menulis ke tabel yang
-- tertutup untuk pengguna biasa. Karena itu setiap fungsi WAJIB
-- memeriksa siapa pemanggilnya (auth.uid()) sebelum mengubah data.
--
-- File ini aman dijalankan ulang (semua memakai CREATE OR REPLACE).

-- Tanggal hari ini menurut WIB. Server Supabase memakai UTC, jadi
-- current_date bisa tertinggal satu hari antara pukul 00.00 dan 07.00 WIB.
CREATE OR REPLACE FUNCTION hari_ini()
RETURNS DATE
LANGUAGE sql
STABLE
AS $$
    SELECT (now() AT TIME ZONE 'Asia/Jakarta')::DATE;
$$;

-- Pembantu hak akses. Juga dipakai di policies.sql.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin' AND is_verified
    );
$$;

CREATE OR REPLACE FUNCTION is_verified_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND is_verified
    );
$$;

CREATE OR REPLACE FUNCTION wajib_admin()
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Hanya admin yang boleh melakukan aksi ini.';
    END IF;
END;
$$;

-- Barang masuk: stok bertambah dan tercatat sebagai mutasi 'masuk'.
-- Juga dipakai untuk mencatat stok awal barang baru.
CREATE OR REPLACE FUNCTION tambah_barang_masuk(
    p_item_id        UUID,
    p_jumlah         INTEGER,
    p_dokumen_ref    TEXT DEFAULT NULL,
    p_foto_bukti_url TEXT DEFAULT NULL,
    p_catatan        TEXT DEFAULT NULL,
    p_tanggal        DATE DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_stok_lama INTEGER;
    v_aktif     BOOLEAN;
    v_tanggal   DATE := COALESCE(p_tanggal, hari_ini());
BEGIN
    PERFORM wajib_admin();

    IF p_jumlah IS NULL OR p_jumlah <= 0 THEN
        RAISE EXCEPTION 'Jumlah barang masuk harus lebih dari 0.';
    END IF;
    IF v_tanggal > hari_ini() THEN
        RAISE EXCEPTION 'Tanggal barang masuk tidak boleh di masa depan.';
    END IF;

    SELECT stok, is_active INTO v_stok_lama, v_aktif
    FROM items WHERE id = p_item_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Barang tidak ditemukan.';
    END IF;
    IF NOT v_aktif THEN
        RAISE EXCEPTION 'Barang sudah dinonaktifkan. Aktifkan dulu sebelum mencatat barang masuk.';
    END IF;

    UPDATE items SET stok = v_stok_lama + p_jumlah WHERE id = p_item_id;

    INSERT INTO stock_movements
        (item_id, jenis, jumlah, saldo_sebelum, saldo_sesudah, tanggal,
         dokumen_ref, foto_bukti_url, catatan, created_by)
    VALUES
        (p_item_id, 'masuk', p_jumlah, v_stok_lama, v_stok_lama + p_jumlah, v_tanggal,
         NULLIF(trim(p_dokumen_ref), ''), NULLIF(p_foto_bukti_url, ''),
         NULLIF(trim(p_catatan), ''), auth.uid());

    RETURN v_stok_lama + p_jumlah;
END;
$$;

-- Koreksi stok (misalnya setelah stock opname). Alasan wajib diisi.
CREATE OR REPLACE FUNCTION koreksi_stok(
    p_item_id   UUID,
    p_stok_baru INTEGER,
    p_alasan    TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_stok_lama INTEGER;
BEGIN
    PERFORM wajib_admin();

    IF p_stok_baru IS NULL OR p_stok_baru < 0 THEN
        RAISE EXCEPTION 'Stok baru tidak boleh kurang dari 0.';
    END IF;
    IF p_alasan IS NULL OR length(trim(p_alasan)) = 0 THEN
        RAISE EXCEPTION 'Alasan koreksi stok wajib diisi.';
    END IF;

    SELECT stok INTO v_stok_lama FROM items WHERE id = p_item_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Barang tidak ditemukan.';
    END IF;
    IF v_stok_lama = p_stok_baru THEN
        RAISE EXCEPTION 'Stok baru sama dengan stok sekarang, tidak ada yang dikoreksi.';
    END IF;

    UPDATE items SET stok = p_stok_baru WHERE id = p_item_id;

    INSERT INTO stock_movements
        (item_id, jenis, jumlah, saldo_sebelum, saldo_sesudah, tanggal, catatan, created_by)
    VALUES
        (p_item_id, 'koreksi', p_stok_baru - v_stok_lama, v_stok_lama, p_stok_baru,
         hari_ini(), trim(p_alasan), auth.uid());

    RETURN p_stok_baru;
END;
$$;

-- Pemohon membuat permintaan.
-- p_items berbentuk: [{"item_id": "...", "jumlah": 2}, ...]
CREATE OR REPLACE FUNCTION buat_permintaan(
    p_keperluan          TEXT,
    p_tanggal_dibutuhkan DATE,
    p_items              JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request_id UUID;
    v_tahun      INTEGER := extract(year FROM hari_ini())::INTEGER;
    v_urut       INTEGER;
    v_baris      RECORD;
BEGIN
    IF NOT is_verified_user() THEN
        RAISE EXCEPTION 'Akun Anda belum diverifikasi Admin, sehingga belum bisa mengajukan permintaan.';
    END IF;
    IF p_keperluan IS NULL OR length(trim(p_keperluan)) = 0 THEN
        RAISE EXCEPTION 'Keperluan wajib diisi.';
    END IF;
    IF p_tanggal_dibutuhkan IS NULL OR p_tanggal_dibutuhkan < hari_ini() THEN
        RAISE EXCEPTION 'Tanggal dibutuhkan tidak boleh sebelum hari ini.';
    END IF;
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Pilih minimal satu barang.';
    END IF;

    -- Cek setiap barang. Barang yang sama dijumlahkan jadi satu baris.
    FOR v_baris IN
        SELECT (e->>'item_id')::UUID AS item_id, SUM((e->>'jumlah')::INTEGER) AS jumlah
        FROM jsonb_array_elements(p_items) AS e
        GROUP BY 1
    LOOP
        IF v_baris.jumlah IS NULL OR v_baris.jumlah <= 0 THEN
            RAISE EXCEPTION 'Jumlah setiap barang harus lebih dari 0.';
        END IF;
        PERFORM 1 FROM items
        WHERE id = v_baris.item_id AND is_active AND stok >= v_baris.jumlah;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Stok "%" tidak mencukupi atau barang tidak tersedia.',
                COALESCE((SELECT nama FROM items WHERE id = v_baris.item_id), 'barang');
        END IF;
    END LOOP;

    -- Nomor urut per tahun. ON CONFLICT mengunci baris tahun tersebut,
    -- jadi dua permintaan bersamaan tidak akan mendapat nomor yang sama.
    INSERT INTO request_counters (tahun, terakhir) VALUES (v_tahun, 1)
    ON CONFLICT (tahun) DO UPDATE SET terakhir = request_counters.terakhir + 1
    RETURNING terakhir INTO v_urut;

    INSERT INTO requests (nomor, requester_id, keperluan, tanggal_dibutuhkan)
    VALUES ('REQ-' || v_tahun || '-' || lpad(v_urut::TEXT, 4, '0'),
            auth.uid(), trim(p_keperluan), p_tanggal_dibutuhkan)
    RETURNING id INTO v_request_id;

    INSERT INTO request_items (request_id, item_id, jumlah_diminta)
    SELECT v_request_id, (e->>'item_id')::UUID, SUM((e->>'jumlah')::INTEGER)
    FROM jsonb_array_elements(p_items) AS e
    GROUP BY 2;

    INSERT INTO request_status_logs (request_id, status, catatan, changed_by)
    VALUES (v_request_id, 'menunggu', 'Permintaan diajukan', auth.uid());

    RETURN v_request_id;
END;
$$;

-- Pemohon membatalkan permintaannya sendiri, hanya saat masih 'menunggu'.
CREATE OR REPLACE FUNCTION batalkan_permintaan(
    p_request_id UUID,
    p_catatan    TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_status    TEXT;
    v_pemohon   UUID;
BEGIN
    SELECT status, requester_id INTO v_status, v_pemohon
    FROM requests WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND OR v_pemohon <> auth.uid() THEN
        RAISE EXCEPTION 'Permintaan tidak ditemukan.';
    END IF;
    IF v_status <> 'menunggu' THEN
        RAISE EXCEPTION 'Permintaan hanya bisa dibatalkan saat statusnya masih menunggu.';
    END IF;

    UPDATE requests SET status = 'dibatalkan' WHERE id = p_request_id;

    INSERT INTO request_status_logs (request_id, status, catatan, changed_by)
    VALUES (p_request_id, 'dibatalkan',
            COALESCE(NULLIF(trim(p_catatan), ''), 'Dibatalkan oleh pemohon'), auth.uid());
END;
$$;

-- Admin menyetujui atau menolak permintaan.
--   p_status_baru: 'disetujui' atau 'ditolak'
--   p_jumlah_disetujui (opsional, hanya untuk 'disetujui'):
--     [{"item_id": "...", "jumlah": 1}, ...]
--     Barang yang tidak disebut disetujui sebesar jumlah yang diminta.
-- Status 'selesai' lewat selesaikan_permintaan, 'dibatalkan' lewat
-- batalkan_permintaan.
CREATE OR REPLACE FUNCTION ubah_status_permintaan(
    p_request_id       UUID,
    p_status_baru      TEXT,
    p_catatan          TEXT DEFAULT NULL,
    p_jumlah_disetujui JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_status TEXT;
    v_baris  RECORD;
BEGIN
    PERFORM wajib_admin();

    SELECT status INTO v_status FROM requests WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Permintaan tidak ditemukan.';
    END IF;

    IF p_status_baru = 'disetujui' THEN
        IF v_status <> 'menunggu' THEN
            RAISE EXCEPTION 'Hanya permintaan berstatus menunggu yang bisa disetujui.';
        END IF;

        UPDATE request_items ri
        SET jumlah_disetujui = COALESCE(
            (SELECT (e->>'jumlah')::INTEGER
             FROM jsonb_array_elements(COALESCE(p_jumlah_disetujui, '[]'::JSONB)) AS e
             WHERE (e->>'item_id')::UUID = ri.item_id
             LIMIT 1),
            ri.jumlah_diminta)
        WHERE ri.request_id = p_request_id;

        FOR v_baris IN
            SELECT ri.jumlah_diminta, ri.jumlah_disetujui, i.nama, i.stok
            FROM request_items ri JOIN items i ON i.id = ri.item_id
            WHERE ri.request_id = p_request_id
        LOOP
            IF v_baris.jumlah_disetujui < 0 OR v_baris.jumlah_disetujui > v_baris.jumlah_diminta THEN
                RAISE EXCEPTION 'Jumlah disetujui untuk "%" harus antara 0 dan %.',
                    v_baris.nama, v_baris.jumlah_diminta;
            END IF;
            IF v_baris.jumlah_disetujui > v_baris.stok THEN
                RAISE EXCEPTION 'Stok "%" saat ini hanya %, kurangi jumlah yang disetujui.',
                    v_baris.nama, v_baris.stok;
            END IF;
        END LOOP;

        IF NOT EXISTS (SELECT 1 FROM request_items
                       WHERE request_id = p_request_id AND jumlah_disetujui > 0) THEN
            RAISE EXCEPTION 'Minimal satu barang harus disetujui. Jika tidak ada, tolak permintaan ini.';
        END IF;

    ELSIF p_status_baru = 'ditolak' THEN
        IF v_status NOT IN ('menunggu', 'disetujui') THEN
            RAISE EXCEPTION 'Permintaan berstatus % tidak bisa ditolak.', v_status;
        END IF;
        IF p_catatan IS NULL OR length(trim(p_catatan)) = 0 THEN
            RAISE EXCEPTION 'Alasan penolakan wajib diisi.';
        END IF;

    ELSE
        RAISE EXCEPTION 'Status % tidak dikenal untuk aksi ini.', p_status_baru;
    END IF;

    UPDATE requests
    SET status = p_status_baru,
        catatan_admin = COALESCE(NULLIF(trim(p_catatan), ''), catatan_admin),
        handled_by = auth.uid(),
        ada_pembaruan = true
    WHERE id = p_request_id;

    INSERT INTO request_status_logs (request_id, status, catatan, changed_by)
    VALUES (p_request_id, p_status_baru, NULLIF(trim(p_catatan), ''), auth.uid());
END;
$$;

-- Admin menyerahkan barang. Di sinilah stok berkurang.
-- Gagal seluruhnya (tidak ada yang berubah) bila salah satu stok kurang.
CREATE OR REPLACE FUNCTION selesaikan_permintaan(
    p_request_id UUID,
    p_catatan    TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_status TEXT;
    v_nomor  TEXT;
    v_baris  RECORD;
BEGIN
    PERFORM wajib_admin();

    SELECT status, nomor INTO v_status, v_nomor
    FROM requests WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Permintaan tidak ditemukan.';
    END IF;
    IF v_status <> 'disetujui' THEN
        RAISE EXCEPTION 'Hanya permintaan yang sudah disetujui yang bisa diselesaikan.';
    END IF;

    -- Kunci baris barang berurutan menurut id agar tidak saling menunggu
    -- (deadlock) dengan transaksi lain.
    FOR v_baris IN
        SELECT ri.item_id, ri.jumlah_disetujui AS jumlah, i.nama, i.stok
        FROM request_items ri JOIN items i ON i.id = ri.item_id
        WHERE ri.request_id = p_request_id AND ri.jumlah_disetujui > 0
        ORDER BY ri.item_id
        FOR UPDATE OF i
    LOOP
        IF v_baris.stok < v_baris.jumlah THEN
            RAISE EXCEPTION 'Stok "%" tidak cukup: tersedia %, dibutuhkan %.',
                v_baris.nama, v_baris.stok, v_baris.jumlah;
        END IF;

        UPDATE items SET stok = v_baris.stok - v_baris.jumlah WHERE id = v_baris.item_id;

        INSERT INTO stock_movements
            (item_id, jenis, jumlah, saldo_sebelum, saldo_sesudah, tanggal, request_id, catatan, created_by)
        VALUES
            (v_baris.item_id, 'keluar', -v_baris.jumlah, v_baris.stok, v_baris.stok - v_baris.jumlah,
             hari_ini(), p_request_id, 'Penyerahan ' || v_nomor, auth.uid());
    END LOOP;

    UPDATE requests
    SET status = 'selesai', handled_by = auth.uid(), ada_pembaruan = true
    WHERE id = p_request_id;

    INSERT INTO request_status_logs (request_id, status, catatan, changed_by)
    VALUES (p_request_id, 'selesai',
            COALESCE(NULLIF(trim(p_catatan), ''), 'Barang sudah diserahkan'), auth.uid());
END;
$$;

-- Hilangkan badge notifikasi setelah pemohon membuka "Permintaan Saya".
CREATE OR REPLACE FUNCTION tandai_permintaan_dilihat()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE requests SET ada_pembaruan = false
    WHERE requester_id = auth.uid() AND ada_pembaruan;
$$;

-- Impor daftar barang dari Excel (misalnya Referensi Barang SAKTI).
--   p_kategori: [{"kode": "1010301001", "nama": "Alat Tulis"}, ...]
--   p_barang:   [{"kode_unik": "1010301001.000005", "kode_bmn": "1010301001",
--                 "nup": 5, "nama": "...", "kategori_kode": "1010301001",
--                 "satuan": "Buah", "stok": 10, "stok_minimum": 0, "lokasi": null}, ...]
-- Barang yang kode uniknya sudah ada dilewati, tidak ditimpa: perubahan stok
-- barang lama tetap harus lewat Barang Masuk atau Koreksi stok.
-- Satu transaksi: bila satu baris gagal, tidak ada yang tersimpan.
CREATE OR REPLACE FUNCTION impor_barang(p_kategori JSONB, p_barang JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_k        RECORD;
    v_b        RECORD;
    v_id_kat   BIGINT;
    v_item     UUID;
    v_baru     INTEGER := 0;
    v_dilewati INTEGER := 0;
    v_berstok  INTEGER := 0;
BEGIN
    PERFORM wajib_admin();

    IF p_barang IS NULL OR jsonb_array_length(p_barang) = 0 THEN
        RAISE EXCEPTION 'Tidak ada barang untuk diimpor.';
    END IF;
    IF jsonb_array_length(p_barang) > 5000 THEN
        RAISE EXCEPTION 'Maksimal 5.000 barang per impor. Bagi file menjadi beberapa bagian.';
    END IF;

    FOR v_k IN
        SELECT trim(e->>'kode') AS kode, trim(e->>'nama') AS nama
        FROM jsonb_array_elements(COALESCE(p_kategori, '[]'::JSONB)) AS e
    LOOP
        IF v_k.nama IS NULL OR v_k.nama = '' THEN
            RAISE EXCEPTION 'Nama kategori untuk kode % wajib diisi.', v_k.kode;
        END IF;
        BEGIN
            SELECT id INTO v_id_kat FROM categories WHERE kode = v_k.kode;
            IF FOUND THEN
                UPDATE categories SET nama = v_k.nama WHERE id = v_id_kat AND nama <> v_k.nama;
            ELSE
                -- Kategori yang dulu dibuat manual dengan nama sama, dipasangi kode.
                SELECT id INTO v_id_kat FROM categories WHERE lower(nama) = lower(v_k.nama) AND kode IS NULL;
                IF FOUND THEN
                    UPDATE categories SET kode = v_k.kode WHERE id = v_id_kat;
                ELSE
                    INSERT INTO categories (nama, kode) VALUES (v_k.nama, v_k.kode);
                END IF;
            END IF;
        EXCEPTION WHEN unique_violation THEN
            RAISE EXCEPTION 'Nama kategori "%" sudah dipakai kategori lain. Pilih nama lain untuk kode %.',
                v_k.nama, v_k.kode;
        END;
    END LOOP;

    FOR v_b IN
        SELECT * FROM jsonb_to_recordset(p_barang) AS x(
            kode_unik TEXT, kode_bmn TEXT, nup INTEGER, nama TEXT, kategori_kode TEXT,
            satuan TEXT, stok INTEGER, stok_minimum INTEGER, lokasi TEXT)
    LOOP
        IF v_b.stok < 0 OR v_b.stok_minimum < 0 THEN
            RAISE EXCEPTION 'Stok barang % tidak boleh negatif.', v_b.kode_unik;
        END IF;

        -- RETURNING INTO tidak mengosongkan variabel bila tidak ada baris baru.
        v_item := NULL;
        INSERT INTO items (kode_unik, kode_bmn, nup, nama, category_id, satuan, stok_minimum, lokasi)
        VALUES (
            upper(trim(v_b.kode_unik)),
            NULLIF(trim(v_b.kode_bmn), ''),
            v_b.nup,
            trim(v_b.nama),
            (SELECT id FROM categories WHERE kode = v_b.kategori_kode),
            COALESCE(NULLIF(trim(v_b.satuan), ''), 'unit'),
            COALESCE(v_b.stok_minimum, 0),
            NULLIF(trim(v_b.lokasi), '')
        )
        ON CONFLICT (kode_unik) DO NOTHING
        RETURNING id INTO v_item;

        IF v_item IS NULL THEN
            v_dilewati := v_dilewati + 1;
            CONTINUE;
        END IF;
        v_baru := v_baru + 1;

        IF COALESCE(v_b.stok, 0) > 0 THEN
            UPDATE items SET stok = v_b.stok WHERE id = v_item;
            INSERT INTO stock_movements
                (item_id, jenis, jumlah, saldo_sebelum, saldo_sesudah, tanggal, catatan, created_by)
            VALUES
                (v_item, 'masuk', v_b.stok, 0, v_b.stok, hari_ini(), 'Stok awal (impor Excel)', auth.uid());
            v_berstok := v_berstok + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('baru', v_baru, 'dilewati', v_dilewati, 'berstok', v_berstok);
END;
$$;

-- Angka ringkasan Dashboard admin. Tanpa SECURITY DEFINER: RLS tetap
-- berlaku, jadi hanya admin yang mendapat angka lengkap.
CREATE OR REPLACE FUNCTION ringkasan_dashboard()
RETURNS JSONB
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT jsonb_build_object(
        'menunggu', (SELECT count(*) FROM requests WHERE status = 'menunggu'),
        'disetujui', (SELECT count(*) FROM requests WHERE status = 'disetujui'),
        'menipis', (SELECT count(*) FROM items
                    WHERE is_active AND stok_minimum > 0 AND stok <= stok_minimum),
        'barang_aktif', (SELECT count(*) FROM items WHERE is_active),
        'mutasi_bulan_ini', (SELECT count(*) FROM stock_movements
                             WHERE tanggal >= date_trunc('month', hari_ini())::DATE)
    );
$$;

-- Barang aktif yang stoknya sama dengan atau di bawah stok minimum.
-- Supabase tidak bisa membandingkan dua kolom lewat filter biasa,
-- jadi perbandingannya dilakukan di sini.
CREATE OR REPLACE FUNCTION barang_stok_menipis(p_batas INTEGER DEFAULT 10)
RETURNS TABLE (id UUID, kode_unik TEXT, nama TEXT, satuan TEXT, stok INTEGER, stok_minimum INTEGER)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT id, kode_unik, nama, satuan, stok, stok_minimum
    FROM items
    WHERE is_active AND stok_minimum > 0 AND stok <= stok_minimum
    ORDER BY (stok::NUMERIC / stok_minimum), nama
    LIMIT p_batas;
$$;

-- Hak menjalankan fungsi: hanya pengguna yang sudah login.
REVOKE EXECUTE ON FUNCTION
    ringkasan_dashboard(), barang_stok_menipis(INTEGER),
    is_admin(), is_verified_user(), wajib_admin(),
    impor_barang(JSONB, JSONB),
    tambah_barang_masuk(UUID, INTEGER, TEXT, TEXT, TEXT, DATE),
    koreksi_stok(UUID, INTEGER, TEXT),
    buat_permintaan(TEXT, DATE, JSONB),
    batalkan_permintaan(UUID, TEXT),
    ubah_status_permintaan(UUID, TEXT, TEXT, JSONB),
    selesaikan_permintaan(UUID, TEXT),
    tandai_permintaan_dilihat()
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
    ringkasan_dashboard(), barang_stok_menipis(INTEGER),
    is_admin(), is_verified_user(),
    impor_barang(JSONB, JSONB),
    tambah_barang_masuk(UUID, INTEGER, TEXT, TEXT, TEXT, DATE),
    koreksi_stok(UUID, INTEGER, TEXT),
    buat_permintaan(TEXT, DATE, JSONB),
    batalkan_permintaan(UUID, TEXT),
    ubah_status_permintaan(UUID, TEXT, TEXT, JSONB),
    selesaikan_permintaan(UUID, TEXT),
    tandai_permintaan_dilihat()
TO authenticated;

-- Fungsi trigger, tidak untuk dipanggil langsung.
-- cegah_ubah_akun_sendiri dibuat di schema.sql (atau migrasi_002), jadi
-- jalankan file itu dulu sebelum file ini.
REVOKE EXECUTE ON FUNCTION set_updated_at(), handle_new_user(), cegah_ubah_akun_sendiri()
FROM PUBLIC, anon, authenticated;
