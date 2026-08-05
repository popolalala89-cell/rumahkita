-- ============================================================
-- RumahKita — ALTER FASE 3 (jalankan SEKALI setelah fase2_alter.sql)
-- Keluhan & Booking belum punya izin tulis di rls_policies.sql:
--   - pengurus: kelola keluhan & booking
--   - warga:    kirim keluhan, booking fasilitas, ajukan surat
-- Booking juga menambah status 'batal' untuk pembatalan.
-- ============================================================

-- Keluhan: pengurus kelola
drop policy if exists "pengurus_tulis_keluhan" on public.keluhan;
create policy "pengurus_tulis_keluhan" on public.keluhan
  for all using (is_pengurus()) with check (is_pengurus());

-- Keluhan: warga seperumahan mengirim
drop policy if exists "warga_insert_keluhan" on public.keluhan;
create policy "warga_insert_keluhan" on public.keluhan
  for insert with check (perumahan_id = get_my_perumahan_id());

-- Booking: pengurus kelola
drop policy if exists "pengurus_tulis_booking" on public.booking;
create policy "pengurus_tulis_booking" on public.booking
  for all using (is_pengurus()) with check (is_pengurus());

-- Booking: warga memesan fasilitas milik perumahan sendiri (wajib 'menunggu')
drop policy if exists "warga_insert_booking" on public.booking;
create policy "warga_insert_booking" on public.booking
  for insert with check (
    perumahan_id = get_my_perumahan_id()
    and status = 'menunggu'
    and exists (
      select 1 from public.fasilitas f
      where f.id = fasilitas_id and f.perumahan_id = get_my_perumahan_id()
    )
  );

-- Surat: pengurus sudah (pengurus_tulis di fase 0) bisa terbit/batal;
-- warga perlu izin AJUKAN.
drop policy if exists "warga_insert_surat" on public.surat;
create policy "warga_insert_surat" on public.surat
  for insert with check (perumahan_id = get_my_perumahan_id());

-- Tambah status 'batal' untuk booking (self-cancel & manajerial)
alter table public.booking
  drop constraint if exists booking_status_check;
alter table public.booking
  add constraint booking_status_check
    check (status in ('menunggu','disetujui','ditolak','selesai','batal'));