// Memotong (dan memutar) foto sesuai area yang dipilih di jendela Potong foto.
// area: { x, y, width, height } dalam piksel, dari react-easy-crop.
// Hasilnya JPEG; pengecilan ukuran tetap dilakukan kompresGambar sesudahnya.

function muatGambar(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Foto gagal dibaca.'))
    img.src = url
  })
}

// Ukuran kotak yang memuat gambar setelah diputar.
function ukuranSetelahDiputar(lebar, tinggi, derajat) {
  const r = (derajat * Math.PI) / 180
  return {
    lebar: Math.abs(Math.cos(r) * lebar) + Math.abs(Math.sin(r) * tinggi),
    tinggi: Math.abs(Math.sin(r) * lebar) + Math.abs(Math.cos(r) * tinggi),
  }
}

export async function potongGambar(url, area, putar, namaAsli) {
  const img = await muatGambar(url)
  const kotak = ukuranSetelahDiputar(img.width, img.height, putar)

  // Gambar utuh yang sudah diputar, lalu ambil bagian yang dipilih.
  const kanvasPutar = document.createElement('canvas')
  kanvasPutar.width = Math.round(kotak.lebar)
  kanvasPutar.height = Math.round(kotak.tinggi)
  const ctx = kanvasPutar.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, kanvasPutar.width, kanvasPutar.height)
  ctx.translate(kanvasPutar.width / 2, kanvasPutar.height / 2)
  ctx.rotate((putar * Math.PI) / 180)
  ctx.drawImage(img, -img.width / 2, -img.height / 2)

  const hasil = document.createElement('canvas')
  hasil.width = Math.round(area.width)
  hasil.height = Math.round(area.height)
  hasil.getContext('2d').drawImage(kanvasPutar, area.x, area.y, area.width, area.height, 0, 0, hasil.width, hasil.height)

  const blob = await new Promise((resolve, reject) =>
    hasil.toBlob((b) => (b ? resolve(b) : reject(new Error('Foto gagal dipotong.'))), 'image/jpeg', 0.92),
  )
  const namaDasar = (namaAsli || 'foto').replace(/\.[^.]+$/, '')
  return new File([blob], `${namaDasar}.jpg`, { type: 'image/jpeg' })
}
