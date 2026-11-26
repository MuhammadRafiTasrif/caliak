import { useState } from 'react'

// Nomor halaman yang otomatis kembali ke 1 setiap kali filter berubah.
// kunciFilter: teks yang mewakili semua filter, misalnya `${cari}|${kategori}`.
export default function useHalaman(kunciFilter) {
  const [posisi, setPosisi] = useState({ kunci: kunciFilter, halaman: 1 })
  const halaman = posisi.kunci === kunciFilter ? posisi.halaman : 1

  return {
    halaman,
    keHalaman: (nomor) => setPosisi({ kunci: kunciFilter, halaman: nomor }),
    keAwal: () => setPosisi({ kunci: kunciFilter, halaman: 1 }),
  }
}
