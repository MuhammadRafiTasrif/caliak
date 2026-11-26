// Judul halaman dengan tempat tombol aksi di kanan.
export default function PageHeader({ judul, keterangan, aksi }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{judul}</h1>
        {keterangan && <p className="mt-1 text-sm text-slate-600">{keterangan}</p>}
      </div>
      {aksi && <div className="flex flex-wrap gap-2">{aksi}</div>}
    </div>
  )
}
