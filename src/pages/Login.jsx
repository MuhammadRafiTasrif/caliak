import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { halamanAwal, useAuth } from '../context/AuthContext'
import { pesanError } from '../lib/supabaseClient'
import AuthShell from '../components/AuthShell'
import Loading from '../components/Loading'

export default function Login() {
  const { user, role, isVerified, loading, login } = useAuth()
  const lokasi = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mengirim, setMengirim] = useState(false)
  const [error, setError] = useState('')

  // Sudah login: arahkan ke halaman yang sesuai.
  if (loading) return <Loading layarPenuh />
  if (user) {
    if (!isVerified) return <Navigate to="/menunggu-verifikasi" replace />
    return <Navigate to={lokasi.state?.dari || halamanAwal(role)} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMengirim(true)
    try {
      await login(email.trim(), password)
      // Pengalihan terjadi otomatis lewat pengecekan `user` di atas.
    } catch (err) {
      setError(pesanError(err))
    } finally {
      setMengirim(false)
    }
  }

  return (
    <AuthShell judul="Masuk" keterangan="Gunakan email dan kata sandi yang Anda daftarkan.">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <div>
          <label htmlFor="email" className="label">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@instansi.go.id"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="label">Kata sandi</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn-primer w-full" disabled={mengirim || !email || !password}>
          {mengirim && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {mengirim ? 'Memproses...' : 'Masuk'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Belum punya akun?{' '}
        <Link to="/daftar" className="font-semibold text-primer-700 hover:underline">
          Daftar di sini
        </Link>
      </p>
    </AuthShell>
  )
}
