/** Buka WhatsApp dengan pesan yang sudah jadi (wa.me share, di-tap user sendiri). */
export function waShare(text: string) {
  const url = 'https://wa.me/?text=' + encodeURIComponent(text)
  window.open(url, '_blank', 'noopener')
  return url
}