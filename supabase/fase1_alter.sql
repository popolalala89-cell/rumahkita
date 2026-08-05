-- ============================================================
-- RumahKita — ALTER FASE 1 (jalankan SEKALI setelah rls_policies.sql)
-- Menambah kolom `sumber` di kas_transaksi supaya transaksi yang
-- dibuat otomatis dari pembayaran iuran bisa dibedakan, dilacak,
-- dan dibatalkan bersamaan (hapus kas saat pembayaran dibatalkan).
-- ============================================================

alter table public.kas_transaksi
  add column if not exists sumber text default 'manual';

-- backfill transaksi lama (kalau ada) jadi manual
update public.kas_transaksi set sumber = 'manual' where sumber is null;
