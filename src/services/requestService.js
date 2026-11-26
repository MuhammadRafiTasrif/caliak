import { supabase } from '../lib/supabaseClient'

// requests punya dua relasi ke profiles (pemohon dan admin yang menangani),
// jadi nama relasinya harus disebut: requests_requester_id_fkey.
const KOLOM_PERMINTAAN = `
  id, nomor, requester_id, keperluan, tanggal_dibutuhkan, status, catatan_admin, ada_pembaruan, created_at, updated_at,
  pemohon:profiles!requests_requester_id_fkey(nama, nip, unit_kerja),
  rincian:request_items(id, item_id, jumlah_diminta, jumlah_disetujui,
    barang:items(nama, kode_unik, satuan, stok, foto_url))
`

// Pembuatan dan perubahan status lewat fungsi database (supabase/functions.sql).

// items: [{ item_id, jumlah }]
export async function buatPermintaan({ keperluan, tanggalDibutuhkan, items }) {
  const { data, error } = await supabase.rpc('buat_permintaan', {
    p_keperluan: keperluan,
    p_tanggal_dibutuhkan: tanggalDibutuhkan,
    p_items: items,
  })
  if (error) throw error
  return data // id permintaan baru
}

export async function batalkanPermintaan(id, catatan) {
  const { error } = await supabase.rpc('batalkan_permintaan', { p_request_id: id, p_catatan: catatan || null })
  if (error) throw error
}

// jumlah: [{ item_id, jumlah }]
export async function setujuiPermintaan(id, jumlah, catatan) {
  const { error } = await supabase.rpc('ubah_status_permintaan', {
    p_request_id: id,
    p_status_baru: 'disetujui',
    p_catatan: catatan || null,
    p_jumlah_disetujui: jumlah,
  })
  if (error) throw error
}

export async function tolakPermintaan(id, alasan) {
  const { error } = await supabase.rpc('ubah_status_permintaan', {
    p_request_id: id,
    p_status_baru: 'ditolak',
    p_catatan: alasan,
  })
  if (error) throw error
}

export async function selesaikanPermintaan(id, catatan) {
  const { error } = await supabase.rpc('selesaikan_permintaan', { p_request_id: id, p_catatan: catatan || null })
  if (error) throw error
}

export async function tandaiPermintaanDilihat() {
  const { error } = await supabase.rpc('tandai_permintaan_dilihat')
  if (error) throw error
}

// Permintaan milik pengguna yang login (RLS membatasi ke miliknya sendiri,
// tetapi admin juga bisa melihat semua, jadi tetap disaring per pemohon).
export async function ambilPermintaanSaya(userId, { halaman = 1, ukuran = 20 } = {}) {
  const dari = (halaman - 1) * ukuran
  const { data, count, error } = await supabase
    .from('requests')
    .select(KOLOM_PERMINTAAN, { count: 'exact' })
    .eq('requester_id', userId)
    .order('created_at', { ascending: false })
    .range(dari, dari + ukuran - 1)
  if (error) throw error
  return { data, total: count ?? 0 }
}

// Untuk admin. tanggalDari/tanggalSampai berformat 2026-11-27 (WIB).
export async function ambilDaftarPermintaan({ status, tanggalDari, tanggalSampai, halaman = 1, ukuran = 20 } = {}) {
  const dari = (halaman - 1) * ukuran
  let query = supabase.from('requests').select(KOLOM_PERMINTAAN, { count: 'exact' })
  if (status) query = query.eq('status', status)
  if (tanggalDari) query = query.gte('created_at', `${tanggalDari}T00:00:00+07:00`)
  if (tanggalSampai) query = query.lte('created_at', `${tanggalSampai}T23:59:59.999+07:00`)
  const { data, count, error } = await query
    .order('created_at', { ascending: status === 'menunggu' })
    .range(dari, dari + ukuran - 1)
  if (error) throw error
  return { data, total: count ?? 0 }
}

export async function ambilPermintaan(id) {
  const { data, error } = await supabase.from('requests').select(KOLOM_PERMINTAAN).eq('id', id).single()
  if (error) throw error
  return data
}

export async function ambilRiwayatStatus(requestId) {
  const { data, error } = await supabase
    .from('request_status_logs')
    .select('id, status, catatan, created_at, changed_by, pengubah:profiles(nama)')
    .eq('request_id', requestId)
    .order('created_at')
  if (error) throw error
  return data
}

export async function hitungPembaruanSaya(userId) {
  const { count, error } = await supabase
    .from('requests')
    .select('id', { count: 'exact', head: true })
    .eq('requester_id', userId)
    .eq('ada_pembaruan', true)
  if (error) throw error
  return count ?? 0
}

export async function hitungMenunggu() {
  const { count, error } = await supabase
    .from('requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'menunggu')
  if (error) throw error
  return count ?? 0
}
