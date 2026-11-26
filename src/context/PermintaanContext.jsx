import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { hitungMenunggu, hitungPembaruanSaya } from '../services/requestService'

// Dua hal yang dipakai lintas halaman:
//   1. keranjang permintaan (barang yang dipilih dari Katalog),
//   2. angka badge di menu (status yang berubah, dan antrean persetujuan).
const PermintaanContext = createContext(null)

// Keranjang disimpan di browser per pengguna, supaya tidak hilang saat
// halaman dimuat ulang. Bila penyimpanan browser diblokir, keranjang
// tetap jalan, hanya tidak diingat.
function bacaKeranjang(kunci) {
  try {
    const isi = JSON.parse(localStorage.getItem(kunci) || '[]')
    return Array.isArray(isi) ? isi : []
  } catch {
    return []
  }
}

export function PermintaanProvider({ children }) {
  const { user } = useAuth()
  const kunci = `caliak-keranjang-${user?.id ?? 'tamu'}`
  // `key` membuat isi provider dipasang ulang saat pengguna berganti,
  // sehingga keranjang pengguna lain tidak pernah terbawa.
  return (
    <PenyediaPermintaan key={kunci} kunci={kunci}>
      {children}
    </PenyediaPermintaan>
  )
}

function PenyediaPermintaan({ kunci, children }) {
  const { user, isAdmin } = useAuth()
  const lokasi = useLocation()

  // Isi keranjang: [{ id, nama, kode_unik, satuan, stok, foto_url, jumlah }]
  const [keranjang, setKeranjang] = useState(() => bacaKeranjang(kunci))
  const [pembaruan, setPembaruan] = useState(0)
  const [menunggu, setMenunggu] = useState(0)

  useEffect(() => {
    try {
      localStorage.setItem(kunci, JSON.stringify(keranjang))
    } catch {
      // Penyimpanan browser tidak tersedia, keranjang hanya bertahan di halaman ini.
    }
  }, [kunci, keranjang])

  const muatUlangBadge = useCallback(async () => {
    if (!user) return
    try {
      setPembaruan(await hitungPembaruanSaya(user.id))
      if (isAdmin) setMenunggu(await hitungMenunggu())
    } catch {
      // Badge hanya penanda. Bila gagal dimuat, menu tetap bisa dipakai.
    }
  }, [user, isAdmin])

  // Diperbarui setiap pindah halaman.
  useEffect(() => {
    muatUlangBadge()
  }, [muatUlangBadge, lokasi.pathname])

  function tambahKeKeranjang(barang, jumlah = 1) {
    setKeranjang((isi) => {
      const ada = isi.find((b) => b.id === barang.id)
      if (ada) return isi.map((b) => (b.id === barang.id ? { ...b, jumlah: Math.min(b.jumlah + jumlah, barang.stok) } : b))
      const { id, nama, kode_unik, satuan, stok, foto_url } = barang
      return [...isi, { id, nama, kode_unik, satuan, stok, foto_url, jumlah: Math.min(jumlah, stok) }]
    })
  }

  function ubahJumlah(id, jumlah) {
    setKeranjang((isi) => isi.map((b) => (b.id === id ? { ...b, jumlah } : b)))
  }

  function hapusDariKeranjang(id) {
    setKeranjang((isi) => isi.filter((b) => b.id !== id))
  }

  const nilai = {
    keranjang,
    setKeranjang,
    tambahKeKeranjang,
    ubahJumlah,
    hapusDariKeranjang,
    kosongkanKeranjang: () => setKeranjang([]),
    pembaruan,
    menunggu,
    muatUlangBadge,
  }

  return <PermintaanContext.Provider value={nilai}>{children}</PermintaanContext.Provider>
}

export function usePermintaan() {
  const ctx = useContext(PermintaanContext)
  if (!ctx) throw new Error('usePermintaan harus dipakai di dalam <PermintaanProvider>')
  return ctx
}
