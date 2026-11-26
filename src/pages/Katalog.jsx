import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Minus, PackageX, Plus, Search, SearchX } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import Loading from '../components/Loading'
import ItemCard from '../components/ItemCard'
import Penomoran from '../components/Penomoran'
import { useAuth } from '../context/AuthContext'
import { usePermintaan } from '../context/PermintaanContext'
import { pesanError } from '../lib/supabaseClient'
import { ambilHalamanBarang, ambilKategori } from '../services/itemService'
import { formatAngka } from '../utils/format'
import useTunda from '../utils/useTunda'
import useHalaman from '../utils/useHalaman'

const UKURAN_HALAMAN = 24

export default function Katalog() {
  const { isAdmin } = useAuth()
  const { keranjang } = usePermintaan()
  const [daftar, setDaftar] = useState([])
  const [total, setTotal] = useState(0)
  const [kategori, setKategori] = useState([])
  const [memuat, setMemuat] = useState(true)
  const [error, setError] = useState('')

  const [cari, setCari] = useState('')
  const [kategoriId, setKategoriId] = useState('')
  const [hanyaTersedia, setHanyaTersedia] = useState(true)
  const cariTertunda = useTunda(cari)
  const { halaman, keHalaman, keAwal } = useHalaman(`${cariTertunda}|${kategoriId}|${hanyaTersedia}`)

  const muat = useCallback(async () => {
    setMemuat(true)
    setError('')
    try {
      const hasil = await ambilHalamanBarang({
        cari: cariTertunda,
        kategoriId,
        hanyaTersedia,
        status: 'aktif',
        halaman,
        ukuran: UKURAN_HALAMAN,
      })
      setDaftar(hasil.data)
      setTotal(hasil.total)
    } catch (err) {
      if (err.code === 'PGRST103') keAwal()
      else setError(pesanError(err))
    } finally {
      setMemuat(false)
    }
    // keAwal sengaja tidak ikut: fungsinya dibuat ulang setiap render.
  }, [cariTertunda, kategoriId, hanyaTersedia, halaman])

  useEffect(() => {
    muat()
  }, [muat])

  useEffect(() => {
    ambilKategori().then(setKategori).catch(() => {})
  }, [])

  const jumlahDipilih = keranjang.length

  return (
    <div className={jumlahDipilih > 0 ? 'pb-24' : ''}>
      <PageHeader
        judul="Katalog Barang"
        keterangan="Pilih barang dan jumlahnya, lalu ajukan permintaan."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_14rem]">
        <div className="relative">
          <label htmlFor="cari" className="sr-only">Cari nama atau kode barang</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input id="cari" type="search" value={cari} onChange={(e) => setCari(e.target.value)} className="input pl-9"
            placeholder="Cari nama atau kode barang" />
        </div>
        <div>
          <label htmlFor="filterKategori" className="sr-only">Kategori</label>
          <select id="filterKategori" value={kategoriId} onChange={(e) => setKategoriId(e.target.value)} className="input">
            <option value="">Semua kategori</option>
            {kategori.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
        </div>
      </div>
      <label className="mb-4 inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={hanyaTersedia} onChange={(e) => setHanyaTersedia(e.target.checked)}
          className="h-5 w-5 accent-primer-700" />
        Hanya tampilkan barang yang tersedia
      </label>

      {memuat && daftar.length === 0 ? (
        <div className="kartu"><Loading teks="Memuat katalog barang..." /></div>
      ) : error ? (
        <div className="kartu">
          <EmptyState ikon={AlertTriangle} judul="Katalog gagal dimuat" pesan={error}
            aksi={<button type="button" className="btn-sekunder" onClick={muat}>Coba lagi</button>} />
        </div>
      ) : daftar.length === 0 ? (
        <div className="kartu">
          {cariTertunda || kategoriId ? (
            <EmptyState ikon={SearchX} judul="Tidak ada barang yang cocok"
              pesan={hanyaTersedia ? 'Coba kata lain, atau hilangkan centang "Hanya tampilkan barang yang tersedia".' : 'Coba kata pencarian atau kategori lain.'} />
          ) : (
            <EmptyState ikon={PackageX} judul={hanyaTersedia ? 'Belum ada barang yang tersedia' : 'Katalog masih kosong'}
              pesan={isAdmin ? 'Tambah stok lewat menu Barang Masuk.' : 'Admin belum mencatat stok barang. Hubungi pengelola barang.'} />
          )}
        </div>
      ) : (
        <>
          <p className="mb-2 text-sm text-slate-600" aria-live="polite">{formatAngka(total)} barang</p>
          {/* Kartu mendatar: sebagian besar barang dari SAKTI belum punya foto,
              jadi daftar padat lebih cepat dibaca daripada kotak foto besar. */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {daftar.map((b) => (
              <ItemCard key={b.id} barang={b} horizontal>
                <PilihBarang barang={b} />
              </ItemCard>
            ))}
          </div>
          <Penomoran halaman={halaman} total={total} ukuran={UKURAN_HALAMAN} onPindah={keHalaman} sibuk={memuat}
            label="Halaman katalog" />
        </>
      )}

      {jumlahDipilih > 0 && (
        // Admin: geser ke kanan selebar sidebar (w-72). Pemohon di HP: di atas menu bawah.
        <div className={`fixed inset-x-0 z-20 px-4 sm:px-6 ${
          isAdmin ? 'bottom-4 lg:pl-[calc(18rem+2.5rem)] lg:pr-10' : 'bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-4'
        }`}>
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-xl bg-primer-800 px-4 py-3 text-white shadow-lg" data-gelap>
            <p className="text-sm">
              <strong>{jumlahDipilih} barang</strong> dipilih
            </p>
            <Link to="/permintaan/baru" className="btn bg-white text-primer-800 hover:bg-primer-50">
              Lanjut ajukan
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// Tombol pilih, atau pengatur jumlah bila barang sudah ada di keranjang.
function PilihBarang({ barang }) {
  const { keranjang, tambahKeKeranjang, ubahJumlah, hapusDariKeranjang } = usePermintaan()
  const dipilih = keranjang.find((k) => k.id === barang.id)

  if (barang.stok === 0) {
    return <p className="text-center text-sm font-medium text-slate-600">Stok habis, belum bisa diminta</p>
  }

  if (!dipilih) {
    return (
      <button type="button" className="btn-sekunder w-full" onClick={() => tambahKeKeranjang(barang)}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Pilih barang ini
      </button>
    )
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm font-medium text-primer-800">Dipilih</span>
      <div className="flex items-center gap-1" role="group" aria-label={`Jumlah ${barang.nama}`}>
        <button type="button" className="btn-sekunder h-11 w-11 px-0"
          onClick={() => (dipilih.jumlah <= 1 ? hapusDariKeranjang(barang.id) : ubahJumlah(barang.id, dipilih.jumlah - 1))}
          aria-label={dipilih.jumlah <= 1 ? 'Batalkan pilihan' : 'Kurangi satu'}>
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-[3rem] text-center text-sm font-semibold tabular-nums" aria-live="polite">
          {dipilih.jumlah} {barang.satuan}
        </span>
        <button type="button" className="btn-sekunder h-11 w-11 px-0" disabled={dipilih.jumlah >= barang.stok}
          onClick={() => ubahJumlah(barang.id, dipilih.jumlah + 1)} aria-label="Tambah satu">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
