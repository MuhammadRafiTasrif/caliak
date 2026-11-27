-- CALIAK: data contoh untuk mencoba aplikasi di database KOSONG.
-- Jalankan paling akhir: schema.sql -> functions.sql -> policies.sql -> seed.sql
--
-- Isi:
--   3 akun   admin@caliak.test     / Admin12345   (admin)
--            pegawai1@caliak.test  / Pegawai12345 (pemohon)
--            pegawai2@caliak.test  / Pegawai12345 (pemohon)
--   5 kategori, 15 barang (nama dari Referensi Barang SAKTI),
--   4 permintaan: menunggu, disetujui, selesai, ditolak.
--
-- Data ditulis langsung ke tabel (bukan lewat fungsi RPC, karena SQL Editor
-- tidak login sebagai admin), tetapi saldo stok dan mutasinya dibuat saling
-- cocok seperti bila dicatat lewat aplikasi.
--
-- Ganti kata sandi akun contoh, atau hapus akunnya, sebelum aplikasi dipakai sungguhan.

DO $$
DECLARE
    v_admin   UUID := gen_random_uuid();
    v_peg1    UUID := gen_random_uuid();
    v_peg2    UUID := gen_random_uuid();
    v_tahun   INTEGER := extract(year FROM hari_ini())::INTEGER;
    v_req     UUID;
    v_akun    RECORD;
    v_barang  RECORD;
    v_id      UUID;
