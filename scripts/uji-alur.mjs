// Uji alur lengkap di browser: pemohon mengajukan, admin menyetujui dan
// menyerahkan, lalu stok dicek berkurang. Screenshot tiap langkah disimpan
// di screenshots/alur-*.png.
//
// Pemakaian (dev server harus sudah jalan):
//   CALIAK_ADMIN_EMAIL=... CALIAK_ADMIN_PASSWORD=... \
//   CALIAK_PEMOHON_EMAIL=... CALIAK_PEMOHON_PASSWORD=... \
//   CALIAK_BARANG="Ballpoint Pilot" node scripts/uji-alur.mjs
//
// Perhatian: membuat permintaan dan mutasi sungguhan di database.

import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const BASE = process.env.CALIAK_URL || 'http://localhost:5173'
const BARANG = process.env.CALIAK_BARANG || 'Ballpoint Pilot'
const env = (k) => {
  if (!process.env[k]) throw new Error(`Variabel ${k} belum diisi.`)
  return process.env[k]
}

await mkdir('screenshots', { recursive: true })
const browser = await chromium.launch()
const errorConsole = []
let langkah = 0

async function sesi(email, password, viewport) {
  const context = await browser.newContext({ viewport, locale: 'id-ID' })
  const page = await context.newPage()
  page.on('console', (m) => m.type() === 'error' && errorConsole.push(`[${email}] ${m.text()}`))
  page.on('pageerror', (e) => errorConsole.push(`[${email}] ${e.message}`))
  await page.goto(`${BASE}/login`)
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type=submit]')
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 })
  if (page.url().includes('menunggu-verifikasi')) throw new Error(`Akun ${email} belum diverifikasi.`)
  return { page, context }
}

async function foto(page, nama) {
  langkah += 1
  await page.waitForTimeout(500)
  const file = `screenshots/alur-${String(langkah).padStart(2, '0')}-${nama}.png`
  await page.screenshot({ path: file })
  console.log(`  foto: ${file}`)
}

async function stokBarang(page) {
  await page.goto(`${BASE}/admin/barang`)
  await page.fill('#cari', BARANG)
  const baris = page.locator('tr', { hasText: BARANG }).first()
  await baris.waitFor()
  const teks = await baris.locator('td').nth(1).innerText()
  return Number(teks.match(/[\d.]+/)[0].replace(/\./g, ''))
}

try {
  const HP = { width: 390, height: 844 }
  const DESKTOP = { width: 1280, height: 800 }

  console.log('1. Admin: cek stok awal')
  const admin = await sesi(env('CALIAK_ADMIN_EMAIL'), env('CALIAK_ADMIN_PASSWORD'), DESKTOP)
  const stokAwal = await stokBarang(admin.page)
  console.log(`  stok ${BARANG}: ${stokAwal}`)
  if (stokAwal < 2) throw new Error(`Stok ${BARANG} kurang dari 2. Catat barang masuk dulu.`)

  console.log('2. Pemohon (HP): pilih barang di Katalog dan ajukan')
  const pemohon = await sesi(env('CALIAK_PEMOHON_EMAIL'), env('CALIAK_PEMOHON_PASSWORD'), HP)
  const p = pemohon.page
  await p.goto(`${BASE}/katalog`)
  await p.fill('#cari', BARANG)
  const kartu = p.locator('article', { hasText: BARANG }).first()
  await kartu.getByRole('button', { name: 'Pilih barang ini' }).click()
  await kartu.getByRole('button', { name: 'Tambah satu' }).click()
  await foto(p, 'pemohon-katalog-dipilih')
  await p.getByRole('link', { name: 'Lanjut ajukan' }).click()
  await p.fill('#keperluan', 'UJI OTOMATIS Fase 5: pengujian alur aplikasi, bukan permintaan sungguhan')
  await foto(p, 'pemohon-buat-permintaan')
  await p.getByRole('button', { name: 'Ajukan permintaan' }).click()
  await p.waitForURL(/permintaan-saya/)
  const nomor = (await p.locator('li', { hasText: 'REQ-' }).first().innerText()).match(/REQ-\d{4}-\d{4}/)[0]
  console.log(`  permintaan dibuat: ${nomor}`)
  await foto(p, 'pemohon-permintaan-saya')

  console.log('3. Admin: periksa dan setujui')
  const a = admin.page
  await a.goto(`${BASE}/admin/persetujuan`)
  await a.locator('tr', { hasText: nomor }).getByRole('button', { name: 'Periksa' }).click()
  await a.getByRole('dialog').getByRole('button', { name: 'Setujui' }).waitFor()
  await foto(a, 'admin-periksa')
  await a.getByRole('dialog').getByRole('button', { name: 'Setujui' }).click()
  await a.getByRole('button', { name: 'Ya, setujui' }).click()
  await a.getByText(`${nomor} disetujui`).waitFor()

  console.log('4. Pemohon: badge dan status disetujui')
  await p.goto(`${BASE}/katalog`)
  await p.waitForTimeout(1000)
  const badge = await p.locator('nav').last().getByRole('link', { name: /Permintaan Saya/ }).innerText()
  console.log(`  menu bawah: "${badge.replace(/\s+/g, ' ')}"`)
  await foto(p, 'pemohon-badge')
  await p.goto(`${BASE}/permintaan-saya`)
  await p.locator('li', { hasText: nomor }).getByRole('button').click()
  await p.getByRole('dialog').getByRole('heading', { name: 'Riwayat status' }).waitFor()
  await foto(p, 'pemohon-detail-disetujui')

  console.log('5. Admin: serahkan dan tandai selesai')
  await a.goto(`${BASE}/admin/persetujuan?status=disetujui`)
  await a.locator('tr', { hasText: nomor }).getByRole('button', { name: 'Serahkan' }).click()
  await a.getByRole('dialog').getByRole('button', { name: /Tandai selesai/ }).click()
  await foto(a, 'admin-konfirmasi-serahkan')
  await a.getByRole('button', { name: 'Ya, tandai selesai' }).click()
  await a.getByText(`${nomor} selesai`).waitFor()

  console.log('6. Admin: cek stok sesudah')
  const stokAkhir = await stokBarang(a)
  console.log(`  stok ${BARANG}: ${stokAwal} menjadi ${stokAkhir}`)
  await foto(a, 'admin-stok-sesudah')
  await a.goto(`${BASE}/admin/riwayat`)
  await a.locator('tr', { hasText: nomor }).first().waitFor()
  await foto(a, 'admin-riwayat-mutasi')

  console.log(stokAkhir === stokAwal - 2 ? '\nLOLOS: stok berkurang 2 tepat saat diserahkan.' : `\nGAGAL: stok seharusnya ${stokAwal - 2}.`)
} catch (err) {
  console.log(`\nGAGAL: ${err.message}`)
  process.exitCode = 1
} finally {
  await browser.close()
  console.log(errorConsole.length ? `\nError console:\n${errorConsole.join('\n')}` : 'Tidak ada error di console.')
}
