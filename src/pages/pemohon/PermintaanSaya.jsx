import { Construction } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import EmptyState from '../../components/EmptyState'

// Sementara: halaman ini dibangun di Fase 3.
export default function PermintaanSaya() {
  return (
    <>
      <PageHeader judul="Permintaan Saya" />
      <div className="kartu">
        <EmptyState ikon={Construction} judul="Halaman sedang disiapkan" pesan="Fitur ini dibangun di Fase 3." />
      </div>
    </>
  )
}
