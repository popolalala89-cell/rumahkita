-- ============================================================
-- RumahKita — SEED (jalankan setelah schema + rls)
-- Tenant pertama: perumahan Pa. Blok B × 32 rumah,
-- iuran awal: Sampah + Infaq. Ganti nama perumahan sesuai selera.
-- ============================================================

-- ── Perumahan tenant 1 ──────────────────────────────────────
insert into perumahan (id, nama, alamat, kode_undangan)
values (
  '10000000-0000-4000-8000-000000000001',
  'Perumahan RumahKita',
  'Blok A-B',
  'RUMAHKITA'
) on conflict (id) do nothing;

-- ── Blok B: 32 rumah (nomor 1..32) ──────────────────────────
insert into rumah (perumahan_id, blok, nomor, tipe, status_huni)
select
  '10000000-0000-4000-8000-000000000001',
  'B',
  g::text,
  'Rumah',
  'kosong'
from generate_series(1, 32) as g
on conflict (perumahan_id, blok, nomor) do nothing;

-- ── Master iuran (nominal contoh, pengurus bisa ubah) ───────
insert into iuran_jenis (perumahan_id, nama, nominal, periode)
values
  ('10000000-0000-4000-8000-000000000001', 'Iuran Sampah', 30000, 'bulanan'),
  ('10000000-0000-4000-8000-000000000001', 'Infaq', 10000, 'bulanan')
on conflict do nothing;

-- ── Data warga Pa (rumah B.3) ───────────────────────────────
insert into warga (perumahan_id, rumah_id, nama, status_tinggal, aktif)
select
  '10000000-0000-4000-8000-000000000001',
  r.id,
  'Pa',
  'pemilik',
  true
from rumah r
where r.perumahan_id = '10000000-0000-4000-8000-000000000001' and r.blok = 'B' and r.nomor = '3'
on conflict do nothing;

-- ── Siapkan rumah B.3 = dihuni ──────────────────────────────
update rumah
set status_huni = 'dihuni'
where perumahan_id = '10000000-0000-4000-8000-000000000001' and blok = 'B' and nomor = '3';

-- ══ SETELAH Pa REGISTRASI (login sekali di web), jalanin ini
--    agar akun Pa jadi Ketua dan terhubung ke rumah B.3:
-- ═══════════════════════════════════════════════════════════
-- update profiles p
-- set role = 'ketua', aktif = true,
--     rumah_id = (select id from rumah where perumahan_id='10000000-0000-4000-8000-000000000001' and blok='B' and nomor='3')
-- from auth.users u
-- where u.id = p.id and u.email = 'popolalala89@gmail.com';