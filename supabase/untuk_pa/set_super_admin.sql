-- ============================================================
-- RumahKita — BUAT PROFIL akun pengurus + jadikan SUPER ADMIN
-- (untuk akun yang TERDAFTAR tapi belum punya baris profil,
--  karena email konfirmasi aktif saat awal daftar).
-- Jalankan di Supabase → SQL Editor. Aman di-ulang (upsert).
--
-- Ganti 'popolalala89@gmail.com' kalau emailnya beda.
-- Perumahan tenant 1 = '10000000-0000-4000-8000-000000000001'
-- ============================================================

insert into profiles (id, perumahan_id, role, nama, no_hp, aktif)
select
  au.id,
  '10000000-0000-4000-8000-000000000001',  -- perumahan seed 1 (RUMAHKITA)
  'super_admin',
  'Admin RumahKita',                        -- nama (bisa diganti nanti)
  '',
  true
from auth.users au
where lower(au.email) = lower('popolalala89@gmail.com')
on conflict (id) do update
  set role = 'super_admin', aktif = true,
      perumahan_id = '10000000-0000-4000-8000-000000000001';

-- ── Verifikasi: harus muncul 1 baris dengan role=super_admin, aktif=true ──
select u.email, p.role, p.aktif, p.perumahan_id, u.created_at
from auth.users u
left join profiles p on p.id = u.id
where lower(u.email) = lower('popolalala89@gmail.com');