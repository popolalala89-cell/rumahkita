-- ============================================================
-- RumahKita - LANGANAN (dikelola manual oleh Super Admin)
-- Jalankan SEKALI di Supabase SQL Editor.
-- Menambah kolom langganan_hingga di tabel perumahan.
--   NULL = tanpa batas (perumahan gratis/lifetime)
--   tanggal = aktif sampai tanggal itu (setelah itu terkunci)
-- Diatur dari menu Kelola Perumahan > tombol langganan.
-- ============================================================

alter table perumahan
  add column if not exists langganan_hingga date;

-- VERIFIKASI: kolom langganan_hingga muncul
select column_name, data_type
from information_schema.columns
where table_name = 'perumahan' and column_name = 'langganan_hingga';