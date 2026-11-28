import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Loader2, MailCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { pesanError } from '../lib/supabaseClient'
import AuthShell from '../components/AuthShell'

const FORM_KOSONG = { nip: '', nama: '', unitKerja: '', email: '', password: '', ulangiPassword: '' }

function validasi(f) {
  const e = {}
  if (!/^\d{18}$/.test(f.nip.trim())) e.nip = 'NIP harus 18 digit angka.'
  if (f.nama.trim().length < 3) e.nama = 'Nama lengkap wajib diisi.'
  if (!f.unitKerja.trim()) e.unitKerja = 'Unit kerja wajib diisi.'
  if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Format email tidak valid.'
  if (f.password.length < 8) e.password = 'Kata sandi minimal 8 karakter.'
  if (f.ulangiPassword !== f.password) e.ulangiPassword = 'Kata sandi tidak sama.'
  return e
}

export default function Register() {
  const { user, register } = useAuth()
  const [form, setForm] = useState(FORM_KOSONG)
  const [errors, setErrors] = useState({})
  const [errorServer, setErrorServer] = useState('')
  const [mengirim, setMengirim] = useState(false)
  const [cekEmail, setCekEmail] = useState(false)

  // Berhasil daftar tanpa konfirmasi email: Supabase langsung membuat sesi.
  if (user) return <Navigate to="/menunggu-verifikasi" replace />

  function ubah(nama) {
    return (e) => setForm({ ...form, [nama]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const hasil = validasi(form)
    setErrors(hasil)
    setErrorServer('')
    if (Object.keys(hasil).length > 0) return

    setMengirim(true)
    try {
      const { perluKonfirmasiEmail } = await register({
        email: form.email.trim(),
        password: form.password,
        nip: form.nip.trim(),
        nama: form.nama.trim(),
        unitKerja: form.unitKerja.trim(),
      })
      if (perluKonfirmasiEmail) setCekEmail(true)
    } catch (err) {
      setErrorServer(pesanError(err))
    } finally {
      setMengirim(false)
    }
  }

  if (cekEmail) {
    return (
      <AuthShell judul="Cek email Anda">
        <div className="kartu flex gap-3 p-4">
          <MailCheck className="h-6 w-6 shrink-0 text-primer-600" aria-hidden="true" />
          <p className="text-sm text-slate-600">
            Kami mengirim tautan konfirmasi ke <strong>{form.email}</strong>. Klik tautan itu, lalu tunggu Admin
            memverifikasi akun Anda sebelum bisa mengajukan permintaan.
          </p>
        </div>
        <Link to="/login" className="btn-sekunder mt-6 w-full">Kembali ke halaman masuk</Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell judul="Daftar akun pegawai" keterangan="Akun bisa dipakai setelah diverifikasi Admin.">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {errorServer && (
          <p className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2.5 text-sm text-red-700 dark:text-red-400" role="alert">
            {errorServer}
          </p>
        )}

        <Isian id="nip" label="NIP" error={errors.nip}>
          <input id="nip" inputMode="numeric" maxLength={18} value={form.nip} onChange={ubah('nip')}
            className={`input ${errors.nip ? 'input-error' : ''}`} placeholder="18 digit" />
        </Isian>

        <Isian id="nama" label="Nama lengkap" error={errors.nama}>
          <input id="nama" autoComplete="name" value={form.nama} onChange={ubah('nama')}
            className={`input ${errors.nama ? 'input-error' : ''}`} />
        </Isian>

        <Isian id="unitKerja" label="Unit kerja" error={errors.unitKerja}>
          <input id="unitKerja" value={form.unitKerja} onChange={ubah('unitKerja')}
            className={`input ${errors.unitKerja ? 'input-error' : ''}`} placeholder="Contoh: Subbagian Umum" />
        </Isian>

        <Isian id="email" label="Email" error={errors.email}>
          <input id="email" type="email" autoComplete="email" value={form.email} onChange={ubah('email')}
            className={`input ${errors.email ? 'input-error' : ''}`} placeholder="nama@instansi.go.id" />
        </Isian>

        <div className="grid gap-4 sm:grid-cols-2">
          <Isian id="password" label="Kata sandi" error={errors.password}>
            <input id="password" type="password" autoComplete="new-password" value={form.password}
              onChange={ubah('password')} className={`input ${errors.password ? 'input-error' : ''}`} />
          </Isian>
          <Isian id="ulangiPassword" label="Ulangi kata sandi" error={errors.ulangiPassword}>
            <input id="ulangiPassword" type="password" autoComplete="new-password" value={form.ulangiPassword}
              onChange={ubah('ulangiPassword')} className={`input ${errors.ulangiPassword ? 'input-error' : ''}`} />
          </Isian>
        </div>

        <button type="submit" className="btn-primer w-full" disabled={mengirim}>
          {mengirim && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {mengirim ? 'Mendaftarkan...' : 'Daftar'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Sudah punya akun?{' '}
        <Link to="/login" className="font-semibold text-primer-700 hover:underline">Masuk</Link>
      </p>
    </AuthShell>
  )
}

function Isian({ id, label, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {error && <p className="teks-error">{error}</p>}
    </div>
  )
}
