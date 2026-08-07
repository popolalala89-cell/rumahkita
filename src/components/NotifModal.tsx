import { useEffect, useState } from 'react'
import Modal from './ui/Modal'
import { useAuth } from '../lib/auth'
import { notifPermission, subscribePush, unsubscribePush, getSubscription } from '../lib/notif'
import { showToast } from '../lib/toast'

interface Props {
  open: boolean
  onClose: () => void
}

/**
 * Panel notifikasi: tampilkan status izin push + tombol aktifkan/munculkan
 * ulang izin. Kalau user pernah pilih "Blokir", browser TIDAK akan menampilkan
 * prompt lagi dari kode — kita beri petunjuk ubah manual di pengaturan browser.
 */
export default function NotifModal({ open, onClose }: Props) {
  const { user, profile } = useAuth()
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    setPerm(notifPermission())
    setSubscribed(!!(await getSubscription()))
  }

  useEffect(() => {
    if (open) void refresh()
  }, [open])

  const onAktifkan = async () => {
    if (!user || !profile?.perumahan_id) {
      showToast('Akun belum terhubung ke perumahan', 'warning')
      return
    }
    setBusy(true)
    const r = await subscribePush(profile.perumahan_id, user.id)
    setBusy(false)
    if (r.ok) {
      showToast('Notifikasi aktif 🔔', 'success')
      void refresh()
    } else if (r.error === 'diblokir') {
      showToast('Notifikasi diblokir di browser. Izinkan lewat pengaturan browser.', 'danger')
      void refresh()
    } else if (r.error === 'ditolak') {
      showToast('Izin notifikasi tidak diberikan.', 'warning')
      void refresh()
    } else {
      showToast(r.error ?? 'Gagal mengaktifkan notifikasi', 'danger')
    }
  }

  const onNonaktifkan = async () => {
    setBusy(true)
    const ok = await unsubscribePush()
    setBusy(false)
    if (ok) {
      showToast('Notifikasi dimatikan', 'success')
      void refresh()
    } else {
      showToast('Gagal mematikan notifikasi', 'danger')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="🔔 Notifikasi">
      {perm === 'unsupported' && (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Browser ini belum mendukung notifikasi web. Coba Chrome terbaru (HP/komputer) atau Safari iOS 16.4+.
        </div>
      )}

      {perm !== 'unsupported' && perm === 'granted' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ background: 'var(--surface)', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 28 }}>🔔</span>
              <div>
                <div style={{ fontWeight: 700 }}>Notifikasi aktif</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {subscribed
                    ? 'Perangkat ini terdaftar menerima notifikasi.'
                    : 'Izin sudah diberikan, perangkat belum terdaftar.'}
                </div>
              </div>
            </div>
          </div>
          {!subscribed && (
            <button className="btn btn-primary" onClick={onAktifkan} disabled={busy}>
              {busy ? '⏳' : 'Daftarkan Perangkat Ini'}
            </button>
          )}
          {subscribed && (
            <button className="btn btn-outline" onClick={onNonaktifkan} disabled={busy}>
              {busy ? '⏳' : 'Matikan Notifikasi'}
            </button>
          )}
        </div>
      )}

      {perm === 'default' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Notifikasi memberi tahu kamu saat ada <b>iuran baru, pengumuman, atau kegiatan</b> di perumahanmu —
            muncul walau kamu tidak sedang membuka aplikasi.
          </div>
          <button className="btn btn-primary" onClick={onAktifkan} disabled={busy}>
            {busy ? '⏳' : '🔔 Aktifkan / Munculkan Izin Notifikasi'}
          </button>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Tombol ini memunculkan ulang permintaan izin browser. Pilih <b>Izinkan</b> saat muncul.
          </div>
        </div>
      )}

      {perm === 'denied' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ background: 'var(--danger-bg, #fdecea)', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 28 }}>🚫</span>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--danger, #b3261e)' }}>Notifikasi diblokir browser</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Saat ini browser menolak notifikasi untuk situs ini. Karena pilihan "Blokir" dulu, aplikasi tidak bisa
                  memunculkan permintaan izin lagi.
                </div>
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', lineHeight: 1.6 }}>
            <b>Cara mengizinkan manual:</b>
            <br />• <b>HP Android (Chrome):</b> ⋮ → Pengaturan situs → Notifikasi → pilih <b>Izinkan</b>.
            <br />• <b>Komputer (Chrome):</b> ikon 🔒 di kiri alamat → Izin situs → Notifikasi → <b>Izinkan</b>.
            <br />• <b>iPhone (Safari):</b> Pengaturan → Safari → Notifikasi → RumahKita → <b>Izinkan</b> (butuh app
            dipasang dulu ke layar utama).
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Setelah diizinkan, kembali ke halaman ini dan tekan tombol di bawah.
          </div>
          <button className="btn btn-primary" onClick={onAktifkan} disabled={busy}>
            {busy ? '⏳' : '🔔 Aktifkan Sekarang'}
          </button>
        </div>
      )}
    </Modal>
  )
}
