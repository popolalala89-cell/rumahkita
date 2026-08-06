-- ============================================================
-- RumahKita - ALUR KONFIRMASI LANGGANAN (permintaan + bukti QRIS)
-- Jalankan SEKALI di Supabase SQL Editor.
-- Membuat: tabel permintaan_langganan + RLS + bucket storage
-- 'bukti-langganan' untuk unggah bukti transfer QRIS.
-- ============================================================

-- 1) Tabel permintaan langganan
create table if not exists public.permintaan_langganan (
  id uuid primary key default gen_random_uuid(),
  perumahan_id uuid not null references public.perumahan(id) on delete cascade,
  pemohon_id uuid not null references public.profiles(id) on delete cascade,
  bukti_url text,
  catatan text,
  status text not null default 'menunggu' check (status in ('menunggu','diterima','ditolak')),
  dibuat_pada timestamptz not null default now(),
  ditinjau_pada timestamptz
);

alter table public.permintaan_langganan enable row level security;

-- baca: pemohon sendiri / satu perumahan dengannya / super admin
drop policy if exists "baca_permintaan" on public.permintaan_langganan;
create policy "baca_permintaan" on public.permintaan_langganan
  for select using (
    pemohon_id = auth.uid()
    or perumahan_id = public.get_my_perumahan_id()
    or public.is_super_admin()
  );

-- tulis: hanya untuk perumahan sendiri (pemohon = si pengguna)
drop policy if exists "buat_permintaan" on public.permintaan_langganan;
create policy "buat_permintaan" on public.permintaan_langganan
  for insert with check (
    pemohon_id = auth.uid()
    and perumahan_id = public.get_my_perumahan_id()
  );

-- tinjau (terima/tolak): super admin
drop policy if exists "tinjau_permintaan" on public.permintaan_langganan;
create policy "tinjau_permintaan" on public.permintaan_langganan
  for update using (public.is_super_admin());

grant select, insert, update on public.permintaan_langganan to authenticated;

-- 2) Storage bucket untuk bukti QRIS (private, ditampilkan via link sementara)
insert into storage.buckets (id, name, public)
values ('bukti-langganan', 'bukti-langganan', false)
on conflict (id) do nothing;

drop policy if exists "bukti_baca" on storage.objects;
create policy "bukti_baca" on storage.objects
  for select using (bucket_id = 'bukti-langganan');

drop policy if exists "bukti_unggah" on storage.objects;
create policy "bukti_unggah" on storage.objects
  for insert with check (bucket_id = 'bukti-langganan');

drop policy if exists "bukti_hapus" on storage.objects;
create policy "bukti_hapus" on storage.objects
  for delete using (bucket_id = 'bukti-langganan');

-- VERIFIKASI
select 'tabel' as cek, count(*)::text as hasil from information_schema.tables where table_name = 'permintaan_langganan'
union all
select 'bucket', count(*)::text from storage.buckets where id = 'bukti-langganan';