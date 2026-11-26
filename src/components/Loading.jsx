import { Loader2 } from 'lucide-react'

export default function Loading({ teks = 'Memuat data...', layarPenuh = false }) {
  return (
    <div
      className={`flex items-center justify-center gap-2 text-sm text-slate-500 ${
        layarPenuh ? 'min-h-screen' : 'py-16'
      }`}
      role="status"
    >
      <Loader2 className="h-5 w-5 animate-spin text-primer-600" aria-hidden="true" />
      {teks}
    </div>
  )
}
