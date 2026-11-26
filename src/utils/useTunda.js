import { useEffect, useState } from 'react'

// Mengembalikan `nilai` setelah pengguna berhenti mengetik selama `jeda` ms.
// Dipakai di kotak pencarian agar query tidak dikirim di setiap ketukan.
export default function useTunda(nilai, jeda = 300) {
  const [nilaiTertunda, setNilaiTertunda] = useState(nilai)

  useEffect(() => {
    const timer = setTimeout(() => setNilaiTertunda(nilai), jeda)
    return () => clearTimeout(timer)
  }, [nilai, jeda])

  return nilaiTertunda
}
