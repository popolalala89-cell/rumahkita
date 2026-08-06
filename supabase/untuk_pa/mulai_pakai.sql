-- ============================================================
-- RumahKita - MULAI PAKAI (owner daftar sendiri, tahan super admin)
-- Jalankan SEKALI di Supabase SQL Editor.
-- create_perumahan_owner: membuat perumahan BARU + sekaligus
-- menjadikan akun login (auth.uid()) = KETUA pemiliknya.
-- Dipakai halaman publik "Mulai Pakai".
-- ============================================================

create or replace function public.create_perumahan_owner(
  p_nama text, p_alamat text, p_kode text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_pid uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Sesi berakhir, silakan login kembali');
  end if;
  if exists (select 1 from profiles where id = auth.uid()) then
    return jsonb_build_object('ok', false, 'error', 'Akun ini sudah terdaftar di sebuah perumahan');
  end if;
  if length(trim(p_nama)) = 0 or length(trim(p_kode)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'Nama perumahan & kode undangan wajib diisi');
  end if;

  insert into perumahan (nama, alamat, kode_undangan)
  values (trim(p_nama), coalesce(trim(p_alamat), ''), upper(trim(p_kode)))
  returning id into v_pid;

  insert into profiles (id, perumahan_id, role, nama, no_hp, aktif)
  values (auth.uid(), v_pid, 'ketua', trim(p_nama), '', true);

  return jsonb_build_object('ok', true, 'perumahan_id', v_pid, 'error', null);
exception when unique_violation then
  return jsonb_build_object('ok', false, 'error', 'Kode undangan sudah dipakai perumahan lain');
end $$;

revoke all on function public.create_perumahan_owner(text,text,text) from public;
grant execute on function public.create_perumahan_owner(text,text,text) to authenticated;

-- VERIFIKASI: muncul 1 baris
select proname from pg_proc where proname = 'create_perumahan_owner';