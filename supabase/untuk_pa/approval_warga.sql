-- ============================================================
-- RumahKita - FITUR PERSETUJUAN WARGA (RPC + izin)
-- Jalankan SEKALI di Supabase SQL Editor.
-- Setelah ini, menu Warga > tab Akun bisa: Terima / Tolak
-- akun yang lagi menunggu, langsung dari dashboard (tanpa SQL).
-- ============================================================

-- 1) Terima akun: aktifkan + (opsional) hubungkan ke rumah.
create or replace function public.setujui_warga(v_target uuid, v_aktif boolean, v_rumah_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pengurus_perum uuid;
  v_target_perum uuid;
  v_rumah_perum uuid;
begin
  -- hanya pengurus yang boleh
  if not exists (
    select 1 from profiles
    where id = auth.uid() and role in ('ketua','bendahara','sekretaris','super_admin')
  ) then
    return jsonb_build_object('ok', false, 'error', 'Hanya pengurus yang bisa menyetujui');
  end if;

  select perumahan_id into v_pengurus_perum from profiles where id = auth.uid();
  select perumahan_id into v_target_perum from profiles where id = v_target;
  if v_target_perum is null then
    return jsonb_build_object('ok', false, 'error', 'Akun tidak ditemukan');
  end if;
  if v_pengurus_perum is distinct from v_target_perum then
    return jsonb_build_object('ok', false, 'error', 'Akun bukan dari perumahan Anda');
  end if;

  -- kalau pilih rumah, pastikan rumah itu milik perumahan yang sama
  if v_rumah_id is not null then
    select perumahan_id into v_rumah_perum from rumah where id = v_rumah_id;
    if v_rumah_perum is null or v_rumah_perum is distinct from v_target_perum then
      return jsonb_build_object('ok', false, 'error', 'Rumah tidak valid');
    end if;
  end if;

  update profiles
  set aktif = coalesce(v_aktif, false),
      rumah_id = coalesce(v_rumah_id, rumah_id)
  where id = v_target;

  return jsonb_build_object('ok', true, 'error', null);
end $$;

-- 2) Tolak akun: hapus permintaan (profil dihapus; akun email
--    yang bersangkutan tidak bisa lagi masuk ke app ini).
create or replace function public.tolak_warga(v_target uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pengurus_perum uuid;
  v_target_perum uuid;
begin
  if not exists (
    select 1 from profiles
    where id = auth.uid() and role in ('ketua','bendahara','sekretaris','super_admin')
  ) then
    return jsonb_build_object('ok', false, 'error', 'Hanya pengurus yang bisa menolak');
  end if;

  select perumahan_id into v_pengurus_perum from profiles where id = auth.uid();
  select perumahan_id into v_target_perum from profiles where id = v_target;
  if v_target_perum is null then
    return jsonb_build_object('ok', false, 'error', 'Akun tidak ditemukan');
  end if;
  if v_pengurus_perum is distinct from v_target_perum then
    return jsonb_build_object('ok', false, 'error', 'Akun bukan dari perumahan Anda');
  end if;

  delete from profiles where id = v_target;
  return jsonb_build_object('ok', true, 'error', null);
end $$;

-- 3) Izinkan pemakaian dari app
revoke all on function public.setujui_warga(uuid,boolean,uuid) from public;
revoke all on function public.tolak_warga(uuid) from public;
grant execute on function public.setujui_warga(uuid,boolean,uuid) to authenticated;
grant execute on function public.tolak_warga(uuid) to authenticated;

-- VERIFIKASI: harus muncul 2 fungsi di bawah
select proname, pg_get_function_identity_arguments(oid) as args
from pg_proc
where proname in ('setujui_warga','tolak_warga');