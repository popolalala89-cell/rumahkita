-- ─────────────────────────────────────────────
-- RUMAHKITA · Bersihkan duplikat data warga
-- Jalankan di Supabase → SQL Editor (sekali saja)
-- ─────────────────────────────────────────────

-- 1) PRATINJAU: tampilkan semua warga + statusnya
--    (cari baris "Pa" yang tampil 2x, perhatikan kolom id-nya)
select id, nama, no_hp, rumah_id, aktif, status_tinggal, created_at
from warga
order by id;

-- 2) HAPUS duplikat: pertahankan id TERKECIL dari pasangan yang
--    identik (nama, rumah, no HP), hapus sisanya.
delete from warga w
using warga w2
where w.id > w2.id
  and w.nama = w2.nama
  and coalesce(w.rumah_id, 0) = coalesce(w2.rumah_id, 0)
  and coalesce(w.no_hp, '')  = coalesce(w2.no_hp, '');

-- 3) VERIFIKASI: setelah hapus, jumlah warga harus menurun
--    (chip "Warga · N" jadi N yang benar).
select id, nama, no_hp, rumah_id, aktif, status_tinggal, created_at
from warga
order by id;