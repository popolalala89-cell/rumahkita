-- ============================================================
-- RumahKita - QRIS PEMBAYARAN PLATFORM (satu QRIS utk semua perumah)
-- Jalankan SEKALI di Supabase SQL Editor.
-- Membuat tabel pengaturan_qris (singleton) + bucket qris-platform
-- untuk gambar QRIS pembayaran langganan. Diisi oleh Super Admin.
-- ============================================================

-- 1) Tabel pengaturan QRIS (baris tunggal id=1)
create table if not exists public.pengaturan_qris (
  id int primary key default 1 check (id = 1),
  gambar_url text,
  keterangan text,
  updated_at timestamptz default now()
);

insert into public.pengaturan_qris (id) values (1) on conflict (id) do nothing;

alter table public.pengaturan_qris enable row level security;

-- baca: semua anggota (untuk tampil di halaman Langganan)
drop policy if exists "baca_qris" on public.pengaturan_qris;
create policy "baca_qris" on public.pengaturan_qris
  for select using (true);

-- kelola: hanya Super Admin
drop policy if exists "kelola_qris" on public.pengaturan_qris;
create policy "kelola_qris" on public.pengaturan_qris
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

grant select on public.pengaturan_qris to anon, authenticated;
grant insert, update, delete on public.pengaturan_qris to authenticated;

-- 2) Storage bucket untuk gambar QRIS (private)
insert into storage.buckets (id, name, public)
values ('qris-platform', 'qris-platform', false)
on conflict (id) do nothing;

drop policy if exists "qris_baca" on storage.objects;
create policy "qris_baca" on storage.objects
  for select using (bucket_id = 'qris-platform');

drop policy if exists "qris_unggah" on storage.objects;
create policy "qris_unggah" on storage.objects
  for insert with check (bucket_id = 'qris-platform');

drop policy if exists "qris_hapus" on storage.objects;
create policy "qris_hapus" on storage.objects
  for delete using (bucket_id = 'qris-platform');

-- VERIFIKASI
select count(*) as cek_tabel
from information_schema.tables where table_name = 'pengaturan_qris';