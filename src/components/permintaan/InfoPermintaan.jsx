import StatusBadge from '../StatusBadge'
import { KodeBarang } from '../barang/TampilanBarang'
import { formatAngka, formatTanggal, formatWaktu } from '../../utils/format'

// "Ballpoint Pilot, Map Gobi, dan 2 barang lain"
export function ringkasBarang(rincian) {
  const nama = rincian.map((r) => r.barang?.nama ?? 'Barang nonaktif')
  if (nama.length <= 2) return nama.join(', ')
  return `${nama.slice(0, 2).join(', ')}, dan ${nama.length - 2} barang lain`
}

export function KepalaPermintaan({ permintaan, tampilkanPemohon = false }) {
  const p = permintaan
  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-slate-600">Nomor</dt>
        <dd className="mt-0.5 flex flex-wrap items-center gap-2">
          <span className="font-mono font-semibold text-slate-900">{p.nomor}</span>
          <StatusBadge status={p.status} />
        </dd>
      </div>
      {tampilkanPemohon && (
        <div>
          <dt className="text-slate-600">Pemohon</dt>
          <dd className="mt-0.5 font-medium text-slate-900">
            {p.pemohon?.nama ?? '-'}
            <span className="block text-xs font-normal text-slate-600">
              {[p.pemohon?.nip, p.pemohon?.unit_kerja].filter(Boolean).join(', ')}
            </span>
          </dd>
        </div>
      )}
      <div>
        <dt className="text-slate-600">Diajukan</dt>
        <dd className="mt-0.5 text-slate-900">{formatWaktu(p.created_at)}</dd>
      </div>
      <div>
        <dt className="text-slate-600">Dibutuhkan</dt>
        <dd className="mt-0.5 text-slate-900">{formatTanggal(p.tanggal_dibutuhkan)}</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-slate-600">Keperluan</dt>
        <dd className="mt-0.5 whitespace-pre-line text-slate-900">{p.keperluan}</dd>
      </div>
      {p.catatan_admin && (
        <div className="sm:col-span-2">
          <dt className="text-slate-600">{p.status === 'ditolak' ? 'Alasan penolakan' : 'Catatan admin'}</dt>
          <dd className="mt-0.5 whitespace-pre-line text-slate-900">{p.catatan_admin}</dd>
        </div>
      )}
    </dl>
  )
}

// Daftar barang yang diminta, hanya baca.
export function RincianBarang({ rincian }) {
  const adaPersetujuan = rincian.some((r) => r.jumlah_disetujui !== null)
  return (
    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
      {rincian.map((r) => (
        <li key={r.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
          <div className="min-w-0">
            <p className="font-medium text-slate-900">{r.barang?.nama ?? 'Barang sudah dinonaktifkan'}</p>
            {r.barang && <KodeBarang kode={r.barang.kode_unik} />}
          </div>
          <div className="text-right tabular-nums">
            <p className="text-slate-700">Diminta {formatAngka(r.jumlah_diminta)} {r.barang?.satuan}</p>
            {adaPersetujuan && (
              <p className={r.jumlah_disetujui < r.jumlah_diminta ? 'font-semibold text-amber-900 dark:text-amber-200' : 'font-semibold text-slate-900'}>
                Disetujui {formatAngka(r.jumlah_disetujui ?? 0)} {r.barang?.satuan}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
