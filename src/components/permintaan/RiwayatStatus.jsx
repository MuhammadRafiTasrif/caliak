import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import StatusBadge from '../StatusBadge'
import { ambilRiwayatStatus } from '../../services/requestService'
import { pesanError } from '../../lib/supabaseClient'
import { formatWaktu } from '../../utils/format'

// Timeline perubahan status satu permintaan: siapa, kapan, catatan.
// Pemohon tidak bisa membaca profil admin (RLS), jadi nama admin tampil
// sebagai "Admin" di sisi pemohon.
export default function RiwayatStatus({ requestId, pemohonId }) {
  const [log, setLog] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let batal = false
    ambilRiwayatStatus(requestId)
      .then((data) => !batal && setLog(data))
      .catch((err) => !batal && setError(pesanError(err)))
    return () => {
      batal = true
    }
  }, [requestId])

  if (error) return <p className="text-sm text-red-700">Riwayat status gagal dimuat: {error}</p>
  if (!log) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Memuat riwayat status...
      </p>
    )
  }

  return (
    <ol className="relative space-y-4 border-l-2 border-slate-200 pl-5">
      {log.map((l) => (
        <li key={l.id} className="relative">
          <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-primer-600" aria-hidden="true" />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={l.status} />
            <span className="text-xs text-slate-600">{formatWaktu(l.created_at)}</span>
          </div>
          <p className="mt-1 text-sm text-slate-700">
            oleh {l.pengubah?.nama || (l.changed_by === pemohonId ? 'pemohon' : 'Admin')}
          </p>
          {l.catatan && <p className="mt-0.5 text-sm text-slate-900">{l.catatan}</p>}
        </li>
      ))}
    </ol>
  )
}
