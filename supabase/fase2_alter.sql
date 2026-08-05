-- ============================================================
-- RumahKita — ALTER FASE 2 (jalankan SEKALI setelah fase1_alter.sql)
-- Polling belum punya izin tulis di rls_policies.sql:
--   - pengurus: buat/edit/hapus polling
--   - warga:   memilih saat polling aktif (sekali per rumah,
--              bisa ganti pilihan = hapus suara lama dulu)
-- ============================================================

-- Pengurus kelola polling
drop policy if exists "pengurus_tulis_polling" on public.polling;
create policy "pengurus_tulis_polling" on public.polling
  for all using (is_pengurus()) with check (is_pengurus());

-- Warga seperumahan memilih (polling harus aktif & milik perumahan sendiri)
drop policy if exists "warga_pilih" on public.polling_suara;
create policy "warga_pilih" on public.polling_suara
  for insert
  with check (
    perumahan_id = get_my_perumahan_id()
    and exists (
      select 1 from public.polling p
      where p.id = polling_id
        and p.perumahan_id = get_my_perumahan_id()
        and p.aktif
    )
  );

-- Warga menghapus suaranya sendiri (ganti pilihan)
drop policy if exists "warga_hapus_suara" on public.polling_suara;
create policy "warga_hapus_suara" on public.polling_suara
  for delete using (rumah_id = get_my_rumah_id());
