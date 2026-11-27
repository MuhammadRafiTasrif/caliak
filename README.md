# CALIAK

**Catatan Logistik Akurat dan Informasi Ketersediaan.** Aplikasi web untuk mengelola permintaan dan mutasi Barang Milik Negara (barang persediaan) di instansi.

- Pegawai mengajukan permintaan barang dari katalog dan memantau statusnya.
- Admin menyetujui atau menolak permintaan, lalu menandai selesai saat barang diserahkan. **Stok baru berkurang pada saat itu.**
- Admin mencatat barang masuk, mengoreksi stok, dan mengimpor daftar barang dari Referensi Barang SAKTI (Excel).
- Setiap perubahan stok dan status tercatat permanen dan bisa diekspor ke Excel.

Teknologi: Vite + React, Tailwind CSS, Supabase (PostgreSQL, Auth, Storage, Row Level Security).

## Memasang dari nol

### 1. Buat project Supabase

1. Masuk ke [supabase.com](https://supabase.com), klik **New project**. Pilih region **Southeast Asia (Singapore)**.
2. Simpan kata sandi database di tempat aman.

### 2. Jalankan file SQL secara berurutan

Di **SQL Editor**, buka **New query** untuk setiap file, tempel seluruh isinya, lalu **Run**:

| Urutan | File | Isi |
|---|---|---|
| 1 | `supabase/schema.sql` | Tabel, constraint, index, trigger profil |
| 2 | `supabase/functions.sql` | Fungsi stok, permintaan, impor, dashboard |
| 3 | `supabase/policies.sql` | Row Level Security dan bucket foto `foto-barang` |
| 4 | `supabase/seed.sql` | Opsional: akun dan data contoh. Hanya untuk database kosong |

`schema.sql` dan `seed.sql` hanya dijalankan sekali. `functions.sql` aman dijalankan ulang.

**Database yang dibuat sebelum versi terbaru** cukup menjalankan file migrasi yang belum pernah dijalankan, lalu `functions.sql` lagi:

- `supabase/migrasi_001_kode_kategori.sql` (impor Excel)
- `supabase/migrasi_002_email_pengguna.sql` (Kelola Pengguna)

### 3. Atur login di Supabase

Di **Authentication**:

- **Sign In / Providers**, bagian **Email**: matikan **Confirm email** selama pengembangan. Nyalakan lagi saat aplikasi dipakai sungguhan, dan atur pengirim email (SMTP) sendiri, karena pengirim bawaan Supabase dibatasi beberapa email per jam.
- **URL Configuration**: isi **Site URL** dengan alamat aplikasi, misalnya `http://localhost:5173`.

### 4. Isi file `.env`

Salin `.env.example` menjadi `.env`, lalu isi dari **Project Settings > API**:

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=kunci-anon-atau-publishable
```

Gunakan alamat dasar project (tanpa `/rest/v1/`). Jangan pernah memakai kunci `service_role` atau secret key di sini: kunci itu menembus semua aturan keamanan.

### 5. Jalankan aplikasi

```bash
npm install
npm run dev
```

Buka `http://localhost:5173`. Perintah dijalankan dari folder `caliak` (folder yang berisi `package.json`).

## Akun

**Bila memakai `seed.sql`:**

| Email | Kata sandi | Peran |
|---|---|---|
| admin@caliak.test | Admin12345 | Admin |
| pegawai1@caliak.test | Pegawai12345 | Pemohon |
| pegawai2@caliak.test | Pegawai12345 | Pemohon |

Ganti kata sandinya atau hapus akun-akun ini sebelum aplikasi dipakai sungguhan.

**Tanpa `seed.sql`**, buat admin pertama dengan mendaftar di `/daftar`, lalu jalankan di SQL Editor:

```sql
UPDATE profiles SET role = 'admin', is_verified = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'email-anda@instansi.go.id');
```

Akun berikutnya diverifikasi admin lewat menu **Kelola Pengguna**.

## Alur kerja

1. Pegawai mendaftar. Akun berstatus menunggu verifikasi sampai admin memverifikasinya.
2. Pegawai memilih barang di **Katalog**, lalu **Buat Permintaan**. Nomor `REQ-TAHUN-0001` dibuat otomatis.
3. Admin membuka **Persetujuan**: menyetujui (jumlah bisa dikurangi) atau menolak dengan alasan.
4. Saat barang diserahkan, admin menekan **Tandai selesai**. Stok berkurang dan tercatat sebagai mutasi keluar.
5. Pegawai melihat perubahan status di **Permintaan Saya** (ada angka penanda di menu).

## Impor barang dari SAKTI

Menu **Kelola Barang > Impor Excel** menerima file ekspor laporan Referensi Barang SAKTI apa adanya (kolom Kd Brng, Kd Barang, Satuan, Deskripsi). Judul laporan, nomor halaman, dan judul kolom yang berulang dilewati otomatis. Kode unik barang dibentuk dari Kd Barang dan Kd Brng, contoh `1010301001.000005`. Barang yang kodenya sudah ada tidak ditimpa.

## Keamanan

- Semua tabel memakai Row Level Security. Pengguna yang belum login tidak bisa membaca data apa pun.
- Stok tidak bisa diubah langsung dari aplikasi. Semua perubahan stok lewat fungsi database (`functions.sql`) yang mengunci baris barang dan selalu mencatat mutasinya.
- Riwayat mutasi dan riwayat status tidak punya izin ubah atau hapus.
- Pemohon tidak bisa mengubah profilnya sendiri, termasuk role. Admin tidak bisa mencabut role atau verifikasi akunnya sendiri.

## Struktur folder

```
supabase/        SQL: skema, fungsi, RLS, data contoh, migrasi
src/
  components/    Komponen tampilan bersama (Layout, Modal, ImageUpload, ...)
  context/       AuthContext (login, profil) dan PermintaanContext (keranjang, angka di menu)
  pages/         Halaman: umum, pemohon/, admin/
  services/      Semua query Supabase, dipisah dari tampilan
  utils/         Format tanggal dan angka, kompres foto, baca dan tulis Excel
scripts/         Alat uji: screenshot, pemeriksaan tampilan HP, uji alur lengkap
DESIGN.md        Arah desain dan alasan setiap keputusan visual
```

## Pengujian

Dengan `npm run dev` berjalan:

```bash
# Screenshot desktop dan HP, sekaligus mencatat error console
node scripts/screenshot.mjs /login /daftar

# Pemeriksaan HP: tidak ada scroll ke samping, tombol minimal 44px, garis fokus terlihat
node scripts/cek-tampilan.mjs /login /daftar
```

Untuk halaman yang butuh login, isi `CALIAK_EMAIL` dan `CALIAK_PASSWORD` sebagai variabel lingkungan. `scripts/uji-alur.mjs` menjalankan alur lengkap (ajukan, setujui, serahkan, cek stok) dengan akun admin dan pemohon. Skrip ini membuat permintaan sungguhan di database, jadi jalankan di database uji.
