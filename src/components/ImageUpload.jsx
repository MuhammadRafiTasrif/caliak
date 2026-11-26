import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { kompresGambar, TIPE_FOTO } from '../utils/kompresGambar'
import { formatUkuranFile } from '../utils/format'

// Memilih foto, mengecek format dan ukuran, lalu mengompresnya di browser.
// onChange dipanggil dengan:
//   File  -> foto baru yang sudah dikompres, siap diunggah
//   null  -> pengguna menghapus foto
// Selama onChange belum dipanggil, foto lama (urlAwal) dianggap tidak berubah.
export default function ImageUpload({ id, label, keterangan, urlAwal, onChange }) {
  const inputRef = useRef(null)
  const [pratinjau, setPratinjau] = useState(urlAwal || null)
  const [info, setInfo] = useState('')
  const [error, setError] = useState('')
  const [memproses, setMemproses] = useState(false)

  // URL sementara dari createObjectURL perlu dilepas agar tidak membebani memori.
  useEffect(() => {
    return () => {
      if (pratinjau?.startsWith('blob:')) URL.revokeObjectURL(pratinjau)
    }
  }, [pratinjau])

  async function pilihFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setError('')
    setMemproses(true)
    try {
      const hasil = await kompresGambar(file)
      setPratinjau(URL.createObjectURL(hasil))
      setInfo(`${formatUkuranFile(file.size)} dikompres menjadi ${formatUkuranFile(hasil.size)}`)
      onChange(hasil)
    } catch (err) {
      setError(err.message)
    } finally {
      setMemproses(false)
    }
  }

  function hapus() {
    setPratinjau(null)
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
            <img src={pratinjau} alt="Pratinjau foto" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-8 w-8 text-slate-500" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-sekunder"
              onClick={() => inputRef.current.click()}
              disabled={memproses}
              aria-describedby={`${id}-ket`}
            >
              {pratinjau ? 'Ganti foto' : 'Pilih foto'}
            </button>
            {pratinjau && (
              <button type="button" className="btn-sekunder" onClick={hapus} disabled={memproses}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Hapus
              </button>
            )}
          </div>
          <p id={`${id}-ket`} className="text-xs text-slate-600">
            {keterangan || 'JPG, PNG, atau WebP. Foto otomatis dikecilkan hingga di bawah 2 MB.'}
          </p>
          {info && <p className="text-xs text-slate-600">{info}</p>}
          {error && <p className="teks-error" role="alert">{error}</p>}
        </div>
      </div>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={TIPE_FOTO.join(',')}
        className="hidden"
        onChange={pilihFile}
        aria-labelledby={`${id}-label`}
      />
    </div>
  )
}
