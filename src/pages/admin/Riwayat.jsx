import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { AlertTriangle, Download, History, ImageIcon, Loader2, Search, X } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import EmptyState from '../../components/EmptyState'
import Loading from '../../components/Loading'
import Penomoran from '../../components/Penomoran'
import StatusBadge, { LABEL_STATUS } from '../../components/StatusBadge'
import { KodeBarang } from '../../components/barang/TampilanBarang'
import { pesanError } from '../../lib/supabaseClient'
import { ambilBarang } from '../../services/itemService'
import { ambilHalamanMutasi, ambilSemuaMutasi } from '../../services/movementService'
import { ambilHalamanLogStatus, ambilSemuaLogStatus } from '../../services/requestService'
import { unduhExcel } from '../../utils/exportExcel'
import { formatAngka, formatTanggal, formatWaktu, hariIni } from '../../utils/format'
import useTunda from '../../utils/useTunda'
import useHalaman from '../../utils/useHalaman'

const UKURAN = 50
const LABEL_JENIS = { masuk: 'Masuk', keluar: 'Keluar', koreksi: 'Koreksi' }

export default function Riwayat() {
  const [tab, setTab] = useState('mutasi')

  return (
    <>
      <PageHeader
        judul="Riwayat"
        keterangan="Catatan permanen setiap perubahan stok dan status permintaan. Riwayat tidak bisa diubah atau dihapus."
      />
      <div className="mb-5 flex gap-2" role="tablist">
        {[
          ['mutasi', 'Mutasi barang'],
          ['permintaan', 'Riwayat permintaan'],
        ].map(([kunci, label]) => (
          <button key={kunci} type="button" role="tab" aria-selected={tab === kunci} onClick={() => setTab(kunci)}
            className={`min-h-11 rounded-lg px-4 text-sm font-medium ${
              tab === kunci ? 'bg-primer-700 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'mutasi' ? <TabMutasi /> : <TabPermintaan />}
    </>
  )
}

function FilterTanggal({ dari, sampai, setDari, setSampai }) {
  return (
    <>
      <div>
        <label htmlFor="dari" className="label">Dari tanggal</label>
        <input id="dari" type="date" value={dari} max={sampai || undefined} onChange={(e) => setDari(e.target.value)} className="input" />
      </div>
      <div>
        <label htmlFor="sampai" className="label">Sampai tanggal</label>
        <input id="sampai" type="date" value={sampai} min={dari || undefined} onChange={(e) => setSampai(e.target.value)} className="input" />
      </div>
    </>
  )
}

function TombolExport({ onExport, nonaktif }) {
  const [mengekspor, setMengekspor] = useState(false)
  async function jalankan() {
    setMengekspor(true)
    try {
      await onExport()
    } catch (err) {
      toast.error(`Export gagal: ${pesanError(err)}`)
    } finally {
      setMengekspor(false)
    }
  }
  return (
    <button type="button" className="btn-sekunder" onClick={jalankan} disabled={mengekspor || nonaktif}>
      {mengekspor ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
      {mengekspor ? 'Menyiapkan file...' : 'Export Excel'}
    </button>
  )
}

// Keterangan filter yang ikut dicetak di file Excel, supaya jelas data apa yang diekspor.
function lembarFilter(isi) {
  return {
    nama: 'Filter',
    baris: [['Diekspor dari CALIAK', formatWaktu(new Date())], ...isi.map(([k, v]) => [k, v || 'Semua'])],
    lebar: [22, 40],
  }
}

function TabMutasi() {
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')
  const [jenis, setJenis] = useState('')
  const [cari, setCari] = useState('')
  const cariTertunda = useTunda(cari)
  const { halaman, keHalaman } = useHalaman(`${dari}|${sampai}|${jenis}|${cariTertunda}`)

  const [daftar, setDaftar] = useState([])
  const [total, setTotal] = useState(0)
  const [memuat, setMemuat] = useState(true)
  const [error, setError] = useState('')

  // Pencarian barang diubah dulu menjadi daftar id barang yang cocok.
  async function saringan() {
    const saring = { tanggalDari: dari, tanggalSampai: sampai, jenis }
    if (cariTertunda.trim()) {
      const barang = await ambilBarang({ cari: cariTertunda, status: 'semua', batas: 100 })
      saring.itemIds = barang.map((b) => b.id)
    }
    return saring
  }

  const muat = useCallback(async () => {
    setMemuat(true)
    setError('')
    try {
      const saring = await saringan()
      if (saring.itemIds?.length === 0) {
        setDaftar([])
        setTotal(0)
        return
      }
      const hasil = await ambilHalamanMutasi({ ...saring, halaman, ukuran: UKURAN })
      setDaftar(hasil.data)
      setTotal(hasil.total)
    } catch (err) {
      setError(pesanError(err))
    } finally {
      setMemuat(false)
    }
    // saringan memakai nilai filter yang sudah ada di daftar dependensi.
  }, [dari, sampai, jenis, cariTertunda, halaman])

  useEffect(() => {
    muat()
  }, [muat])

  async function exportExcel() {
    const saring = await saringan()
    const data = saring.itemIds?.length === 0 ? [] : await ambilSemuaMutasi(saring)
    await unduhExcel(`riwayat-mutasi-${hariIni()}.xlsx`, [
      {
        nama: 'Mutasi',
        baris: [
          ['Tanggal', 'Waktu dicatat', 'Kode barang', 'Nama barang', 'Satuan', 'Jenis', 'Jumlah', 'Saldo sebelum',
            'Saldo sesudah', 'Pelaku', 'No. permintaan', 'Dokumen', 'Catatan', 'Foto bukti'],
          ...data.map((m) => [
            m.tanggal, formatWaktu(m.created_at), m.barang?.kode_unik, m.barang?.nama, m.barang?.satuan,
            LABEL_JENIS[m.jenis], m.jumlah, m.saldo_sebelum, m.saldo_sesudah, m.pelaku?.nama ?? '',
            m.permintaan?.nomor ?? '', m.dokumen_ref ?? '', m.catatan ?? '', m.foto_bukti_url ?? '',
          ]),
        ],
        lebar: [11, 18, 20, 40, 9, 9, 8, 12, 12, 22, 15, 24, 36, 30],
      },
      lembarFilter([
        ['Dari tanggal', dari],
        ['Sampai tanggal', sampai],
        ['Jenis', LABEL_JENIS[jenis]],
        ['Pencarian barang', cariTertunda],
        ['Jumlah baris', String(data.length)],
      ]),
    ])
    toast.success(`${formatAngka(data.length)} baris mutasi diekspor.`)
  }

  const adaFilter = Boolean(dari || sampai || jenis || cariTertunda)

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_10rem_auto] lg:items-end">
        <div>
          <label htmlFor="cariBarang" className="label">Barang</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <input id="cariBarang" type="search" value={cari} onChange={(e) => setCari(e.target.value)} className="input pl-9"
              placeholder="Nama atau kode barang" />
          </div>
        </div>
        <FilterTanggal dari={dari} sampai={sampai} setDari={setDari} setSampai={setSampai} />
        <div>
          <label htmlFor="jenis" className="label">Jenis</label>
          <select id="jenis" value={jenis} onChange={(e) => setJenis(e.target.value)} className="input">
            <option value="">Semua jenis</option>
            <option value="masuk">Masuk</option>
            <option value="keluar">Keluar</option>
            <option value="koreksi">Koreksi</option>
          </select>
        </div>
        <TombolExport onExport={exportExcel} nonaktif={total === 0} />
      </div>
      {adaFilter && (
        <button type="button" className="btn-sekunder mb-4" onClick={() => { setDari(''); setSampai(''); setJenis(''); setCari('') }}>
          <X className="h-4 w-4" aria-hidden="true" />
          Hapus semua filter
        </button>
      )}

      {memuat && daftar.length === 0 ? (
        <div className="kartu"><Loading teks="Memuat riwayat mutasi..." /></div>
      ) : error ? (
        <div className="kartu">
          <EmptyState ikon={AlertTriangle} judul="Riwayat mutasi gagal dimuat" pesan={error}
            aksi={<button type="button" className="btn-sekunder" onClick={muat}>Coba lagi</button>} />
        </div>
      ) : daftar.length === 0 ? (
        <div className="kartu">
          <EmptyState ikon={History} judul={adaFilter ? 'Tidak ada mutasi yang cocok' : 'Belum ada mutasi'}
            pesan={adaFilter ? 'Ubah atau hapus filter.' : 'Mutasi tercatat otomatis dari Barang Masuk, Koreksi stok, dan penyerahan permintaan.'} />
        </div>
      ) : (
        <>
          <p className="mb-2 text-sm text-slate-600" aria-live="polite">{formatAngka(total)} mutasi</p>
          <div className="kartu hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Tanggal</th>
                  <th scope="col" className="px-4 py-3 font-medium">Barang</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Jumlah</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Saldo</th>
                  <th scope="col" className="px-4 py-3 font-medium">Pelaku</th>
                  <th scope="col" className="px-4 py-3 font-medium">Referensi dan catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {daftar.map((m) => (
                  <tr key={m.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3">
                      <p className="text-slate-900">{formatTanggal(m.tanggal)}</p>
                      <p className="text-xs text-slate-600">{LABEL_JENIS[m.jenis]}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{m.barang?.nama}</p>
                      {m.barang && <KodeBarang kode={m.barang.kode_unik} />}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right"><Jumlah m={m} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700">
                      {formatAngka(m.saldo_sebelum)} menjadi <strong className="text-slate-900">{formatAngka(m.saldo_sesudah)}</strong>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {m.pelaku?.nama ?? '-'}
                      <p className="text-xs text-slate-600">{formatWaktu(m.created_at)}</p>
                    </td>
                    <td className="px-4 py-3"><Referensi m={m} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 lg:hidden">
            {daftar.map((m) => (
              <li key={m.id} className="kartu p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{m.barang?.nama}</p>
                    {m.barang && <KodeBarang kode={m.barang.kode_unik} />}
                  </div>
                  <Jumlah m={m} />
                </div>
                <p className="mt-2 text-slate-700">
                  {LABEL_JENIS[m.jenis]}, {formatTanggal(m.tanggal)}. Saldo {formatAngka(m.saldo_sebelum)} menjadi{' '}
                  <strong className="text-slate-900">{formatAngka(m.saldo_sesudah)}</strong>
                </p>
                <p className="mt-1 text-xs text-slate-600">Dicatat {m.pelaku?.nama ?? '-'}, {formatWaktu(m.created_at)}</p>
                <div className="mt-2"><Referensi m={m} /></div>
              </li>
            ))}
          </ul>

          <Penomoran halaman={halaman} total={total} ukuran={UKURAN} onPindah={keHalaman} sibuk={memuat} label="Halaman riwayat mutasi" />
        </>
      )}
    </>
  )
}

function Jumlah({ m }) {
  const positif = m.jumlah > 0
  return (
    <span className={`shrink-0 font-semibold tabular-nums ${positif ? 'text-emerald-700' : 'text-red-700'}`}>
      {positif ? '+' : ''}
      {formatAngka(m.jumlah)} {m.barang?.satuan}
    </span>
  )
}

function Referensi({ m }) {
  return (
    <div className="space-y-0.5 text-sm">
      {m.permintaan?.nomor && <p className="font-mono text-slate-900">{m.permintaan.nomor}</p>}
      {m.dokumen_ref && <p className="text-slate-900">{m.dokumen_ref}</p>}
      {m.catatan && <p className="text-slate-600">{m.catatan}</p>}
      {m.foto_bukti_url && (
        <a href={m.foto_bukti_url} target="_blank" rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-1 font-medium text-primer-700 hover:underline">
          <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Lihat foto bukti
        </a>
      )}
      {!m.permintaan?.nomor && !m.dokumen_ref && !m.catatan && !m.foto_bukti_url && <p className="text-slate-600">-</p>}
    </div>
  )
}

function TabPermintaan() {
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')
  const [status, setStatus] = useState('')
  const { halaman, keHalaman } = useHalaman(`${dari}|${sampai}|${status}`)

  const [daftar, setDaftar] = useState([])
  const [total, setTotal] = useState(0)
  const [memuat, setMemuat] = useState(true)
  const [error, setError] = useState('')

  const saring = { tanggalDari: dari, tanggalSampai: sampai, status }

  const muat = useCallback(async () => {
    setMemuat(true)
    setError('')
    try {
      const hasil = await ambilHalamanLogStatus({ tanggalDari: dari, tanggalSampai: sampai, status, halaman, ukuran: UKURAN })
      setDaftar(hasil.data)
      setTotal(hasil.total)
    } catch (err) {
      setError(pesanError(err))
    } finally {
      setMemuat(false)
    }
  }, [dari, sampai, status, halaman])

  useEffect(() => {
    muat()
  }, [muat])

  async function exportExcel() {
    const data = await ambilSemuaLogStatus(saring)
    await unduhExcel(`riwayat-permintaan-${hariIni()}.xlsx`, [
      {
        nama: 'Riwayat permintaan',
        baris: [
          ['Waktu', 'No. permintaan', 'Pemohon', 'Unit kerja', 'Status', 'Oleh', 'Catatan'],
          ...data.map((l) => [
            formatWaktu(l.created_at), l.permintaan?.nomor, l.permintaan?.pemohon?.nama ?? '',
            l.permintaan?.pemohon?.unit_kerja ?? '', LABEL_STATUS[l.status] ?? l.status, l.pengubah?.nama ?? '', l.catatan ?? '',
          ]),
        ],
        lebar: [18, 15, 26, 24, 12, 26, 40],
      },
      lembarFilter([
        ['Dari tanggal', dari],
        ['Sampai tanggal', sampai],
        ['Status', LABEL_STATUS[status]],
        ['Jumlah baris', String(data.length)],
      ]),
    ])
    toast.success(`${formatAngka(data.length)} baris riwayat diekspor.`)
  }

  const adaFilter = Boolean(dari || sampai || status)

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[auto_auto_12rem_auto] lg:items-end lg:justify-start">
        <FilterTanggal dari={dari} sampai={sampai} setDari={setDari} setSampai={setSampai} />
        <div>
          <label htmlFor="status" className="label">Status</label>
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} className="input">
            <option value="">Semua status</option>
            {Object.entries(LABEL_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <TombolExport onExport={exportExcel} nonaktif={total === 0} />
      </div>

      {memuat && daftar.length === 0 ? (
        <div className="kartu"><Loading teks="Memuat riwayat permintaan..." /></div>
      ) : error ? (
        <div className="kartu">
          <EmptyState ikon={AlertTriangle} judul="Riwayat permintaan gagal dimuat" pesan={error}
            aksi={<button type="button" className="btn-sekunder" onClick={muat}>Coba lagi</button>} />
        </div>
      ) : daftar.length === 0 ? (
        <div className="kartu">
          <EmptyState ikon={History} judul={adaFilter ? 'Tidak ada riwayat yang cocok' : 'Belum ada riwayat permintaan'}
            pesan={adaFilter ? 'Ubah atau hapus filter.' : 'Setiap pengajuan, persetujuan, penolakan, dan penyerahan tercatat di sini.'} />
        </div>
      ) : (
        <>
          <p className="mb-2 text-sm text-slate-600" aria-live="polite">{formatAngka(total)} perubahan status</p>
          <ul className="kartu divide-y divide-slate-100">
            {daftar.map((l) => (
              <li key={l.id} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[10rem_9rem_1fr] sm:gap-4">
                <span className="text-slate-600">{formatWaktu(l.created_at)}</span>
                <span className="flex items-center gap-2 sm:block">
                  <span className="font-mono font-semibold text-slate-900">{l.permintaan?.nomor}</span>
                  <span className="sm:mt-1 sm:block"><StatusBadge status={l.status} /></span>
                </span>
                <span>
                  <span className="text-slate-900">
                    Pemohon {l.permintaan?.pemohon?.nama ?? '-'}
                    {l.permintaan?.pemohon?.unit_kerja ? `, ${l.permintaan.pemohon.unit_kerja}` : ''}
                  </span>
                  <span className="block text-slate-600">Oleh {l.pengubah?.nama ?? '-'}</span>
                  {l.catatan && <span className="block text-slate-900">{l.catatan}</span>}
                </span>
              </li>
            ))}
          </ul>
          <Penomoran halaman={halaman} total={total} ukuran={UKURAN} onPindah={keHalaman} sibuk={memuat} label="Halaman riwayat permintaan" />
        </>
      )}
    </>
  )
}
