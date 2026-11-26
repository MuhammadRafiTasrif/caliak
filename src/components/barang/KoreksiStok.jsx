import { useState } from 'react'
import toast from 'react-hot-toast'
import ConfirmModal from '../ConfirmModal'
import Modal from '../Modal'
import { pesanError } from '../../lib/supabaseClient'
import { koreksiStok } from '../../services/movementService'
import { formatAngka } from '../../utils/format'
import { KodeBarang } from './TampilanBarang'

// Koreksi stok dua langkah: isi stok baru dan alasan, lalu konfirmasi.
export default function KoreksiStok({ barang, onSelesai, onBatal }) {
  const [stokBaru, setStokBaru] = useState(String(barang.stok))
  const [alasan, setAlasan] = useState('')
  const [errors, setErrors] = useState({})
  const [konfirmasi, setKonfirmasi] = useState(false)
  const [memproses, setMemproses] = useState(false)

  const selisih = Number(stokBaru) - barang.stok

  function lanjut(e) {
    e.preventDefault()
    const err = {}
    if (stokBaru === '' || !Number.isInteger(Number(stokBaru)) || Number(stokBaru) < 0) {
      err.stokBaru = 'Stok baru harus bilangan bulat 0 atau lebih.'
    } else if (selisih === 0) {
      err.stokBaru = 'Stok baru sama dengan stok sekarang.'
    }
    if (!alasan.trim()) err.alasan = 'Alasan koreksi wajib diisi.'
    setErrors(err)
    if (Object.keys(err).length === 0) setKonfirmasi(true)
  }

  async function simpan() {
    setMemproses(true)
    try {
      const stok = await koreksiStok(barang.id, stokBaru, alasan.trim())
      toast.success(`Stok ${barang.nama} dikoreksi menjadi ${formatAngka(stok)} ${barang.satuan}.`)
      onSelesai()
    } catch (err) {
      toast.error(pesanError(err))
      setKonfirmasi(false)
    } finally {
      setMemproses(false)
    }
  }

  return (
    <>
      <Modal terbuka onTutup={onBatal} judul="Koreksi stok" tutupDiLuar={false}
        keterangan="Gunakan untuk menyesuaikan stok dengan hasil stock opname. Perubahan tercatat di riwayat.">
        <form onSubmit={lanjut} noValidate className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="font-semibold text-slate-900">{barang.nama}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <KodeBarang kode={barang.kode_unik} />
              <span>Stok sekarang: <strong className="text-slate-900">{formatAngka(barang.stok)} {barang.satuan}</strong></span>
            </div>
          </div>

          <div>
            <label htmlFor="stokBaru" className="label">Stok sebenarnya ({barang.satuan})</label>
            <input id="stokBaru" type="number" min="0" step="1" inputMode="numeric" value={stokBaru}
              onChange={(e) => setStokBaru(e.target.value)} className={`input ${errors.stokBaru ? 'input-error' : ''}`} />
            {errors.stokBaru ? (
              <p className="teks-error">{errors.stokBaru}</p>
            ) : (
              stokBaru !== '' && selisih !== 0 && (
                <p className="mt-1 text-xs text-slate-600">
                  {selisih > 0 ? 'Bertambah' : 'Berkurang'} {formatAngka(Math.abs(selisih))} {barang.satuan}
                </p>
              )
            )}
          </div>

          <div>
            <label htmlFor="alasan" className="label">Alasan koreksi</label>
            <textarea id="alasan" rows={3} value={alasan} onChange={(e) => setAlasan(e.target.value)}
              className={`input ${errors.alasan ? 'input-error' : ''}`}
              placeholder="Contoh: hasil stock opname, 2 rim rusak terkena air" />
            {errors.alasan && <p className="teks-error">{errors.alasan}</p>}
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-sekunder" onClick={onBatal}>Batal</button>
            <button type="submit" className="btn-primer">Lanjutkan</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        terbuka={konfirmasi}
        judul="Simpan koreksi stok?"
        pesan={`Stok ${barang.nama} akan diubah dari ${formatAngka(barang.stok)} menjadi ${formatAngka(Number(stokBaru))} ${barang.satuan}. Catatan riwayat tidak bisa dihapus.`}
        labelKonfirmasi="Ya, simpan koreksi"
        memproses={memproses}
        onKonfirmasi={simpan}
        onBatal={() => setKonfirmasi(false)}
      />
    </>
  )
}
