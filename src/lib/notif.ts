import { supabase } from './supabase'
import { VAPID_PUBLIC_KEY } from './vapid'

/** Dukungan push di browser ini? */
export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** Status izin: 'granted' | 'denied' | 'default' | 'unsupported' */
export function notifPermission(): NotificationPermission | 'unsupported' {
  if (!pushSupported()) return 'unsupported'
  return Notification.permission
}

/** Ubah kunci publik base64url → Uint8Array (format yang diminta pushManager.subscribe) */
function urlBase64ToUint8Array(b64: string): Uint8Array {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4)
  const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/** Ambil subscription push yang aktif (kalau ada) */
export async function getSubscription(): Promise<PushSubscription | null> {
  try {
    const reg = await navigator.serviceWorker.ready
    return await reg.pushManager.getSubscription()
  } catch {
    return null
  }
}

/**
 * Aktifkan notifikasi. WAJIB dipanggil dari klik user (user gesture),
 * kalau tidak browser menolak menampilkan prompt izin.
 */
export async function subscribePush(
  perumahanId: string,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') {
      return { ok: false, error: perm === 'denied' ? 'diblokir' : 'ditolak' }
    }
    // Pastikan service worker aktif & sudah diperbarui sebelum subscribe
    let reg = await navigator.serviceWorker.ready
    try {
      if (navigator.serviceWorker.getRegistration) {
        const cur = await navigator.serviceWorker.getRegistration()
        if (cur?.active && cur.active !== reg.active) reg = cur
      }
    } catch {
      /* abaikan; lanjut pakai reg.ready */
    }
    // Coba refresh SW (tangani kasus versi lama yang masih memegang registrasi)
    try {
      if (typeof reg.update === 'function') await reg.update()
    } catch { /* abaikan */ }
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }
    const j = sub.toJSON()
    const { error } = await supabase
      .from('notifikasi_subscriptions')
      .upsert(
        {
          perumahan_id: perumahanId,
          user_id: userId,
          endpoint: j.endpoint ?? '',
          p256dh: j.keys?.p256dh ?? '',
          auth: j.keys?.auth ?? '',
          device_info: navigator.userAgent.slice(0, 120),
        },
        { onConflict: 'endpoint' }
      )
    if (error) throw error
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'gagal'
    // Terjemahkan pesan teknis browser jadi petunjuk yang jelas
    const lower = msg.toLowerCase()
    if (lower.includes('push service')) {
      return {
        ok: false,
        error:
          'push-service-gagal',
      }
    }
    if (lower.includes('notallow') || lower.includes('permission')) {
      return { ok: false, error: 'diblokir' }
    }
    return { ok: false, error: msg }
  }
}

/** Matikan notifikasi (hapus langganan di DB + browser) */
export async function unsubscribePush(): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      const j = sub.toJSON()
      await supabase.from('notifikasi_subscriptions').delete().eq('endpoint', j.endpoint ?? '')
      await sub.unsubscribe()
    }
    return true
  } catch {
    return false
  }
}
