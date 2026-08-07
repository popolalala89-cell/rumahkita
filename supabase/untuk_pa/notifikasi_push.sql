-- ============================================================
--  NOTIFIKASI PUSH (Web Push) — RumahKita
--  RUN SEKALI di Supabase → SQL Editor → paste → Run
--  ============================================================

-- 1) Tabel langganan notifikasi (dipakai frontend + kirim)
create table if not exists public.notifikasi_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  perumahan_id  uuid not null references public.perumahan(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null default '',
  auth          text not null default '',
  device_info   text,
  created_at    timestamptz not null default now()
);

-- 2) RLS: tiap user cuma bisa baca/tulis data miliknya; super admin lihat semua (buat kirim)
alter table public.notifikasi_subscriptions enable row level security;

drop policy if exists "nsub_baca" on public.notifikasi_subscriptions;
create policy "nsub_baca" on public.notifikasi_subscriptions
  for select using (user_id = auth.uid() or is_super_admin());

drop policy if exists "nsub_tulis" on public.notifikasi_subscriptions;
create policy "nsub_tulis" on public.notifikasi_subscriptions
  for insert with check (user_id = auth.uid() and perumahan_id = get_my_perumahan_id());

drop policy if exists "nsub_ubah" on public.notifikasi_subscriptions;
create policy "nsub_ubah" on public.notifikasi_subscriptions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "nsub_hapus" on public.notifikasi_subscriptions;
create policy "nsub_hapus" on public.notifikasi_subscriptions
  for delete using (user_id = auth.uid() or is_super_admin());

-- 3) Grant
grant select, insert, update, delete on public.notifikasi_subscriptions to authenticated;

-- 4) Verifikasi
select 'ok' as status, count(*) as jumlah from public.notifikasi_subscriptions;