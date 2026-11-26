import { Construction } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import EmptyState from '../../components/EmptyState'

// Sementara: halaman ini dibangun di Fase 2.
export default function BarangMasuk() {
  return (
    <>
      <PageHeader judul="Barang Masuk" />
      <div className="kartu">
        <EmptyState ikon={Construction} judul="Halaman sedang disiapkan" pesan="Fitur ini dibangun di Fase 2." />
      </div>
    </>
  )
}
