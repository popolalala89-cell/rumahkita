-- ============================================================
--  RUMANKITA — KEAMANAN STORAGE (tutup celah akses umum)
--  RUN SEKALI di Supabase → SQL Editor → paste → Run
--  ============================================================
--  Yang diperbaiki: policy bucket `bukti-langganan` & `qris-platform`
--  sebelumnya dibuat TANPA klausa role → berlaku untuk role PUBLIC
--  (termasuk anonim). Akibatnya siapa pun (tanpa login) bisa:
--   (a) membaca / menandatangani semua bukti pembayaran semua perumahan
--   (b) menghapus file bukti
--   (c) MENIMPA gambar QRIS platform dengan QRIS lain (warga bisa
--       terkecoh transfer ke rekening penyerang)
--
--  Perbaikan di bawah:
--   • bukti-langganan: hanya role authenticated, dan hanya untuk folder
--     perumahan-nya sendiri (path = <perumahan_id>/...), super admin bebas.
--   • qris-platform: baca hanya anggota (authenticated); unggah & hapus
--     hanya super admin.
-- ============================================================

-- 1) BUKTI LANGANAN: baca/unggah/hapus hanya utk perumahan sendiri (path
--    diawali <perumahan_id>) atau super admin
drop policy if exists "bukti_baca" on storage.objects;
create policy "bukti_baca" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'bukti-langganan'
    and ( (storage.foldername(name))[1] = public.get_my_perumahan_id()::text
          or public.is_super_admin() )
  );

drop policy if exists "bukti_unggah" on storage.objects;
create policy "bukti_unggah" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'bukti-langganan'
    and (storage.foldername(name))[1] = public.get_my_perumahan_id()::text
  );

drop policy if exists "bukti_hapus" on storage.objects;
create policy "bukti_hapus" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'bukti-langganan'
    and ( (storage.foldername(name))[1] = public.get_my_perumahan_id()::text
          or public.is_super_admin() )
  );

-- 2) QRIS PLATFORM: baca hanya anggota login; unggah & hapus hanya super admin
drop policy if exists "qris_baca" on storage.objects;
create policy "qris_baca" on storage.objects
  for select to authenticated
  using (bucket_id = 'qris-platform');

drop policy if exists "qris_unggah" on storage.objects;
create policy "qris_unggah" on storage.objects
  for insert to authenticated
  with check ( bucket_id = 'qris-platform' and public.is_super_admin() );

drop policy if exists "qris_hapus" on storage.objects;
create policy "qris_hapus" on storage.objects
  for delete to authenticated
  using ( bucket_id = 'qris-platform' and public.is_super_admin() );

-- VERIFIKASI (harus tampil 6 policy dengan role authenticated)
select policyname, cmd, roles from pg_policies where schemaname = 'storage' order by policyname;