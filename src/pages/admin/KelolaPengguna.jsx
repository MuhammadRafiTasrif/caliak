import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { AlertTriangle, Pencil, Search, UserCheck, Users } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import EmptyState from '../../components/EmptyState'
import Loading from '../../components/Loading'
import Penomoran from '../../components/Penomoran'
import ConfirmModal from '../../components/ConfirmModal'
import Modal from '../../components/Modal'
import FormAkun from '../../components/pengguna/FormAkun'
import { useAuth } from '../../context/AuthContext'
import { usePermintaan } from '../../context/PermintaanContext'
import { pesanError } from '../../lib/supabaseClient'
import { ambilDaftarPengguna, ubahPengguna } from '../../services/userService'
import { formatAngka, formatTanggal } from '../../utils/format'
import useTunda from '../../utils/useTunda'
import useHalaman from '../../utils/useHalaman'

const UKURAN = 30
const TAB = [
  ['menunggu', 'Menunggu verifikasi'],
  ['terverifikasi', 'Terverifikasi'],
  ['admin', 'Admin'],
  ['', 'Semua'],
]

// Setiap aksi: perubahan data, judul konfirmasi, penjelasan, dan gaya tombol.
const AKSI = {
  verifikasi: {
    ubah: { is_verified: true },
    judul: (n) => `Verifikasi akun ${n}?`,
    pesan: 'Pegawai ini bisa melihat katalog dan mengajukan permintaan barang.',
    label: 'Ya, verifikasi',
    varian: 'primer',
  },
  cabut: {
    ubah: { is_verified: false },
    judul: (n) => `Cabut verifikasi ${n}?`,
    pesan: 'Akun tidak bisa dipakai lagi sampai diverifikasi ulang. Permintaan dan riwayatnya tetap tersimpan.',
    label: 'Ya, cabut',
    varian: 'bahaya',
  },
  jadikanAdmin: {
    ubah: { role: 'admin' },
    judul: (n) => `Jadikan ${n} admin?`,
    pesan: 'Admin bisa menyetujui permintaan, mengubah stok, dan mengelola pengguna lain.',
    label: 'Ya, jadikan admin',
    varian: 'primer',
  },
  jadikanPemohon: {
    ubah: { role: 'pemohon' },
    judul: (n) => `Jadikan ${n} pemohon biasa?`,
    pesan: 'Hak admin dicabut. Akun tetap bisa mengajukan permintaan.',
    label: 'Ya, cabut hak admin',
    varian: 'bahaya',
  },
}

