import { useState } from 'react'
import toast from 'react-hot-toast'
import { KeyRound, Loader2 } from 'lucide-react'
import ConfirmModal from '../ConfirmModal'
import { pesanError } from '../../lib/supabaseClient'
import { aturUlangSandi, ubahPengguna } from '../../services/userService'

function validasi(f) {
  const e = {}
  if (f.nama.trim().length < 3) e.nama = 'Nama lengkap wajib diisi.'
  if (f.nip.trim() && !/^\d{18}$/.test(f.nip.trim())) e.nip = 'NIP harus 18 digit angka, atau kosongkan.'
  return e
}

// Form ubah akun oleh Admin. Untuk akun sendiri, peran dan status verifikasi
// dikunci (database juga menolaknya) agar admin tidak terkunci di luar aplikasi.
export default function FormAkun({ pengguna, akunSendiri, onSelesai, onBatal, onSibuk }) {
  const [form, setForm] = useState({
    nama: pengguna.nama ?? '',
    nip: pengguna.nip ?? '',
    unitKerja: pengguna.unit_kerja ?? '',
    role: pengguna.role,
    terverifikasi: pengguna.is_verified,
  })
  const [errors, setErrors] = useState({})
  const [menyimpan, setMenyimpan] = useState(false)

  const [sandi, setSandi] = useState('')
  const [ulangiSandi, setUlangiSandi] = useState('')
  const [errorSandi, setErrorSandi] = useState('')
  const [konfirmasiSandi, setKonfirmasiSandi] = useState(false)
  const [menyimpanSandi, setMenyimpanSandi] = useState(false)

  const ubah = (nama) => (e) => {
    setForm((f) => ({ ...f, [nama]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
    // Pesan kesalahan isian ini hilang begitu isiannya diperbaiki.
    setErrors((er) => ({ ...er, [nama]: undefined }))
  }

  async function simpan(e) {
    e.preventDefault()
    const hasil = validasi(form)
    setErrors(hasil)
    if (Object.keys(hasil).length > 0) return

    const perubahan = { nama: form.nama.trim(), nip: form.nip.trim() || null, unit_kerja: form.unitKerja.trim() || null }
    if (!akunSendiri) {
      perubahan.role = form.role
      perubahan.is_verified = form.terverifikasi
    }
    setMenyimpan(true)
    onSibuk?.(true)
    try {
      await ubahPengguna(pengguna.id, perubahan)
      toast.success(`Akun ${perubahan.nama} diperbarui.`)
      onSelesai()
    } catch (err) {
      toast.error(pesanError(err))
    } finally {
      setMenyimpan(false)
      onSibuk?.(false)
    }
  }

  function mintaGantiSandi() {
    if (sandi.length < 8) return setErrorSandi('Kata sandi baru minimal 8 karakter.')
    if (sandi !== ulangiSandi) return setErrorSandi('Kata sandi tidak sama.')
    setErrorSandi('')
    setKonfirmasiSandi(true)
  }

  async function simpanSandi() {
    setMenyimpanSandi(true)
    try {
      await aturUlangSandi(pengguna.id, sandi)
      toast.success('Kata sandi baru disimpan. Sampaikan langsung kepada pemilik akun.', { duration: 6000 })
      setSandi('')
      setUlangiSandi('')
      setKonfirmasiSandi(false)
    } catch (err) {
      toast.error(pesanError(err))
      setKonfirmasiSandi(false)
    } finally {
      setMenyimpanSandi(false)
    }
  }

  return (
    <>
      <form onSubmit={simpan} noValidate className="space-y-4">
        <div>
          <p className="label">Email</p>
          <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-700">{pengguna.email ?? '-'}</p>
          <p className="mt-1 text-xs text-slate-600">Email dipakai untuk masuk dan tidak bisa diubah dari aplikasi.</p>
        </div>

        <div>
          <label htmlFor="akun-nama" className="label">Nama lengkap</label>
          <input id="akun-nama" value={form.nama} onChange={ubah('nama')} className={`input ${errors.nama ? 'input-error' : ''}`} />
          {errors.nama && <p className="teks-error">{errors.nama}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="akun-nip" className="label">NIP</label>
            <input id="akun-nip" inputMode="numeric" maxLength={18} value={form.nip} onChange={ubah('nip')}
              className={`input ${errors.nip ? 'input-error' : ''}`} placeholder="18 digit" />
            {errors.nip && <p className="teks-error">{errors.nip}</p>}
          </div>
          <div>
            <label htmlFor="akun-unit" className="label">Unit kerja</label>
            <input id="akun-unit" value={form.unitKerja} onChange={ubah('unitKerja')} className="input" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="akun-peran" className="label">Peran</label>
            <select id="akun-peran" value={form.role} onChange={ubah('role')} disabled={akunSendiri} className="input">
              <option value="pemohon">Pemohon</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <label className={`flex min-h-11 items-center gap-3 self-end rounded-lg border border-slate-300 px-3 text-sm text-slate-700 ${akunSendiri ? 'bg-slate-100' : 'cursor-pointer'}`}>
            <input type="checkbox" checked={form.terverifikasi} onChange={ubah('terverifikasi')} disabled={akunSendiri}
              className="h-5 w-5 accent-primer-700" />
            Akun terverifikasi
          </label>
        </div>
        {akunSendiri && (
          <p className="text-xs text-slate-600">Peran dan status verifikasi akun Anda sendiri tidak bisa diubah, agar tidak terkunci di luar aplikasi.</p>
        )}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-sekunder" onClick={onBatal} disabled={menyimpan}>Batal</button>
          <button type="submit" className="btn-primer" disabled={menyimpan}>
            {menyimpan && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {menyimpan ? 'Menyimpan...' : 'Simpan perubahan'}
          </button>
        </div>
      </form>

      <section className="mt-6 space-y-3 border-t border-slate-200 pt-5" aria-labelledby="judul-sandi">
        <div>
          <h3 id="judul-sandi" className="flex items-center gap-2 font-semibold text-slate-900">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            Atur ulang kata sandi
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Untuk pegawai yang lupa kata sandinya. Kata sandi lama langsung tidak berlaku.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="akun-sandi" className="label">Kata sandi baru</label>
            <input id="akun-sandi" type="password" autoComplete="new-password" value={sandi}
              onChange={(e) => setSandi(e.target.value)} className={`input ${errorSandi ? 'input-error' : ''}`} />
          </div>
          <div>
            <label htmlFor="akun-sandi2" className="label">Ulangi kata sandi baru</label>
            <input id="akun-sandi2" type="password" autoComplete="new-password" value={ulangiSandi}
              onChange={(e) => setUlangiSandi(e.target.value)} className={`input ${errorSandi ? 'input-error' : ''}`} />
          </div>
        </div>
        {errorSandi && <p className="teks-error">{errorSandi}</p>}
        <div className="flex justify-end">
          <button type="button" className="btn-sekunder" onClick={mintaGantiSandi} disabled={!sandi}>
            Simpan kata sandi baru
          </button>
        </div>
      </section>

      <ConfirmModal
        terbuka={konfirmasiSandi}
        judul={`Ganti kata sandi ${pengguna.nama}?`}
        pesan="Kata sandi lama tidak bisa dipakai lagi. Sampaikan kata sandi baru langsung kepada pemilik akun, jangan lewat grup."
        labelKonfirmasi="Ya, ganti kata sandi"
        memproses={menyimpanSandi}
        onKonfirmasi={simpanSandi}
        onBatal={() => setKonfirmasiSandi(false)}
      />
    </>
  )
}
