import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowDownToLine, ClipboardCheck, PackageCheck } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Loading from '../../components/Loading'
import EmptyState from '../../components/EmptyState'
import StatusBadge from '../../components/StatusBadge'
import { KodeBarang } from '../../components/barang/TampilanBarang'
import { ringkasBarang } from '../../components/permintaan/InfoPermintaan'
import { pesanError } from '../../lib/supabaseClient'
import { ambilDaftarPermintaan, ambilRingkasanDashboard } from '../../services/requestService'
import { ambilBarangStokMenipis } from '../../services/itemService'
import { formatAngka, formatTanggal, hariIni } from '../../utils/format'

export default function Dashboard() {
  const [ringkasan, setRingkasan] = useState(null)
  const [terbaru, setTerbaru] = useState([])
  const [menipis, setMenipis] = useState([])
  const [error, setError] = useState('')

  const muat = useCallback(async () => {
    setError('')
    try {
      const [r, p, m] = await Promise.all([
        ambilRingkasanDashboard(),
        ambilDaftarPermintaan({ ukuran: 5 }),
        ambilBarangStokMenipis(8),
      ])
      setRingkasan(r)
      setTerbaru(p.data)
      setMenipis(m)
    } catch (err) {
      setError(pesanError(err))
    }
  }, [])

  useEffect(() => {
    muat()
  }, [muat])

  const header = <PageHeader judul="Dashboard" keterangan={`Kondisi per ${formatTanggal(hariIni())}.`} />

  if (error) {
    return (
      <>
        {header}
        <div className="kartu">
          <EmptyState ikon={AlertTriangle} judul="Dashboard gagal dimuat"
            pesan={error.includes('ringkasan_dashboard') ? 'Fungsi database untuk Dashboard belum dipasang. Jalankan ulang supabase/functions.sql.' : error}
            aksi={<button type="button" className="btn-sekunder" onClick={muat}>Coba lagi</button>} />
        </div>
      </>
    )
  }
  if (!ringkasan) {
    return (
      <>
        {header}
        <div className="kartu"><Loading teks="Menghitung ringkasan..." /></div>
      </>
    )
  }

  return (
    <>
      {header}

      {/* Fokus utama: antrean yang menunggu tindakan admin. */}
      <section className="grid gap-4 md:grid-cols-2" aria-label="Antrean tindakan">
        <Link to="/admin/persetujuan" data-gelap
          className="group flex items-center justify-between gap-4 rounded-xl bg-primer-800 p-5 text-white hover:bg-primer-900">
          <div>
            <p className="text-sm text-primer-100">Permintaan menunggu persetujuan</p>
            <p className="mt-1 text-4xl font-bold tabular-nums">{formatAngka(ringkasan.menunggu)}</p>
            <p className="mt-2 text-sm font-medium group-hover:underline">
              {ringkasan.menunggu > 0 ? 'Periksa sekarang' : 'Tidak ada antrean'}
            </p>
          </div>
          <ClipboardCheck className="h-10 w-10 shrink-0 text-primer-200" aria-hidden="true" />
        </Link>
        <Link to="/admin/persetujuan?status=disetujui"
          className="kartu group flex items-center justify-between gap-4 p-5 hover:border-primer-200">
          <div>
            <p className="text-sm text-slate-600">Disetujui, menunggu diserahkan</p>
            <p className="mt-1 text-4xl font-bold tabular-nums text-slate-900">{formatAngka(ringkasan.disetujui)}</p>
            <p className="mt-2 text-sm font-medium text-primer-700 group-hover:underline">Buka daftar penyerahan</p>
          </div>
          <PackageCheck className="h-10 w-10 shrink-0 text-slate-400" aria-hidden="true" />
        </Link>
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-3" aria-label="Ringkasan barang">
        <Angka label="Barang stok menipis" nilai={ringkasan.menipis} ke="/admin/barang-masuk" tautan="Catat barang masuk"
          peringatan={ringkasan.menipis > 0} />
        <Angka label="Barang aktif" nilai={ringkasan.barang_aktif} ke="/admin/barang" tautan="Kelola barang" />
        <Angka label="Mutasi bulan ini" nilai={ringkasan.mutasi_bulan_ini} ke="/admin/riwayat" tautan="Lihat riwayat" />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="kartu" aria-labelledby="judul-terbaru">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <h2 id="judul-terbaru" className="font-semibold text-slate-900">5 permintaan terbaru</h2>
            <Link to="/admin/persetujuan" className="inline-flex min-h-11 items-center text-sm font-medium text-primer-700 hover:underline">
              Semua permintaan
            </Link>
          </div>
          {terbaru.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-600">Belum ada permintaan dari pegawai.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {terbaru.map((p) => (
                <li key={p.id} className="px-5 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-semibold text-slate-900">{p.nomor}</span>
                    <StatusBadge status={p.status} />
                    <span className="text-xs text-slate-600">{formatTanggal(p.created_at)}</span>
                  </div>
                  <p className="mt-1 text-slate-900">{p.pemohon?.nama}: {ringkasBarang(p.rincian)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="kartu" aria-labelledby="judul-menipis">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <h2 id="judul-menipis" className="font-semibold text-slate-900">Stok menipis</h2>
            <Link to="/admin/barang-masuk" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primer-700 hover:underline">
              <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />
              Barang masuk
            </Link>
          </div>
          {menipis.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-600">
              Tidak ada barang di bawah stok minimum. Barang dengan stok minimum 0 tidak dipantau.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {menipis.map((b) => (
                <li key={b.id} className="flex items-start justify-between gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{b.nama}</p>
                    <KodeBarang kode={b.kode_unik} />
                  </div>
                  <p className="shrink-0 text-right tabular-nums">
                    <span className={`font-semibold ${b.stok === 0 ? 'text-red-700' : 'text-amber-900'}`}>
                      {formatAngka(b.stok)} {b.satuan}
                    </span>
                    <span className="block text-xs text-slate-600">min. {formatAngka(b.stok_minimum)}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}

function Angka({ label, nilai, ke, tautan, peringatan = false }) {
  return (
    <Link to={ke} className="kartu group block p-4 hover:border-primer-200">
      <p className="text-sm text-slate-600">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${peringatan ? 'text-amber-900' : 'text-slate-900'}`}>{formatAngka(nilai)}</p>
      <p className="mt-1 text-sm font-medium text-primer-700 group-hover:underline">{tautan}</p>
    </Link>
  )
}
