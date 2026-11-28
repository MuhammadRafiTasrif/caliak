# Arah Desain CALIAK

Bagian "Arahan" berisi ketentuan dari pemilik proyek. Bagian lain menjelaskan
cara ketentuan itu diterapkan, dengan alasan satu baris per keputusan.

## Arahan (dari pemilik proyek)

- Bersih, formal, bergaya aplikasi pemerintahan.
- Palet warna (pengganti biru tua di spesifikasi awal), sekaligus tema bawaan:
  magenta tua #A21CAF, magenta #D946EF, cyan tua #0E7490, cyan #06B6D4,
  cyan muda #67E8F9, latar #F6F9FC.
- Contoh tampilan dari pemilik: sidebar bergradasi magenta ke cyan, menu aktif putih,
  badge cyan, tab aktif cyan tua, tombol utama bergradasi, judul halaman magenta tua.
- Ada tema gelap.
- Mobile-first. Tabel di HP berubah menjadi kartu.
- Badge status: menunggu kuning, disetujui biru, selesai hijau, ditolak merah, dibatalkan abu-abu.
- Logo atau teks "CALIAK" di header dengan tagline "Catatan Logistik Akurat dan Informasi Ketersediaan".
- Ikon dari lucide-react.

## Design Read

Aplikasi internal pencatatan BMN untuk pegawai dan pengelola barang di instansi pemerintah.
Warnanya cerah karena itu palet pilihan pemilik, tetapi tata letaknya tetap formal dan tenang.
Dial: ENERGY 2 / RHYTHM 1 / MOTION 1.

Alasan dial: pengguna membuka aplikasi untuk menyelesaikan tugas administrasi (mengajukan,
menyetujui, mencatat). ENERGY naik satu tingkat hanya karena warna merek lebih hidup, bukan
karena ada hiasan tambahan. Tata letak antarhalaman sengaja seragam supaya pegawai cepat hafal
posisi tombol. Gerak hanya pada hover, fokus, dan laci menu.

## Keputusan dan alasannya

| Keputusan | Alasan |
|---|---|
| Gradasi magenta tua ke cyan tua pada sidebar, header HP, panel halaman Masuk, dan tombol utama | Ditetapkan pemilik sebagai identitas aplikasi. Gradasi hanya dipakai di area merek dan aksi utama, tidak di kartu atau tabel. |
| Semua warna lewat variabel CSS (`--primer-*`, `--slate-*`, `--latar`, `--permukaan`) | Tema gelap cukup mengganti nilai variabel, jadi kode halaman tidak perlu ditulis dua kali. |
| Latar halaman #F6F9FC, kartu putih dengan garis tepi | Latar dari palet pemilik. Kartu sudah terpisah dari latar lewat warna dan garis, jadi tidak perlu bayangan. |
| Tab dan pilihan aktif cyan tua #0E7490 | Mengikuti contoh pemilik. Cyan tua dipilih, bukan cyan #06B6D4, karena teks putih di atas cyan biasa tidak terbaca (kontras di bawah 3:1). |
| Badge angka cyan muda dengan teks cyan sangat gelap | Badge harus menonjol di atas gradasi sidebar. Teks gelap di atas cyan muda kontrasnya 7.41:1. |
| Judul halaman magenta tua | Mengikuti contoh pemilik. Memberi warna merek tanpa menambah elemen baru. |
| Menu aktif berlatar putih dengan teks magenta | Mengikuti contoh pemilik. Kontrasnya paling kuat di atas gradasi, jadi posisi pengguna jelas. |
| Tema terang sebagai bawaan, tema gelap lewat tombol | Ditetapkan pemilik. Pilihan diingat di browser masing-masing. Skrip kecil di `index.html` memasang tema sebelum halaman tergambar supaya tidak berkedip putih. |
| Tombol tema di sidebar admin, header pemohon, dan halaman Masuk | Tiga tempat yang selalu terlihat di setiap peran, termasuk sebelum login. |
| Tema gelap: latar biru sangat gelap, bukan hitam murni | Hitam murni dengan teks putih terlalu tajam untuk dibaca lama. Biru gelap juga masih senada dengan cyan. |
| Tema gelap: skala warna dibalik (angka besar menjadi terang) | Kelas yang sama, misalnya `text-slate-900`, tetap berarti teks paling kuat di kedua tema. |
| Tema gelap: gradasi memakai magenta dan cyan yang lebih gelap | Gradasi terang terlalu menyilaukan di samping latar gelap. Teks putih di atasnya tetap di atas 9:1. |
| Warna badge status tetap, dengan varian gelap | Ditetapkan pemilik. Setiap badge juga memuat teks status, tidak hanya warna. |
| Font Plus Jakarta Sans | Huruf buatan desainer Indonesia untuk identitas kota Jakarta, terbaca jelas di ukuran kecil. |
| Ikon lucide-react | Ditetapkan pemilik. Setiap ikon dipasangkan dengan label teks atau label untuk pembaca layar. |
| Radius 8px untuk tombol dan input, 12px untuk kartu | Dua ukuran saja: kontrol sedikit lebih tegas dari wadah. Tidak ada elemen berbentuk pil kecuali badge. |
| Kode unik barang ditampilkan dalam huruf tetap di label abu-abu | Kode BMN dan NUP adalah hal yang dicari dan dicocokkan pengelola barang, jadi tampilannya sama di semua layar. |
| Target sentuh minimal 44px | Banyak pegawai memakai HP untuk mengajukan permintaan. |
| Garis fokus magenta di area terang, putih di area bergradasi | Pengguna keyboard harus selalu bisa melihat posisinya. |

## Kontras (diuji dengan contrast-check.py dari antislop-human)

Semua pasangan lolos WCAG AA untuk teks normal (minimal 4.5:1).

| Tema | Pasangan | Rasio |
|---|---|---|
| Terang | Teks `slate-600` di latar #F6F9FC | 7.17 |
| Terang | Judul magenta tua `primer-900` di latar | 9.49 |
| Terang | Teks putih di magenta tua #A21CAF (awal gradasi) | 6.32 |
| Terang | Teks putih di cyan tua #0E7490 (akhir gradasi, tab aktif) | 5.36 |
| Terang | Teks putih 90% di cyan tua (tagline, pasangan terendah) | 4.67 |
| Terang | Teks cyan sangat gelap di badge cyan muda | 7.41 |
| Terang | Garis fokus `primer-600` di putih | 4.71 |
| Gelap | Teks `slate-600` di latar gelap | 9.13 |
| Gelap | Judul `primer-900` di latar gelap | 16.23 |
| Gelap | Teks `slate-900` di kartu gelap | 15.64 |
| Gelap | Teks putih di magenta gradasi gelap | 10.03 |
| Gelap | Teks putih di cyan gradasi gelap | 9.11 |

Pemeriksaan tampilan HP (`scripts/cek-tampilan.mjs`) lolos di kedua tema untuk semua halaman
admin dan pemohon: tidak ada scroll ke samping, target sentuh minimal 44px, dan garis fokus terlihat.
