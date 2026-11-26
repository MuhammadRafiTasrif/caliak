// Mengambil screenshot halaman CALIAK di ukuran desktop dan HP,
// sekaligus mencatat error yang muncul di console browser.
//
// Pemakaian (dev server harus sudah jalan):
//   node scripts/screenshot.mjs /login /daftar
// Untuk halaman yang butuh login, isi variabel lingkungan:
//   CALIAK_EMAIL=admin@contoh.go.id CALIAK_PASSWORD=... node scripts/screenshot.mjs /admin
//
// Hasil disimpan di folder screenshots/ (tidak ikut git).

import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const BASE = process.env.CALIAK_URL || 'http://localhost:5173'
const halaman = process.argv.slice(2)
if (halaman.length === 0) halaman.push('/login')

const UKURAN = {
  desktop: { width: 1280, height: 800 },
  hp: { width: 390, height: 844 },
}

await mkdir('screenshots', { recursive: true })
const browser = await chromium.launch()
let adaError = false

for (const [namaUkuran, viewport] of Object.entries(UKURAN)) {
  const context = await browser.newContext({ viewport, locale: 'id-ID' })
  const page = await context.newPage()
  page.on('console', (pesan) => {
    if (pesan.type() === 'error') {
      adaError = true
      console.log(`  [console error] ${pesan.text()}`)
    }
  })
  page.on('pageerror', (err) => {
    adaError = true
    console.log(`  [page error] ${err.message}`)
  })

  if (process.env.CALIAK_EMAIL) {
    await page.goto(`${BASE}/login`)
    await page.fill('#email', process.env.CALIAK_EMAIL)
    await page.fill('#password', process.env.CALIAK_PASSWORD || '')
    await page.click('button[type=submit]')
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 })
  }

  for (const jalur of halaman) {
    await page.goto(`${BASE}${jalur}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(400)
    const nama = `${jalur.replace(/^\//, '').replace(/\//g, '_') || 'beranda'}-${namaUkuran}.png`
    await page.screenshot({ path: `screenshots/${nama}`, fullPage: true })
    console.log(`OK  ${jalur} (${namaUkuran}) -> screenshots/${nama}`)
  }
  await context.close()
}

await browser.close()
console.log(adaError ? '\nAda error di console.' : '\nTidak ada error di console.')
