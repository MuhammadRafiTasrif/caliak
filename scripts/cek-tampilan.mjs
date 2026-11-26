// Pemeriksaan tampilan di ukuran HP (390px) untuk setiap halaman yang disebut:
//   - tidak ada scroll ke samping,
//   - setiap tombol, tautan, dan input setinggi minimal 44px,
//   - garis fokus terlihat saat berpindah dengan tombol Tab.
//
// Pemakaian (dev server harus sudah jalan):
//   node scripts/cek-tampilan.mjs /login /daftar
// Untuk halaman yang butuh login, isi CALIAK_EMAIL dan CALIAK_PASSWORD.

import { chromium } from 'playwright'

const BASE = process.env.CALIAK_URL || 'http://localhost:5173'
const halaman = process.argv.slice(2)
if (halaman.length === 0) halaman.push('/login')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
let gagal = 0

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

  const lebar = await page.evaluate(() => ({
    halaman: document.documentElement.scrollWidth,
    layar: window.innerWidth,
  }))
  if (lebar.halaman > lebar.layar) {
    gagal++
    console.log(`GAGAL ${jalur}: halaman selebar ${lebar.halaman}px, layar ${lebar.layar}px`)
  }

  // Hanya elemen yang terlihat. Tautan di dalam kalimat (inline) dikecualikan.
  const kecil = await page.evaluate(() =>
    [...document.querySelectorAll('button, a[href], input, select, textarea')]
      .filter((el) => {
        const r = el.getBoundingClientRect()
        const gaya = getComputedStyle(el)
        if (r.width === 0 || gaya.visibility === 'hidden') return false
        if (el.tagName === 'A' && gaya.display === 'inline') return false
        return r.height < 44
      })
      .map((el) => `${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute('aria-label') || el.id).trim()}" ${Math.round(el.getBoundingClientRect().height)}px`),
  )
  for (const k of kecil) {
    gagal++
    console.log(`GAGAL ${jalur}: target sentuh kurang dari 44px: ${k}`)
  }

  await page.keyboard.press('Tab')
  const fokus = await page.evaluate(() => {
    const el = document.activeElement
    if (!el || el === document.body) return null
    const g = getComputedStyle(el)
    return { nama: el.tagName.toLowerCase(), outline: g.outlineStyle, ring: g.boxShadow }
  })
  if (!fokus || (fokus.outline === 'none' && fokus.ring === 'none')) {
    gagal++
    console.log(`GAGAL ${jalur}: tidak ada garis fokus saat menekan Tab`)
  }

  console.log(`cek ${jalur} selesai`)
}

await browser.close()
console.log(gagal === 0 ? '\nSemua pemeriksaan lolos.' : `\n${gagal} pemeriksaan gagal.`)
process.exit(gagal === 0 ? 0 : 1)