export default function KelolaPengguna() {
  const { user, muatUlangProfil } = useAuth()
  const { muatUlangBadge } = usePermintaan()
  const [status, setStatus] = useState('menunggu')
  const [cari, setCari] = useState('')
  const cariTertunda = useTunda(cari)
  const { halaman, keHalaman } = useHalaman(`${status}|${cariTertunda}`)

  const [daftar, setDaftar] = useState([])
  const [total, setTotal] = useState(0)
  const [memuat, setMemuat] = useState(true)
  const [error, setError] = useState('')
  const [aksi, setAksi] = useState(null) // { jenis, pengguna }
  const [memproses, setMemproses] = useState(false)
  const [diubah, setDiubah] = useState(null)
  const [formSibuk, setFormSibuk] = useState(false)

  const muat = useCallback(async () => {
    setMemuat(true)
    setError('')
    try {
      const hasil = await ambilDaftarPengguna({ status, cari: cariTertunda, halaman, ukuran: UKURAN })
      setDaftar(hasil.data)
      setTotal(hasil.total)
    } catch (err) {
      const pesan = pesanError(err)
      setError(pesan.includes('email') ? 'Kolom email belum ada. Jalankan supabase/migrasi_002_email_pengguna.sql di Supabase.' : pesan)
    } finally {
      setMemuat(false)
    }
  }, [status, cariTertunda, halaman])

  useEffect(() => {
    muat()
  }, [muat])

  async function jalankan() {
    setMemproses(true)
    try {
      await ubahPengguna(aksi.pengguna.id, AKSI[aksi.jenis].ubah)
      toast.success('Perubahan akun disimpan.')
      setAksi(null)
      muat()
      muatUlangBadge()
    } catch (err) {
      toast.error(pesanError(err))
    } finally {
      setMemproses(false)
    }
  }

  const aturanAksi = aksi ? AKSI[aksi.jenis] : null

  return (
    <>
      <PageHeader
        judul="Kelola Pengguna"
        keterangan="Verifikasi akun pegawai yang baru mendaftar, dan atur siapa yang menjadi admin."
      />

      <div className="mb-4 flex flex-wrap gap-2" role="tablist">
        {TAB.map(([kunci, label]) => (
          <button key={kunci || 'semua'} type="button" role="tab" aria-selected={status === kunci} onClick={() => setStatus(kunci)}
            className={`min-h-11 rounded-lg px-3 text-sm font-medium ${
              status === kunci ? 'bg-primer-700 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="relative mb-4 max-w-md">
        <label htmlFor="cari" className="sr-only">Cari pengguna</label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
        <input id="cari" type="search" value={cari} onChange={(e) => setCari(e.target.value)} className="input pl-9"
          placeholder="Nama, NIP, email, atau unit kerja" />
      </div>

      {memuat && daftar.length === 0 ? (
        <div className="kartu"><Loading teks="Memuat daftar pengguna..." /></div>
      ) : error ? (
        <div className="kartu">
          <EmptyState ikon={AlertTriangle} judul="Daftar pengguna gagal dimuat" pesan={error}
            aksi={<button type="button" className="btn-sekunder" onClick={muat}>Coba lagi</button>} />
        </div>
      ) : daftar.length === 0 ? (
        <div className="kartu">
          {status === 'menunggu' && !cariTertunda ? (
            <EmptyState ikon={UserCheck} judul="Tidak ada akun yang menunggu verifikasi"
              pesan="Pegawai yang baru mendaftar di halaman Daftar akan muncul di sini." />
          ) : (
            <EmptyState ikon={Users} judul="Tidak ada pengguna yang cocok" pesan="Ubah kata pencarian atau pilih tab lain." />
          )}
        </div>
      ) : (
        <>
          <p className="mb-2 text-sm text-slate-600" aria-live="polite">{formatAngka(total)} pengguna</p>
          <ul className="kartu divide-y divide-slate-100">
            {daftar.map((p) => (
              <li key={p.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{p.nama}</p>
                    {p.role === 'admin' && <span className="rounded bg-primer-100 px-1.5 py-0.5 text-xs font-medium text-primer-800">Admin</span>}
                    {!p.is_verified && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900">Belum diverifikasi</span>}
                    {p.id === user.id && <span className="text-xs text-slate-600">(akun Anda)</span>}
                  </div>
                  <p className="mt-0.5 break-all text-slate-700">{p.email ?? '-'}</p>
                  <p className="text-slate-600">
                    NIP {p.nip ?? '-'}, {p.unit_kerja ?? 'unit kerja belum diisi'}. Mendaftar {formatTanggal(p.created_at)}.
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button type="button" className="btn-sekunder" onClick={() => setDiubah(p)}>
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Ubah
                  </button>
                  {p.id !== user.id && (!p.is_verified ? (
                      <button type="button" className="btn-primer" onClick={() => setAksi({ jenis: 'verifikasi', pengguna: p })}>
                        Verifikasi
                      </button>
                    ) : (
                      <>
                        {p.role === 'admin' ? (
                          <button type="button" className="btn-sekunder" onClick={() => setAksi({ jenis: 'jadikanPemohon', pengguna: p })}>
                            Cabut hak admin
                          </button>
                        ) : (
                          <button type="button" className="btn-sekunder" onClick={() => setAksi({ jenis: 'jadikanAdmin', pengguna: p })}>
                            Jadikan admin
                          </button>
                        )}
                        <button type="button" className="btn-sekunder text-red-700" onClick={() => setAksi({ jenis: 'cabut', pengguna: p })}>
                          Cabut verifikasi
                        </button>
                      </>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <Penomoran halaman={halaman} total={total} ukuran={UKURAN} onPindah={keHalaman} sibuk={memuat} label="Halaman daftar pengguna" />
        </>
      )}

      <Modal terbuka={Boolean(diubah)} onTutup={() => setDiubah(null)} judul={diubah ? `Ubah akun ${diubah.nama}` : 'Ubah akun'}
        lebar="max-w-xl" tutupDiLuar={false} terkunci={formSibuk}>
        {diubah && (
          <FormAkun
            pengguna={diubah}
            akunSendiri={diubah.id === user.id}
            onSibuk={setFormSibuk}
            onBatal={() => setDiubah(null)}
            onSelesai={() => {
              if (diubah.id === user.id) muatUlangProfil()
              setDiubah(null)
              muat()
              muatUlangBadge()
            }}
          />
        )}
      </Modal>

      <ConfirmModal
        terbuka={Boolean(aksi)}
        judul={aturanAksi?.judul(aksi.pengguna.nama) ?? ''}
        pesan={aturanAksi?.pesan}
        labelKonfirmasi={aturanAksi?.label}
        varian={aturanAksi?.varian}
        memproses={memproses}
        onKonfirmasi={jalankan}
        onBatal={() => setAksi(null)}
      />
    </>
  )
}
