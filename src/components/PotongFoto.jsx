import { useState } from 'react'
import Cropper from 'react-easy-crop'
import { Loader2, RotateCw } from 'lucide-react'
import Modal from './Modal'

// Pilihan bentuk potongan. 'asli' mengikuti perbandingan foto aslinya.
const BENTUK = [
  { kunci: 'persegi', label: 'Persegi', nilai: 1 },
  { kunci: '4:3', label: '4:3', nilai: 4 / 3 },
  { kunci: '3:4', label: '3:4', nilai: 3 / 4 },
  { kunci: 'asli', label: 'Asli', nilai: null },
]

// Jendela untuk memotong foto sebelum diunggah.
// onPakai(area, putar) dipanggil dengan area piksel yang dipilih;
// onUtuh() bila pengguna memilih memakai foto tanpa dipotong.
export default function PotongFoto({ sumber, bentukAwal = 'persegi', memproses, onPakai, onUtuh, onBatal }) {
  const [posisi, setPosisi] = useState({ x: 0, y: 0 })
  const [perbesar, setPerbesar] = useState(1)
  const [putar, setPutar] = useState(0)
  const [bentuk, setBentuk] = useState(bentukAwal)
  const [rasioAsli, setRasioAsli] = useState(4 / 3)
  const [area, setArea] = useState(null)

  const dipilih = BENTUK.find((b) => b.kunci === bentuk)
  // Foto yang diputar 90 atau 270 derajat bertukar lebar dan tingginya.
  const rasio = dipilih.nilai ?? (putar % 180 === 0 ? rasioAsli : 1 / rasioAsli)

  return (
    <Modal terbuka onTutup={onBatal} judul="Potong foto" lebar="max-w-2xl" tutupDiLuar={false} terkunci={memproses}
      keterangan="Geser foto untuk mengatur bagian yang dipakai. Di HP, cubit layar untuk memperbesar.">
      <div className="relative h-[52vh] max-h-[420px] min-h-[260px] overflow-hidden rounded-lg bg-neutral-900">
        <Cropper
          image={sumber}
          crop={posisi}
          zoom={perbesar}
          rotation={putar}
          aspect={rasio}
          minZoom={1}
          maxZoom={4}
          zoomSpeed={0.3}
          onCropChange={setPosisi}
          onZoomChange={setPerbesar}
          onCropComplete={(_, piksel) => setArea(piksel)}
          onMediaLoaded={({ naturalWidth, naturalHeight }) => setRasioAsli(naturalWidth / naturalHeight)}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label htmlFor="perbesar" className="label">Perbesar</label>
          <input id="perbesar" type="range" min="1" max="4" step="0.05" value={perbesar}
            onChange={(e) => setPerbesar(Number(e.target.value))} className="h-11 w-full accent-primer-700" />
        </div>
        <button type="button" className="btn-sekunder" onClick={() => setPutar((p) => (p + 90) % 360)}>
          <RotateCw className="h-4 w-4" aria-hidden="true" />
          Putar 90°
        </button>
      </div>

      <fieldset className="mt-3">
        <legend className="label">Bentuk</legend>
        <div className="flex flex-wrap gap-2">
          {BENTUK.map((b) => (
            <button key={b.kunci} type="button" aria-pressed={bentuk === b.kunci} onClick={() => setBentuk(b.kunci)}
              className={`min-h-11 rounded-lg px-4 text-sm font-medium ${
                bentuk === b.kunci ? 'pilihan-aktif' : 'pilihan-pasif'
              }`}>
              {b.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
        <button type="button" className="btn-sekunder" onClick={onBatal} disabled={memproses}>Batal</button>
        <button type="button" className="btn-sekunder" onClick={onUtuh} disabled={memproses}>Pakai foto utuh</button>
        <button type="button" className="btn-primer" onClick={() => onPakai(area, putar)} disabled={memproses || !area}>
          {memproses && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {memproses ? 'Memproses...' : 'Pakai foto ini'}
        </button>
      </div>
    </Modal>
  )
}
