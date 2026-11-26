import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Plus, Wand2 } from 'lucide-react'
import ImageUpload from '../ImageUpload'
import { pesanError } from '../../lib/supabaseClient'
import {
  ambilKategori,
  buatKodeOtomatis,
  hapusFoto,
  kodeSudahDipakai,
  rapikanKode,
  simpanBarang,
  tambahKategori,
  unggahFoto,
} from '../../services/itemService'
import { catatBarangMasuk } from '../../services/movementService'

const SATUAN_UMUM = ['unit', 'buah', 'rim', 'pak', 'kotak', 'lembar', 'botol', 'set', 'roll']

function formAwal(barang) {
  return {
    nama: barang?.nama ?? '',
    kategoriId: barang?.category_id ? String(barang.category_id) : '',
    satuan: barang?.satuan ?? 'unit',
    stokAwal: '0',
    stokMinimum: String(barang?.stok_minimum ?? 0),
    lokasi: barang?.lokasi ?? '',
    deskripsi: barang?.deskripsi ?? '',
    sumberKode: barang?.kode_bmn ? 'bmn' : 'internal',
    kodeUnik: barang?.kode_bmn ? '' : barang?.kode_unik ?? '',
    kodeBmn: barang?.kode_bmn ?? '',
    nup: barang?.nup ? String(barang.nup) : '',
    fotoUrl: barang?.foto_url ?? '',
  }
}

// Kode unik dari kode BMN 10 digit dan NUP, misalnya 3100102001-1.
function kodeDariBmn(kodeBmn, nup) {
  const digit = kodeBmn.replace(/\D/g, '')
  return digit && nup ? `${digit}-${Number(nup)}` : ''
}

function bilanganBulat(nilai) {
  return nilai !== '' && Number.isInteger(Number(nilai)) && Number(nilai) >= 0
}

function validasi(form, kodeFinal) {
  const e = {}
  if (!form.nama.trim()) e.nama = 'Nama barang wajib diisi.'
  if (!form.satuan.trim()) e.satuan = 'Satuan wajib diisi.'
  if (form.sumberKode === 'bmn') {
    if (form.kodeBmn.replace(/\D/g, '').length !== 10) e.kodeBmn = 'Kode BMN harus 10 digit angka.'
    if (!(Number.isInteger(Number(form.nup)) && Number(form.nup) > 0)) e.nup = 'NUP harus angka lebih dari 0.'
  } else if (!kodeFinal) {
    e.kodeUnik = 'Kode unik wajib diisi, atau tekan Generate kode.'
  }
  if (!bilanganBulat(form.stokAwal)) e.stokAwal = 'Stok awal harus bilangan bulat 0 atau lebih.'
  if (!bilanganBulat(form.stokMinimum)) e.stokMinimum = 'Stok minimum harus bilangan bulat 0 atau lebih.'
  return e
}

