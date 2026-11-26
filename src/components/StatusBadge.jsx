// Warna mengikuti spesifikasi: menunggu kuning, disetujui biru, selesai hijau,
// ditolak merah, dibatalkan abu-abu. Teks status selalu ditulis, tidak hanya warna.
const GAYA = {
  menunggu: 'bg-amber-100 text-amber-900',
  disetujui: 'bg-blue-100 text-blue-900',
  selesai: 'bg-emerald-100 text-emerald-900',
  ditolak: 'bg-red-100 text-red-900',
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
