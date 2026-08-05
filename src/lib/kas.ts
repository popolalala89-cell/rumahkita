import { supabase } from './supabase'

// Deteksi apakah kolom `sumber` sudah ada (di-alter lewat fase1_alter.sql).
// Tanpa kolom ini, transaksi kas dari pembayaran tidak bisa ditautkan/dihapus.
let cachedSumber: boolean | null = null

export async function hasSumberColumn(): Promise<boolean> {
  if (cachedSumber !== null) return cachedSumber
  try {
    await supabase.from('kas_transaksi').select('sumber').limit(1)
    cachedSumber = true
  } catch {
    cachedSumber = false
  }
  return cachedSumber
}

export interface KasInsert {
  perumahan_id: string
  tgl: string
  jenis: 'masuk' | 'keluar'
  kategori: string
  nominal: number
  keterangan: string
  user_id?: string | null
  /** 'pembayaran:<tagihan_id>' untuk transaksi iuran otomatis, 'manual' untuk catatan sendiri */
  sumber?: string
}

/** Insert transaksi kas, otomatis memakai kolom `sumber` kalau tersedia. */
export async function insertKas(row: KasInsert): Promise<{ error: unknown } | null> {
  const src = await hasSumberColumn()
  const payload: Record<string, unknown> = {
    perumahan_id: row.perumahan_id,
    tgl: row.tgl,
    jenis: row.jenis,
    kategori: row.kategori,
    nominal: row.nominal,
    keterangan: row.keterangan,
    user_id: row.user_id ?? null,
  }
  if (src && row.sumber) payload.sumber = row.sumber
  const { error } = await supabase.from('kas_transaksi').insert(payload)
  return error ? { error: true } : null
}

/** Hapus entri kas otomatis milik sebuah tagihan (saat pembayaran dibatalkan). */
export async function hapusKasByTagihan(perumahanId: string, tagihanId: string): Promise<void> {
  if (!(await hasSumberColumn())) return
  await supabase
    .from('kas_transaksi')
    .delete()
    .eq('perumahan_id', perumahanId)
    .eq('sumber', `pembayaran:${tagihanId}`)
}