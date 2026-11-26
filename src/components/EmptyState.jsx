import { Inbox } from 'lucide-react'

export default function EmptyState({ ikon: Ikon = Inbox, judul, pesan, aksi }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Ikon className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="font-semibold text-slate-700">{judul}</p>
      {pesan && <p className="mt-1 max-w-sm text-sm text-slate-500">{pesan}</p>}
      {aksi && <div className="mt-4">{aksi}</div>}
    </div>
  )
}
