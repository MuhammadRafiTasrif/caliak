import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { pasangTema, temaSekarang } from '../utils/tema'

// Tombol ganti tema terang/gelap.
// varian 'sidebar': tombol lebar berlabel di sidebar admin.
// varian 'ikon': tombol ikon 44px untuk header (label dibaca pembaca layar).
// varian 'biasa': tombol sekunder, misalnya di halaman Masuk.
export default function TombolTema({ varian = 'biasa' }) {
  const [tema, setTema] = useState(temaSekarang)
  const keGelap = tema === 'terang'
  const label = keGelap ? 'Tema gelap' : 'Tema terang'
  const Ikon = keGelap ? Moon : Sun

  function ganti() {
    const baru = keGelap ? 'gelap' : 'terang'
    pasangTema(baru)
    setTema(baru)
  }

  if (varian === 'ikon') {
    return (
      <button type="button" onClick={ganti} aria-label={label} title={label}
        className="flex h-11 w-11 items-center justify-center rounded-lg text-white hover:bg-white/10">
        <Ikon className="h-5 w-5" />
      </button>
    )
  }
  if (varian === 'sidebar') {
    return (
      <button type="button" onClick={ganti}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-white hover:bg-white/10">
        <Ikon className="h-4 w-4" aria-hidden="true" />
        {label}
      </button>
    )
  }
  return (
    <button type="button" onClick={ganti} className="btn-sekunder">
      <Ikon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  )
}
