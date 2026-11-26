# Arah Desain CALIAK

Bagian "Arahan" disalin dari spesifikasi pemilik proyek (poin 9). Bagian lain
menjelaskan cara arahan itu diterapkan, dengan alasan satu baris per keputusan.

## Arahan (dari pemilik proyek)

- Bersih, formal, bergaya aplikasi pemerintahan.
- Warna: biru tua, putih, abu-abu. Font mudah dibaca.
- Mobile-first. Tabel di HP berubah menjadi kartu.
- Badge status: menunggu kuning, disetujui biru, selesai hijau, ditolak merah, dibatalkan abu-abu.
- Logo atau teks "CALIAK" di header dengan tagline "Catatan Logistik Akurat dan Informasi Ketersediaan".
- Ikon dari lucide-react.

## Design Read

Aplikasi internal pencatatan BMN untuk pegawai dan pengelola barang di instansi pemerintah,
bahasa visual formal dan tenang. Dial: ENERGY 1 / RHYTHM 1 / MOTION 1.

Alasan dial: pengguna membuka aplikasi untuk menyelesaikan tugas administrasi (mengajukan,
menyetujui, mencatat), jadi tampilan tidak perlu menarik perhatian. Tata letak antarhalaman
sengaja seragam supaya pegawai cepat hafal posisi tombol. Gerak hanya pada hover, fokus, dan
laci menu.

## Keputusan dan alasannya

| Keputusan | Alasan |
|---|---|
| Biru tua `primer-800` (#152f5a) untuk sidebar dan header | Arahan pemilik: biru tua bergaya pemerintahan, dan gelapnya memisahkan navigasi dari isi. |
| Latar halaman `slate-100`, kartu putih dengan garis tepi | Kartu sudah terpisah dari latar lewat warna dan garis, jadi tidak perlu bayangan. |
| Bayangan hanya pada modal dan laci menu | Hanya elemen yang benar-benar menutupi halaman yang perlu terlihat terangkat. |
| Aksen tunggal: tombol aksi utama `primer-700` | Satu warna solid untuk aksi yang paling penting di tiap layar. Warna lain hanya untuk status. |
| Warna badge status | Ditetapkan pemilik. Setiap badge juga memuat teks status, tidak hanya warna. |
| Font Plus Jakarta Sans | Huruf buatan desainer Indonesia untuk identitas kota Jakarta, terbaca jelas di ukuran kecil, dan memberi kesan Indonesia. |
| Ikon lucide-react | Ditetapkan pemilik. Setiap ikon dipasangkan dengan label teks dan dipilih sesuai isinya (paket untuk barang, panah masuk untuk barang masuk). |
| Radius 8px untuk tombol dan input, 12px untuk kartu | Dua ukuran saja: kontrol sedikit lebih tegas dari wadah. Tidak ada elemen berbentuk pil kecuali badge status. |
| Motif identitas: kode unik barang ditampilkan dalam huruf tetap (tabular) di label abu-abu | Kode BMN dan NUP adalah hal yang dicari dan dicocokkan pengelola barang, jadi tampilannya dibuat konsisten di semua layar. |
| Target sentuh minimal 44px | Banyak pegawai memakai HP untuk mengajukan permintaan. |
| Garis fokus biru tua di area terang dan putih di area biru tua | Pengguna keyboard harus selalu bisa melihat posisinya. |

## Kontras (diuji dengan contrast-check.py dari antislop-human)

| Pasangan | Rasio |
|---|---|
| Teks `slate-600` di latar `slate-100` | 6.92 |
| Teks `primer-200` di `primer-800` | 7.37 |
| Teks putih di tombol `primer-700` | 10.82 |
| Garis fokus `primer-600` di putih | 8.39 |
