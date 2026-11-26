import { Loader2 } from 'lucide-react'

// Selalu isi `teks` dengan apa yang sedang dimuat, misalnya "Memuat daftar barang...".
export default function Loading({ teks = 'Memeriksa sesi login...', layarPenuh = false }) {
  return (
    <div
      className={`flex items-center justify-center gap-2 text-sm text-slate-600 ${
        layarPenuh ? 'min-h-screen' : 'py-16'
      }`}
      role="status"
    >
      <Loader2 className="h-5 w-5 animate-spin text-primer-600" aria-hidden="true" />
      {teks}
    </div>
  )
}
