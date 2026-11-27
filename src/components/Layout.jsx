import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowDownToLine,
  ClipboardCheck,
  ClipboardList,
  History,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  PlusCircle,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { usePermintaan } from '../context/PermintaanContext'
import Brand from './Brand'

const MENU_ADMIN = [
  { ke: '/admin', label: 'Dashboard', ikon: LayoutDashboard, persis: true },
  { ke: '/admin/persetujuan', label: 'Persetujuan', ikon: ClipboardCheck, badge: 'menunggu' },
  { ke: '/admin/barang', label: 'Kelola Barang', ikon: Package },
  { ke: '/admin/barang-masuk', label: 'Barang Masuk', ikon: ArrowDownToLine },
  { ke: '/admin/riwayat', label: 'Riwayat', ikon: History },
  { ke: '/admin/pengguna', label: 'Kelola Pengguna', ikon: Users, badge: 'belumVerifikasi' },
]

const MENU_PEMOHON = [
  { ke: '/katalog', label: 'Katalog', ikon: LayoutGrid },
  { ke: '/permintaan/baru', label: 'Buat Permintaan', ikon: PlusCircle },
  { ke: '/permintaan-saya', label: 'Permintaan Saya', ikon: ClipboardList, badge: 'pembaruan' },
]

const KETERANGAN_BADGE = {
  menunggu: 'permintaan menunggu persetujuan',
  pembaruan: 'permintaan dengan status baru',
  belumVerifikasi: 'akun menunggu verifikasi',
}

// Angka kecil di menu. `jenis` adalah nama angka di PermintaanContext.
function AngkaBadge({ jenis, className = '' }) {
  const angka = usePermintaan()[jenis] ?? 0
  if (!jenis || angka === 0) return null
  return (
    <span className={`inline-flex min-w-5 items-center justify-center rounded-full bg-amber-400 px-1.5 text-[11px] font-bold leading-5 text-slate-900 ${className}`}>
      {angka > 99 ? '99+' : angka}
      <span className="sr-only"> {KETERANGAN_BADGE[jenis]}</span>
    </span>
  )
}

// Keluar lalu buka halaman Masuk tanpa mengingat halaman terakhir, supaya
// pengguna berikutnya di perangkat yang sama mulai dari halaman awalnya sendiri.
function useKeluar() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  return async () => {
    await logout()
    navigate('/login', { replace: true, state: null })
    toast.success('Anda sudah keluar.')
  }
}

export default function Layout() {
  const { isAdmin } = useAuth()
  return isAdmin ? <LayoutAdmin /> : <LayoutPemohon />
}

// Admin: sidebar tetap di desktop, laci yang dibuka lewat tombol Menu di HP.
function LayoutAdmin() {
  const [laciTerbuka, setLaciTerbuka] = useState(false)
  const lokasi = useLocation()

  useEffect(() => setLaciTerbuka(false), [lokasi.pathname])

  useEffect(() => {
    if (!laciTerbuka) return
    const tutupDenganEsc = (e) => e.key === 'Escape' && setLaciTerbuka(false)
    window.addEventListener('keydown', tutupDenganEsc)
    return () => window.removeEventListener('keydown', tutupDenganEsc)
  }, [laciTerbuka])

  return (
    <div className="min-h-screen lg:flex">
      <header
        data-gelap
        className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-primer-800 px-4 py-2 lg:hidden"
      >
        <Brand terang tagline={false} />
        <button
          type="button"
          onClick={() => setLaciTerbuka(true)}
          className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-white hover:bg-white/10"
          aria-expanded={laciTerbuka}
          aria-controls="sidebar-admin"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
          Menu
        </button>
      </header>

      {laciTerbuka && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={() => setLaciTerbuka(false)} />
      )}

      {/* Saat laci tertutup di HP, `invisible` mencegah tautannya terjangkau tombol Tab. */}
      <aside
        id="sidebar-admin"
        data-gelap
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-primer-800 transition-transform lg:visible lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          laciTerbuka ? 'visible translate-x-0' : 'invisible -translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between gap-2 border-b border-white/10 px-5 py-5">
          <Brand terang />
          <button
            type="button"
            onClick={() => setLaciTerbuka(false)}
            className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-primer-100 hover:bg-white/10 lg:hidden"
            aria-label="Tutup menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          <GrupMenu judul="Administrasi" menu={MENU_ADMIN} />
          <GrupMenu judul="Permintaan barang" menu={MENU_PEMOHON} />
        </nav>

        <KakiSidebar />
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <Outlet />
      </main>
    </div>
  )
}

function GrupMenu({ judul, menu }) {
  return (
    <div>
      <p className="mb-2 px-3 text-xs font-medium text-primer-200">{judul}</p>
      <ul className="space-y-1">
        {menu.map((m) => (
          <li key={m.ke}>
            <NavLink
              to={m.ke}
              end={m.persis}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                  isActive ? 'bg-white text-primer-800' : 'text-primer-50 hover:bg-white/10'
                }`
              }
            >
              <m.ikon className="h-[18px] w-[18px]" aria-hidden="true" />
              {m.label}
              <AngkaBadge jenis={m.badge} className="ml-auto" />
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

function KakiSidebar() {
  const { profile } = useAuth()
  const keluar = useKeluar()
  return (
    <div className="border-t border-white/10 px-5 py-4">
      <p className="truncate text-sm font-semibold text-white">{profile?.nama}</p>
      <p className="truncate text-xs text-primer-200">Admin, {profile?.unit_kerja || 'unit kerja belum diisi'}</p>
      <button
        type="button"
        onClick={keluar}
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/30 px-3 text-sm font-medium text-white hover:bg-white/10"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Keluar
      </button>
    </div>
  )
}

// Pemohon: navbar di atas, ditambah menu bawah di HP karena menunya hanya tiga.
function LayoutPemohon() {
  const { profile } = useAuth()
  const keluar = useKeluar()

  return (
    <div className="min-h-screen pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <header data-gelap className="sticky top-0 z-30 bg-primer-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
          <Brand terang />

          <nav className="hidden items-center gap-1 md:flex">
            {MENU_PEMOHON.map((m) => (
              <NavLink
                key={m.ke}
                to={m.ke}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium ${
                    isActive ? 'bg-white text-primer-800' : 'text-primer-50 hover:bg-white/10'
                  }`
                }
              >
                {m.label}
                <AngkaBadge jenis={m.badge} />
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden text-right lg:block">
              <p className="max-w-[180px] truncate text-sm font-semibold text-white">{profile?.nama}</p>
              <p className="max-w-[180px] truncate text-xs text-primer-200">{profile?.unit_kerja || 'Pemohon'}</p>
            </div>
            <button
              type="button"
              onClick={keluar}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-primer-50 hover:bg-white/10"
              aria-label="Keluar"
              title="Keluar"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {MENU_PEMOHON.map((m) => (
          <NavLink
            key={m.ke}
            to={m.ke}
            className={({ isActive }) =>
              `relative flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                isActive ? 'text-primer-700' : 'text-slate-600'
              }`
            }
          >
            <span className="relative">
              <m.ikon className="h-5 w-5" aria-hidden="true" />
              <AngkaBadge jenis={m.badge} className="absolute -right-3 -top-2" />
            </span>
            {m.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
