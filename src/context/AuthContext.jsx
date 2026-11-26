import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ambilProfil } from '../services/userService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [memuatSesi, setMemuatSesi] = useState(true)
  const [memuatProfil, setMemuatProfil] = useState(false)
  const [errorProfil, setErrorProfil] = useState('')

  const userId = session?.user?.id

  // 1. Ambil sesi yang tersimpan, lalu dengarkan perubahan login/logout.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setMemuatSesi(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, sesiBaru) => {
      // Jangan memanggil query Supabase di dalam callback ini (bisa macet).
      // Profil diambil oleh useEffect di bawah saat userId berubah.
      setSession(sesiBaru)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // 2. Ambil profil setiap kali pengguna yang login berganti.
  useEffect(() => {
    if (!userId) {
      setProfile(null)
      return
    }
    muatProfil(userId)
  }, [userId])

  async function muatProfil(id) {
    setMemuatProfil(true)
    setErrorProfil('')
    try {
      const data = await ambilProfil(id)
      setProfile(data)
      if (!data) setErrorProfil('Profil akun tidak ditemukan. Hubungi Admin.')
    } catch (err) {
      setErrorProfil('Gagal memuat profil. Coba muat ulang halaman.')
      console.error(err)
    } finally {
      setMemuatProfil(false)
    }
  }

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  // Data tambahan dikirim sebagai metadata; trigger handle_new_user
  // di database memindahkannya ke tabel profiles.
  async function register({ email, password, nip, nama, unitKerja }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nip, nama, unit_kerja: unitKerja } },
    })
    if (error) throw error
    // session null berarti Supabase meminta konfirmasi email dulu.
    return { perluKonfirmasiEmail: !data.session }
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  const nilai = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    isAdmin: profile?.role === 'admin',
    isVerified: profile?.is_verified === true,
    loading: memuatSesi || memuatProfil || (Boolean(userId) && !profile && !errorProfil),
    errorProfil,
    login,
    register,
    logout,
    muatUlangProfil: () => userId && muatProfil(userId),
  }

  return <AuthContext.Provider value={nilai}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>')
  return ctx
}

// Halaman awal setelah login, sesuai role.
export function halamanAwal(role) {
  return role === 'admin' ? '/admin' : '/katalog'
}
