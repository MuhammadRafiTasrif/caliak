import { PackageSearch } from 'lucide-react'

// Logo dan nama aplikasi. `terang` dipakai di atas latar biru tua.
export default function Brand({ terang = false, tagline = true }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          terang ? 'bg-white/10 text-white' : 'bg-primer-700 text-white'
        }`}
      >
        <PackageSearch className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className={`text-lg font-bold leading-tight tracking-wide ${terang ? 'text-white' : 'text-primer-800'}`}>
          CALIAK
        </p>
        {tagline && (
          <p className={`text-[11px] leading-snug ${terang ? 'text-primer-100' : 'text-slate-600'}`}>
            Catatan Logistik Akurat dan Informasi Ketersediaan
          </p>
        )}
      </div>
    </div>
  )
}
