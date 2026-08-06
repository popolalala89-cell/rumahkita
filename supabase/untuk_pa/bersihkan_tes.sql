-- ============================================================
-- RumahKita - BERSIHKAN DATA TES (dari tes otomatis E2E)
-- Jalankan SEKALI di Supabase SQL Editor, lalu hapus.
-- Menghapus semua peremahan demo + profil + akun auth + bukti
-- yang dibuat selama verifikasi fitur. Aman dijalankan.
-- ============================================================

-- profil milik peremahan tes
delete from profiles where perumahan_id in (
  '98cb769b-61da-481b-8e39-219a3e0fa3f3',
  '6b1d79fc-2018-4ad8-9171-257e583cf9bd',
  '00a363e7-4991-4d59-89f8-ea26aac3791f',
  '46f96496-3c3a-4636-902d-b34e82ae50d6',
  '569ef252-6107-43e9-ab64-c120ae86cef1'
);

-- peremahan demo (cascade menghapus permintaan_langganan-nya)
delete from public.perumahan where id in (
  '98cb769b-61da-481b-8e39-219a3e0fa3f3',
  '6b1d79fc-2018-4ad8-9171-257e583cf9bd',
  '00a363e7-4991-4d59-89f8-ea26aac3791f',
  '46f96496-3c3a-4636-902d-b34e82ae50d6',
  '569ef252-6107-43e9-ab64-c120ae86cef1'
);

-- akun auth tes
delete from auth.users where email in (
  'rk-demo-1785981457@example.com',
  'rk-sec-1785981527@example.com',
  'rk-fin-1785982132@example.com',
  'rk-lang-1785983931@example.com',
  'rk-paket-1785995240@example.com'
);

-- bukti QRIS tes dihapus lewat Storage API (SQL dilarang hapus storage.objects)

-- VERIFIKASI: semuanya harus 0
select (select count(*) from public.perumahan where id in (
  '98cb769b-61da-481b-8e39-219a3e0fa3f3','6b1d79fc-2018-4ad8-9171-257e583cf9bd','00a363e7-4991-4d59-89f8-ea26aac3791f','46f96496-3c3a-4636-902d-b34e82ae50d6','569ef252-6107-43e9-ab64-c120ae86cef1')) as sisa_perumahan,
       (select count(*) from auth.users where email like 'rk-demo-%@example.com' or email like 'rk-sec-%@example.com' or email like 'rk-fin-%@example.com' or email like 'rk-lang-%@example.com' or email like 'rk-paket-%@example.com') as sisa_akun_tes,
       (select count(*) from storage.objects where bucket_id='bukti-langganan') as sisa_bukti;