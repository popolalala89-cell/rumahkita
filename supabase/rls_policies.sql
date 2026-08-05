-- ============================================================
-- RumahKita — RLS POLICIES + FUNCTIONS (jalankan setelah schema.sql)
-- Amankan data antar-perumahan. Fungsi helper SECURITY DEFINER
-- (bypass RLS saat baca profiles, hindari infinite recursion).
-- ============================================================

-- ── Helper functions ────────────────────────────────────────
create or replace function get_my_perumahan_id() returns uuid
language sql stable security definer set search_path = public
as $$ select perumahan_id from profiles where id = auth.uid() $$;

create or replace function get_my_rumah_id() returns uuid
language sql stable security definer set search_path = public
as $$ select rumah_id from profiles where id = auth.uid() $$;

create or replace function is_super_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from profiles where id = auth.uid() and role = 'super_admin') $$;

create or replace function is_pengurus() returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from profiles where id = auth.uid() and role in ('ketua','bendahara','sekretaris','super_admin')) $$;

create or replace function is_role(r text) returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from profiles where id = auth.uid() and role = r) $$;

-- ── RPC pendaftaran warga (amankan: pakai kode undangan) ────
create or replace function public.daftar_profile(p_nama text, p_no_hp text, p_kode_undangan text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v_perum uuid;
begin
  select id into v_perum
  from perumahan
  where kode_undangan = upper(trim(p_kode_undangan)) and aktif;
  if v_perum is null then
    return jsonb_build_object('ok', false, 'error', 'Kode undangan tidak valid');
  end if;
  if exists(select 1 from profiles where id = auth.uid()) then
    return jsonb_build_object('ok', false, 'error', 'Akun ini sudah terdaftar di perumahan');
  end if;
  insert into profiles (id, perumahan_id, role, nama, no_hp, aktif)
    values (auth.uid(), v_perum, 'warga', p_nama, coalesce(p_no_hp,''), false);
  return jsonb_build_object('ok', true, 'error', null);
end $$;
revoke all on function public.daftar_profile(text,text,text) from public;
grant execute on function public.daftar_profile(text,text,text) to authenticated;

-- ── Profil: revoke default dulu, nanti grant column-level ───
alter table profiles enable row level security;
alter table perumahan enable row level security;

-- profiles: baca = diri sendiri atau seperumahan; update = pengurus
-- atau hanya kolom nama/no_hp utk diri sendiri (via column grant)
drop policy if exists "baca_profil" on profiles;
create policy "baca_profil" on profiles
  for select using (id = auth.uid() or perumahan_id = get_my_perumahan_id() or is_super_admin());

drop policy if exists "kelola_profil" on profiles;
create policy "kelola_profil" on profiles
  for all using (is_pengurus())
  with check (is_pengurus());

drop policy if exists "update_diri" on profiles;
create policy "update_diri" on profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- Batasi kolom yang bisa diubah warga sendiri:
revoke all on profiles from anon, authenticated;
grant select on profiles to anon, authenticated;
grant update (nama, no_hp) on profiles to authenticated;

-- perumahan: anggota baca perumahan sendiri, super admin kelola
drop policy if exists "baca_perumahan" on perumahan;
create policy "baca_perumahan" on perumahan
  for select using (id = get_my_perumahan_id() or is_super_admin());
drop policy if exists "kelola_perumahan" on perumahan;
create policy "kelola_perumahan" on perumahan
  for all using (is_super_admin())
  with check (is_super_admin());

-- ── Semua tabel bisnis: aktifkan RLS + policy baca anggota ──
do $$
declare t text;
begin
  foreach t in array array[
    'rumah','warga','pengurus','iuran_jenis','tagihan','pembayaran','kas_transaksi',
    'pengumuman','kegiatan','polling','polling_suara','direktori_usaha','keluhan',
    'fasilitas','booking','surat','buku_tamu','kendaraan_log','aset','pemeliharaan',
    'dokumen','kontak_penting','log_aktivitas','pengaturan']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "baca_anggota" on %I', t);
    execute format('create policy "baca_anggota" on %I for select using (perumahan_id = get_my_perumahan_id() or is_super_admin())', t);
  end loop;
end $$;

-- ── Pengurus kelola (ketua/bendahara/sekretaris) ────────────
do $$
declare t text;
begin
  foreach t in array array[
    'rumah','warga','pengurus','iuran_jenis','tagihan','pembayaran','kas_transaksi',
    'pengumuman','kegiatan','direktori_usaha','surat','fasilitas','aset','pemeliharaan',
    'dokumen','kontak_penting','log_aktivitas','pengaturan']
  loop
    execute format('drop policy if exists "pengurus_tulis" on %I', t);
    execute format('create policy "pengurus_tulis" on %I for all using (is_pengurus()) with check (is_pengurus())', t);
  end loop;
end $$;

-- ── Satpam: buku tamu + log kendaraan ──────────────────────
do $$
declare t text;
begin
  foreach t in array array['buku_tamu','kendaraan_log']
  loop
    execute format('drop policy if exists "satpam_tulis" on %I', t);
    execute format('create policy "satpam_tulis" on %I for all using (is_role(''satpam'') or is_pengurus()) with check (is_role(''satpam'') or is_pengurus())', t);
  end loop;
end $$;

-- ── Warga bisa melapor/booking/mengajukan (insert) ─────────
do $$
declare t text;
begin
  foreach t in array array['keluhan','booking']
  loop
    execute format('drop policy if exists "warga_tambah" on %I', t);
    execute format('create policy "warga_tambah" on %I for insert with check (perumahan_id = get_my_perumahan_id() or is_super_admin())', t);
  end loop;
end $$;

drop policy if exists "warga_tambah_surat" on surat;
create policy "warga_tambah_surat" on surat
  for insert with check (perumahan_id = get_my_perumahan_id() and status = 'diajukan');

-- warga update keluhan/booking milik sendiri (misal batalkan)
drop policy if exists "warga_update_keluhan" on keluhan;
create policy "warga_update_keluhan" on keluhan
  for update using (perumahan_id = get_my_perumahan_id()) with check (perumahan_id = get_my_perumahan_id());

drop policy if exists "warga_update_booking" on booking;
create policy "warga_update_booking" on booking
  for update using (perumahan_id = get_my_perumahan_id()) with check (perumahan_id = get_my_perumahan_id());

-- ── Storage bucket foto ──────────────────────────────────────
insert into storage.buckets (id, name, public) values ('foto', 'foto', true)
  on conflict (id) do nothing;

drop policy if exists "foto_baca" on storage.objects;
create policy "foto_baca" on storage.objects
  for select using (bucket_id = 'foto' and auth.role() = 'authenticated');

drop policy if exists "foto_tulis" on storage.objects;
create policy "foto_tulis" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'foto' and (storage.foldername(name))[1] = get_my_perumahan_id()::text);

drop policy if exists "foto_hapus" on storage.objects;
create policy "foto_hapus" on storage.objects
  for delete to authenticated
  using (bucket_id = 'foto' and (storage.foldername(name))[1] = get_my_perumahan_id()::text);