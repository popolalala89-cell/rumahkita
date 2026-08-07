#!/usr/bin/env node
/**
 * KIRIM NOTIFIKASI PUSH (Web Push) ke semua subscriber suatu perumahan.
 *
 * Pemakaian:
 *   node scripts/kirim-notifikasi.mjs <perumahan_id> "Judul" "Isi pesan"
 *
 * Yang diperlukan:
 *   - .env (Supabase URL + ANON key) sudah ada.
 *   - API login sebagai SUPER ADMIN (email) supaya bisa baca daftar langganan
 *     semua warga. Set lewat env: ADMIN_EMAIL + ADMIN_PASSWORD.
 *     (Super admin punya policy baca semua baris notifikasi_subscriptions.)
 *
 * Contoh:
 *   ADMIN_EMAIL=popolalala89@gmail.com ADMIN_PASSWORD=xxxx \
 *   node scripts/kirim-notifikasi.mjs 1000... "Iuran Mei" "Segera bayar iuran!" \
 *     --url "/app/iuran" --extra-data '{}'
 *
 * opsi: --url (route buka saat notif diklik, default /app), --data key=val dcsv
 */
import dotenv from 'dotenv'
dotenv.config() // .env (Supabase URL + anon key)
dotenv.config({ path: '.env.notif.local' }) // kunci VAPID
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const [perumahanId, title, body] = process.argv.slice(2)
const urlFlag = process.argv.indexOf('--url')
const url = urlFlag !== -1 && process.argv[urlFlag + 1] ? process.argv[urlFlag + 1] : '/app'

if (!perumahanId || !title || !body) {
  console.error('Pemakaian: node scripts/kirim-notif.mjs <perumahan_id> "Judul" "Isi".')
  process.exit(1)
}

const VAURL = process.env.VITE_SUPABASE_URL
const ANON = process.env.VITE_SUPABASE_ANON_KEY
const SUBJ = process.env.VAPID_SUBJECT
const VAPID_PUB = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIV = process.env.VAPID_PRIVATE_KEY
const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ADMIN_PASS = process.env.ADMIN_PASSWORD

if (!VAURL || !ANON) { console.error('Isi .env dengan VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY.'); process.exit(1) }
if (!VAPID_PUB || !VAPID_PRIV || !SUBJ) {
  console.error('Isi .env.local dengan VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.')
  process.exit(1)
}
if (!ADMIN_EMAIL || !ADMIN_PASS) {
  console.error('Butuh login super admin: ADMIN_EMAIL & ADMIN_PASSWORD.')
  process.exit(1)
}

webpush.setVapidDetails(SUBJ, VAPID_PUB, VAPID_PRIV)
const supabase = createClient(VAURL, ANON)

const payload = JSON.stringify({ title, body, url, date: new Date().toISOString() })

async function main() {
  // login sebagai super admin (butuh gaboleh key; anon cukup utk login)
  const { data: au, error: ae } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASS })
  if (ae) { console.error('Login gagal:', ae.message); process.exit(1) }

  const { data: subs, error: se } = await supabase
    .from('notifikasi_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('perumahan_id', perumahanId)

  if (se) { console.error('Gagal ambil langganan:', se.message); process.exit(1) }
  if (!subs || subs.length === 0) { console.log('Tidak ada subscriber untuk perumahan ini.'); return }

  console.log(`Mengirim ke ${subs.length} subscriber...`)
  let ok = 0, fail = 0
  await Promise.all(
    subs.map(async (s) => {
      const sub = { endpoint: s.endpoint, keys: { auth: s.auth, p256dh: s.p256dh } }
      try {
        await webpush.sendNotification(sub, payload, {
        urgency: 'high', // peluang lebih besar tampil sebagai popup heads-up
        TTL: 86400,
      })
        ok++
      } catch (e) {
        // 404/410 = langganan kedaluwarsa; 410 bisa dihapus
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await supabase.from('notifikasi_subscriptions').delete().eq('id', s.id)
          console.log('  hapus sub kedaluwarsa (410)')
        } else {
          fail++
          console.log('  gagal:', e?.statusCode, e?.body || e.message)
        }
      }
    })
  )
  console.log(`Selesai. Terkirim: ${ok}. Gagal: ${fail}.`)
}

main().catch((e) => { console.error(e); process.exit(1) })