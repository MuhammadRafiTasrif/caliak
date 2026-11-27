-- Perbaikan data untuk permintaan yang disetujui SEBELUM functions.sql versi
-- "setujui = langsung diserahkan" dijalankan. Permintaan seperti itu berstatus
-- 'disetujui' tetapi stoknya belum berkurang, dan tombol penyerahan terpisah
-- sudah tidak ada di aplikasi.
--
-- Jalankan SETELAH functions.sql terbaru. Aman dijalankan ulang: permintaan
-- yang sudah punya mutasi keluar dilewati. Bila stok salah satu barang tidak
-- cukup, seluruh file dibatalkan dan pesan errornya menyebut barangnya.

DO $$
DECLARE
    v_req   RECORD;
    v_b     RECORD;
    v_jml   INTEGER := 0;
BEGIN
    FOR v_req IN
        SELECT r.id, r.nomor, r.handled_by
        FROM requests r
        WHERE r.status = 'disetujui'
          AND NOT EXISTS (SELECT 1 FROM stock_movements m WHERE m.request_id = r.id AND m.jenis = 'keluar')
        ORDER BY r.created_at
    LOOP
        FOR v_b IN
            SELECT ri.item_id, ri.jumlah_disetujui AS jumlah, i.nama, i.stok
            FROM request_items ri JOIN items i ON i.id = ri.item_id
            WHERE ri.request_id = v_req.id AND ri.jumlah_disetujui > 0
            ORDER BY ri.item_id
            FOR UPDATE OF i
        LOOP
            IF v_b.stok < v_b.jumlah THEN
                RAISE EXCEPTION 'Stok "%" tidak cukup untuk %: tersedia %, disetujui %. Catat barang masuk dulu, lalu jalankan ulang file ini.',
                    v_b.nama, v_req.nomor, v_b.stok, v_b.jumlah;
            END IF;

            UPDATE items SET stok = v_b.stok - v_b.jumlah WHERE id = v_b.item_id;

            INSERT INTO stock_movements
                (item_id, jenis, jumlah, saldo_sebelum, saldo_sesudah, tanggal, request_id, catatan, created_by)
            VALUES
                (v_b.item_id, 'keluar', -v_b.jumlah, v_b.stok, v_b.stok - v_b.jumlah, hari_ini(), v_req.id,
                 'Disetujui dan diserahkan ' || v_req.nomor || ' (penyesuaian versi lama)', v_req.handled_by);
        END LOOP;
        v_jml := v_jml + 1;
        RAISE NOTICE 'Stok untuk % sudah dikurangi.', v_req.nomor;
    END LOOP;

    RAISE NOTICE '% permintaan disesuaikan.', v_jml;
END $$;
