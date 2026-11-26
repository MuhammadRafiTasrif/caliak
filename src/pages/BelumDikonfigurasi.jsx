import { Settings } from 'lucide-react'
import AuthShell from '../components/AuthShell'

// Tampil bila file .env belum diisi, supaya tidak muncul layar kosong.
export default function BelumDikonfigurasi() {
  return (
    <AuthShell judul="Koneksi Supabase belum diatur">
      <div className="kartu flex gap-3 p-5 text-sm text-slate-600">
        <Settings className="h-6 w-6 shrink-0 text-primer-600" aria-hidden="true" />
        <ol className="list-decimal space-y-1.5 pl-4">
          <li>Salin file <code className="rounded bg-slate-100 px-1">.env.example</code> menjadi <code className="rounded bg-slate-100 px-1">.env</code>.</li>
          <li>Isi <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_URL</code> dan <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_ANON_KEY</code> dari Supabase (Project Settings, API).</li>
          <li>Hentikan lalu jalankan ulang <code className="rounded bg-slate-100 px-1">npm run dev</code>.</li>
        </ol>
      </div>
    </AuthShell>
  )
}
