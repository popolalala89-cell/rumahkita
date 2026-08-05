-- ============================================================
-- RumahKita - FITUR PENGATURAN: ubah peran akun anggota
-- Jalankan SEKALI di Supabase SQL Editor.
-- Menciptakan fungsi ubah_peran_warga: dipakai menu Pengaturan
-- buat mengubah peran (warga/sekretaris/bendahara/ketua).
-- ============================================================

create or replace function public.ubah_peran_warga(v_target uuid, v_peran text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pengurus_perum uuid;
  v_target_perum uuid;
begin
  -- hanya pengurus yang boleh mengubah peran
  if not exists (
    select 1 from profiles
    where id = auth.uid() and role in ('super_admin','ketua','bendahara','sekretaris')
  ) then
    return jsonb_build_object('ok', false, 'error', 'Hanya pengurus yang bisa mengubah peran');
  end if;

  -- v_peran yang diizinkan
  if v_peran not in ('warga','sekretaris','bendahara','ketua') then
    return jsonb_build_object('ok', false, 'error', 'Peran tidak valid');
  end if;

  select perumahan_id into v_pengurus_perum from profiles where id = auth.uid();
  select perumahan_id into v_target_perum from profiles where id = v_target;
  if v_target_perum is null then
    return jsonb_build_object('ok', false, 'error', 'Akun tidak ditemukan');
  end if;
  if v_pengurus_perum is distinct from v_target_perum then
    return jsonb_build_object('ok', false, 'error', 'Akun bukan dari perumahan Anda');
  end if;

  -- jaga-jaga: jangan ubah akun super_admin dan ubah peran sendiri
  if exists (select 1 from profiles where id = v_target and role = 'super_admin') then
    return jsonb_build_object('ok', false, 'error', 'Akun super_admin tidak bisa diubah perannya');
  end if;
  if v_target = auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'Tidak bisa mengubah peran akun sendiri di sini');
  end if;

  update profiles set role = v_peran where id = v_target;
  return jsonb_build_object('ok', true, 'error', null);
end $$;

revoke all on function public.ubah_peran_warga(uuid,text) from public;
grant execute on function public.ubah_peran_warga(uuid,text) to authenticated;

-- VERIFIKASI: muncul 1 baris
select proname from pg_proc where proname = 'ubah_peran_warga';