import { Construction } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import EmptyState from '../../components/EmptyState'

// Sementara: halaman ini dibangun di Fase 4.
export default function Riwayat() {
  return (
    <>
      <PageHeader judul="Riwayat" />
      <div className="kartu">
        <EmptyState ikon={Construction} judul="Halaman sedang disiapkan" pesan="Fitur ini dibangun di Fase 4." />
      </div>
    </>
  )
}
