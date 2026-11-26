// Kode unik format SAKTI: Kd Barang 10 digit + Kd Brng/NUP 6 digit,
// misalnya 1010301001.000005. Kosong bila salah satu bagian tidak valid.
export function kodeDariBmn(kodeBarang, nup) {
  const digit = String(kodeBarang ?? '').replace(/\D/g, '')
  const urut = Number(String(nup ?? '').replace(/\D/g, '') || NaN)
  if (digit.length !== 10 || !Number.isInteger(urut) || urut <= 0 || urut > 999999) return ''
  return `${digit}.${String(urut).padStart(6, '0')}`
}

// "BUAH", "buah", " Buah " -> "Buah". Singkatan pendek seperti "FKP" dibiarkan.
export function rapikanSatuan(satuan) {
  const s = String(satuan ?? '').trim().replace(/\s+/g, ' ')
  if (!s || s === '-') return ''
  if (/^[A-Z]{2,3}$/.test(s)) return s
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}
