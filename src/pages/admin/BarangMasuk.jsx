import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { AlertTriangle, ArrowDownToLine, ImageIcon, Loader2, PackagePlus, Search, X } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import EmptyState from '../../components/EmptyState'
import Loading from '../../components/Loading'
import Modal from '../../components/Modal'
import ImageUpload from '../../components/ImageUpload'
import FormBarang from '../../components/barang/FormBarang'
import { FotoBarang, KodeBarang } from '../../components/barang/TampilanBarang'
import { pesanError } from '../../lib/supabaseClient'
import { ambilBarang, hapusFoto, unggahFoto } from '../../services/itemService'
import { ambilMutasiTerbaru, catatBarangMasuk } from '../../services/movementService'
import { formatAngka, formatTanggal, formatWaktu, hariIni } from '../../utils/format'
import useTunda from '../../utils/useTunda'

const FORM_KOSONG = { jumlah: '', tanggal: hariIni(), dokumenRef: '', catatan: '' }

export default function BarangMasuk() {
  const [barang, setBarang] = useState(null)
  const [form, setForm] = useState(FORM_KOSONG)
  const [fotoBukti, setFotoBukti] = useState(null)
  const [kunciFoto, setKunciFoto] = useState(0)
  const [errors, setErrors] = useState({})
  const [menyimpan, setMenyimpan] = useState(false)
  const [formBarangBaru, setFormBarangBaru] = useState(false)
  const [formSibuk, setFormSibuk] = useState(false)

  const [riwayat, setRiwayat] = useState([])
  const [memuatRiwayat, setMemuatRiwayat] = useState(true)
  const [errorRiwayat, setErrorRiwayat] = useState('')

  const muatRiwayat = useCallback(async () => {
    setMemuatRiwayat(true)
    setErrorRiwayat('')
    try {
      setRiwayat(await ambilMutasiTerbaru({ jenis: 'masuk', batas: 10 }))
    } catch (err) {
      setErrorRiwayat(pesanError(err))
    } finally {
      setMemuatRiwayat(false)
    }
  }, [])

  useEffect(() => {
    muatRiwayat()
  }, [muatRiwayat])

  function ubah(nama) {
    return (e) => setForm((f) => ({ ...f, [nama]: e.target.value }))
  }

  function validasi() {
    const e = {}
    if (!barang) e.barang = 'Pilih barang terlebih dahulu.'
    const jumlah = Number(form.jumlah)
    if (!Number.isInteger(jumlah) || jumlah <= 0) e.jumlah = 'Jumlah harus bilangan bulat lebih dari 0.'
    if (!form.tanggal) e.tanggal = 'Tanggal wajib diisi.'
    else if (form.tanggal > hariIni()) e.tanggal = 'Tanggal tidak boleh setelah hari ini.'
    if (!form.dokumenRef.trim()) e.dokumenRef = 'Sumber atau nomor dokumen wajib diisi.'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const hasil = validasi()
    setErrors(hasil)
    if (Object.keys(hasil).length > 0) return

    setMenyimpan(true)
    let urlBukti = null
    try {
      if (fotoBukti) urlBukti = await unggahFoto(fotoBukti, 'bukti')
      const stokSesudah = await catatBarangMasuk({
        itemId: barang.id,
        jumlah: form.jumlah,
        tanggal: form.tanggal,
        dokumenRef: form.dokumenRef.trim(),
        fotoBuktiUrl: urlBukti,
        catatan: form.catatan.trim(),
      })
      toast.success(
        `${barang.nama} bertambah ${formatAngka(Number(form.jumlah))} ${barang.satuan}. Stok sekarang ${formatAngka(stokSesudah)}.`,
      )
      setBarang(null)
      setForm({ ...FORM_KOSONG, tanggal: hariIni() })
      setFotoBukti(null)
      setKunciFoto((k) => k + 1)
      muatRiwayat()
    } catch (err) {
      if (urlBukti) hapusFoto(urlBukti)
      toast.error(pesanError(err))
    } finally {
      setMenyimpan(false)
    }
  }

  const jumlahValid = Number.isInteger(Number(form.jumlah)) && Number(form.jumlah) > 0

  return (
    <>
      <PageHeader
        judul="Barang Masuk"
        keterangan="Catat barang yang diterima. Stok bertambah otomatis dan tercatat sebagai mutasi masuk."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <form onSubmit={handleSubmit} noValidate className="kartu space-y-5 p-5 sm:p-6">
          <h2 className="text-base font-semibold text-slate-900">Catat barang masuk</h2>

          <div>
            <p className="label" id="label-barang">Barang</p>
            {barang ? (
              <div className="flex items-center gap-3 rounded-lg border border-primer-200 bg-primer-50 p-3">
                <FotoBarang url={barang.foto_url} nama={barang.nama} className="h-12 w-12" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{barang.nama}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-slate-700">
                    <KodeBarang kode={barang.kode_unik} />
                    <span>Stok {formatAngka(barang.stok)} {barang.satuan}</span>
                  </div>
                </div>
                <button type="button" className="btn-sekunder shrink-0 px-3" onClick={() => setBarang(null)}>
                  Ganti
                </button>
              </div>
            ) : (
              <PilihBarang
                error={errors.barang}
                onPilih={(b) => {
                  setBarang(b)
                  setErrors((e) => ({ ...e, barang: undefined }))
                }}
                onTambahBaru={() => setFormBarangBaru(true)}
              />
            )}
            {barang && errors.barang && <p className="teks-error">{errors.barang}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="jumlah" className="label">Jumlah masuk{barang ? ` (${barang.satuan})` : ''}</label>
              <input id="jumlah" type="number" min="1" step="1" inputMode="numeric" value={form.jumlah}
                onChange={ubah('jumlah')} className={`input ${errors.jumlah ? 'input-error' : ''}`} />
              {errors.jumlah ? (
                <p className="teks-error">{errors.jumlah}</p>
              ) : (
                barang && jumlahValid && (
                  <p className="mt-1 text-xs text-slate-600">
                    Stok sesudah: {formatAngka(barang.stok)} + {formatAngka(Number(form.jumlah))} ={' '}
                    <strong className="text-slate-900">{formatAngka(barang.stok + Number(form.jumlah))}</strong>
                  </p>
                )
              )}
            </div>
            <div>
              <label htmlFor="tanggal" className="label">Tanggal diterima</label>
              <input id="tanggal" type="date" max={hariIni()} value={form.tanggal} onChange={ubah('tanggal')}
                className={`input ${errors.tanggal ? 'input-error' : ''}`} />
              {errors.tanggal && <p className="teks-error">{errors.tanggal}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="dokumenRef" className="label">Sumber / nomor dokumen</label>
            <input id="dokumenRef" value={form.dokumenRef} onChange={ubah('dokumenRef')}
              className={`input ${errors.dokumenRef ? 'input-error' : ''}`}
              placeholder="Contoh: nomor BAST, faktur, atau surat pengiriman" />
            {errors.dokumenRef && <p className="teks-error">{errors.dokumenRef}</p>}
          </div>

          <div>
            <label htmlFor="catatan" className="label">Catatan (opsional)</label>
            <textarea id="catatan" rows={2} value={form.catatan} onChange={ubah('catatan')} className="input" />
          </div>

          <ImageUpload key={kunciFoto} id="fotoBukti" label="Foto bukti (opsional)" bentukPotong="asli"
            keterangan="Foto dokumen atau barang yang diterima. Bisa dipotong, lalu dikecilkan otomatis di bawah 2 MB."
            onChange={setFotoBukti} />

          <div className="border-t border-slate-100 pt-5">
            <button type="submit" className="btn-primer w-full sm:w-auto" disabled={menyimpan}>
              {menyimpan ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />}
              {menyimpan ? 'Menyimpan...' : 'Catat barang masuk'}
            </button>
          </div>
        </form>

        <section className="kartu" aria-labelledby="judul-riwayat">
          <h2 id="judul-riwayat" className="border-b border-slate-100 px-5 py-4 text-base font-semibold text-slate-900">
            10 barang masuk terakhir
          </h2>
          {memuatRiwayat && riwayat.length === 0 ? (
            <Loading teks="Memuat catatan barang masuk..." />
          ) : errorRiwayat ? (
            <EmptyState ikon={AlertTriangle} judul="Catatan gagal dimuat" pesan={errorRiwayat}
              aksi={<button type="button" className="btn-sekunder" onClick={muatRiwayat}>Coba lagi</button>} />
          ) : riwayat.length === 0 ? (
            <EmptyState ikon={ArrowDownToLine} judul="Belum ada barang masuk"
              pesan="Barang masuk yang Anda catat lewat form ini akan muncul di sini." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {riwayat.map((m) => (
                <li key={m.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{m.barang?.nama}</p>
                      <p className="text-sm text-slate-600">{formatTanggal(m.tanggal)}{m.dokumen_ref ? `, ${m.dokumen_ref}` : ''}</p>
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                      +{formatAngka(m.jumlah)} {m.barang?.satuan}
                    </p>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                    <span>Saldo {formatAngka(m.saldo_sebelum)} menjadi {formatAngka(m.saldo_sesudah)}</span>
                    <span>Dicatat {m.pelaku?.nama || 'admin'}, {formatWaktu(m.created_at)}</span>
                    {m.foto_bukti_url && (
                      <a href={m.foto_bukti_url} target="_blank" rel="noreferrer"
                        className="inline-flex min-h-11 items-center gap-1 font-medium text-primer-700 hover:underline">
                        <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        Lihat bukti
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Modal terbuka={formBarangBaru} onTutup={() => setFormBarangBaru(false)} judul="Tambah barang baru"
        keterangan="Setelah disimpan, barang ini langsung terpilih di form barang masuk."
        lebar="max-w-2xl" tutupDiLuar={false} terkunci={formSibuk}>
        {formBarangBaru && (
          <FormBarang
            barang={null}
            tanpaStokAwal
            onSibuk={setFormSibuk}
            onBatal={() => setFormBarangBaru(false)}
            onSelesai={(baru) => {
              setFormBarangBaru(false)
              setBarang(baru)
              setErrors((e) => ({ ...e, barang: undefined }))
            }}
          />
        )}
      </Modal>
    </>
  )
}

// Kotak pencarian barang aktif berdasarkan nama atau kode unik.
function PilihBarang({ error, onPilih, onTambahBaru }) {
  const [cari, setCari] = useState('')
  const cariTertunda = useTunda(cari)
  const [hasil, setHasil] = useState([])
  const [memuat, setMemuat] = useState(false)
  const [gagal, setGagal] = useState('')

  useEffect(() => {
    if (!cariTertunda.trim()) {
      setHasil([])
      return
    }
    let batal = false
    setMemuat(true)
    setGagal('')
    ambilBarang({ cari: cariTertunda, status: 'aktif', batas: 8 })
      .then((data) => !batal && setHasil(data))
      .catch((err) => !batal && setGagal(pesanError(err)))
      .finally(() => !batal && setMemuat(false))
    // Abaikan hasil pencarian lama bila pengguna sudah mengetik kata lain.
    return () => {
      batal = true
    }
  }, [cariTertunda])

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
        <input type="search" value={cari} onChange={(e) => setCari(e.target.value)} aria-labelledby="label-barang"
          className={`input pl-9 pr-11 ${error ? 'input-error' : ''}`} placeholder="Ketik nama atau kode unik barang" />
        {cari && (
          <button type="button" onClick={() => setCari('')} aria-label="Kosongkan pencarian"
            className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-slate-500 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {error && <p className="teks-error">{error}</p>}

      {cariTertunda.trim() && (
        <div className="mt-2 rounded-lg border border-slate-200" aria-live="polite">
          {memuat ? (
            <p className="flex items-center gap-2 px-3 py-3 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Mencari barang...
            </p>
          ) : gagal ? (
            <p className="px-3 py-3 text-sm text-red-700 dark:text-red-400">Pencarian gagal: {gagal}</p>
          ) : hasil.length === 0 ? (
            <p className="px-3 py-3 text-sm text-slate-600">
              Tidak ada barang aktif dengan nama atau kode &ldquo;{cariTertunda}&rdquo;.
            </p>
          ) : (
            <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
              {hasil.map((b) => (
                <li key={b.id}>
                  <button type="button" onClick={() => onPilih(b)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50">
                    <FotoBarang url={b.foto_url} nama={b.nama} className="h-10 w-10" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-slate-900">{b.nama}</span>
                      <KodeBarang kode={b.kode_unik} />
                    </span>
                    <span className="shrink-0 text-sm text-slate-600">{formatAngka(b.stok)} {b.satuan}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button type="button" onClick={onTambahBaru}
        className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primer-700 hover:underline">
        <PackagePlus className="h-4 w-4" aria-hidden="true" />
        Barang belum terdaftar? Tambah barang baru
      </button>
    </div>
  )
}