// barang: null untuk barang baru, objek barang untuk mode ubah.
// tanpaStokAwal: dipakai dari halaman Barang Masuk, karena stoknya dicatat
// lewat form barang masuk itu sendiri (lengkap dengan dokumen dan bukti).
export default function FormBarang({ barang, tanpaStokAwal = false, onSelesai, onBatal, onSibuk }) {
  const modeUbah = Boolean(barang)
  const [form, setForm] = useState(() => formAwal(barang))
  const [fotoBaru, setFotoBaru] = useState(undefined)
  const [errors, setErrors] = useState({})
  const [menyimpan, setMenyimpan] = useState(false)
  const [membuatKode, setMembuatKode] = useState(false)

  const [kategori, setKategori] = useState([])
  const [errorKategori, setErrorKategori] = useState('')
  const [kategoriBaru, setKategoriBaru] = useState(null)
  const [menyimpanKategori, setMenyimpanKategori] = useState(false)

  const kodeFinal = form.sumberKode === 'bmn' ? kodeDariBmn(form.kodeBmn, form.nup) : rapikanKode(form.kodeUnik)

  useEffect(() => {
    ambilKategori()
      .then(setKategori)
      .catch(() => setErrorKategori('Daftar kategori gagal dimuat. Tutup form lalu buka lagi.'))
  }, [])

  useEffect(() => {
    onSibuk?.(menyimpan)
  }, [menyimpan, onSibuk])

  function ubah(nama) {
    return (e) => setForm((f) => ({ ...f, [nama]: e.target.value }))
  }

  async function cekKode() {
    if (!kodeFinal) return
    try {
      if (await kodeSudahDipakai(kodeFinal, barang?.id)) {
        const kunci = form.sumberKode === 'bmn' ? 'nup' : 'kodeUnik'
        setErrors((e) => ({ ...e, [kunci]: `Kode ${kodeFinal} sudah dipakai barang lain.` }))
      }
    } catch {
      // Pengecekan diulang saat menyimpan, jadi kegagalan di sini diabaikan.
    }
  }

  async function generateKode() {
    setMembuatKode(true)
    try {
      const kode = await buatKodeOtomatis()
      setForm((f) => ({ ...f, kodeUnik: kode }))
      setErrors((e) => ({ ...e, kodeUnik: undefined }))
    } catch (err) {
      toast.error(pesanError(err))
    } finally {
      setMembuatKode(false)
    }
  }

  async function simpanKategoriBaru() {
    if (!kategoriBaru?.trim()) return
    setMenyimpanKategori(true)
    try {
      const baru = await tambahKategori(kategoriBaru)
      setKategori((daftar) => [...daftar, baru].sort((a, b) => a.nama.localeCompare(b.nama, 'id')))
      setForm((f) => ({ ...f, kategoriId: String(baru.id) }))
      setKategoriBaru(null)
    } catch (err) {
      toast.error(pesanError(err))
    } finally {
      setMenyimpanKategori(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const hasil = validasi(form, kodeFinal)
    setErrors(hasil)
    if (Object.keys(hasil).length > 0) return

    setMenyimpan(true)
    let urlFotoBaru = null
    try {
      if (await kodeSudahDipakai(kodeFinal, barang?.id)) {
        const kunci = form.sumberKode === 'bmn' ? 'nup' : 'kodeUnik'
        setErrors({ [kunci]: `Kode ${kodeFinal} sudah dipakai barang lain.` })
        return
      }

      if (fotoBaru) urlFotoBaru = await unggahFoto(fotoBaru, 'barang')
      const fotoUrl = fotoBaru === undefined ? form.fotoUrl : urlFotoBaru

      const data = {
        ...form,
        kodeUnik: kodeFinal,
        kodeBmn: form.sumberKode === 'bmn' ? form.kodeBmn : '',
        nup: form.sumberKode === 'bmn' ? form.nup : '',
        fotoUrl,
      }
      let tersimpan = await simpanBarang(data, barang?.id)

      if (!modeUbah && !tanpaStokAwal && Number(form.stokAwal) > 0) {
        try {
          const stok = await catatBarangMasuk({ itemId: tersimpan.id, jumlah: form.stokAwal, catatan: 'Stok awal' })
          tersimpan = { ...tersimpan, stok }
        } catch (err) {
          toast.error(`Barang tersimpan, tetapi stok awal gagal dicatat: ${pesanError(err)} Catat lewat menu Barang Masuk.`, {
            duration: 8000,
          })
        }
      }

      // Foto lama dihapus setelah data baru tersimpan, bukan sebelumnya.
      if (modeUbah && fotoBaru !== undefined && barang.foto_url) hapusFoto(barang.foto_url)

      toast.success(modeUbah ? 'Perubahan barang disimpan.' : `Barang ${tersimpan.nama} ditambahkan.`)
      onSelesai(tersimpan)
    } catch (err) {
      if (urlFotoBaru) hapusFoto(urlFotoBaru)
      toast.error(pesanError(err))
    } finally {
      setMenyimpan(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <Isian id="nama" label="Nama barang" error={errors.nama}>
        <input id="nama" value={form.nama} onChange={ubah('nama')} className={kelasInput(errors.nama)}
          placeholder="Contoh: Kertas HVS A4 80 gram" />
      </Isian>

      <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-medium text-slate-700">Kode unik barang</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2" role="radiogroup">
          <PilihanRadio nama="sumberKode" nilai="internal" terpilih={form.sumberKode} onChange={ubah('sumberKode')}>
            Kode internal
          </PilihanRadio>
          <PilihanRadio nama="sumberKode" nilai="bmn" terpilih={form.sumberKode} onChange={ubah('sumberKode')}>
            Kode BMN + NUP
          </PilihanRadio>
        </div>

        {form.sumberKode === 'internal' ? (
          <Isian id="kodeUnik" label="Kode" error={errors.kodeUnik}>
            <div className="flex gap-2">
              <input id="kodeUnik" value={form.kodeUnik} onChange={ubah('kodeUnik')} onBlur={cekKode}
                className={`${kelasInput(errors.kodeUnik)} font-mono uppercase`} placeholder="BRG-2026-XXXX" />
              <button type="button" className="btn-sekunder shrink-0" onClick={generateKode} disabled={membuatKode}>
                {membuatKode ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Wand2 className="h-4 w-4" aria-hidden="true" />}
                Generate kode
              </button>
            </div>
          </Isian>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
              <Isian id="kodeBmn" label="Kode barang BMN" error={errors.kodeBmn}>
                <input id="kodeBmn" inputMode="numeric" value={form.kodeBmn} onChange={ubah('kodeBmn')} onBlur={cekKode}
                  className={`${kelasInput(errors.kodeBmn)} font-mono`} placeholder="10 digit" />
              </Isian>
              <Isian id="nup" label="NUP" error={errors.nup}>
                <input id="nup" inputMode="numeric" value={form.nup} onChange={ubah('nup')} onBlur={cekKode}
                  className={`${kelasInput(errors.nup)} font-mono`} />
              </Isian>
            </div>
            <p className="text-sm text-slate-600">
              Kode unik yang tersimpan:{' '}
              <span className="font-mono font-medium text-slate-900">{kodeFinal || 'isi kode BMN dan NUP'}</span>
            </p>
          </>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Isian id="kategori" label="Kategori" error={errorKategori}>
          {kategoriBaru === null ? (
            <div className="flex gap-2">
              <select id="kategori" value={form.kategoriId} onChange={ubah('kategoriId')} className="input">
                <option value="">Tanpa kategori</option>
                {kategori.map((k) => (
                  <option key={k.id} value={k.id}>{k.nama}</option>
                ))}
              </select>
              <button type="button" className="btn-sekunder shrink-0 px-3" onClick={() => setKategoriBaru('')}
                aria-label="Tambah kategori baru" title="Tambah kategori baru">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input id="kategori" autoFocus value={kategoriBaru} onChange={(e) => setKategoriBaru(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    simpanKategoriBaru()
                  }
                }}
                className="input" placeholder="Nama kategori baru" />
              <button type="button" className="btn-primer shrink-0 px-3" onClick={simpanKategoriBaru}
                disabled={menyimpanKategori || !kategoriBaru.trim()}>
                Simpan
              </button>
              <button type="button" className="btn-sekunder shrink-0 px-3" onClick={() => setKategoriBaru(null)}>
                Batal
              </button>
            </div>
          )}
        </Isian>

        <Isian id="satuan" label="Satuan" error={errors.satuan}>
          <input id="satuan" list="daftar-satuan" value={form.satuan} onChange={ubah('satuan')} className={kelasInput(errors.satuan)} />
          <datalist id="daftar-satuan">
            {SATUAN_UMUM.map((s) => <option key={s} value={s} />)}
          </datalist>
        </Isian>

        {!modeUbah && !tanpaStokAwal && (
          <Isian id="stokAwal" label="Stok awal" error={errors.stokAwal}
            bantuan="Dicatat sebagai mutasi masuk dengan catatan Stok awal.">
            <input id="stokAwal" type="number" min="0" step="1" inputMode="numeric" value={form.stokAwal}
              onChange={ubah('stokAwal')} className={kelasInput(errors.stokAwal)} />
          </Isian>
        )}

        <Isian id="stokMinimum" label="Stok minimum" error={errors.stokMinimum}
          bantuan="Barang ditandai menipis bila stok sama dengan atau di bawah angka ini.">
          <input id="stokMinimum" type="number" min="0" step="1" inputMode="numeric" value={form.stokMinimum}
            onChange={ubah('stokMinimum')} className={kelasInput(errors.stokMinimum)} />
        </Isian>

        <Isian id="lokasi" label="Lokasi penyimpanan (opsional)" lebarPenuh={!modeUbah && !tanpaStokAwal}>
          <input id="lokasi" value={form.lokasi} onChange={ubah('lokasi')} className="input"
            placeholder="Contoh: Gudang lantai 1, rak B" />
        </Isian>
      </div>

      <Isian id="deskripsi" label="Deskripsi (opsional)">
        <textarea id="deskripsi" rows={3} value={form.deskripsi} onChange={ubah('deskripsi')} className="input" />
      </Isian>

      <ImageUpload id="foto" label="Foto barang (opsional)" urlAwal={form.fotoUrl} onChange={setFotoBaru} />

      {modeUbah && (
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          Stok tidak bisa diubah dari form ini. Gunakan Barang Masuk untuk menambah stok, atau Koreksi stok untuk
          menyesuaikan hasil stock opname.
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
        <button type="button" className="btn-sekunder" onClick={onBatal} disabled={menyimpan}>Batal</button>
        <button type="submit" className="btn-primer" disabled={menyimpan}>
          {menyimpan && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {menyimpan ? 'Menyimpan...' : modeUbah ? 'Simpan perubahan' : 'Tambah barang'}
        </button>
      </div>
    </form>
  )
}

function kelasInput(error) {
  return `input ${error ? 'input-error' : ''}`
}

function Isian({ id, label, error, bantuan, lebarPenuh, children }) {
  return (
    <div className={lebarPenuh ? 'sm:col-span-2' : ''}>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {bantuan && !error && <p className="mt-1 text-xs text-slate-600">{bantuan}</p>}
      {error && <p className="teks-error">{error}</p>}
    </div>
  )
}

function PilihanRadio({ nama, nilai, terpilih, onChange, children }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-slate-700">
      <input type="radio" name={nama} value={nilai} checked={terpilih === nilai} onChange={onChange}
        className="h-4 w-4 accent-primer-700" />
      {children}
    </label>
  )
}
