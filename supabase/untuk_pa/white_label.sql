-- ============================================================
-- RumahKita - WHITE LABEL (identitas per perumahan)
-- Jalankan SEKALI di Supabase SQL Editor.
-- Menambah kolom logo_url & warna di tabel perumahan.
-- Diisi dari Pengaturan > Tampilan Perumahan.
-- ============================================================

alter table perumahan
  add column if not exists logo_url text,
  add column if not exists warna text;

-- VERIFIKASI
select column_name from information_schema.columns
where table_name = 'perumahan' and column_name in ('logo_url','warna');