-- ============================================================
--  RUMANKITA — KEAMANAN STORAGE: TAMBAHAN bucket 'foto'
--  RUN SEKALI setelah file keamanan_storage.sql (atau gabung saja)
--  ============================================================
--  Bucket 'foto' adalah peninggalan skema lama; aplikasi sekarang
--  TIDAK mengunggah/membaca apa pun dari bucket ini. Namun bucket
--  dibuat public=true di skema awal → siapa pun di internet bisa
--  membuka isinya lewat URL publik. Blok di bawah menguncinya
--  (private + hanya anggota perumahan sendiri + super admin).

-- 1) Jadikan bucket private (tidak ada isinya, jadi tidak ada dampak)
update storage.buckets set public = false where id = 'foto';

-- 2) Baca: hanya anggota yang login, dan hanya folder perumahannya sendiri
drop policy if exists "foto_baca" on storage.objects;
create policy "foto_baca" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'foto'
    and ( (storage.foldername(name))[1] = public.get_my_perumahan_id()::text
          or public.is_super_admin() )
  );

-- 3) Unggah & hapus tetap dibatasi per perumahan (sama seperti semula,
--    + klausa role eksplisit biar tidak "public")
drop policy if exists "foto_tulis" on storage.objects;
create policy "foto_tulis" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'foto'
    and (storage.foldername(name))[1] = public.get_my_perumahan_id()::text
  );

drop policy if exists "foto_hapus" on storage.objects;
create policy "foto_hapus" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'foto'
    and ( (storage.foldername(name))[1] = public.get_my_perumahan_id()::text
          or public.is_super_admin() )
  );

-- VERIFIKASI: semua policy storage sekarang harus ber-role authenticated
select policyname, cmd, roles from pg_policies where schemaname = 'storage' order by policyname;