import { MapPin } from 'lucide-react'
import { FotoBarang, KodeBarang, StokBarang } from './barang/TampilanBarang'

// Kartu barang. `horizontal` untuk daftar ringkas di HP (Kelola Barang),
// tanpa `horizontal` untuk grid katalog. `children` berisi tombol aksi.
export default function ItemCard({ barang, horizontal = false, children }) {
  return (
    <article className="kartu flex flex-col overflow-hidden">
      <div className={horizontal ? 'flex gap-3 p-4' : ''}>
        <FotoBarang
          url={barang.foto_url}
          nama={barang.nama}
          className={horizontal ? 'h-16 w-16' : 'aspect-[4/3] w-full rounded-none rounded-t-xl'}
        />
        <div className={`min-w-0 space-y-1.5 ${horizontal ? '' : 'p-4'}`}>
          <h3 className="font-semibold leading-snug text-slate-900">{barang.nama}</h3>
          <KodeBarang kode={barang.kode_unik} />
          <p className="text-sm text-slate-600">{barang.kategori?.nama || 'Tanpa kategori'}</p>
          <StokBarang barang={barang} />
          {barang.lokasi && (
            <p className="flex items-start gap-1 text-sm text-slate-600">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {barang.lokasi}
            </p>
          )}
        </div>
      </div>
      {children && <div className="mt-auto border-t border-slate-100 p-3">{children}</div>}
    </article>
  )
}
