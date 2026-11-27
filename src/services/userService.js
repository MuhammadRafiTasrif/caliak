import { supabase } from '../lib/supabaseClient'

const KOLOM_PROFIL = 'id, email, nip, nama, unit_kerja, role, is_verified, created_at'

export async function ambilProfil(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nip, nama, unit_kerja, role, is_verified')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

// Untuk admin. status: 'menunggu' | 'terverifikasi' | 'admin' | ''
export async function ambilDaftarPengguna({ status = '', cari = '', halaman = 1, ukuran = 30 } = {}) {
  const dari = (halaman - 1) * ukuran
  let query = supabase.from('profiles').select(KOLOM_PROFIL, { count: 'exact' })
  if (status === 'menunggu') query = query.eq('is_verified', false)
  if (status === 'terverifikasi') query = query.eq('is_verified', true)
  if (status === 'admin') query = query.eq('role', 'admin')

  const kata = cari.replace(/[,()%]/g, ' ').trim()
  if (kata) query = query.or(`nama.ilike.%${kata}%,nip.ilike.%${kata}%,email.ilike.%${kata}%,unit_kerja.ilike.%${kata}%`)

  const { data, count, error } = await query
    .order('is_verified')
    .order('created_at', { ascending: false })
    .range(dari, dari + ukuran - 1)
  if (error) throw error
  return { data, total: count ?? 0 }
}

// perubahan: sebagian dari { nama, nip, unit_kerja, role, is_verified }
export async function ubahPengguna(id, perubahan) {
  const { error } = await supabase.from('profiles').update(perubahan).eq('id', id)
  if (error) throw error
}

// Hanya admin. Lewat fungsi database karena aplikasi tidak memegang kunci service role.
export async function aturUlangSandi(id, sandiBaru) {
  const { error } = await supabase.rpc('atur_ulang_sandi', { p_user_id: id, p_sandi_baru: sandiBaru })
  if (error) throw error
}

export async function hitungBelumVerifikasi() {
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_verified', false)
  if (error) throw error
  return count ?? 0
}
