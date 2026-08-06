-- ============================================================
-- RumahKita - FIX: izinkan PEMILIK edit branding peremahan
-- Jalankan SEKALI di Supabase SQL Editor.
-- Fungsi simpan_info_perumahan = update NAMA/ALAMAT/WARNA/LOGO
-- (bukan langganan_hingga, tetap KEG super admin) utk pemilik.
-- Security definer + perumahan dipatok ke auth.uid() agar tak
-- bisa diarahkan ke peremahan orang lain.
-- ============================================================

create or replace function public.simpan_info_perumahan(
  p_nama text default null,
  p_alamat text default null,
  p_warna text default null,
  p_logo_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_pid uuid;
begin
  -- peremahan si caller (pemilik), bukan sembarang id
  select perumahan_id into v_pid from profiles where id = auth.uid();
  if v_pid is null then
    return jsonb_build_object('ok', false, 'error', 'Akun tidak terhubung ke peremahan');
  end if;
  if p_nama is not null and length(trim(p_nama)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'Nama peremahan tidak boleh kosong');
  end if;

  update perumahan
     set nama     = trim(p_nama),
         alamat   = coalesce(nullif(trim(coalesce(p_alamat, '')), ''), alamat),
         warna    = nullif(trim(p_warna), ''),
         logo_url = nullif(trim(p_logo_url), '')
   where id = v_pid;

  return jsonb_build_object('ok', true, 'error', null);
end $$;

revoke all on function public.simpan_info_perumahan(text, text, text, text) from public;
grant execute on function public.simpan_info_perumahan(text, text, text, text) to authenticated;

-- VERIFIKASI
select proname from pg_proc where proname = 'simpan_info_perumahan';