-- ============================================================
-- RumahKita — Angkat akun pengurus jadi SUPER ADMIN
-- Jalankan di Supabase → SQL Editor.
-- Aman di-ulang (idempotent). Diakhiri query verifikasi.
--
-- CATATAN: kalau emailnya bukan popolalala89@gmail.com,
-- ganti di bagian 'GANTI_EMAIL' di bawah.
-- ============================================================

update profiles p
set role = 'super_admin', aktif = true
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('popolalala89@gmail.com');

-- ── Verifikasi: harus muncul 1 baris dengan role=super_admin, aktif=true ──
select u.email, p.role, p.aktif, p.perumahan_id, u.created_at
from auth.users u
left join profiles p on p.id = u.id
where lower(u.email) = lower('popolalala89@gmail.com');

-- ── Kalau verifikasi di atas KOSONG: list semua user terdaftar ──
-- (biar ketahuan email sebenarnya yang kamu pakai daftar)
-- select u.email, p.role, p.aktif, p.perumahan_id
-- from auth.users u
-- left join profiles p on p.id = u.id;