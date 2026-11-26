import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Clock, RefreshCw } from 'lucide-react'
import { halamanAwal, useAuth } from '../context/AuthContext'
import AuthShell from '../components/AuthShell'
import Loading from '../components/Loading'

export default function MenungguVerifikasi() {
  const { user, profile, role, isVerified, loading, errorProfil, logout, muatUlangProfil } = useAuth()
  const [memeriksa, setMemeriksa] = useState(false)

  if (loading && !memeriksa) return <Loading layarPenuh />
  if (!user) return <Navigate to="/login" replace />
  if (isVerified) return <Navigate to={halamanAwal(role)} replace />

  async function periksaLagi() {
    setMemeriksa(true)
    await muatUlangProfil()
    setMemeriksa(false)
  }

  return (
    <AuthShell judul="Akun menunggu verifikasi">
      {errorProfil ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{errorProfil}</p>
      ) : (
        <div className="kartu p-5">
          <div className="flex gap-3">
            <Clock className="h-6 w-6 shrink-0 text-amber-500" aria-hidden="true" />
            <p className="text-sm text-slate-600">
              Pendaftaran Anda sudah diterima. Admin perlu memverifikasi akun ini sebelum Anda bisa melihat katalog dan
              mengajukan permintaan barang.
            </p>
          </div>
          <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-sm">
            <dt className="text-slate-500">Nama</dt>
            <dd className="font-medium text-slate-800">{profile?.nama}</dd>
            <dt className="text-slate-500">NIP</dt>
            <dd className="font-medium text-slate-800">{profile?.nip || '-'}</dd>
            <dt className="text-slate-500">Unit kerja</dt>
            <dd className="font-medium text-slate-800">{profile?.unit_kerja || '-'}</dd>
          </dl>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={periksaLagi} className="btn-primer" disabled={memeriksa}>
          <RefreshCw className={`h-4 w-4 ${memeriksa ? 'animate-spin' : ''}`} aria-hidden="true" />
          Periksa status
        </button>
        <button type="button" onClick={logout} className="btn-sekunder">Keluar</button>
      </div>
    </AuthShell>
  )
}
