import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { showToast } from '../lib/toast'
import { formatRp } from '../lib/format'
import type { PaketLangganan } from '../lib/types'

// Pengelola paket & harga (khusus Super Admin, di menu Kelola Perumahan)
export default function PaketAdminCard() {
  const [pakets, setPakets] = useState<PaketLangganan[]>([])
  const [busy, setBusy] = useState<number | 'baru' | null>(null)

  const load = () => {
    supabase
      .from('paket_langganan')
      .select('*')
      .order('harga', { ascending: true })
      .then(({ data }) => {
        if (data) setPakets(data as PaketLangganan[])
      })
  }
  useEffect(() => {
    load()
  }, [])

  const setField = (id: number, key: keyof PaketLangganan, val: string | number | boolean) =>
    setPakets((ps) => ps.map((x) => (x.id === id ? { ...x, [key]: val } : x)))

  const simpan = async (p: PaketLangganan) => {
    setBusy(p.id)
    const { error } = await supabase
      .from('paket_langganan')
      .update({
        nama: p.nama.trim() || 'Paket',
        durasi_hari: Number(p.durasi_hari) || 0,
        harga: Number(p.harga) || 0,
        aktif: p.aktif,
      })
      .eq('id', p.id)
    setBusy(null)
    if (error) {
      showToast('Gagal menyimpan', 'danger')
      return
    }
    showToast('Paket disimpan ✅', 'success')
    load()
  }

  const hapus = async (p: PaketLangganan) => {
    setBusy(p.id)
    const { error } = await supabase.from('paket_langganan').delete().eq('id', p.id)
    setBusy(null)
    if (error) {
      showToast('Tidak bisa dihapus (mungkin sudah dipakai)', 'danger')
      return
    }
    showToast('Paket dihapus', 'success')
    load()
  }

  const tambah = async () => {
    setBusy('baru')
    const { error } = await supabase.from('paket_langganan').insert({
      nama: 'Paket Baru',
      durasi_hari: 30,
      harga: 0,
      aktif: true,
    })
    setBusy(null)
    if (error) {
      showToast('Gagal menambah', 'danger')
      return
    }
    showToast('Paket ditambahkan — ganti namanya lalu Simpan ✅', 'success')
    load()
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="card-title">
        <span className="mat-icon">sell</span>
        <span style={{ fontWeight: 700 }}>Paket &amp; Harga Langganan</span>
      </div>
      <p className="li-sub" style={{ marginBottom: 10 }}>
        Daftar ini tampil di halaman "Langganan" semua perumahan. Nama, durasi (hari), dan harga (Rp) bisa kamu ubah
        kapan saja.
      </p>
      {pakets.length === 0 ? (
        <p className="li-sub">Belum ada paket.</p>
      ) : (
        pakets.map((p) => (
          <div key={p.id} style={{ border: '1px solid #eee', borderRadius: 10, padding: 10, marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                className="form-control"
                style={{ flex: 2, minWidth: 110 }}
                value={p.nama}
                onChange={(e) => setField(p.id, 'nama', e.target.value)}
                placeholder="Nama paket"
              />
              <input
                className="form-control"
                style={{ flex: 1, minWidth: 80 }}
                type="number"
                value={p.durasi_hari}
                onChange={(e) => setField(p.id, 'durasi_hari', Number(e.target.value))}
                placeholder="Hari"
                title="Durasi dalam hari"
              />
              <input
                className="form-control"
                style={{ flex: 1, minWidth: 110 }}
                type="number"
                value={p.harga}
                onChange={(e) => setField(p.id, 'harga', Number(e.target.value))}
                placeholder="Harga Rp"
                title="Harga dalam rupiah"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
                <input type="checkbox" checked={p.aktif} onChange={(e) => setField(p.id, 'aktif', e.target.checked)} /> Aktif
              </label>
              <span className="li-sub">
                {formatRp(p.harga)} / {p.durasi_hari} hari
              </span>
              <div style={{ flex: 1 }} />
              <button className="btn btn-sm btn-primary" disabled={busy === p.id} onClick={() => simpan(p)}>
                {busy === p.id ? '⏳' : '💾 Simpan'}
              </button>
              <button className="btn btn-sm btn-danger" disabled={busy === p.id} onClick={() => hapus(p)}>
                🗑
              </button>
            </div>
          </div>
        ))
      )}
      <button className="btn btn-sm btn-outline" style={{ marginTop: 4 }} disabled={busy === 'baru'} onClick={tambah}>
        ➕ Tambah Paket
      </button>
    </div>
  )
}