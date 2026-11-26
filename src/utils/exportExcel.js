// Membuat dan mengunduh file Excel di browser.
// lembar: [{ nama: 'Barang', baris: [[...header], [...isi], ...], lebar: [12, 30] }]
export async function unduhExcel(namaFile, lembar) {
  const XLSX = await import('xlsx')
  const buku = XLSX.utils.book_new()
  for (const l of lembar) {
    const ws = XLSX.utils.aoa_to_sheet(l.baris)
    if (l.lebar) ws['!cols'] = l.lebar.map((wch) => ({ wch }))
    XLSX.utils.book_append_sheet(buku, ws, l.nama)
  }
  XLSX.writeFile(buku, namaFile)
}

// Kolom template sama dengan laporan Referensi Barang SAKTI, ditambah
// kolom opsional milik CALIAK di sebelah kanan.
export function unduhTemplateBarang() {
  return unduhExcel('template-impor-barang-caliak.xlsx', [
    {
      nama: 'Barang',
      baris: [['Kd Brng', 'Kd Barang', 'Satuan', 'Deskripsi', 'Kategori', 'Stok', 'Stok Minimum', 'Lokasi']],
      lebar: [10, 14, 10, 45, 24, 8, 14, 24],
    },
    {
      nama: 'Petunjuk',
      baris: [
        ['Kolom', 'Wajib', 'Keterangan'],
        ['Kd Brng', 'Ya', 'Nomor urut barang dari SAKTI, 1 sampai 6 digit. Contoh: 5 atau 000005.'],
        ['Kd Barang', 'Ya', 'Kode barang 10 digit dari SAKTI. Sekaligus menjadi kode kategori.'],
        ['Satuan', 'Tidak', 'Bila kosong diisi Unit.'],
        ['Deskripsi', 'Ya', 'Nama barang.'],
        ['Kategori', 'Tidak', 'Nama kategori. Bisa juga diisi di layar pratinjau.'],
        ['Stok', 'Tidak', 'Stok awal. Dicatat sebagai mutasi masuk "Stok awal (impor Excel)".'],
        ['Stok Minimum', 'Tidak', 'Batas stok menipis.'],
        ['Lokasi', 'Tidak', 'Lokasi penyimpanan.'],
        [],
        ['Kode unik barang di CALIAK = Kd Barang + titik + Kd Brng 6 digit, contoh 1010301001.000005.'],
        ['Barang yang kodenya sudah terdaftar dilewati dan tidak ditimpa.'],
        ['File ekspor Referensi Barang dari SAKTI juga bisa langsung diunggah tanpa diubah.'],
      ],
      lebar: [14, 8, 80],
    },
  ])
}
