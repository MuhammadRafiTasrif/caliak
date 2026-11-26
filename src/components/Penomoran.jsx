import { ChevronLeft, ChevronRight } from 'lucide-react'

// Tombol pindah halaman untuk daftar yang panjang.
export default function Penomoran({ halaman, total, ukuran, onPindah, sibuk = false, label = 'Halaman daftar' }) {
  const jumlahHalaman = Math.max(1, Math.ceil(total / ukuran))
  if (jumlahHalaman <= 1) return null

  return (
    <nav className="mt-4 flex items-center justify-between gap-3" aria-label={label}>
      <button type="button" className="btn-sekunder" disabled={halaman === 1 || sibuk} onClick={() => onPindah(halaman - 1)}>
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Sebelumnya
      </button>
      <span className="text-sm text-slate-600">
        Halaman {halaman} dari {jumlahHalaman}
      </span>
      <button type="button" className="btn-sekunder" disabled={halaman >= jumlahHalaman || sibuk} onClick={() => onPindah(halaman + 1)}>
        Berikutnya
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  )
}
