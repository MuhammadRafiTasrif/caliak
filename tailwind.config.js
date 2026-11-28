/** @type {import('tailwindcss').Config} */

// Warna yang berganti di mode gelap ditulis sebagai variabel CSS (lihat
// src/index.css). Dengan begitu kelas seperti text-slate-600 atau
// bg-permukaan otomatis menyesuaikan tema tanpa ditulis dua kali.
const variabel = (nama, tingkat) =>
  Object.fromEntries(tingkat.map((t) => [t, `rgb(var(--${nama}-${t}) / <alpha-value>)`]))
const TINGKAT = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Magenta: warna utama merek CALIAK (teks tautan, fokus, aksen).
        primer: variabel('primer', TINGKAT),
        // Abu-abu untuk teks, garis, dan latar kecil. Terbalik di mode gelap.
        slate: variabel('slate', TINGKAT),
        latar: 'rgb(var(--latar) / <alpha-value>)',
        permukaan: 'rgb(var(--permukaan) / <alpha-value>)',
        // Area merek (sidebar, header, tombol utama) memakai fuchsia dan cyan
        // bawaan Tailwind yang nilainya tetap di kedua tema.
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
