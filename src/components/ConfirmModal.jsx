import { Loader2 } from 'lucide-react'
import Modal from './Modal'

const KELAS_TOMBOL = {
  primer: 'btn-primer',
  bahaya: 'btn-bahaya',
  sukses: 'btn-sukses',
}

// Konfirmasi sebelum aksi penting (setujui, tolak, selesai, koreksi stok,
// nonaktifkan barang). `children` untuk isian tambahan, misalnya alasan.
export default function ConfirmModal({
  terbuka,
  judul,
  pesan,
  children,
  labelKonfirmasi = 'Ya, lanjutkan',
  varian = 'primer',
  memproses = false,
  konfirmasiNonaktif = false,
  onKonfirmasi,
  onBatal,
}) {
  return (
    <Modal terbuka={terbuka} onTutup={onBatal} judul={judul} lebar="max-w-md" terkunci={memproses}>
      {pesan && <p className="text-sm text-slate-700">{pesan}</p>}
      {children && <div className="mt-4">{children}</div>}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" className="btn-sekunder" onClick={onBatal} disabled={memproses}>
          Batal
        </button>
        <button
          type="button"
          className={KELAS_TOMBOL[varian]}
          onClick={onKonfirmasi}
          disabled={memproses || konfirmasiNonaktif}
        >
          {memproses && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {memproses ? 'Memproses...' : labelKonfirmasi}
        </button>
      </div>
    </Modal>
  )
}
