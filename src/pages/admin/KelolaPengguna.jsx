import { Construction } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import EmptyState from '../../components/EmptyState'

// Sementara: halaman ini dibangun di Fase 4.
export default function KelolaPengguna() {
  return (
    <>
      <PageHeader judul="Kelola Pengguna" />
      <div className="kartu">
        <EmptyState ikon={Construction} judul="Halaman sedang disiapkan" pesan="Fitur ini dibangun di Fase 4." />
      </div>
    </>
  )
}
