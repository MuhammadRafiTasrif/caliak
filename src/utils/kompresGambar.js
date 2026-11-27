export const TIPE_FOTO = ['image/jpeg', 'image/png', 'image/webp']
export const BATAS_FILE_ASLI = 10 * 1024 * 1024
export const BATAS_UNGGAH = 2 * 1024 * 1024

const SISI_TERPANJANG = 1600
const KUALITAS = 0.8

// Mengecilkan foto di browser sebelum diunggah: sisi terpanjang maksimal
// 1600px, disimpan sebagai WebP (atau JPEG bila browser tidak mendukung WebP).
// Melempar Error berbahasa Indonesia bila file tidak memenuhi syarat.
// Dipakai sebelum foto dibuka di jendela Potong foto, agar file yang salah
// langsung ditolak.
export function periksaFoto(file) {
  if (!TIPE_FOTO.includes(file.type)) {
    throw new Error('Format foto harus JPG, PNG, atau WebP.')
  }
  if (file.size > BATAS_FILE_ASLI) {
    throw new Error('Ukuran foto terlalu besar. Pilih foto di bawah 10 MB.')
  }
}

export async function kompresGambar(file) {
  periksaFoto(file)

  const gambar = await createImageBitmap(file)
  const skala = Math.min(1, SISI_TERPANJANG / Math.max(gambar.width, gambar.height))
  const kanvas = document.createElement('canvas')
  kanvas.width = Math.round(gambar.width * skala)
  kanvas.height = Math.round(gambar.height * skala)
  const ctx = kanvas.getContext('2d')
  // Latar putih agar PNG transparan tidak menjadi hitam saat diubah ke JPEG.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, kanvas.width, kanvas.height)
  ctx.drawImage(gambar, 0, 0, kanvas.width, kanvas.height)
  gambar.close()

  let hasil = await keBlob(kanvas, 'image/webp')
  // Safari lama tidak bisa membuat WebP dan diam-diam mengembalikan PNG.
  if (hasil.type !== 'image/webp') hasil = await keBlob(kanvas, 'image/jpeg')

  // Foto yang sudah kecil kadang justru membesar setelah dikompres.
  if (hasil.size > file.size && file.size <= BATAS_UNGGAH) return file

  if (hasil.size > BATAS_UNGGAH) {
    throw new Error('Foto masih lebih dari 2 MB setelah dikompres. Pilih foto lain.')
  }

  const ekstensi = hasil.type === 'image/webp' ? 'webp' : 'jpg'
  const namaDasar = file.name.replace(/\.[^.]+$/, '')
  return new File([hasil], `${namaDasar}.${ekstensi}`, { type: hasil.type })
}

function keBlob(kanvas, tipe) {
  return new Promise((resolve, reject) => {
    kanvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Foto gagal diproses.'))), tipe, KUALITAS)
  })
}
