import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// false bila file .env belum diisi. App.jsx lalu menampilkan petunjuk
// pengaturan, bukan layar kosong.
export const supabaseSiap = Boolean(url && anonKey)

export const supabase = supabaseSiap ? createClient(url, anonKey) : null

// Ubah pesan error Supabase menjadi kalimat yang bisa dibaca pengguna.
// Pesan dari fungsi RPC (RAISE EXCEPTION) sudah berbahasa Indonesia,
// jadi diteruskan apa adanya.
export function pesanError(error) {
  if (!error) return ''
  const pesan = error.message || String(error)

  if (pesan.includes('Invalid login credentials')) return 'Email atau kata sandi salah.'
  if (pesan.includes('Email not confirmed')) return 'Email belum dikonfirmasi. Cek kotak masuk email Anda.'
  if (pesan.includes('User already registered')) return 'Email ini sudah terdaftar. Silakan masuk.'
  if (pesan.includes('Password should be at least')) return 'Kata sandi minimal 6 karakter.'
  if (pesan.includes('profiles_nip_key')) return 'NIP ini sudah terdaftar.'
  if (pesan.includes('items_kode_unik_key')) return 'Kode unik sudah dipakai barang lain.'
  if (pesan.includes('Failed to fetch')) return 'Tidak dapat terhubung ke server. Periksa koneksi internet.'
  if (pesan.includes('row-level security') || pesan.includes('permission denied')) {
    return 'Anda tidak punya hak untuk melakukan aksi ini.'
  }
  return pesan
}
