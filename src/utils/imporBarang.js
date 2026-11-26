import { kodeDariBmn, rapikanSatuan } from './kodeBarang'

// Nama kolom yang dikenali (huruf besar/kecil diabaikan). Urutan pertama
// mengikuti laporan Referensi Barang SAKTI, sisanya nama yang umum dipakai.
const KOLOM = {
  kodeBarang: ['kd barang', 'kode barang', 'kd_barang', 'kode_barang', 'kode bmn'],
  kdBrng: ['kd brng', 'kode brng', 'kd_brng', 'nup', 'no urut'],
  nama: ['deskripsi', 'nama barang', 'nama', 'uraian'],
  satuan: ['satuan'],
  stok: ['stok', 'stok awal', 'saldo', 'jumlah', 'kuantitas'],
  stokMinimum: ['stok minimum', 'stok min'],
  lokasi: ['lokasi', 'lokasi penyimpanan'],
  kategori: ['kategori', 'nama kategori'],
}

// Baris judul dan kaki halaman yang ikut terbawa dari ekspor laporan SAKTI.
const BARIS_LAPORAN = /referensi barang|kode uakpb|uakpb\s*:|halaman\s*:|tanggal\s*:/i

function normal(teks) {
  return String(teks ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export async function bacaFileExcel(file) {
  // Dimuat saat dibutuhkan saja, agar halaman lain tidak ikut berat.
  const XLSX = await import('xlsx')
  const buku = XLSX.read(await file.arrayBuffer())
  const lembar = buku.Sheets[buku.SheetNames[0]]
  return XLSX.utils.sheet_to_json(lembar, { header: 1, raw: true, defval: '' })
}

function cariHeader(semuaBaris) {
  for (let i = 0; i < Math.min(semuaBaris.length, 40); i++) {
    const sel = semuaBaris[i].map(normal)
    const peta = {}
    for (const [kunci, nama] of Object.entries(KOLOM)) {
      const indeks = sel.findIndex((s) => nama.includes(s))
      if (indeks >= 0) peta[kunci] = indeks
    }
    if (peta.kodeBarang !== undefined && peta.nama !== undefined) return { baris: i, peta }
  }
  return null
}

// Mengubah isi lembar Excel menjadi daftar barang mentah.
export function olahBaris(semuaBaris) {
  const header = cariHeader(semuaBaris)
  if (!header) {
    throw new Error(
      'Kolom "Kd Barang" dan "Deskripsi" tidak ditemukan. Gunakan template CALIAK atau ekspor Referensi Barang dari SAKTI.',
    )
  }
  const { peta } = header
  const hasil = []

  for (let r = header.baris + 1; r < semuaBaris.length; r++) {
    const baris = semuaBaris[r]
    const ambil = (kunci) => (peta[kunci] === undefined ? '' : String(baris[peta[kunci]] ?? '').trim())

    if (baris.every((sel) => String(sel).trim() === '')) continue
    if (BARIS_LAPORAN.test(baris.join(' '))) continue
    // Header yang diulang di setiap halaman laporan.
    if (KOLOM.kodeBarang.includes(normal(ambil('kodeBarang')))) continue

    const kodeBarang = ambil('kodeBarang')
    const kdBrng = ambil('kdBrng')
    const nama = ambil('nama')
    if (!kodeBarang && !kdBrng && !nama) continue

    // Deskripsi panjang di laporan SAKTI kadang terpotong ke baris berikutnya
    // tanpa kode. Sambungkan ke barang sebelumnya.
    if (!kodeBarang && !kdBrng && nama && hasil.length > 0) {
      hasil[hasil.length - 1].nama += ` ${nama}`
      continue
    }

    hasil.push({
      baris: r + 1,
      kodeBarang,
      kdBrng,
      nama,
      satuan: ambil('satuan'),
      stok: ambil('stok'),
      stokMinimum: ambil('stokMinimum'),
      lokasi: ambil('lokasi'),
      kategori: ambil('kategori'),
    })
  }
  return hasil
}

function bacaBilangan(teks) {
  if (teks === '') return 0
  // "1.250" (format Indonesia) dibaca 1250.
  const bersih = /^\d{1,3}(\.\d{3})+$/.test(teks) ? teks.replace(/\./g, '') : teks
  const angka = Number(bersih)
  return Number.isInteger(angka) && angka >= 0 ? angka : null
}

// Memeriksa setiap baris. status: 'siap' | 'ada' (kode sudah terdaftar) | 'galat'.
export function periksaBaris(daftar, kodeTerdaftar) {
  const dipakai = new Map()

  return daftar.map((b) => {
    const galat = []
    const catatan = []
    const kodeDigit = b.kodeBarang.replace(/\D/g, '')
    const kodeUnik = kodeDariBmn(b.kodeBarang, b.kdBrng)

    if (kodeDigit.length !== 10) galat.push('Kd Barang harus 10 digit')
    if (!b.kdBrng) galat.push('Kd Brng kosong')
    else if (!kodeUnik && kodeDigit.length === 10) galat.push('Kd Brng harus angka 1 sampai 999999')
    if (!b.nama.trim()) galat.push('Deskripsi kosong')

    let satuan = rapikanSatuan(b.satuan)
    if (!satuan) {
      satuan = 'Unit'
      catatan.push('Satuan kosong, diisi Unit')
    }

    const stok = bacaBilangan(b.stok)
    const stokMinimum = bacaBilangan(b.stokMinimum)
    if (stok === null) galat.push('Stok harus bilangan bulat 0 atau lebih')
    if (stokMinimum === null) galat.push('Stok minimum harus bilangan bulat 0 atau lebih')

    if (kodeUnik) {
      if (dipakai.has(kodeUnik)) galat.push(`Kode sama dengan baris ${dipakai.get(kodeUnik)}`)
      else dipakai.set(kodeUnik, b.baris)
    }

    let status = 'siap'
    if (galat.length > 0) status = 'galat'
    else if (kodeTerdaftar.has(kodeUnik)) status = 'ada'

    return {
      baris: b.baris,
      status,
      galat,
      catatan,
      kodeUnik,
      kodeBarang: kodeDigit,
      nup: Number(b.kdBrng.replace(/\D/g, '')) || null,
      nama: b.nama.replace(/\s+/g, ' ').trim(),
      satuan,
      stok: stok ?? 0,
      stokMinimum: stokMinimum ?? 0,
      lokasi: b.lokasi,
      namaKategori: b.kategori,
    }
  })
}

// Satu kategori per Kd Barang 10 digit. Nama awal diambil dari kolom
// kategori di file, lalu dari kategori yang sudah ada di database,
// dan bila tidak ada, sementara memakai kodenya.
export function susunKategori(barisSiap, kategoriDb) {
  const namaDb = new Map(kategoriDb.filter((k) => k.kode).map((k) => [k.kode, k.nama]))
  const grup = new Map()
  for (const b of barisSiap) {
    const g = grup.get(b.kodeBarang) ?? { kode: b.kodeBarang, jumlah: 0, namaFile: '' }
    g.jumlah += 1
    if (!g.namaFile && b.namaKategori) g.namaFile = b.namaKategori
    grup.set(b.kodeBarang, g)
  }
  return [...grup.values()]
    .sort((a, b) => a.kode.localeCompare(b.kode))
    .map((g) => ({
      kode: g.kode,
      jumlah: g.jumlah,
      nama: g.namaFile || namaDb.get(g.kode) || g.kode,
      sudahAda: namaDb.has(g.kode),
      ikut: true,
    }))
}
