-- CALIAK: skema database
-- Urutan menjalankan: schema.sql -> functions.sql -> policies.sql -> seed.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Profil pengguna. Satu baris per akun di auth.users, dibuat otomatis
-- oleh trigger di bagian bawah file ini.
CREATE TABLE profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nip         TEXT UNIQUE,
    nama        TEXT NOT NULL,
    unit_kerja  TEXT,
    role        TEXT NOT NULL DEFAULT 'pemohon' CHECK (role IN ('pemohon', 'admin')),
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categories (
    id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nama TEXT NOT NULL UNIQUE CHECK (length(trim(nama)) > 0)
);

-- Barang. Kolom stok hanya boleh diubah lewat fungsi di functions.sql.
-- kode_bmn dan nup diisi bila barang punya kode BMN resmi.
CREATE TABLE items (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode_unik    TEXT NOT NULL UNIQUE CHECK (length(trim(kode_unik)) > 0),
    kode_bmn     TEXT,
    nup          INTEGER CHECK (nup > 0),
    nama         TEXT NOT NULL CHECK (length(trim(nama)) > 0),
    category_id  BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    satuan       TEXT NOT NULL DEFAULT 'unit',
    stok         INTEGER NOT NULL DEFAULT 0 CHECK (stok >= 0),
    stok_minimum INTEGER NOT NULL DEFAULT 0 CHECK (stok_minimum >= 0),
    lokasi       TEXT,
    deskripsi    TEXT,
    foto_url     TEXT,
    is_active    BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Permintaan barang.
-- ada_pembaruan = true bila admin mengubah status dan pemohon belum
-- membuka halaman "Permintaan Saya". Dipakai untuk badge notifikasi.
CREATE TABLE requests (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomor              TEXT NOT NULL UNIQUE,
    requester_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    keperluan          TEXT NOT NULL CHECK (length(trim(keperluan)) > 0),
    tanggal_dibutuhkan DATE NOT NULL,
    status             TEXT NOT NULL DEFAULT 'menunggu'
                       CHECK (status IN ('menunggu', 'disetujui', 'ditolak', 'selesai', 'dibatalkan')),
    catatan_admin      TEXT,
    handled_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
    ada_pembaruan      BOOLEAN NOT NULL DEFAULT false,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE request_items (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_id       UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    item_id          UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    jumlah_diminta   INTEGER NOT NULL CHECK (jumlah_diminta > 0),
    jumlah_disetujui INTEGER CHECK (jumlah_disetujui >= 0),
    UNIQUE (request_id, item_id)
);

-- Riwayat status permintaan (append-only).
CREATE TABLE request_status_logs (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE RESTRICT,
    status     TEXT NOT NULL,
    catatan    TEXT,
    changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mutasi stok (append-only).
-- jumlah bertanda: positif untuk masuk, negatif untuk keluar,
-- dan bisa keduanya untuk koreksi.
CREATE TABLE stock_movements (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    item_id        UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    jenis          TEXT NOT NULL CHECK (jenis IN ('masuk', 'keluar', 'koreksi')),
    jumlah         INTEGER NOT NULL CHECK (jumlah <> 0),
    saldo_sebelum  INTEGER NOT NULL CHECK (saldo_sebelum >= 0),
    saldo_sesudah  INTEGER NOT NULL CHECK (saldo_sesudah >= 0),
    tanggal        DATE NOT NULL DEFAULT current_date,
    request_id     UUID REFERENCES requests(id) ON DELETE RESTRICT,
    dokumen_ref    TEXT,
    foto_bukti_url TEXT,
    catatan        TEXT,
    created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (saldo_sesudah = saldo_sebelum + jumlah),
    CHECK (jenis <> 'masuk' OR jumlah > 0),
    CHECK (jenis <> 'keluar' OR jumlah < 0)
);

-- Penghitung nomor permintaan per tahun (REQ-2026-0001, REQ-2026-0002, ...).
CREATE TABLE request_counters (
    tahun    INTEGER PRIMARY KEY,
    terakhir INTEGER NOT NULL
);

-- Index untuk kolom yang sering difilter.
CREATE INDEX items_category_idx          ON items (category_id);
CREATE INDEX items_aktif_nama_idx        ON items (is_active, nama);
CREATE INDEX requests_requester_idx      ON requests (requester_id, created_at DESC);
CREATE INDEX requests_status_idx         ON requests (status, created_at DESC);
CREATE INDEX requests_pembaruan_idx      ON requests (requester_id) WHERE ada_pembaruan;
CREATE INDEX request_items_request_idx   ON request_items (request_id);
CREATE INDEX request_items_item_idx      ON request_items (item_id);
CREATE INDEX status_logs_request_idx     ON request_status_logs (request_id, created_at);
CREATE INDEX movements_item_idx          ON stock_movements (item_id, created_at DESC);
CREATE INDEX movements_created_idx       ON stock_movements (created_at DESC);
CREATE INDEX movements_jenis_idx         ON stock_movements (jenis);
CREATE INDEX movements_request_idx       ON stock_movements (request_id);
CREATE INDEX profiles_verified_idx       ON profiles (is_verified);

-- updated_at otomatis
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER items_updated_at BEFORE UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER requests_updated_at BEFORE UPDATE ON requests
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Buat baris profiles saat user baru mendaftar.
-- Data NIP, nama, dan unit kerja dikirim dari form registrasi lewat
-- options.data di supabase.auth.signUp. Role selalu 'pemohon' dan
-- belum terverifikasi, apa pun isi metadata yang dikirim.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO profiles (id, nip, nama, unit_kerja)
    VALUES (
        NEW.id,
        NULLIF(trim(NEW.raw_user_meta_data->>'nip'), ''),
        COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'nama'), ''), split_part(NEW.email, '@', 1)),
        NULLIF(trim(NEW.raw_user_meta_data->>'unit_kerja'), '')
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
