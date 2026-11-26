const ZONA = 'Asia/Jakarta'

// "26 November 2026"
export function formatTanggal(nilai) {
  if (!nilai) return '-'
  // Tanggal murni (2026-11-26) dibaca sebagai tanggal lokal, bukan UTC,
  // supaya tidak bergeser satu hari.
  const tanggal = typeof nilai === 'string' && nilai.length === 10 ? new Date(`${nilai}T00:00:00`) : new Date(nilai)
  return tanggal.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: ZONA })
}

// "26 Nov 2026, 14.05"
export function formatWaktu(nilai) {
  if (!nilai) return '-'
  return new Date(nilai).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: ZONA,
  })
}

// 1250 -> "1.250"
export function formatAngka(nilai) {
  return new Intl.NumberFormat('id-ID').format(nilai ?? 0)
}

// 1536000 -> "1,5 MB"
export function formatUkuranFile(byte) {
  if (byte < 1024 * 1024) return `${formatAngka(Math.round(byte / 1024))} KB`
  return `${(byte / (1024 * 1024)).toLocaleString('id-ID', { maximumFractionDigits: 1 })} MB`
}

// Tanggal hari ini (WIB) dalam format input date: "2026-11-26".
export function hariIni() {
  return new Date().toLocaleDateString('en-CA', { timeZone: ZONA })
}
