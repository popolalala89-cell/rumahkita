import { createClient } from "npm:@supabase/supabase-js"
import webpush from "npm:web-push"

// ============================================================
// Edge Function: kirim-notif
// Kirim notifikasi web push ke SEMUA perangkat terdaftar satu perumahan.
// Dipanggil dari aplikasi (hanya super admin yang sah).
//
// Body JSON:
//   { perumahan_id: string, judul: string, isi: string, url?: string }
//
// Kunci VAPID (private) dibaca dari SECRET khusus fungsi, bukan dari repo,
// sehingga tidak pernah bocor ke aplikasi web.
// ============================================================

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  try {
    const auth = req.headers.get("authorization") ?? ""
    const token = auth.replace(/^Bearer\s+/i, "").trim()
    if (!token) return json(cors, { ok: false, error: "Belum login" }, 401)

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )

    // Verifikasi: harus super_admin proyek (hanya Pa yang bisa broadcast semua warga)
    const { data: { user }, error: ue } = await supabase.auth.getUser(token)
    if (ue || !user) return json(cors, { ok: false, error: "Sesi tidak valid" }, 401)

    const { data: me } = await supabase
      .from("profiles")
      .select("role, perumahan_id")
      .eq("id", user.id)
      .single()
    const ALLOWED = ["ketua", "bendahara", "sekretaris", "super_admin"]
    if (!me || !ALLOWED.includes(me.role)) {
      return json(cors, { ok: false, error: "Hanya pengurus perumahan yang boleh mengirim broadcast" }, 403)
    }

    const body = await req.json().catch(() => ({}))
    // Pengurus HANYA boleh kirim ke perumahan-nya SENDIRI (abaikan perumahan_id
    // dari body supaya tidak bisa kena broadcast ke perumahan lain). Super admin
    // boleh pilih perumahan mana pun.
    const perumahanId = me.role === "super_admin"
      ? String(body?.perumahan_id || me.perumahan_id || "").trim()
      : String(me.perumahan_id || "").trim()
    if (!perumahanId || perumahanId === "null") {
      return json(cors, { ok: false, error: "perumahan_id diperlukan" }, 400)
    }
    const judul = String(body?.judul ?? "").slice(0, 80)
    const isi = String(body?.isi ?? "").slice(0, 500)
    if (!judul) return json(cors, { ok: false, error: "Judul tidak boleh kosong" }, 400)
    const url = String(body?.url || "/app")

    const VAPID_PUB = Deno.env.get("VAPID_PUBLIC_KEY")
    const VAPID_PRIV = Deno.env.get("VAPID_PRIVATE_KEY")
    const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT")
    if (!VAPID_PUB || !VAPID_PRIV || !VAPID_SUBJECT) {
      return json(cors, { ok: false, error: "VAPID belum dikonfigurasi di server" }, 500)
    }

    // Baca semua subscriber perumahan ini (pakai token super_admin, RLS lolos)
    const { data: subs, error: se } = await supabase
      .from("notifikasi_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("perumahan_id", perumahanId)
    if (se) return json(cors, { ok: false, error: "Gagal baca langganan: " + se.message }, 500)

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUB, VAPID_PRIV)
    const payload = JSON.stringify({ title: judul, body: isi, url, date: new Date().toISOString() })

    let ok = 0, fail = 0, removed = 0
    await Promise.all((subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { auth: s.auth, p256dh: s.p256dh } },
          payload,
          { urgency: "high", TTL: 86400 }
        )
        ok++
      } catch (e) {
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await supabase.from("notifikasi_subscriptions").delete().eq("id", s.id)
          removed++
        } else {
          fail++
        }
      }
    }))

    return json(cors, { ok: true, terkirim: ok, gagal: fail, dihapus_kedaluwarsa: removed })
  } catch (e) {
    return json(cors, { ok: false, error: "Terjadi kesalahan: " + (e?.message ?? "tidak diketahui") }, 500)
  }
})

function json(headers: Record<string, string>, obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  })
}