import { useState } from 'react'
import { Package } from 'lucide-react'
import { formatAngka } from '../../utils/format'

// Potongan tampilan barang yang dipakai di beberapa halaman.

export function FotoBarang({ url, nama, className = 'h-12 w-12' }) {
  const [gagal, setGagal] = useState(false)
  if (!url || gagal) {
    return (
      <div className={`flex shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 ${className}`}>
        <Package className="h-1/3 w-1/3 min-h-5 min-w-5" aria-label="Belum ada foto" />
      </div>
    )
  }
  return (
    <img
      src={url}
      alt={`Foto ${nama}`}
      loading="lazy"
      onError={() => setGagal(true)}
      className={`shrink-0 rounded-lg bg-slate-100 object-cover ${className}`}
    />
  )
}

// Kode unik selalu tampil dengan huruf tetap supaya mudah dicocokkan
// dengan label di barang (lihat DESIGN.md, motif identitas).
export function KodeBarang({ kode }) {
  return (
    <span className="inline-block max-w-full break-all rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">
      {kode}
    </span>
  )
}

export function kondisiStok(barang) {
  if (barang.stok === 0) return 'habis'
  if (barang.stok_minimum > 0 && barang.stok <= barang.stok_minimum) return 'menipis'
  return 'aman'
}

export function StokBarang({ barang }) {
  const kondisi = kondisiStok(barang)
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="font-semibold tabular-nums text-slate-900">
        {formatAngka(barang.stok)} {barang.satuan}
      </span>
      {kondisi === 'habis' && (
        <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700">Stok habis</span>
      )}
      {kondisi === 'menipis' && (
        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-800">
          Menipis (min. {formatAngka(barang.stok_minimum)})
        </span>
      )}
    </span>
  )
}
