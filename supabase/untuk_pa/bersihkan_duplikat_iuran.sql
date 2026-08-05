-- ============================================================
-- RumahKita — BERSIHKAN DUPLIKAT: JENIS IURAN + TAGIHAN
-- (akibat seed dijalankan 2x / jenis ditambah manual 2x)
-- Jalankan SEKALI di Supabase → SQL Editor. Aman di-ulang.
--
-- Alur: pembayaran dipindah ke tagihan asli → tagihan dobel dihapus
-- → tagihan yang nunjuk jenis duplikat dialihkan → jenis duplikat
-- dihapus → constraint unique dipasang.
-- ============================================================

-- 1) Tagihan dobel (rumah+jenis+bulan+tahun yang sama):
--    pindahkan pembayarannya ke tagihan asli (id terkecil), lalu hapus duplikatnya.
update pembayaran pay
set tagihan_id = keep.id
from (
  select min(id) as id, perumahan_id, rumah_id, iuran_jenis_id, bulan, tahun
  from tagihan
  group by perumahan_id, rumah_id, iuran_jenis_id, bulan, tahun
  having count(*) > 1
) keep
join tagihan dup
  on dup.perumahan_id = keep.perumahan_id
 and dup.rumah_id = keep.rumah_id
 and dup.iuran_jenis_id = keep.iuran_jenis_id
 and dup.bulan = keep.bulan
 and dup.tahun = keep.tahun
 and dup.id <> keep.id
where pay.tagihan_id = dup.id;

delete from tagihan dup
using (
  select min(id) as id, perumahan_id, rumah_id, iuran_jenis_id, bulan, tahun
  from tagihan
  group by perumahan_id, rumah_id, iuran_jenis_id, bulan, tahun
  having count(*) > 1
) keep
where dup.perumahan_id = keep.perumahan_id
  and dup.rumah_id = keep.rumah_id
  and dup.iuran_jenis_id = keep.iuran_jenis_id
  and dup.bulan = keep.bulan
  and dup.tahun = keep.tahun
  and dup.id <> keep.id;

-- 2) Alihkan tagihan dari jenis duplikat → jenis asli (id terkecil)
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

-- 3) Hapus jenis iuran duplikat (yang bukan id terkecil)
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

-- 4) Pasang constraint biar duplikat nggak bisa masuk lagi
alter table iuran_jenis
  add constraint iuran_jenis_perum_nama_unique unique (perumahan_id, nama);

-- ── Verifikasi: dua query di bawah harusnya KOSONG ──
select perumahan_id, nama, count(*) as jumlah
from iuran_jenis
group by perumahan_id, nama
having count(*) > 1;

select perumahan_id, rumah_id, iuran_jenis_id, bulan, tahun, count(*) as jumlah
from tagihan
group by perumahan_id, rumah_id, iuran_jenis_id, bulan, tahun
having count(*) > 1;