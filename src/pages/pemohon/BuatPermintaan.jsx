import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AlertTriangle, LayoutGrid, Loader2, Send, ShoppingBasket, Trash2 } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import EmptyState from '../../components/EmptyState'
import Loading from '../../components/Loading'
import { FotoBarang, KodeBarang } from '../../components/barang/TampilanBarang'
import { usePermintaan } from '../../context/PermintaanContext'
import { pesanError } from '../../lib/supabaseClient'
import { ambilBarangDenganId } from '../../services/itemService'
import { buatPermintaan } from '../../services/requestService'
import { formatAngka, hariIni } from '../../utils/format'

export default function BuatPermintaan() {
  const navigate = useNavigate()
  const { keranjang, setKeranjang, ubahJumlah, hapusDariKeranjang, kosongkanKeranjang } = usePermintaan()
  const [menyegarkan, setMenyegarkan] = useState(true)
  const [errorSegar, setErrorSegar] = useState('')
  const [keperluan, setKeperluan] = useState('')
  const [tanggal, setTanggal] = useState(hariIni())
  const [errors, setErrors] = useState({})
  const [mengirim, setMengirim] = useState(false)

  // Perbarui nama dan stok isi keranjang dari database, sekali saat halaman dibuka.
  useEffect(() => {
    let batal = false
    const ids = keranjang.map((b) => b.id)
    ambilBarangDenganId(ids)
      .then((terbaru) => {
        if (batal) return
        const peta = new Map(terbaru.map((b) => [b.id, b]))
        const hilang = keranjang.filter((b) => !peta.get(b.id)?.is_active)
        if (hilang.length > 0) {
          toast(`${hilang.map((b) => b.nama).join(', ')} sudah tidak tersedia dan dikeluarkan dari daftar.`, { duration: 6000 })
        }
        setKeranjang((isi) =>
          isi
            .filter((b) => peta.get(b.id)?.is_active)
            .map((b) => {
              const t = peta.get(b.id)
              return { ...b, nama: t.nama, satuan: t.satuan, stok: t.stok, foto_url: t.foto_url, jumlah: Math.min(b.jumlah, t.stok) }
            }),
        )
      })
      .catch((err) => !batal && setErrorSegar(pesanError(err)))
      .finally(() => !batal && setMenyegarkan(false))
    return () => {
      batal = true
    }
    // Sengaja hanya saat halaman dibuka, bukan setiap isi keranjang berubah.
  }, [])

  function validasi() {
    const e = {}
    keranjang.forEach((b) => {
      if (b.stok === 0) e[b.id] = 'Stok habis. Hapus barang ini dari daftar.'
      else if (!Number.isInteger(b.jumlah) || b.jumlah < 1) e[b.id] = 'Isi jumlah, minimal 1.'
      else if (b.jumlah > b.stok) e[b.id] = `Maksimal ${formatAngka(b.stok)} ${b.satuan}.`
    })
    if (!keperluan.trim()) e.keperluan = 'Tulis untuk apa barang ini dibutuhkan.'
    if (!tanggal) e.tanggal = 'Tanggal dibutuhkan wajib diisi.'
    else if (tanggal < hariIni()) e.tanggal = 'Tanggal tidak boleh sebelum hari ini.'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const hasil = validasi()
    setErrors(hasil)
    if (Object.keys(hasil).length > 0) return

    setMengirim(true)
    try {
      await buatPermintaan({
        keperluan: keperluan.trim(),
        tanggalDibutuhkan: tanggal,
        items: keranjang.map((b) => ({ item_id: b.id, jumlah: b.jumlah })),
      })
      kosongkanKeranjang()
      toast.success('Permintaan diajukan. Admin akan memeriksanya.')
      navigate('/permintaan-saya')
    } catch (err) {
      toast.error(pesanError(err), { duration: 7000 })
    } finally {
      setMengirim(false)
    }
  }

  if (menyegarkan && keranjang.length > 0) {
    return (
      <>
        <PageHeader judul="Buat Permintaan" />
        <div className="kartu"><Loading teks="Memeriksa stok terbaru barang yang dipilih..." /></div>
      </>
    )
  }

  if (keranjang.length === 0) {
    return (
      <>
        <PageHeader judul="Buat Permintaan" />
        <div className="kartu">
          <EmptyState ikon={ShoppingBasket} judul="Belum ada barang yang dipilih"
            pesan="Pilih barang dan jumlahnya di Katalog, lalu kembali ke halaman ini untuk mengajukan."
            aksi={
              <Link to="/katalog" className="btn-primer">
                <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                Buka Katalog
              </Link>
            } />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        judul="Buat Permintaan"
        keterangan="Stok belum berkurang saat permintaan diajukan. Stok baru berkurang ketika barang diserahkan."
      />

      {errorSegar && (
        <p className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Stok terbaru gagal diperiksa ({errorSegar}). Permintaan tetap bisa diajukan, stok dicek ulang saat dikirim.
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <section className="kartu" aria-labelledby="judul-daftar">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <h2 id="judul-daftar" className="font-semibold text-slate-900">Barang diminta ({keranjang.length})</h2>
            <Link to="/katalog" className="inline-flex min-h-11 shrink-0 items-center text-sm font-medium text-primer-700 hover:underline">
              + Tambah barang
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {keranjang.map((b) => (
              <li key={b.id} className="px-5 py-4">
                <div className="flex gap-3">
                  <FotoBarang url={b.foto_url} nama={b.nama} className="h-14 w-14" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{b.nama}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                      <KodeBarang kode={b.kode_unik} />
                      <span>Tersedia {formatAngka(b.stok)} {b.satuan}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-end gap-2 sm:pl-[4.25rem]">
                  <div className="w-32">
                    <label htmlFor={`jumlah-${b.id}`} className="label">Jumlah ({b.satuan})</label>
                    <input id={`jumlah-${b.id}`} type="number" min="1" max={b.stok} step="1" inputMode="numeric"
                      value={Number.isFinite(b.jumlah) ? b.jumlah : ''}
                      onChange={(e) => ubahJumlah(b.id, e.target.value === '' ? NaN : Number(e.target.value))}
                      className={`input ${errors[b.id] ? 'input-error' : ''}`} />
                  </div>
                  <button type="button" className="btn-sekunder" onClick={() => hapusDariKeranjang(b.id)}
                    aria-label={`Hapus ${b.nama} dari permintaan`}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Hapus
                  </button>
                </div>
                {errors[b.id] && <p className="teks-error sm:pl-[4.25rem]">{errors[b.id]}</p>}
              </li>
            ))}
          </ul>
        </section>

        <section className="kartu space-y-4 p-5" aria-labelledby="judul-detail">
          <h2 id="judul-detail" className="font-semibold text-slate-900">Detail permintaan</h2>
          <div>
            <label htmlFor="keperluan" className="label">Keperluan</label>
            <textarea id="keperluan" rows={4} value={keperluan} onChange={(e) => setKeperluan(e.target.value)}
              className={`input ${errors.keperluan ? 'input-error' : ''}`}
              placeholder="Contoh: kebutuhan ATK pelatihan petugas Susenas" />
            {errors.keperluan && <p className="teks-error">{errors.keperluan}</p>}
          </div>
          <div>
            <label htmlFor="tanggal" className="label">Tanggal dibutuhkan</label>
            <input id="tanggal" type="date" min={hariIni()} value={tanggal} onChange={(e) => setTanggal(e.target.value)}
              className={`input ${errors.tanggal ? 'input-error' : ''}`} />
            {errors.tanggal && <p className="teks-error">{errors.tanggal}</p>}
          </div>
          <button type="submit" className="btn-primer w-full" disabled={mengirim}>
            {mengirim ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            {mengirim ? 'Mengajukan...' : 'Ajukan permintaan'}
          </button>
        </section>
      </form>
    </>
  )
}
