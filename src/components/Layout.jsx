import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
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
import Brand from './Brand'

const MENU_ADMIN = [
  { ke: '/admin', label: 'Dashboard', ikon: LayoutDashboard, persis: true },
  { ke: '/admin/persetujuan', label: 'Persetujuan', ikon: ClipboardCheck },
  { ke: '/admin/barang', label: 'Kelola Barang', ikon: Package },
  { ke: '/admin/barang-masuk', label: 'Barang Masuk', ikon: ArrowDownToLine },
  { ke: '/admin/riwayat', label: 'Riwayat', ikon: History },
  { ke: '/admin/pengguna', label: 'Kelola Pengguna', ikon: Users },
]

const MENU_PEMOHON = [
  { ke: '/katalog', label: 'Katalog', ikon: LayoutGrid },
  { ke: '/permintaan/baru', label: 'Buat Permintaan', ikon: PlusCircle },
  { ke: '/permintaan-saya', label: 'Permintaan Saya', ikon: ClipboardList },
]

export default function Layout() {
  const { isAdmin } = useAuth()
  return isAdmin ? <LayoutAdmin /> : <LayoutPemohon />
}

// ---------------------------------------------------------------------
// Admin: sidebar di desktop, laci (drawer) yang bisa dibuka di HP.
// ---------------------------------------------------------------------
function LayoutAdmin() {
  const [laciTerbuka, setLaciTerbuka] = useState(false)
  const lokasi = useLocation()

  // Tutup laci setiap kali pindah halaman.
  useEffect(() => setLaciTerbuka(false), [lokasi.pathname])

  return (
    <div className="min-h-screen lg:flex">
      {/* Bar atas khusus HP */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-primer-800 px-4 py-3 lg:hidden">
        <Brand terang tagline={false} />
        <button
          type="button"
          onClick={() => setLaciTerbuka(true)}
          className="rounded-lg p-2 text-white hover:bg-white/10"
          aria-label="Buka menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {laciTerbuka && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={() => setLaciTerbuka(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-primer-800 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          laciTerbuka ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between gap-2 border-b border-white/10 px-5 py-5">
          <Brand terang />
          <button
            type="button"
            onClick={() => setLaciTerbuka(false)}
            className="rounded-lg p-1.5 text-primer-100 hover:bg-white/10 lg:hidden"
            aria-label="Tutup menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          <GrupMenu judul="Administrasi" menu={MENU_ADMIN} />
          <GrupMenu judul="Permintaan Barang" menu={MENU_PEMOHON} />
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
      <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-primer-200">{judul}</p>
      <ul className="space-y-1">
        {menu.map((m) => (
          <li key={m.ke}>
            <NavLink
              to={m.ke}
              end={m.persis}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-white text-primer-800' : 'text-primer-50 hover:bg-white/10'
                }`
              }
            >
              <m.ikon className="h-[18px] w-[18px]" aria-hidden="true" />
              {m.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

function KakiSidebar() {
  const { profile, logout } = useAuth()
  return (
    <div className="border-t border-white/10 px-5 py-4">
      <p className="truncate text-sm font-semibold text-white">{profile?.nama}</p>
      <p className="truncate text-xs text-primer-200">Admin · {profile?.unit_kerja || '-'}</p>
      <button
        type="button"
        onClick={logout}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Keluar
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------
// Pemohon: navbar di atas, ditambah menu bawah di HP.
// ---------------------------------------------------------------------
function LayoutPemohon() {
  const { profile, logout } = useAuth()

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-30 bg-primer-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Brand terang />

          <nav className="hidden items-center gap-1 md:flex">
            {MENU_PEMOHON.map((m) => (
              <NavLink
                key={m.ke}
                to={m.ke}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive ? 'bg-white text-primer-800' : 'text-primer-50 hover:bg-white/10'
                  }`
                }
              >
                {m.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right lg:block">
              <p className="max-w-[180px] truncate text-sm font-semibold text-white">{profile?.nama}</p>
              <p className="max-w-[180px] truncate text-xs text-primer-200">{profile?.unit_kerja || 'Pemohon'}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg p-2 text-primer-50 hover:bg-white/10"
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

      {/* Menu bawah khusus HP */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-slate-200 bg-white md:hidden">
        {MENU_PEMOHON.map((m) => (
          <NavLink
            key={m.ke}
            to={m.ke}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                isActive ? 'text-primer-700' : 'text-slate-500'
              }`
            }
          >
            <m.ikon className="h-5 w-5" aria-hidden="true" />
            {m.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
