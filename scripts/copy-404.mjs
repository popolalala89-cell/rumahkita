// Salin dist/index.html -> dist/404.html
// Supaya reload halaman menu di GitHub Pages (yang server-nya balas 404 utk
// route SPA) langsung menampilkan app di halaman yang sama, tanpa lompat ke
// beranda lalu restore. Karena base pakai '/rumahkita/', tombol aset di dalam
// file ini absolut dari akar domain, jadi aman jalan di kedalaman path mana pun.
import { copyFileSync, existsSync } from 'node:fs'

const from = 'dist/index.html'
const to = 'dist/404.html'
if (!existsSync(from)) {
  console.error('dist/index.html tidak ada — jalankan npm run build dulu')
  process.exit(1)
}
copyFileSync(from, to)
console.log('dist/404.html = salinan index.html OK')