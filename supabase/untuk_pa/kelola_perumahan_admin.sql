-- ============================================================
-- RumahKita - KELOLA PERUMAHAN (super admin), lintas perumah)
-- Jalankan SEKALI di Supabase SQL Editor.
-- Fungsi admin_atur = ubah peran & status akun di PERUMAHAN
-- mana pun (Super Admin saja yang bisa, penaglas RLS).
-- ============================================================

create or replace function public.admin_atur_akun(
  v_target uuid, v_peran text default null, v_aktif boolean default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_super_admin() then
    return jsonb_build_object('ok', false, 'error', 'Hanya Super Admin');
  end if;
  if v_target = auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'Tidak bisa mengubah akun sendiri');
  end if;
  if exists (select 1 from profiles where id = v_target and role = 'super_admin') then
    return jsonb_build_object('ok', false, 'error', 'Akun Super Admin tidak boleh diubah');
  end if;
  if v_peran is not null and v_peran not in ('warga','sekretaris','bendahara','ketua','satpam') then
    return jsonb_build_object('ok', false, 'error', 'Peran tidak valid');
  end if;

  update profiles
     set role  = coalesce(v_peran, role),
         aktif = coalesce(v_aktif, aktif)
   where id = v_target;
  return jsonb_build_object('ok', true, 'error', null);
end $$;

revoke all on function public.admin_atur_akun(uuid, text, boolean) from public;
grant execute on function public.admin_atur_akun(uuid, text, boolean) to authenticated;

-- VERIFIKASI: muncul 1 baris
select proname from pg_proc where proname = 'admin_atur_akun';