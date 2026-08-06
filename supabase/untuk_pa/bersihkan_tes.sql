-- ============================================================
-- RumahKita - BERSIHKAN DATA TES (dari tes otomatis E2E)
-- Jalankan SEKALI di Supabase SQL Editor, lalu hapus.
-- Menghapus peremahan demo + profil + akun auth yang dibuat
-- selama verifikasi fitur. Aman dijalankan (baris tidak ada
-- di DB berarti sudah terhapus / tidak masalah).
-- ============================================================

-- profil milik peremahan tes
delete from profiles where perumahan_id in (
  '98cb769b-61da-481b-8e39-219a3e0fa3f3',
  '6b1d79fc-2018-4ad8-9171-257e583cf9bd'
);

-- peremahan tes
delete from perumahan where id in (
  '98cb769b-61da-481b-8e39-219a3e0fa3f3',
  '6b1d79fc-2018-4ad8-9171-257e583cf9bd'
);

-- akun auth tes
delete from auth.users where email in (
  'rk-demo-1785981457@example.com',
  'rk-sec-1785981527@example.com'
);

-- VERIFIKASI: keduanya harus 0
select (select count(*) from perumahan where id in (
  '98cb769b-61da-481b-8e39-219a3e0fa3f3','6b1d79fc-2018-4ad8-9171-257e583cf9bd')) as sisa_perumahan,
       (select count(*) from auth.users where email like 'rk-%-@example.com' or email like 'rk-demo-%@example.com' or email like 'rk-sec-%@example.com') as sisa_akun_tes;