BEGIN
    IF EXISTS (SELECT 1 FROM items) OR EXISTS (SELECT 1 FROM requests) THEN
        RAISE EXCEPTION 'Database sudah berisi barang atau permintaan. seed.sql hanya untuk database kosong.';
    END IF;

    -- Akun. Trigger handle_new_user otomatis membuat baris profiles.
    FOR v_akun IN
        SELECT * FROM (VALUES
            (v_admin, 'admin@caliak.test',    'Admin12345',   'Admin Contoh',        '199001012020121001', 'Subbagian Umum'),
            (v_peg1,  'pegawai1@caliak.test', 'Pegawai12345', 'Pegawai Contoh Satu', '199202022021122002', 'Fungsi Statistik Sosial'),
            (v_peg2,  'pegawai2@caliak.test', 'Pegawai12345', 'Pegawai Contoh Dua',  '199303032022031003', 'Fungsi Statistik Produksi')
        ) AS a(id, email, sandi, nama, nip, unit)
    LOOP
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
            confirmation_token, email_change, email_change_token_new, recovery_token)
        VALUES (
            '00000000-0000-0000-0000-000000000000', v_akun.id, 'authenticated', 'authenticated',
            v_akun.email, extensions.crypt(v_akun.sandi, extensions.gen_salt('bf')), now(),
            '{"provider": "email", "providers": ["email"]}'::JSONB,
            jsonb_build_object('nama', v_akun.nama, 'nip', v_akun.nip, 'unit_kerja', v_akun.unit),
            now(), now(), '', '', '', '');

        INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
        VALUES (gen_random_uuid(), v_akun.id::TEXT, v_akun.id,
                jsonb_build_object('sub', v_akun.id::TEXT, 'email', v_akun.email, 'email_verified', true),
                'email', now(), now(), now());
    END LOOP;

    UPDATE profiles SET is_verified = true WHERE id IN (v_admin, v_peg1, v_peg2);
    UPDATE profiles SET role = 'admin' WHERE id = v_admin;

    -- Nama kategori ini contoh. Sesuaikan dengan penamaan di instansi Anda.
    INSERT INTO categories (kode, nama) VALUES
        ('1010301001', 'Alat Tulis'),
        ('1010302001', 'Kertas'),
        ('1010302004', 'Amplop'),
        ('1010304004', 'Tinta dan Toner'),
        ('1010305008', 'Bahan Pembersih');

    -- Barang dan stok awal. Setiap stok awal > 0 dicatat sebagai mutasi masuk.
    FOR v_barang IN
        SELECT * FROM (VALUES
            ('1010301001', 5,   'Ballpoint Pilot',               'Buah', 120, 20, 'Lemari ATK, rak 1'),
            ('1010301001', 33,  'Pensil 2B Faber-Castell',       'Buah', 60,  10, 'Lemari ATK, rak 1'),
            ('1010301001', 48,  'Spidol Whiteboard',             'Buah', 24,  6,  'Lemari ATK, rak 2'),
            ('1010301001', 45,  'Stabilo 5 Warna',               'Buah', 4,   5,  'Lemari ATK, rak 2'),
            ('1010301001', 38,  'Isi Stapless No 10',            'Kotak', 30, 5,  'Lemari ATK, rak 2'),
            ('1010302001', 1,   'Kertas HVS A4',                 'Rim',  40,  10, 'Gudang, rak kertas'),
            ('1010302001', 2,   'Kertas HVS F4',                 'Rim',  25,  10, 'Gudang, rak kertas'),
            ('1010302001', 14,  'Kertas A3 80 gram',             'Rim',  2,   2,  'Gudang, rak kertas'),
            ('1010302004', 7,   'Amplop Dinas Kecil Berkop BPS', 'Buah', 200, 50, 'Lemari ATK, rak 3'),
            ('1010302004', 8,   'Amplop Dinas Folio Berkop BPS', 'Buah', 150, 50, 'Lemari ATK, rak 3'),
            ('1010304004', 82,  'Tinta EPSON 008 Black',         'Buah', 6,   2,  'Lemari tinta'),
            ('1010304004', 79,  'Tinta EPSON 008 Cyan',          'Buah', 1,   2,  'Lemari tinta'),
            ('1010304004', 88,  'Toner HP 89A',                  'Pcs',  0,   1,  'Lemari tinta'),
            ('1010305008', 5,   'Hand Soap Carex',               'Buah', 12,  4,  'Gudang kebersihan'),
            ('1010305008', 8,   'Tissue Isi 250 sheets',         'Buah', 30,  10, 'Gudang kebersihan')
        ) AS b(kode, nup, nama, satuan, stok, minimum, lokasi)
    LOOP
        INSERT INTO items (kode_unik, kode_bmn, nup, nama, category_id, satuan, stok, stok_minimum, lokasi)
        VALUES (v_barang.kode || '.' || lpad(v_barang.nup::TEXT, 6, '0'), v_barang.kode, v_barang.nup, v_barang.nama,
                (SELECT id FROM categories WHERE kode = v_barang.kode), v_barang.satuan,
                v_barang.stok, v_barang.minimum, v_barang.lokasi)
        RETURNING id INTO v_id;

        IF v_barang.stok > 0 THEN
            INSERT INTO stock_movements (item_id, jenis, jumlah, saldo_sebelum, saldo_sesudah, tanggal,
                                         dokumen_ref, catatan, created_by, created_at)
            VALUES (v_id, 'masuk', v_barang.stok, 0, v_barang.stok, hari_ini() - 14,
                    'Data contoh', 'Stok awal (data contoh)', v_admin, now() - interval '14 days');
        END IF;
    END LOOP;

    -- Permintaan 1: menunggu persetujuan.
    INSERT INTO requests (nomor, requester_id, keperluan, tanggal_dibutuhkan, status, created_at, updated_at)
    VALUES ('REQ-' || v_tahun || '-0001', v_peg1, 'Kebutuhan ATK rapat koordinasi bulanan',
            hari_ini() + 3, 'menunggu', now() - interval '1 hour', now() - interval '1 hour')
    RETURNING id INTO v_req;
    INSERT INTO request_items (request_id, item_id, jumlah_diminta)
    SELECT v_req, id, CASE nama WHEN 'Ballpoint Pilot' THEN 5 ELSE 2 END
    FROM items WHERE nama IN ('Ballpoint Pilot', 'Kertas HVS A4');
    INSERT INTO request_status_logs (request_id, status, catatan, changed_by, created_at)
    VALUES (v_req, 'menunggu', 'Permintaan diajukan', v_peg1, now() - interval '1 hour');

    -- Permintaan 2: disetujui, tinta disetujui sebagian karena stoknya tinggal 1.
    INSERT INTO requests (nomor, requester_id, keperluan, tanggal_dibutuhkan, status, catatan_admin,
                          handled_by, ada_pembaruan, created_at, updated_at)
    VALUES ('REQ-' || v_tahun || '-0002', v_peg2, 'Pengolahan dokumen survei di ruang produksi',
            hari_ini() + 1, 'disetujui', 'Tinta Cyan tersisa 1, disetujui 1.', v_admin, true,
            now() - interval '1 day', now() - interval '20 hours')
    RETURNING id INTO v_req;
    INSERT INTO request_items (request_id, item_id, jumlah_diminta, jumlah_disetujui)
    SELECT v_req, id,
           CASE nama WHEN 'Spidol Whiteboard' THEN 4 ELSE 2 END,
           CASE nama WHEN 'Spidol Whiteboard' THEN 4 ELSE 1 END
    FROM items WHERE nama IN ('Spidol Whiteboard', 'Tinta EPSON 008 Cyan');
    INSERT INTO request_status_logs (request_id, status, catatan, changed_by, created_at) VALUES
        (v_req, 'menunggu', 'Permintaan diajukan', v_peg2, now() - interval '1 day'),
        (v_req, 'disetujui', 'Tinta Cyan tersisa 1, disetujui 1.', v_admin, now() - interval '20 hours');

    -- Permintaan 3: selesai. Stok berkurang dan tercatat sebagai mutasi keluar.
    INSERT INTO requests (nomor, requester_id, keperluan, tanggal_dibutuhkan, status, handled_by,
                          created_at, updated_at)
    VALUES ('REQ-' || v_tahun || '-0003', v_peg1, 'Surat undangan dan ATK pelatihan petugas',
            hari_ini() - 5, 'selesai', v_admin, now() - interval '7 days', now() - interval '5 days')
    RETURNING id INTO v_req;
    INSERT INTO request_items (request_id, item_id, jumlah_diminta, jumlah_disetujui)
    SELECT v_req, id, j, j
    FROM items JOIN (VALUES ('Amplop Dinas Kecil Berkop BPS', 50), ('Ballpoint Pilot', 10)) AS x(n, j) ON x.n = items.nama;
    INSERT INTO request_status_logs (request_id, status, catatan, changed_by, created_at) VALUES
        (v_req, 'menunggu', 'Permintaan diajukan', v_peg1, now() - interval '7 days'),
        (v_req, 'disetujui', NULL, v_admin, now() - interval '6 days'),
        (v_req, 'selesai', 'Barang sudah diserahkan', v_admin, now() - interval '5 days');

    FOR v_barang IN
        SELECT i.id, i.stok, ri.jumlah_disetujui AS jumlah
        FROM request_items ri JOIN items i ON i.id = ri.item_id
        WHERE ri.request_id = v_req
    LOOP
        INSERT INTO stock_movements (item_id, jenis, jumlah, saldo_sebelum, saldo_sesudah, tanggal,
                                     request_id, catatan, created_by, created_at)
        VALUES (v_barang.id, 'keluar', -v_barang.jumlah, v_barang.stok, v_barang.stok - v_barang.jumlah,
                hari_ini() - 5, v_req, 'Penyerahan REQ-' || v_tahun || '-0003', v_admin, now() - interval '5 days');
        UPDATE items SET stok = v_barang.stok - v_barang.jumlah WHERE id = v_barang.id;
    END LOOP;

    -- Permintaan 4: ditolak karena stok kosong.
    INSERT INTO requests (nomor, requester_id, keperluan, tanggal_dibutuhkan, status, catatan_admin,
                          handled_by, created_at, updated_at)
    VALUES ('REQ-' || v_tahun || '-0004', v_peg2, 'Penggantian toner printer ruang tata usaha',
            hari_ini() - 2, 'ditolak', 'Stok toner kosong. Sedang diproses pengadaannya.', v_admin,
            now() - interval '3 days', now() - interval '2 days')
    RETURNING id INTO v_req;
    INSERT INTO request_items (request_id, item_id, jumlah_diminta)
    SELECT v_req, id, 1 FROM items WHERE nama = 'Toner HP 89A';
    INSERT INTO request_status_logs (request_id, status, catatan, changed_by, created_at) VALUES
        (v_req, 'menunggu', 'Permintaan diajukan', v_peg2, now() - interval '3 days'),
        (v_req, 'ditolak', 'Stok toner kosong. Sedang diproses pengadaannya.', v_admin, now() - interval '2 days');

    INSERT INTO request_counters (tahun, terakhir) VALUES (v_tahun, 4);

    RAISE NOTICE 'Data contoh dibuat. Masuk dengan admin@caliak.test / Admin12345.';
END $$;
