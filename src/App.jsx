import { Navigate, Route, Routes } from 'react-router-dom'
import { supabaseSiap } from './lib/supabaseClient'
import { AuthProvider, halamanAwal, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Loading from './components/Loading'

import Login from './pages/Login'
import Register from './pages/Register'
import MenungguVerifikasi from './pages/MenungguVerifikasi'
import BelumDikonfigurasi from './pages/BelumDikonfigurasi'
import Katalog from './pages/Katalog'
import BuatPermintaan from './pages/pemohon/BuatPermintaan'
import PermintaanSaya from './pages/pemohon/PermintaanSaya'
import Dashboard from './pages/admin/Dashboard'
import KelolaBarang from './pages/admin/KelolaBarang'
import ImporBarang from './pages/admin/ImporBarang'
import BarangMasuk from './pages/admin/BarangMasuk'
import Persetujuan from './pages/admin/Persetujuan'
import Riwayat from './pages/admin/Riwayat'
import KelolaPengguna from './pages/admin/KelolaPengguna'

export default function App() {
  if (!supabaseSiap) return <BelumDikonfigurasi />

  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/daftar" element={<Register />} />
        <Route path="/menunggu-verifikasi" element={<MenungguVerifikasi />} />

        {/* Semua pengguna terverifikasi (admin juga boleh mengajukan permintaan) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/katalog" element={<Katalog />} />
            <Route path="/permintaan/baru" element={<BuatPermintaan />} />
            <Route path="/permintaan-saya" element={<PermintaanSaya />} />
          </Route>
        </Route>

        {/* Khusus admin */}
        <Route element={<ProtectedRoute peran={['admin']} />}>
          <Route element={<Layout />}>
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/barang" element={<KelolaBarang />} />
            <Route path="/admin/barang/impor" element={<ImporBarang />} />
            <Route path="/admin/barang-masuk" element={<BarangMasuk />} />
            <Route path="/admin/persetujuan" element={<Persetujuan />} />
            <Route path="/admin/riwayat" element={<Riwayat />} />
            <Route path="/admin/pengguna" element={<KelolaPengguna />} />
          </Route>
        </Route>

        <Route path="*" element={<ArahkanKeAwal />} />
      </Routes>
    </AuthProvider>
  )
}

// Alamat "/" atau alamat yang tidak dikenal diarahkan sesuai status login.
function ArahkanKeAwal() {
  const { user, role, loading } = useAuth()
  if (loading) return <Loading layarPenuh />
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={halamanAwal(role)} replace />
}
