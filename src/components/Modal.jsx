import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

// Jendela dialog berbasis <dialog> bawaan browser: Escape menutup dialog,
// dan fokus keyboard tertahan di dalamnya selama terbuka.
// `tutupDiLuar` false untuk form, supaya isian tidak hilang karena salah klik.
export default function Modal({ terbuka, onTutup, judul, keterangan, children, lebar = 'max-w-lg', tutupDiLuar = true, terkunci = false }) {
  const ref = useRef(null)
  // Menghubungkan dialog ke judul dan keterangannya untuk pembaca layar.
  const idJudul = useId()
  const idKet = useId()

  useEffect(() => {
    const dialog = ref.current
    if (terbuka && !dialog.open) dialog.showModal()
    if (!terbuka && dialog.open) dialog.close()
  }, [terbuka])

  function tutup() {
    if (!terkunci) onTutup()
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={idJudul}
      aria-describedby={keterangan ? idKet : undefined}
      onCancel={(e) => {
        e.preventDefault()
        tutup()
      }}
      onClick={(e) => tutupDiLuar && e.target === ref.current && tutup()}
      className={`w-[calc(100%-2rem)] ${lebar} max-h-[calc(100dvh-2rem)] rounded-xl bg-permukaan p-0 text-slate-800 shadow-xl backdrop:bg-black/60`}
    >
      {terbuka && (
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 id={idJudul} className="text-lg font-bold text-slate-900">{judul}</h2>
              {keterangan && <p id={idKet} className="mt-1 text-sm text-slate-600">{keterangan}</p>}
            </div>
            <button
              type="button"
              onClick={tutup}
              disabled={terkunci}
              className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              aria-label="Tutup"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}
