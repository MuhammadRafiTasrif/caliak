import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { halamanAwal, useAuth } from '../context/AuthContext'
import Loading from './Loading'

// Menjaga halaman agar hanya bisa dibuka oleh pengguna yang:
//   1. sudah login,
//   2. akunnya sudah diverifikasi Admin,
//   3. punya role yang diizinkan (bila `peran` diisi).
// Ini hanya untuk kenyamanan tampilan. Pengamanan data yang sebenarnya
// ada di RLS dan fungsi database.
export default function ProtectedRoute({ peran }) {
  const { user, role, isVerified, loading, errorProfil } = useAuth()
  const lokasi = useLocation()

  if (loading) return <Loading layarPenuh />

  if (!user) return <Navigate to="/login" replace state={{ dari: lokasi.pathname }} />

  if (errorProfil || !isVerified) return <Navigate to="/menunggu-verifikasi" replace />

  if (peran && !peran.includes(role)) return <Navigate to={halamanAwal(role)} replace />

  return <Outlet />
}
