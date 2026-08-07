-- ============================================================
--  RUMANKITA — NOTIFIKASI UNTUK PENGURUS
--  RUN SEKALI di Supabase → SQL Editor → paste → Run
--  (syarat: file notifikasi_push.sql dulu sudah pernah di-run)
--  ============================================================
--  Kegunaan: membolehkan ketua/bendahara/sekretaris membaca daftar
--  langganan notifikasi warganya di perumahan sendiri. Tanpa ini,
--  pengurus yang menekan tombol "Kirim Notif" hanya bisa melihat
--  langganan-nya sendiri (RLS), jadi broadcast ke warga tak terkirim.
--
--  Aturan lama: user cuma baca langganan sendiri + super_admin.
--  Policy baru di bawah menambah: pengurus boleh membaca semua
--  langganan di perumahan-nya sendiri.
--
alter table public.notifikasi_subscriptions enable row level security;

drop policy if exists "nsub_baca_pengurus" on public.notifikasi_subscriptions;
create policy "nsub_baca_pengurus" on public.notifikasi_subscriptions
  for select using (
    is_pengurus() and perumahan_id = get_my_perumahan_id()
  );

-- Verifikasi: tampilkan semua policy di tabel ini
select policyname, cmd from pg_policies where tablename = 'notifikasi_subscriptions';