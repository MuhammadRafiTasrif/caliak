import { ShieldCheck } from 'lucide-react'
import Brand from './Brand'

// Kerangka halaman Login, Daftar, dan Menunggu Verifikasi.
// Desktop: panel biru di kiri, form di kanan. HP: form saja.
export default function AuthShell({ judul, keterangan, children }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section className="hidden flex-col justify-between bg-primer-800 p-12 text-white lg:flex">
        <Brand terang />
        <div className="max-w-md">
          <h2 className="text-3xl font-bold leading-tight">
            Permintaan dan mutasi Barang Milik Negara, tercatat di satu tempat.
          </h2>
          <p className="mt-4 text-primer-100">
            Ajukan permintaan barang, pantau persetujuannya, dan lihat ketersediaan stok kapan saja.
          </p>
        </div>
        <p className="flex items-center gap-2 text-sm text-primer-200">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Akun baru aktif setelah diverifikasi Admin.
        </p>
      </section>

      <section className="flex min-h-screen flex-col justify-center px-4 py-10 sm:px-8 lg:min-h-0">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{judul}</h1>
          {keterangan && <p className="mt-1 text-sm text-slate-500">{keterangan}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </section>
    </div>
  )
}
