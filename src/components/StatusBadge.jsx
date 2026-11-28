// Warna mengikuti spesifikasi: menunggu kuning, disetujui biru, selesai hijau,
// ditolak merah, dibatalkan abu-abu. Teks status selalu ditulis, tidak hanya warna.
const GAYA = {
  menunggu: 'bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200',
  disetujui: 'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-200',
  selesai: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200',
  ditolak: 'bg-red-100 dark:bg-red-900/50 text-red-900 dark:text-red-200',
  dibatalkan: 'bg-slate-200 text-slate-800',
}

export const LABEL_STATUS = {
  menunggu: 'Menunggu',
  disetujui: 'Disetujui',
  selesai: 'Selesai',
  ditolak: 'Ditolak',
  dibatalkan: 'Dibatalkan',
}

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${GAYA[status] ?? GAYA.dibatalkan}`}>
      {LABEL_STATUS[status] ?? status}
    </span>
  )
}
