// Tema tampilan: 'terang' (bawaan) atau 'gelap'. Pilihan diingat di browser
// ini saja. Bila penyimpanan browser diblokir, tema tetap bisa diganti
// selama halaman terbuka.
const KUNCI = 'caliak-tema'

export function temaSekarang() {
  return document.documentElement.classList.contains('dark') ? 'gelap' : 'terang'
}

export function pasangTema(tema) {
  document.documentElement.classList.toggle('dark', tema === 'gelap')
  try {
    localStorage.setItem(KUNCI, tema)
  } catch {
    // Penyimpanan tidak tersedia; tema hanya berlaku sampai halaman ditutup.
  }
}
