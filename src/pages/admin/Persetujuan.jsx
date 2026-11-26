import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { AlertTriangle, CheckCheck, ClipboardCheck, PackageCheck, X } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import EmptyState from '../../components/EmptyState'
import Loading from '../../components/Loading'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import Penomoran from '../../components/Penomoran'
import StatusBadge, { LABEL_STATUS } from '../../components/StatusBadge'
import RiwayatStatus from '../../components/permintaan/RiwayatStatus'
import { KepalaPermintaan, RincianBarang, ringkasBarang } from '../../components/permintaan/InfoPermintaan'
import { KodeBarang } from '../../components/barang/TampilanBarang'
import { usePermintaan } from '../../context/PermintaanContext'
import { pesanError } from '../../lib/supabaseClient'
import {
  ambilDaftarPermintaan,
  ambilPermintaan,
  selesaikanPermintaan,
  setujuiPermintaan,
  tolakPermintaan,
} from '../../services/requestService'
import { formatAngka, formatTanggal } from '../../utils/format'
import useHalaman from '../../utils/useHalaman'

const UKURAN = 20
const FILTER_STATUS = ['menunggu', 'disetujui', 'selesai', 'ditolak', 'dibatalkan', '']

export default function Persetujuan() {
  const { menunggu, muatUlangBadge } = usePermintaan()
  const [status, setStatus] = useState('menunggu')
  const [tanggalDari, setTanggalDari] = useState('')
  const [tanggalSampai, setTanggalSampai] = useState('')
  const { halaman, keHalaman } = useHalaman(`${status}|${tanggalDari}|${tanggalSampai}`)

  const [daftar, setDaftar] = useState([])
  const [total, setTotal] = useState(0)
  const [memuat, setMemuat] = useState(true)
  const [error, setError] = useState('')
  const [dibukaId, setDibukaId] = useState(null)

  const muat = useCallback(async () => {
    setMemuat(true)
    setError('')
    try {
      const hasil = await ambilDaftarPermintaan({ status, tanggalDari, tanggalSampai, halaman, ukuran: UKURAN })
      setDaftar(hasil.data)
      setTotal(hasil.total)
    } catch (err) {
      setError(pesanError(err))
    } finally {
      setMemuat(false)
    }
  }, [status, tanggalDari, tanggalSampai, halaman])

  useEffect(() => {
    muat()
  }, [muat])

  function setelahAksi() {
    setDibukaId(null)
    muat()
    muatUlangBadge()
  }

  const adaFilterTanggal = Boolean(tanggalDari || tanggalSampai)

  return (
    <>
      <PageHeader
        judul="Persetujuan"
        keterangan="Setujui atau tolak permintaan, lalu tandai selesai saat barang diserahkan. Stok berkurang saat ditandai selesai."
      />

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter status">
        {FILTER_STATUS.map((s) => (
          <button key={s || 'semua'} type="button" role="tab" aria-selected={status === s} onClick={() => setStatus(s)}
            className={`min-h-11 rounded-lg px-3 text-sm font-medium ${
              status === s ? 'bg-primer-700 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}>
            {s ? LABEL_STATUS[s] : 'Semua'}
            {s === 'menunggu' && menunggu > 0 && ` (${formatAngka(menunggu)})`}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="dari" className="label">Diajukan dari</label>
          <input id="dari" type="date" value={tanggalDari} max={tanggalSampai || undefined}
            onChange={(e) => setTanggalDari(e.target.value)} className="input" />
        </div>
        <div>
          <label htmlFor="sampai" className="label">Sampai</label>
          <input id="sampai" type="date" value={tanggalSampai} min={tanggalDari || undefined}
            onChange={(e) => setTanggalSampai(e.target.value)} className="input" />
        </div>
        {adaFilterTanggal && (
          <button type="button" className="btn-sekunder" onClick={() => { setTanggalDari(''); setTanggalSampai('') }}>
            <X className="h-4 w-4" aria-hidden="true" />
            Hapus filter tanggal
          </button>
        )}
      </div>

      {memuat && daftar.length === 0 ? (
        <div className="kartu"><Loading teks="Memuat daftar permintaan..." /></div>
      ) : error ? (
        <div className="kartu">
          <EmptyState ikon={AlertTriangle} judul="Daftar permintaan gagal dimuat" pesan={error}
            aksi={<button type="button" className="btn-sekunder" onClick={muat}>Coba lagi</button>} />
        </div>
      ) : daftar.length === 0 ? (
        <div className="kartu">
          <EmptyState ikon={ClipboardCheck}
            judul={status === 'menunggu' && !adaFilterTanggal ? 'Tidak ada permintaan yang menunggu' : 'Tidak ada permintaan'}
            pesan={adaFilterTanggal ? 'Tidak ada permintaan pada rentang tanggal ini. Ubah atau hapus filter tanggal.' : 'Permintaan baru dari pegawai akan muncul di sini.'} />
        </div>
      ) : (
        <>
          <p className="mb-2 text-sm text-slate-600" aria-live="polite">{formatAngka(total)} permintaan</p>

          <div className="kartu hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Nomor</th>
                  <th scope="col" className="px-4 py-3 font-medium">Pemohon</th>
                  <th scope="col" className="px-4 py-3 font-medium">Barang</th>
                  <th scope="col" className="px-4 py-3 font-medium">Dibutuhkan</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {daftar.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      <p className="font-mono font-semibold text-slate-900">{p.nomor}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <StatusBadge status={p.status} />
                        <span className="text-xs text-slate-600">{formatTanggal(p.created_at)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{p.pemohon?.nama}</p>
                      <p className="text-xs text-slate-600">{p.pemohon?.unit_kerja}</p>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-slate-700">{ringkasBarang(p.rincian)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatTanggal(p.tanggal_dibutuhkan)}</td>
                    <td className="px-4 py-3 text-right">
                      <TombolBuka permintaan={p} onBuka={() => setDibukaId(p.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {daftar.map((p) => (
              <li key={p.id} className="kartu p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-slate-900">{p.nomor}</span>
                  <StatusBadge status={p.status} />
                </div>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {p.pemohon?.nama} <span className="font-normal text-slate-600">{p.pemohon?.unit_kerja}</span>
                </p>
                <p className="mt-1 text-sm text-slate-700">{ringkasBarang(p.rincian)}</p>
                <p className="mt-1 text-xs text-slate-600">
                  Diajukan {formatTanggal(p.created_at)}, dibutuhkan {formatTanggal(p.tanggal_dibutuhkan)}
                </p>
                <div className="mt-3">
                  <TombolBuka permintaan={p} onBuka={() => setDibukaId(p.id)} penuh />
                </div>
              </li>
            ))}
          </ul>

          <Penomoran halaman={halaman} total={total} ukuran={UKURAN} onPindah={keHalaman} sibuk={memuat}
            label="Halaman daftar permintaan" />
        </>
      )}

      {dibukaId && <DetailPersetujuan id={dibukaId} onTutup={() => setDibukaId(null)} onSelesai={setelahAksi} />}
    </>
  )
}

function TombolBuka({ permintaan, onBuka, penuh = false }) {
  const perluAksi = permintaan.status === 'menunggu' || permintaan.status === 'disetujui'
  return (
    <button type="button" onClick={onBuka} className={`${perluAksi ? 'btn-primer' : 'btn-sekunder'} ${penuh ? 'w-full' : ''}`}>
      {permintaan.status === 'menunggu' ? 'Periksa' : permintaan.status === 'disetujui' ? 'Serahkan' : 'Lihat'}
    </button>
  )
}

// Detail satu permintaan beserta aksi sesuai statusnya.
function DetailPersetujuan({ id, onTutup, onSelesai }) {
  const [p, setP] = useState(null)
  const [error, setError] = useState('')
  const [jumlah, setJumlah] = useState({})
  const [catatan, setCatatan] = useState('')
  const [aksi, setAksi] = useState(null) // 'setujui' | 'tolak' | 'selesai'
  const [alasanTolak, setAlasanTolak] = useState('')
  const [memproses, setMemproses] = useState(false)

  useEffect(() => {
    ambilPermintaan(id)
      .then((data) => {
        setP(data)
        // Usulan awal: sebanyak yang diminta, tetapi tidak melebihi stok.
        setJumlah(Object.fromEntries(data.rincian.map((r) => [r.item_id, Math.min(r.jumlah_diminta, r.barang?.stok ?? 0)])))
      })
      .catch((err) => setError(pesanError(err)))
  }, [id])

  async function jalankan() {
    setMemproses(true)
    try {
      if (aksi === 'setujui') {
        await setujuiPermintaan(p.id, p.rincian.map((r) => ({ item_id: r.item_id, jumlah: Number(jumlah[r.item_id]) })), catatan.trim())
        toast.success(`${p.nomor} disetujui. Tandai selesai saat barang diserahkan.`)
      } else if (aksi === 'tolak') {
        await tolakPermintaan(p.id, alasanTolak.trim())
        toast.success(`${p.nomor} ditolak.`)
      } else if (aksi === 'selesai') {
        await selesaikanPermintaan(p.id, catatan.trim())
        toast.success(`${p.nomor} selesai. Stok barang sudah dikurangi.`)
      }
      onSelesai()
    } catch (err) {
      toast.error(pesanError(err), { duration: 8000 })
      setAksi(null)
    } finally {
      setMemproses(false)
    }
  }

  const galatJumlah = {}
  if (p?.status === 'menunggu') {
    for (const r of p.rincian) {
      const n = Number(jumlah[r.item_id])
      if (jumlah[r.item_id] === '' || !Number.isInteger(n) || n < 0) galatJumlah[r.item_id] = 'Isi 0 atau lebih.'
      else if (n > r.jumlah_diminta) galatJumlah[r.item_id] = `Maksimal ${r.jumlah_diminta}.`
      else if (n > (r.barang?.stok ?? 0)) galatJumlah[r.item_id] = `Stok hanya ${r.barang?.stok ?? 0}.`
    }
  }
  const totalDisetujui = p ? p.rincian.reduce((s, r) => s + (Number(jumlah[r.item_id]) || 0), 0) : 0
  const bisaSetujui = p && Object.keys(galatJumlah).length === 0 && totalDisetujui > 0
  const stokKurang = p?.status === 'disetujui' ? p.rincian.filter((r) => (r.jumlah_disetujui ?? 0) > (r.barang?.stok ?? 0)) : []

  return (
    <>
      <Modal terbuka onTutup={onTutup} judul={p ? `Permintaan ${p.nomor}` : 'Permintaan'} lebar="max-w-3xl" terkunci={memproses}>
        {error ? (
          <p className="text-sm text-red-700">Permintaan gagal dimuat: {error}</p>
        ) : !p ? (
          <Loading teks="Memuat detail permintaan..." />
        ) : (
          <div className="space-y-6">
            <KepalaPermintaan permintaan={p} tampilkanPemohon />

            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Barang</h3>
              {p.status === 'menunggu' ? (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {p.rincian.map((r) => (
                    <li key={r.id} className="grid gap-3 px-4 py-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{r.barang?.nama ?? 'Barang sudah dinonaktifkan'}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-slate-600">
                          {r.barang && <KodeBarang kode={r.barang.kode_unik} />}
                          <span>Diminta {formatAngka(r.jumlah_diminta)}</span>
                          <span className={(r.barang?.stok ?? 0) < r.jumlah_diminta ? 'font-medium text-amber-900' : ''}>
                            Stok {formatAngka(r.barang?.stok ?? 0)} {r.barang?.satuan}
                          </span>
                        </div>
                      </div>
                      <div className="sm:w-36">
                        <label htmlFor={`setuju-${r.id}`} className="label">Disetujui</label>
                        <input id={`setuju-${r.id}`} type="number" min="0" max={Math.min(r.jumlah_diminta, r.barang?.stok ?? 0)}
                          step="1" inputMode="numeric" value={jumlah[r.item_id] ?? ''}
                          onChange={(e) => setJumlah((j) => ({ ...j, [r.item_id]: e.target.value === '' ? '' : Number(e.target.value) }))}
                          className={`input ${galatJumlah[r.item_id] ? 'input-error' : ''}`} />
                        {galatJumlah[r.item_id] && <p className="teks-error">{galatJumlah[r.item_id]}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <RincianBarang rincian={p.rincian} />
              )}
              {stokKurang.length > 0 && (
                <p className="mt-2 flex items-start gap-2 text-sm text-red-700" role="alert">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  Stok {stokKurang.map((r) => r.barang?.nama).join(', ')} tidak cukup untuk diserahkan. Catat barang masuk dulu,
                  atau tolak permintaan ini.
                </p>
              )}
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Riwayat status</h3>
              <RiwayatStatus requestId={p.id} pemohonId={p.requester_id} />
            </section>

            {(p.status === 'menunggu' || p.status === 'disetujui') && (
              <section className="space-y-3 border-t border-slate-100 pt-4">
                <div>
                  <label htmlFor="catatan" className="label">
                    {p.status === 'menunggu' ? 'Catatan untuk pemohon (opsional)' : 'Catatan penyerahan (opsional)'}
                  </label>
                  <textarea id="catatan" rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} className="input"
                    placeholder={p.status === 'menunggu' ? 'Contoh: ambil di ruang Subbagian Umum' : 'Contoh: diterima langsung oleh pemohon'} />
                </div>
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button type="button" className="btn-sekunder text-red-700" onClick={() => setAksi('tolak')}>
                    Tolak permintaan
                  </button>
                  {p.status === 'menunggu' ? (
                    <button type="button" className="btn-primer" onClick={() => setAksi('setujui')} disabled={!bisaSetujui}>
                      <CheckCheck className="h-4 w-4" aria-hidden="true" />
                      Setujui
                    </button>
                  ) : (
                    <button type="button" className="btn-sukses" onClick={() => setAksi('selesai')} disabled={stokKurang.length > 0}>
                      <PackageCheck className="h-4 w-4" aria-hidden="true" />
                      Tandai selesai (barang diserahkan)
                    </button>
                  )}
                </div>
                {p.status === 'menunggu' && !bisaSetujui && Object.keys(galatJumlah).length === 0 && (
                  <p className="text-right text-sm text-slate-600">Semua jumlah 0. Tolak permintaan bila tidak ada yang bisa diberikan.</p>
                )}
              </section>
            )}
          </div>
        )}
      </Modal>

      {p && (
        <>
          <ConfirmModal
            terbuka={aksi === 'setujui'}
            judul={`Setujui ${p.nomor}?`}
            pesan={`${p.rincian.filter((r) => Number(jumlah[r.item_id]) > 0).length} dari ${p.rincian.length} barang disetujui${
              p.rincian.some((r) => Number(jumlah[r.item_id]) < r.jumlah_diminta) ? ', sebagian dengan jumlah yang disesuaikan' : ''
            }. Stok belum berkurang sampai permintaan ditandai selesai.`}
            labelKonfirmasi="Ya, setujui"
            memproses={memproses}
            onKonfirmasi={jalankan}
            onBatal={() => setAksi(null)}
          />

          <ConfirmModal
            terbuka={aksi === 'tolak'}
            judul={`Tolak ${p.nomor}?`}
            pesan="Pemohon akan melihat alasan ini di halaman Permintaan Saya."
            labelKonfirmasi="Ya, tolak"
            varian="bahaya"
            memproses={memproses}
            konfirmasiNonaktif={!alasanTolak.trim()}
            onKonfirmasi={jalankan}
            onBatal={() => setAksi(null)}
          >
            <label htmlFor="alasanTolak" className="label">Alasan penolakan (wajib)</label>
            <textarea id="alasanTolak" rows={3} value={alasanTolak} onChange={(e) => setAlasanTolak(e.target.value)} className="input" />
          </ConfirmModal>

          <ConfirmModal
            terbuka={aksi === 'selesai'}
            judul="Barang sudah diserahkan?"
            labelKonfirmasi="Ya, tandai selesai"
            varian="sukses"
            memproses={memproses}
            onKonfirmasi={jalankan}
            onBatal={() => setAksi(null)}
          >
            <p className="text-sm text-slate-700">Stok berikut akan dikurangi dan tercatat sebagai mutasi keluar:</p>
            <ul className="mt-2 space-y-1 text-sm">
              {p.rincian.filter((r) => r.jumlah_disetujui > 0).map((r) => (
                <li key={r.id} className="flex justify-between gap-3">
                  <span className="text-slate-900">{r.barang?.nama}</span>
                  <span className="shrink-0 tabular-nums text-slate-700">
                    {formatAngka(r.barang?.stok ?? 0)} menjadi {formatAngka((r.barang?.stok ?? 0) - r.jumlah_disetujui)}
                  </span>
                </li>
              ))}
            </ul>
          </ConfirmModal>
        </>
      )}
    </>
  )
}
