import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AlertTriangle, ClipboardList, Loader2, PlusCircle } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import EmptyState from '../../components/EmptyState'
import Loading from '../../components/Loading'
import Modal from '../../components/Modal'
import ConfirmModal from '../../components/ConfirmModal'
import StatusBadge from '../../components/StatusBadge'
import RiwayatStatus from '../../components/permintaan/RiwayatStatus'
import { KepalaPermintaan, RincianBarang, ringkasBarang } from '../../components/permintaan/InfoPermintaan'
import { useAuth } from '../../context/AuthContext'
import { usePermintaan } from '../../context/PermintaanContext'
import { pesanError } from '../../lib/supabaseClient'
import { ambilPermintaanSaya, batalkanPermintaan, tandaiPermintaanDilihat } from '../../services/requestService'
import { formatTanggal } from '../../utils/format'

const UKURAN = 20

export default function PermintaanSaya() {
  const { user } = useAuth()
  const { muatUlangBadge } = usePermintaan()
  const [daftar, setDaftar] = useState([])
  const [total, setTotal] = useState(0)
  const [halaman, setHalaman] = useState(1)
  const [memuat, setMemuat] = useState(true)
  const [error, setError] = useState('')
  // Permintaan yang statusnya berubah sejak terakhir dibuka, ditandai di daftar.
  const [baruDiperbarui, setBaruDiperbarui] = useState(new Set())
  const [detail, setDetail] = useState(null)
  const [batal, setBatal] = useState(null)
  const [alasanBatal, setAlasanBatal] = useState('')
  const [membatalkan, setMembatalkan] = useState(false)

  const muat = useCallback(
    async (nomorHalaman = 1) => {
      setMemuat(true)
      setError('')
      try {
        const hasil = await ambilPermintaanSaya(user.id, { halaman: nomorHalaman, ukuran: UKURAN })
        setDaftar((lama) => (nomorHalaman === 1 ? hasil.data : [...lama, ...hasil.data]))
        setTotal(hasil.total)
        setHalaman(nomorHalaman)
        return hasil.data
      } catch (err) {
        setError(pesanError(err))
        return []
      } finally {
        setMemuat(false)
      }
    },
    [user.id],
  )

  // Saat halaman dibuka: muat daftar, ingat mana yang baru berubah,
  // lalu hapus badge di menu.
  useEffect(() => {
    muat(1).then((data) => {
      const berubah = data.filter((p) => p.ada_pembaruan).map((p) => p.id)
      if (berubah.length === 0) return
      setBaruDiperbarui(new Set(berubah))
      tandaiPermintaanDilihat().then(muatUlangBadge).catch(() => {})
    })
  }, [muat, muatUlangBadge])

  async function simpanBatal() {
    setMembatalkan(true)
    try {
      await batalkanPermintaan(batal.id, alasanBatal.trim())
      toast.success(`Permintaan ${batal.nomor} dibatalkan.`)
      setBatal(null)
      setDetail(null)
      setAlasanBatal('')
      muat(1)
    } catch (err) {
      toast.error(pesanError(err))
    } finally {
      setMembatalkan(false)
    }
  }

  return (
    <>
      <PageHeader
        judul="Permintaan Saya"
        keterangan="Pantau status permintaan barang yang Anda ajukan."
        aksi={
          <Link to="/permintaan/baru" className="btn-primer">
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            Buat permintaan
          </Link>
        }
      />

      {memuat && daftar.length === 0 ? (
        <div className="kartu"><Loading teks="Memuat permintaan Anda..." /></div>
      ) : error && daftar.length === 0 ? (
        <div className="kartu">
          <EmptyState ikon={AlertTriangle} judul="Daftar permintaan gagal dimuat" pesan={error}
            aksi={<button type="button" className="btn-sekunder" onClick={() => muat(1)}>Coba lagi</button>} />
        </div>
      ) : daftar.length === 0 ? (
        <div className="kartu">
          <EmptyState ikon={ClipboardList} judul="Belum ada permintaan"
            pesan="Permintaan yang Anda ajukan dari Katalog akan muncul di sini beserta statusnya."
            aksi={<Link to="/katalog" className="btn-primer">Buka Katalog</Link>} />
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {daftar.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => setDetail(p)}
                  className="kartu block w-full p-4 text-left transition-colors hover:border-primer-200 hover:bg-primer-50/40">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-slate-900">{p.nomor}</span>
                    <StatusBadge status={p.status} />
                    {baruDiperbarui.has(p.id) && (
                      <span className="text-xs font-semibold text-primer-700">Status baru diperbarui</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-slate-900">{ringkasBarang(p.rincian)}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Diajukan {formatTanggal(p.created_at)}, dibutuhkan {formatTanggal(p.tanggal_dibutuhkan)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
          {daftar.length < total && (
            <div className="mt-4 text-center">
              <button type="button" className="btn-sekunder" onClick={() => muat(halaman + 1)} disabled={memuat}>
                {memuat && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Tampilkan permintaan lebih lama
              </button>
            </div>
          )}
        </>
      )}

      <Modal terbuka={Boolean(detail)} onTutup={() => setDetail(null)} judul="Detail permintaan" lebar="max-w-2xl">
        {detail && (
          <div className="space-y-6">
            <KepalaPermintaan permintaan={detail} />
            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Barang</h3>
              <RincianBarang rincian={detail.rincian} />
            </section>
            <section>
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Riwayat status</h3>
              <RiwayatStatus requestId={detail.id} pemohonId={detail.requester_id} />
            </section>
            {detail.status === 'menunggu' && (
              <div className="border-t border-slate-100 pt-4">
                <button type="button" className="btn-sekunder w-full sm:w-auto" onClick={() => setBatal(detail)}>
                  Batalkan permintaan ini
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmModal
        terbuka={Boolean(batal)}
        judul={`Batalkan ${batal?.nomor ?? ''}?`}
        pesan="Permintaan yang dibatalkan tidak bisa diaktifkan lagi. Ajukan permintaan baru bila masih membutuhkan barangnya."
        labelKonfirmasi="Ya, batalkan"
        varian="bahaya"
        memproses={membatalkan}
        onKonfirmasi={simpanBatal}
        onBatal={() => setBatal(null)}
      >
        <label htmlFor="alasanBatal" className="label">Alasan (opsional)</label>
        <textarea id="alasanBatal" rows={2} value={alasanBatal} onChange={(e) => setAlasanBatal(e.target.value)} className="input" />
      </ConfirmModal>
    </>
  )
}
