-- ============================================================
-- RumahKita — BERSIHKAN JENIS IURAN DUPLIKAT + kunci anti-duplikat
-- (akibat seed dijalankan 2x / jenis ditambah manual 2x)
-- Jalankan SEKALI di Supabase → SQL Editor. Aman di-ulang.
--
-- Alur: tagihan yang nunjuk ke jenis duplikat dialihkan ke jenis
-- asli (id terkecil) → duplikat dihapus → constraint unique dipasang.
-- ============================================================

-- 1) Alihkan tagihan dari jenis duplikat → jenis asli (id terkecil)
update tagihan t
set iuran_jenis_id = keep.id
from (
  select perumahan_id, nama, min(id) as id
  from iuran_jenis
  group by perumahan_id, nama
  having count(*) > 1
) keep
join iuran_jenis dup
  on dup.perumahan_id = keep.perumahan_id
 and dup.nama = keep.nama
 and dup.id <> keep.id
where t.iuran_jenis_id = dup.id;

-- 2) Hapus jenis iuran duplikat (yang bukan id terkecil)
delete from iuran_jenis dup
using (
  select perumahan_id, nama, min(id) as id
  from iuran_jenis
  group by perumahan_id, nama
  having count(*) > 1
) keep
where dup.perumahan_id = keep.perumahan_id
  and dup.nama = keep.nama
  and dup.id <> keep.id;

-- 3) Pasang constraint biar duplikat nggak bisa masuk lagi
alter table iuran_jenis
  add constraint iuran_jenis_perum_nama_unique unique (perumahan_id, nama);

-- ── Verifikasi: harusnya tiap nama cuma 1 baris ──
select perumahan_id, nama, count(*) as jumlah
from iuran_jenis
group by perumahan_id, nama
having count(*) > 1;