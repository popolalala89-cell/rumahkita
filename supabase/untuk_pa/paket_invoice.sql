-- ============================================================
-- RumahKita - PAKET & HARGA + INVOICE OTOMATIS
-- Jalankan SEKALI di Supabase SQL Editor.
-- Membuat tabel paket_langganan (dengan contoh harga) + kolom
-- invoice pada permintaan_langganan (paket, nominal, nomor invoice).
-- Harga bisa kamu ubah lewat menu Kelola Perumahan nanti.
-- ============================================================

-- 1) Tabel paket langganan
create table if not exists public.paket_langganan (
  id serial primary key,
  nama text not null unique,
  durasi_hari int not null,
  harga bigint not null default 0,
  deskripsi text,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

-- contoh paket awal (kalau tabel masih kosong)
insert into public.paket_langganan (nama, durasi_hari, harga, deskripsi) values
  ('Bulanan', 30, 50000, 'Langganan 1 bulan'),
  ('3 Bulan', 90, 140000, 'Langganan 3 bulan'),
  ('Tahunan', 365, 500000, 'Langganan 1 tahun')
on conflict (nama) do nothing;

alter table public.paket_langganan enable row level security;

-- baca: semua orang yang pakai app
drop policy if exists "baca_paket" on public.paket_langganan;
create policy "baca_paket" on public.paket_langganan
  for select using (true);

-- kelola (ubah harga, tambah paket): hanya Super Admin
drop policy if exists "kelola_paket" on public.paket_langganan;
create policy "kelola_paket" on public.paket_langganan
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

grant select on public.paket_langganan to anon, authenticated;
grant insert, update, delete on public.paket_langganan to authenticated;

-- 2) Kolom invoice pada permintaan_langganan
alter table public.permintaan_langganan add column if not exists paket_id int references public.paket_langganan(id);
alter table public.permintaan_langganan add column if not exists nominal bigint;
alter table public.permintaan_langganan add column if not exists invoice_no text;

-- nomor invoice otomatis: INV-26-0001, INV-26-0002, dst.
create sequence if not exists public.seq_invoice_no;
alter table public.permintaan_langganan alter column invoice_no set default
  'INV-' || to_char(now(), 'YY') || '-' || lpad(nextval('public.seq_invoice_no')::text, 4, '0');

-- VERIFIKASI: paket ter-seed + kolom invoice ada
select id, nama, durasi_hari, harga, aktif from public.paket_langganan order by id;