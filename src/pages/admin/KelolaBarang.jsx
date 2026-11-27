import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AlertTriangle, FileSpreadsheet, PackagePlus, Search, SearchX } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import EmptyState from '../../components/EmptyState'
import Loading from '../../components/Loading'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import ItemCard from '../../components/ItemCard'
import Penomoran from '../../components/Penomoran'
import FormBarang from '../../components/barang/FormBarang'
import KoreksiStok from '../../components/barang/KoreksiStok'
import { FotoBarang, KodeBarang, StokBarang } from '../../components/barang/TampilanBarang'
import { pesanError } from '../../lib/supabaseClient'
import { ambilHalamanBarang, ambilKategori, ubahStatusAktif } from '../../services/itemService'
import { formatAngka } from '../../utils/format'
import useTunda from '../../utils/useTunda'
import useHalaman from '../../utils/useHalaman'

const UKURAN_HALAMAN = 50

export default function KelolaBarang() {
  const [daftar, setDaftar] = useState([])
  const [total, setTotal] = useState(0)
  const [kategori, setKategori] = useState([])
  const [memuat, setMemuat] = useState(true)
  const [error, setError] = useState('')

  const [cari, setCari] = useState('')
  const [kategoriId, setKategoriId] = useState('')
  const [status, setStatus] = useState('aktif')
  const cariTertunda = useTunda(cari)

  const { halaman, keHalaman, keAwal } = useHalaman(`${cariTertunda}|${kategoriId}|${status}`)

  // undefined = tertutup, null = tambah barang baru, objek = ubah barang itu
  const [formBarang, setFormBarang] = useState(undefined)
  const [formSibuk, setFormSibuk] = useState(false)
  const [koreksi, setKoreksi] = useState(null)
  const [ubahAktif, setUbahAktif] = useState(null)
  const [memprosesAktif, setMemprosesAktif] = useState(false)

  const muat = useCallback(async () => {
    setMemuat(true)
    setError('')
    try {
      const hasil = await ambilHalamanBarang({ cari: cariTertunda, kategoriId, status, halaman, ukuran: UKURAN_HALAMAN })
      setDaftar(hasil.data)
      setTotal(hasil.total)
    } catch (err) {
      // Halaman terakhir bisa hilang setelah barang dinonaktifkan.
      if (err.code === 'PGRST103') keAwal()
      else setError(pesanError(err))
    } finally {
      setMemuat(false)
    }
    // keAwal sengaja tidak ikut: fungsinya dibuat ulang setiap render.
  }, [cariTertunda, kategoriId, status, halaman])

  useEffect(() => {
    muat()
  }, [muat])

  // Daftar kategori untuk filter dimuat ulang setiap form ditutup,
  // karena admin bisa menambah kategori dari dalam form.
  useEffect(() => {
    if (formBarang === undefined) ambilKategori().then(setKategori).catch(() => {})
  }, [formBarang])

  async function simpanStatusAktif() {
    setMemprosesAktif(true)
    try {
      await ubahStatusAktif(ubahAktif.id, !ubahAktif.is_active)
      toast.success(ubahAktif.is_active ? `${ubahAktif.nama} dinonaktifkan.` : `${ubahAktif.nama} diaktifkan kembali.`)
      setUbahAktif(null)
      muat()
    } catch (err) {
      toast.error(pesanError(err))
    } finally {
      setMemprosesAktif(false)
    }
  }

  const adaFilter = Boolean(cariTertunda || kategoriId || status !== 'aktif')

  const aksi = (b) => ({
    ubah: () => setFormBarang(b),
    koreksi: () => setKoreksi(b),
    aktif: () => setUbahAktif(b),
  })

  return (
    <>
      <PageHeader
        judul="Kelola Barang"
        keterangan="Tambah dan ubah data barang. Stok hanya berubah lewat Barang Masuk, Koreksi stok, dan penyerahan permintaan."
        aksi={
          <>
            <Link to="/admin/barang/impor" className="btn-sekunder">
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              Impor Excel
            </Link>
            <button type="button" className="btn-primer" onClick={() => setFormBarang(null)}>
              <PackagePlus className="h-4 w-4" aria-hidden="true" />
              Tambah barang
            </button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_12rem_10rem]">
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
        <div>
          <label htmlFor="filterStatus" className="sr-only">Status barang</label>
          <select id="filterStatus" value={status} onChange={(e) => setStatus(e.target.value)} className="input">
            <option value="aktif">Barang aktif</option>
            <option value="nonaktif">Nonaktif</option>
            <option value="semua">Semua status</option>
          </select>
        </div>
      </div>

      {memuat && daftar.length === 0 ? (
        <div className="kartu"><Loading teks="Memuat daftar barang..." /></div>
      ) : error ? (
        <div className="kartu">
          <EmptyState ikon={AlertTriangle} judul="Daftar barang gagal dimuat" pesan={error}
            aksi={<button type="button" className="btn-sekunder" onClick={muat}>Coba lagi</button>} />
        </div>
      ) : daftar.length === 0 ? (
        <div className="kartu">
          {adaFilter ? (
            <EmptyState ikon={SearchX} judul="Tidak ada barang yang cocok"
              pesan="Ubah kata pencarian atau filter kategori dan status." />
          ) : (
            <EmptyState ikon={PackagePlus} judul="Belum ada barang"
              pesan="Impor daftar barang dari Excel SAKTI, atau tambahkan barang satu per satu."
              aksi={
                <div className="flex flex-wrap justify-center gap-2">
                  <Link to="/admin/barang/impor" className="btn-primer">Impor Excel</Link>
                  <button type="button" className="btn-sekunder" onClick={() => setFormBarang(null)}>Tambah barang</button>
                </div>
              } />
          )}
        </div>
      ) : (
        <>
          <p className="mb-2 text-sm text-slate-600" aria-live="polite">
            {formatAngka(total)} barang
            {total > UKURAN_HALAMAN &&
              `, menampilkan ${formatAngka((halaman - 1) * UKURAN_HALAMAN + 1)} sampai ${formatAngka(
                Math.min(halaman * UKURAN_HALAMAN, total),
              )}`}
          </p>

          {/* Desktop: tabel */}
          <div className="kartu hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Barang</th>
                  <th scope="col" className="px-4 py-3 font-medium">Stok</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {daftar.map((b) => (
                  <tr key={b.id} className={b.is_active ? '' : 'bg-slate-50'}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <FotoBarang url={b.foto_url} nama={b.nama} className="h-11 w-11" />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">
                            {b.nama}
                            {!b.is_active && <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs font-medium text-slate-700">Nonaktif</span>}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-600">
                            <KodeBarang kode={b.kode_unik} />
                            <span>{b.kategori?.nama || 'Tanpa kategori'}</span>
                            {b.lokasi && <span>{b.lokasi}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3"><StokBarang barang={b} /></td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <TombolAksi barang={b} {...aksi(b)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* HP: kartu */}
          <div className="space-y-3 md:hidden">
            {daftar.map((b) => (
              <ItemCard key={b.id} barang={b} horizontal>
                {!b.is_active && <p className="mb-2 text-sm font-medium text-slate-700">Barang ini nonaktif</p>}
                <TombolAksi barang={b} {...aksi(b)} />
              </ItemCard>
            ))}
          </div>

          <Penomoran halaman={halaman} total={total} ukuran={UKURAN_HALAMAN} onPindah={keHalaman} sibuk={memuat}
            label="Halaman daftar barang" />
        </>
      )}

      <Modal
        terbuka={formBarang !== undefined}
        onTutup={() => setFormBarang(undefined)}
        judul={formBarang ? 'Ubah barang' : 'Tambah barang'}
        lebar="max-w-2xl"
        tutupDiLuar={false}
        terkunci={formSibuk}
      >
        {formBarang !== undefined && (
          <FormBarang
            barang={formBarang}
            onSibuk={setFormSibuk}
            onBatal={() => setFormBarang(undefined)}
            onSelesai={() => {
              setFormBarang(undefined)
              muat()
            }}
          />
        )}
      </Modal>

      {koreksi && (
        <KoreksiStok
          barang={koreksi}
          onBatal={() => setKoreksi(null)}
          onSelesai={() => {
            setKoreksi(null)
            muat()
          }}
        />
      )}

      <ConfirmModal
        terbuka={Boolean(ubahAktif)}
        judul={ubahAktif?.is_active ? 'Nonaktifkan barang?' : 'Aktifkan kembali barang?'}
        pesan={
          ubahAktif?.is_active
            ? `${ubahAktif?.nama} tidak akan tampil di katalog dan tidak bisa diminta. Data dan riwayatnya tetap tersimpan, dan barang bisa diaktifkan lagi kapan pun.`
            : `${ubahAktif?.nama} akan tampil kembali di katalog dan bisa diminta pegawai.`
        }
        labelKonfirmasi={ubahAktif?.is_active ? 'Ya, nonaktifkan' : 'Ya, aktifkan'}
        varian={ubahAktif?.is_active ? 'bahaya' : 'primer'}
        memproses={memprosesAktif}
        onKonfirmasi={simpanStatusAktif}
        onBatal={() => setUbahAktif(null)}
      />
    </>
  )
}

function TombolAksi({ barang, ubah, koreksi, aktif }) {
  return (
    <div className="flex flex-wrap gap-2 md:flex-nowrap md:justify-end">
      <button type="button" className="btn-sekunder px-3" onClick={ubah}>Ubah</button>
      {barang.is_active && (
        <button type="button" className="btn-sekunder px-3" onClick={koreksi}>Koreksi stok</button>
      )}
      <button type="button" className="btn-sekunder px-3" onClick={aktif}>
        {barang.is_active ? 'Nonaktifkan' : 'Aktifkan'}
      </button>
    </div>
  )
}
