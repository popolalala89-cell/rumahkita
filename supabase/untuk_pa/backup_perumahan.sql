-- ============================================================
-- RumahKita - FITUR CADANGAN DATA (backup)
-- Jalankan SEKALI di Supabase SQL Editor.
-- Membuat fungsi backup_perumahan(): dipanggil dari menu
-- Pengaturan > Cadangkan Data, menghasilkan file JSON lengkap.
-- ============================================================

create or replace function public.backup_perumahan()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pid uuid;
begin
  select perumahan_id into v_pid from profiles where id = auth.uid();
  if v_pid is null then
    return jsonb_build_object('ok', false, 'error', 'Akun tidak terhubung ke perumahan');
  end if;

  return jsonb_build_object(
    'ok', true,
    'dibuat_untuk', now(),
    'perumahan',
      (select to_jsonb(p) from perumahan p where p.id = v_pid),
    'profiles',
      (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from profiles t where t.perumahan_id = v_pid),
    'rumah',
      (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from rumah t where t.perumahan_id = v_pid),
    'warga',
      (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from warga t where t.perumahan_id = v_pid),
    'pengurus',
      (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from pengurus t where t.perumahan_id = v_pid),
    'iuran_jenis',
      (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from iuran_jenis t where t.perumahan_id = v_pid),
    'tagihan',
      (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from tagihan t where t.perumahan_id = v_pid),
    'pembayaran',
      (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from pembayaran t where t.perumahan_id = v_pid),
    'kas_transaksi',
      (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from kas_transaksi t where t.perumahan_id = v_pid),
    'pengumuman',
      (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from pengumuman t where t.perumahan_id = v_pid),
    'kegiatan',
      (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from kegiatan t where t.perumahan_id = v_pid),
    'aset',
      (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from aset t where t.perumahan_id = v_pid),
    'dokumen',
      (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from dokumen t where t.perumahan_id = v_pid),
    'pemeliharaan',
      (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from pemeliharaan t where t.perumahan_id = v_pid),
    'kontak_penting',
      (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from kontak_penting t where t.perumahan_id = v_pid),
    'pengaturan',
      (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from pengaturan t where t.perumahan_id = v_pid)
  );
end $$;

revoke all on function public.backup_perumahan() from public;
grant execute on function public.backup_perumahan() to authenticated;

-- VERIFIKASI: muncul 1 baris
select proname from pg_proc where proname = 'backup_perumahan';