#!/usr/bin/env node
/**
 * CEK SUBSCRIBER — tampilkan perumahan yang punya perangkat terdaftar.
 * Butuh ADMIN_EMAIL + ADMIN_PASSWORD di .env.notif.local (super admin),
 * dan .env (Supabase URL + anon key).
 */
import dotenv from 'dotenv'
dotenv.config()
dotenv.config({ path: '.env.notif.local' })
import { createClient } from '@supabase/supabase-js'

const VAURL = process.env.VITE_SUPABASE_URL
const ANON = process.env.VITE_SUPABASE_ANON_KEY
const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ADMIN_PASS = process.env.ADMIN_PASSWORD

if (!VAURL || !ANON) { console.error('Isi .env (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY).'); process.exit(1) }
if (!ADMIN_EMAIL || !ADMIN_PASS) {
  console.error('Tambahkan ADMIN_EMAIL & ADMIN_PASSWORD di .env.notif.local lalu jalankan lagi.')
  process.exit(1)
}

const supabase = createClient(VAURL, ANON)

async function main() {
  const { data: au, error: ae } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASS })
  if (ae) { console.error('Login gagal:', ae.message); process.exit(1) }
  console.log('Login super admin OK:', au.user?.email)

  // daftar perumahan
  const { data: rum, error: re } = await supabase.from('perumahan').select('id, nama')
  if (re) { console.error('Gagal ambil perumahan:', re.message); process.exit(1) }

  for (const r of rum || []) {
    const { data: subs, error: se } = await supabase
      .from('notifikasi_subscriptions')
      .select('id, device_info, created_at')
      .eq('perumahan_id', r.id)
    if (se) { console.log(`\n[${r.nama}] ${r.id} — ERR ${se.message}`); continue }
    console.log(`\n[${r.nama}]\n  perumahan_id = ${r.id}\n  subscriber   = ${(subs || []).length} perangkat`)
    for (const s of subs || []) {
      console.log(`    - ${s.device_info || 'N/A'}  (${s.created_at})`)
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1) })