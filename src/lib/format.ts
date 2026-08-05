/** Format angka → Rupiah. Contoh: formatRp(15000) → "Rp15.000" */
export function formatRp(value: number | null | undefined): string {
  const n = Number(value || 0)
  return 'Rp' + n.toLocaleString('id-ID')
}

/** Format tanggal ISO → "5 Agu 2026" */
export function formatTanggal(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}
