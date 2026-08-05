import * as XLSX from 'xlsx'

interface SheetData {
  name: string
  rows: Record<string, unknown>[]
}

/** Buat file Excel multi-sheet dan picu unduhan di browser. */
export function downloadExcel(filename: string, sheets: SheetData[]) {
  if (sheets.length === 0) return
  const wb = XLSX.utils.book_new()
  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.rows)
    // judul sheet maksimal 31 karakter, tanpa karakter terlarang
    const safeName = s.name.replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'Sheet'
    XLSX.utils.book_append_sheet(wb, ws, safeName)
  }
  XLSX.writeFile(wb, filename)
}