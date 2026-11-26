import { supabase } from '../lib/supabaseClient'

// Semua perubahan stok lewat fungsi database (supabase/functions.sql),
// tidak pernah lewat update langsung ke tabel items.

export async function catatBarangMasuk({ itemId, jumlah, tanggal, dokumenRef, fotoBuktiUrl, catatan }) {
  const { data, error } = await supabase.rpc('tambah_barang_masuk', {
    p_item_id: itemId,
    p_jumlah: Number(jumlah),
    p_dokumen_ref: dokumenRef || null,
    p_foto_bukti_url: fotoBuktiUrl || null,
    p_catatan: catatan || null,
    p_tanggal: tanggal || null,
  })
  if (error) throw error
  return data // stok sesudah
}

export async function koreksiStok(itemId, stokBaru, alasan) {
  const { data, error } = await supabase.rpc('koreksi_stok', {
    p_item_id: itemId,
    p_stok_baru: Number(stokBaru),
    p_alasan: alasan,
  })
  if (error) throw error
  return data // stok sesudah
}

export async function ambilMutasiTerbaru({ jenis, batas = 10 } = {}) {
  let query = supabase
    .from('stock_movements')
    .select(
      'id, jenis, jumlah, saldo_sebelum, saldo_sesudah, tanggal, dokumen_ref, foto_bukti_url, catatan, created_at, barang:items(nama, kode_unik, satuan), pelaku:profiles(nama)',
    )
    .order('created_at', { ascending: false })
    .limit(batas)
  if (jenis) query = query.eq('jenis', jenis)
  const { data, error } = await query
  if (error) throw error
  return data
}
