import { useEffect, useRef, useState } from 'react'
import { Crop, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import PotongFoto from './PotongFoto'
import { kompresGambar, periksaFoto, TIPE_FOTO } from '../utils/kompresGambar'
import { potongGambar } from '../utils/potongGambar'
import { formatUkuranFile } from '../utils/format'

// Memilih foto, memotongnya (opsional), lalu mengompresnya di browser.
// onChange dipanggil dengan:
//   File  -> foto baru yang sudah dipotong dan dikompres, siap diunggah
//   null  -> pengguna menghapus foto
// Selama onChange belum dipanggil, foto lama (urlAwal) dianggap tidak berubah.
// bentukPotong: bentuk awal di jendela Potong foto ('persegi', '4:3', '3:4', 'asli').
export default function ImageUpload({ id, label, keterangan, urlAwal, onChange, bentukPotong = 'persegi' }) {
  const inputRef = useRef(null)
  const [pratinjau, setPratinjau] = useState(urlAwal || null)
  // Foto asli yang dipilih, disimpan agar bisa dipotong ulang.
  const [asli, setAsli] = useState(null) // { file, url }
  const [jendelaPotong, setJendelaPotong] = useState(false)
  // true bila foto asli di atas sudah dipakai (bukan dibatalkan).
  const [asliDipakai, setAsliDipakai] = useState(false)
  const [info, setInfo] = useState('')
  const [error, setError] = useState('')
  const [memproses, setMemproses] = useState(false)

  // URL sementara dari createObjectURL perlu dilepas agar tidak membebani memori.
  useEffect(() => {
    return () => {
      if (pratinjau?.startsWith('blob:')) URL.revokeObjectURL(pratinjau)
    }
  }, [pratinjau])
  useEffect(() => {
    return () => {
      if (asli) URL.revokeObjectURL(asli.url)
    }
  }, [asli])

  function pilihFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    try {
      periksaFoto(file)
      setAsli({ file, url: URL.createObjectURL(file) })
      setAsliDipakai(false)
      setJendelaPotong(true)
    } catch (err) {
      setError(err.message)
    }
  }

  // potong: null berarti foto dipakai utuh.
  async function simpan(potong) {
    setMemproses(true)
    setError('')
    try {
      const sumber = potong ? await potongGambar(asli.url, potong.area, potong.putar, asli.file.name) : asli.file
      const hasil = await kompresGambar(sumber)
      setPratinjau(URL.createObjectURL(hasil))
      setInfo(`${formatUkuranFile(asli.file.size)} ${potong ? 'dipotong dan ' : ''}dikompres menjadi ${formatUkuranFile(hasil.size)}`)
      onChange(hasil)
      setAsliDipakai(true)
      setJendelaPotong(false)
    } catch (err) {
      setError(err.message)
      setJendelaPotong(false)
    } finally {
      setMemproses(false)
    }
  }

  function hapus() {
    setPratinjau(null)
    setAsli(null)
    setInfo('')
    setError('')
    onChange(null)
  }

  return (
    <div>
      <p className="label" id={`${id}-label`}>{label}</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50">
          {memproses ? (
            <Loader2 className="h-6 w-6 animate-spin text-primer-600" aria-label="Memproses foto" />
          ) : pratinjau ? (
            <img src={pratinjau} alt="Pratinjau foto" className="h-full w-full object-contain" />
          ) : (
            <ImagePlus className="h-8 w-8 text-slate-500" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-sekunder" onClick={() => inputRef.current.click()} disabled={memproses}
              aria-describedby={`${id}-ket`}>
              {pratinjau ? 'Ganti foto' : 'Pilih foto'}
            </button>
            {asli && asliDipakai && pratinjau && (
              <button type="button" className="btn-sekunder" onClick={() => setJendelaPotong(true)} disabled={memproses}>
                <Crop className="h-4 w-4" aria-hidden="true" />
                Potong ulang
              </button>
            )}
            {pratinjau && (
              <button type="button" className="btn-sekunder" onClick={hapus} disabled={memproses}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Hapus
              </button>
            )}
          </div>
          <p id={`${id}-ket`} className="text-xs text-slate-600">
            {keterangan || 'JPG, PNG, atau WebP. Foto bisa dipotong, lalu otomatis dikecilkan hingga di bawah 2 MB.'}
          </p>
          {info && <p className="text-xs text-slate-600">{info}</p>}
          {error && <p className="teks-error" role="alert">{error}</p>}
        </div>
      </div>

      <input ref={inputRef} id={id} type="file" accept={TIPE_FOTO.join(',')} className="hidden" onChange={pilihFile}
        aria-labelledby={`${id}-label`} />

      {jendelaPotong && asli && (
        <PotongFoto
          sumber={asli.url}
          bentukAwal={bentukPotong}
          memproses={memproses}
          onPakai={(area, putar) => simpan({ area, putar })}
          onUtuh={() => simpan(null)}
          onBatal={() => {
            setJendelaPotong(false)
            if (!asliDipakai) setAsli(null)
          }}
        />
      )}
    </div>
  )
}
