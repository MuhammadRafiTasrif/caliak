import { supabase } from '../lib/supabaseClient'

const BUCKET = 'foto-barang'
const KOLOM_BARANG =
  'id, kode_unik, kode_bmn, nup, nama, category_id, satuan, stok, stok_minimum, lokasi, deskripsi, foto_url, is_active, updated_at, kategori:categories(id, nama)'

export async function ambilKategori() {
  const { data, error } = await supabase.from('categories').select('id, nama').order('nama')
  if (error) throw error
  return data
}

export async function tambahKategori(nama) {
  const { data, error } = await supabase.from('categories').insert({ nama: nama.trim() }).select('id, nama').single()
  if (error) {
    if (error.code === '23505') throw new Error('Kategori dengan nama ini sudah ada.')
    throw error
  }
  return data
}

// status: 'aktif' | 'nonaktif' | 'semua'
function saringBarang(query, { cari = '', kategoriId = '', status = 'aktif' }) {
  if (status === 'aktif') query = query.eq('is_active', true)
  if (status === 'nonaktif') query = query.eq('is_active', false)
  if (kategoriId) query = query.eq('category_id', kategoriId)

  // Koma dan tanda kurung punya arti khusus di filter or() Supabase, jadi dibuang.
  const kata = cari.replace(/[,()%]/g, ' ').trim()
  if (kata) query = query.or(`nama.ilike.%${kata}%,kode_unik.ilike.%${kata}%`)
  return query
}

// Untuk kotak pencarian: beberapa hasil teratas saja.
export async function ambilBarang({ batas = 8, ...saring } = {}) {
  const query = saringBarang(supabase.from('items').select(KOLOM_BARANG), saring).order('nama').limit(batas)
  const { data, error } = await query
  if (error) throw error
  return data
}

// Untuk daftar panjang: per halaman, beserta jumlah total yang cocok.
// Supabase membatasi 1.000 baris per permintaan, jadi daftar barang
// selalu diambil per halaman.
export async function ambilHalamanBarang({ halaman = 1, ukuran = 50, ...saring } = {}) {
  const dari = (halaman - 1) * ukuran
  const query = saringBarang(supabase.from('items').select(KOLOM_BARANG, { count: 'exact' }), saring)
    .order('nama')
    .order('kode_unik')
    .range(dari, dari + ukuran - 1)
  const { data, count, error } = await query
  if (error) throw error
  return { data, total: count ?? 0 }
}

// Semua kode unik yang sudah terdaftar, diambil per 1.000.
export async function ambilSemuaKodeUnik() {
  const kode = new Set()
  for (let dari = 0; ; dari += 1000) {
    const { data, error } = await supabase.from('items').select('kode_unik').order('kode_unik').range(dari, dari + 999)
    if (error) throw error
    data.forEach((b) => kode.add(b.kode_unik))
    if (data.length < 1000) return kode
  }
}

export async function ambilKategoriLengkap() {
  const { data, error } = await supabase.from('categories').select('id, nama, kode').order('nama')
  if (error) throw error
  return data
}

export async function imporBarang(kategori, barang) {
  const { data, error } = await supabase.rpc('impor_barang', { p_kategori: kategori, p_barang: barang })
  if (error) throw error
  return data // { baru, dilewati, berstok }
}

export function rapikanKode(kode) {
  return kode.trim().toUpperCase().replace(/\s+/g, '')
}

// true bila kode sudah dipakai barang lain.
export async function kodeSudahDipakai(kode, kecualiId) {
  let query = supabase.from('items').select('id').eq('kode_unik', rapikanKode(kode)).limit(1)
  if (kecualiId) query = query.neq('id', kecualiId)
  const { data, error } = await query
  if (error) throw error
  return data.length > 0
}

// Kode internal, misalnya BRG-2026-7KQ2. Dicek ke database sampai
// mendapat kode yang belum dipakai.
export async function buatKodeOtomatis() {
  const tahun = new Date().getFullYear()
  for (let percobaan = 0; percobaan < 5; percobaan++) {
    const acak = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, '0')
    const kode = `BRG-${tahun}-${acak}`
    if (!(await kodeSudahDipakai(kode))) return kode
  }
  throw new Error('Gagal membuat kode otomatis. Coba lagi.')
}

// Kolom stok sengaja tidak ikut: hanya bisa diubah lewat fungsi database.
function dataBarang(form) {
  return {
    kode_unik: rapikanKode(form.kodeUnik),
    kode_bmn: form.kodeBmn ? form.kodeBmn.replace(/\D/g, '') : null,
    nup: form.nup ? Number(form.nup) : null,
    nama: form.nama.trim(),
    category_id: form.kategoriId ? Number(form.kategoriId) : null,
    satuan: form.satuan.trim(),
    stok_minimum: Number(form.stokMinimum || 0),
    lokasi: form.lokasi.trim() || null,
    deskripsi: form.deskripsi.trim() || null,
    foto_url: form.fotoUrl || null,
  }
}

export async function simpanBarang(form, id) {
  const query = id
    ? supabase.from('items').update(dataBarang(form)).eq('id', id)
    : supabase.from('items').insert(dataBarang(form))
  const { data, error } = await query.select(KOLOM_BARANG).single()
  if (error) {
    if (error.code === '23505') throw new Error('Kode unik sudah dipakai barang lain.')
    throw error
  }
  return data
}

export async function ubahStatusAktif(id, aktif) {
  const { error } = await supabase.from('items').update({ is_active: aktif }).eq('id', id)
  if (error) throw error
}

// folder: 'barang' untuk foto barang, 'bukti' untuk foto bukti barang masuk.
export async function unggahFoto(file, folder) {
  const ekstensi = file.name.split('.').pop().toLowerCase()
  const path = `${folder}/${crypto.randomUUID()}.${ekstensi}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type })
  if (error) {
    if (error.message?.includes('exceeded the maximum')) throw new Error('Ukuran foto melebihi 2 MB.')
    throw error
  }
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

// Dipakai saat foto diganti atau saat penyimpanan gagal setelah foto
// terunggah. Kegagalan di sini tidak mengganggu pengguna, jadi hanya dicatat.
export async function hapusFoto(url) {
  const penanda = `/${BUCKET}/`
  if (!url || !url.includes(penanda)) return
  const path = url.split(penanda)[1]
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) console.warn('Foto lama gagal dihapus:', error.message)
}
