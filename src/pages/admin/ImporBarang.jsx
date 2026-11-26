import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import ConfirmModal from '../../components/ConfirmModal'
import { KodeBarang } from '../../components/barang/TampilanBarang'
import { pesanError } from '../../lib/supabaseClient'
import { ambilKategoriLengkap, ambilSemuaKodeUnik, imporBarang } from '../../services/itemService'
import { unduhTemplateBarang } from '../../utils/exportExcel'
import { formatAngka } from '../../utils/format'
import { bacaFileExcel, olahBaris, periksaBaris, susunKategori } from '../../utils/imporBarang'

const BATAS_TAMPIL = 100

const TAB = [
  { kunci: 'siap', label: 'Siap diimpor' },
  { kunci: 'galat', label: 'Bermasalah' },
  { kunci: 'ada', label: 'Sudah terdaftar' },
]

export default function ImporBarang() {
  const inputRef = useRef(null)
  const [membaca, setMembaca] = useState(false)
  const [namaFile, setNamaFile] = useState('')
  const [baris, setBaris] = useState(null)
  const [kategori, setKategori] = useState([])
  const [tab, setTab] = useState('siap')
  const [konfirmasi, setKonfirmasi] = useState(false)
  const [menyimpan, setMenyimpan] = useState(false)
  const [hasil, setHasil] = useState(null)

  async function pilihFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setMembaca(true)
    try {
      const [isi, kodeTerdaftar, kategoriDb] = await Promise.all([
        bacaFileExcel(file),
        ambilSemuaKodeUnik(),
        ambilKategoriLengkap(),
      ])
      const mentah = olahBaris(isi)
      if (mentah.length === 0) throw new Error('Tidak ada baris barang di bawah judul kolom.')
      const diperiksa = periksaBaris(mentah, kodeTerdaftar)
      setNamaFile(file.name)
      setBaris(diperiksa)
      setKategori(susunKategori(diperiksa.filter((b) => b.status === 'siap'), kategoriDb))
      setTab(diperiksa.some((b) => b.status === 'galat') ? 'galat' : 'siap')
      setHasil(null)
    } catch (err) {
      toast.error(err.message?.includes('Unsupported file') ? 'File tidak bisa dibaca. Gunakan .xlsx, .xls, atau .csv.' : pesanError(err))
    } finally {
      setMembaca(false)
    }
  }

  const kodeIkut = useMemo(() => new Set(kategori.filter((k) => k.ikut).map((k) => k.kode)), [kategori])
  const jumlah = useMemo(() => {
    const hitung = { siap: 0, galat: 0, ada: 0 }
    baris?.forEach((b) => (hitung[b.status] += 1))
    return hitung
  }, [baris])
  const akanDiimpor = useMemo(
    () => (baris ?? []).filter((b) => b.status === 'siap' && kodeIkut.has(b.kodeBarang)),
    [baris, kodeIkut],
  )
  const berstok = akanDiimpor.filter((b) => b.stok > 0).length

  // Nama kategori wajib diisi dan tidak boleh kembar.
  const galatKategori = useMemo(() => {
    const galat = {}
    const dilihat = new Map()
    for (const k of kategori.filter((k) => k.ikut)) {
      const nama = k.nama.trim().toLowerCase()
      if (!nama) galat[k.kode] = 'Nama wajib diisi'
      else if (dilihat.has(nama)) galat[k.kode] = `Sama dengan kode ${dilihat.get(nama)}`
      else dilihat.set(nama, k.kode)
    }
    return galat
  }, [kategori])

  function ubahKategori(kode, perubahan) {
    setKategori((daftar) => daftar.map((k) => (k.kode === kode ? { ...k, ...perubahan } : k)))
  }

  async function simpan() {
    setMenyimpan(true)
    try {
      const dataKategori = kategori.filter((k) => k.ikut).map((k) => ({ kode: k.kode, nama: k.nama.trim() }))
      const dataBarang = akanDiimpor.map((b) => ({
        kode_unik: b.kodeUnik,
        kode_bmn: b.kodeBarang,
        nup: b.nup,
        nama: b.nama,
        kategori_kode: b.kodeBarang,
        satuan: b.satuan,
        stok: b.stok,
        stok_minimum: b.stokMinimum,
        lokasi: b.lokasi || null,
      }))
      setHasil(await imporBarang(dataKategori, dataBarang))
      setKonfirmasi(false)
    } catch (err) {
      toast.error(pesanError(err), { duration: 8000 })
      setKonfirmasi(false)
    } finally {
      setMenyimpan(false)
    }
  }

  function mulaiUlang() {
    setBaris(null)
    setKategori([])
    setNamaFile('')
    setHasil(null)
  }

  const tombolKembali = (
    <Link to="/admin/barang" className="btn-sekunder">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Kelola Barang
    </Link>
  )

  if (hasil) {
    return (
      <>
        <PageHeader judul="Impor barang dari Excel" aksi={tombolKembali} />
        <div className="kartu flex flex-col items-center px-6 py-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-700" aria-hidden="true" />
          <p className="mt-3 text-lg font-semibold text-slate-900">{formatAngka(hasil.baru)} barang berhasil diimpor</p>
          <p className="mt-1 max-w-md text-sm text-slate-600">
            {hasil.berstok > 0 && `${formatAngka(hasil.berstok)} barang tercatat dengan stok awal. `}
            {hasil.dilewati > 0 && `${formatAngka(hasil.dilewati)} barang dilewati karena kodenya sudah terdaftar. `}
            Stok barang tanpa stok awal bisa diisi lewat Barang Masuk atau Koreksi stok.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/admin/barang" className="btn-primer">Lihat daftar barang</Link>
            <button type="button" className="btn-sekunder" onClick={mulaiUlang}>Impor file lain</button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        judul="Impor barang dari Excel"
        keterangan="Unggah ekspor Referensi Barang dari SAKTI apa adanya, atau isi template CALIAK."
        aksi={tombolKembali}
      />

      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={pilihFile}
        aria-label="Pilih file Excel" />

      {!baris ? (
        <div className="kartu grid gap-6 p-5 sm:p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="font-semibold text-slate-900">Kolom yang dibaca</h2>
            <p className="mt-1 text-sm text-slate-600">
              Wajib: <strong>Kd Barang</strong>, <strong>Kd Brng</strong>, dan <strong>Deskripsi</strong>. Opsional: Satuan,
              Kategori, Stok, Stok Minimum, Lokasi. Judul laporan, nomor halaman, dan judul kolom yang berulang di laporan
              SAKTI dilewati otomatis.
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Kode unik barang dibentuk dari Kd Barang dan Kd Brng, contoh <KodeBarang kode="1010301001.000005" />.
              Barang yang kodenya sudah terdaftar tidak ditimpa.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
            <button type="button" className="btn-primer" onClick={() => inputRef.current.click()} disabled={membaca}>
              {membaca ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
              {membaca ? 'Membaca file...' : 'Pilih file Excel'}
            </button>
            <button type="button" className="btn-sekunder" onClick={unduhTemplateBarang}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Unduh template
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="kartu flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 shrink-0 text-emerald-700" aria-hidden="true" />
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900">{namaFile}</p>
                <p className="text-sm text-slate-600">
                  {formatAngka(baris.length)} baris: {formatAngka(jumlah.siap)} siap, {formatAngka(jumlah.ada)} sudah
                  terdaftar, {formatAngka(jumlah.galat)} bermasalah
                </p>
              </div>
            </div>
            <button type="button" className="btn-sekunder shrink-0" onClick={() => inputRef.current.click()} disabled={membaca}>
              {membaca && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Ganti file
            </button>
          </section>

          {kategori.length > 0 && (
            <section className="kartu" aria-labelledby="judul-kategori">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 id="judul-kategori" className="font-semibold text-slate-900">1. Kategori dan nama kategori</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Satu kategori per Kd Barang. Hilangkan centang untuk kelompok yang tidak perlu diimpor, misalnya
                    publikasi lama. Nama kategori cukup diisi sekali dan dipakai lagi pada impor berikutnya.
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" className="btn-sekunder px-3"
                    onClick={() => setKategori((d) => d.map((k) => ({ ...k, ikut: true })))}>Centang semua</button>
                  <button type="button" className="btn-sekunder px-3"
                    onClick={() => setKategori((d) => d.map((k) => ({ ...k, ikut: false })))}>Kosongkan</button>
                </div>
              </div>
              <ul className="divide-y divide-slate-100">
                {kategori.map((k) => (
                  <li key={k.kode} className={`grid gap-2 px-5 py-3 sm:grid-cols-[auto_8.5rem_6rem_1fr] sm:items-center sm:gap-4 ${k.ikut ? '' : 'bg-slate-50'}`}>
                    <label className="flex min-h-11 items-center gap-3 sm:contents">
                      <input type="checkbox" checked={k.ikut} onChange={(e) => ubahKategori(k.kode, { ikut: e.target.checked })}
                        className="h-5 w-5 accent-primer-700" aria-label={`Impor kategori ${k.kode}`} />
                      <span className="font-mono text-sm text-slate-900">{k.kode}</span>
                      <span className="text-sm text-slate-600">{formatAngka(k.jumlah)} barang</span>
                    </label>
                    <div>
                      <label htmlFor={`kat-${k.kode}`} className="sr-only">Nama kategori untuk kode {k.kode}</label>
                      <input id={`kat-${k.kode}`} value={k.nama} disabled={!k.ikut}
                        onChange={(e) => ubahKategori(k.kode, { nama: e.target.value })}
                        className={`input ${k.ikut && galatKategori[k.kode] ? 'input-error' : ''}`}
                        placeholder="Nama kategori" />
                      {k.ikut && galatKategori[k.kode] && <p className="teks-error">{galatKategori[k.kode]}</p>}
                      {k.sudahAda && <p className="mt-1 text-xs text-slate-600">Kategori sudah ada. Mengubah nama akan mengganti namanya.</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="kartu" aria-labelledby="judul-barang">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 id="judul-barang" className="font-semibold text-slate-900">2. Periksa daftar barang</h2>
              <div className="mt-3 flex flex-wrap gap-2" role="tablist">
                {TAB.map((t) => (
                  <button key={t.kunci} type="button" role="tab" aria-selected={tab === t.kunci} onClick={() => setTab(t.kunci)}
                    className={`min-h-11 rounded-lg px-3 text-sm font-medium ${
                      tab === t.kunci ? 'bg-primer-700 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}>
                    {t.label} ({formatAngka(jumlah[t.kunci])})
                  </button>
                ))}
              </div>
              {tab === 'galat' && jumlah.galat > 0 && (
                <p className="mt-3 text-sm text-slate-600">
                  Baris bermasalah tidak ikut diimpor. Perbaiki di file Excel lalu tekan Ganti file, atau lanjutkan tanpa baris ini.
                </p>
              )}
            </div>
            <DaftarBaris baris={baris.filter((b) => b.status === tab)} tab={tab} kodeIkut={kodeIkut} />
          </section>

          <div className="kartu sticky bottom-[calc(1rem+env(safe-area-inset-bottom))] flex flex-col gap-3 p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-700">
              <strong className="text-slate-900">{formatAngka(akanDiimpor.length)} barang</strong> akan diimpor
              {berstok > 0 && `, ${formatAngka(berstok)} di antaranya dengan stok awal`}.
            </p>
            <button type="button" className="btn-primer" onClick={() => setKonfirmasi(true)}
              disabled={akanDiimpor.length === 0 || Object.keys(galatKategori).length > 0}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              Impor {formatAngka(akanDiimpor.length)} barang
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        terbuka={konfirmasi}
        judul={`Impor ${formatAngka(akanDiimpor.length)} barang?`}
        pesan={`Barang dan ${formatAngka(kodeIkut.size)} kategori akan disimpan sekaligus. ${
          berstok > 0 ? `Stok awal ${formatAngka(berstok)} barang dicatat sebagai mutasi masuk. ` : ''
        }Bila ada satu yang gagal, tidak ada yang tersimpan.`}
        labelKonfirmasi="Ya, impor"
        memproses={menyimpan}
        onKonfirmasi={simpan}
        onBatal={() => setKonfirmasi(false)}
      />
    </>
  )
}

function DaftarBaris({ baris, tab, kodeIkut }) {
  if (baris.length === 0) {
    const pesan = {
      siap: 'Tidak ada barang baru di file ini.',
      galat: 'Tidak ada baris bermasalah.',
      ada: 'Tidak ada barang yang sudah terdaftar.',
    }
    return <p className="px-5 py-8 text-center text-sm text-slate-600">{pesan[tab]}</p>
  }

  return (
    <>
      <ul className="divide-y divide-slate-100">
        {baris.slice(0, BATAS_TAMPIL).map((b) => {
          const dilewati = tab === 'siap' && !kodeIkut.has(b.kodeBarang)
          return (
            <li key={b.baris} className={`flex gap-3 px-5 py-3 text-sm ${dilewati ? 'opacity-60' : ''}`}>
              <span className="w-12 shrink-0 pt-0.5 text-xs text-slate-600">Baris {b.baris}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">{b.nama || '(deskripsi kosong)'}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600">
                  {b.kodeUnik ? <KodeBarang kode={b.kodeUnik} /> : <span>Kode tidak lengkap</span>}
                  <span>{b.satuan}</span>
                  {b.stok > 0 && <span>Stok {formatAngka(b.stok)}</span>}
                  {dilewati && <span>Kategori tidak dicentang</span>}
                </div>
                {b.galat.length > 0 && <p className="mt-1 text-red-700">{b.galat.join('. ')}.</p>}
                {b.catatan.length > 0 && <p className="mt-1 text-amber-800">{b.catatan.join('. ')}.</p>}
              </div>
            </li>
          )
        })}
      </ul>
      {baris.length > BATAS_TAMPIL && (
        <p className="border-t border-slate-100 px-5 py-3 text-sm text-slate-600">
          Menampilkan {BATAS_TAMPIL} dari {formatAngka(baris.length)} baris. Semua baris tetap ikut diproses.
        </p>
      )}
    </>
  )
}
