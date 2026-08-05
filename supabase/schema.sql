-- ============================================================
-- RumahKita — SCHEMA (jalankan pertama di Supabase SQL Editor)
-- Semua tabel bisnis punya perumahan_id (multi-tenant)
-- ============================================================

create extension if not exists "pgcrypto";

-- ── Perumahan (tenant) ──────────────────────────────────────
create table if not exists perumahan (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  alamat text default '',
  kode_undangan text not null unique,
  logo_url text,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Profil akun (1:1 dengan auth.users) ─────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  perumahan_id uuid not null references perumahan(id) on delete cascade,
  rumah_id uuid,
  role text not null default 'warga'
    check (role in ('super_admin','ketua','bendahara','sekretaris','warga','satpam')),
  nama text not null default '',
  no_hp text default '',
  aktif boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── Rumah ───────────────────────────────────────────────────
create table if not exists rumah (
  id uuid primary key default gen_random_uuid(),
  perumahan_id uuid not null references perumahan(id) on delete cascade,
  blok text not null,
  nomor text not null,
  tipe text default '',
  status_huni text not null default 'dihuni' check (status_huni in ('dihuni','kosong','kontrakan')),
  created_at timestamptz not null default now(),
  unique (perumahan_id, blok, nomor)
);

-- ── Warga (data diri, tidak harus punya akun) ───────────────
create table if not exists warga (
  id uuid primary key default gen_random_uuid(),
  perumahan_id uuid not null references perumahan(id) on delete cascade,
  rumah_id uuid references rumah(id) on delete set null,
  nama text not null,
  nik text default '',
  no_hp text default '',
  status_tinggal text not null default 'pemilik' check (status_tinggal in ('pemilik','penyewa','keluarga')),
  pekerjaan text default '',
  foto_url text,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Pengurus ────────────────────────────────────────────────
create table if not exists pengurus (
  id uuid primary key default gen_random_uuid(),
  perumahan_id uuid not null references perumahan(id) on delete cascade,
  warga_id uuid references warga(id) on delete cascade,
  jabatan text not null,
  periode_awal text default '',
  periode_akhir text default ''
);

-- ── Master iuran (bisa tambah jenis manual) ─────────────────
create table if not exists iuran_jenis (
  id uuid primary key default gen_random_uuid(),
  perumahan_id uuid not null references perumahan(id) on delete cascade,
  nama text not null,
  nominal bigint not null default 0,
  periode text not null default 'bulanan',
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  unique (perumahan_id, nama)
);

-- ── Tagihan (di-generate per rumah × jenis × bulan) ─────────
create table if not exists tagihan (
  id uuid primary key default gen_random_uuid(),
  perumahan_id uuid not null references perumahan(id) on delete cascade,
  rumah_id uuid not null references rumah(id) on delete cascade,
  iuran_jenis_id uuid not null references iuran_jenis(id) on delete cascade,
  bulan integer not null check (bulan between 1 and 12),
  tahun integer not null,
  nominal bigint not null default 0,
  jatuh_tempo date,
  status text not null default 'belum' check (status in ('belum','lunas')),
  denda bigint not null default 0,
  created_at timestamptz not null default now(),
  unique (perumahan_id, rumah_id, iuran_jenis_id, bulan, tahun)
);

-- ── Pembayaran ──────────────────────────────────────────────
create table if not exists pembayaran (
  id uuid primary key default gen_random_uuid(),
  perumahan_id uuid not null references perumahan(id) on delete cascade,
  tagihan_id uuid not null references tagihan(id) on delete cascade,
  tgl date not null default current_date,
  nominal bigint not null default 0,
  metode text not null default 'tunai' check (metode in ('tunai','transfer','qris')),
  bukti_url text,
  user_id uuid,
  catatan text default '',
  created_at timestamptz not null default now()
);

-- ── Kas ─────────────────────────────────────────────────────
create table if not exists kas_transaksi (
  id uuid primary key default gen_random_uuid(),
  perumahan_id uuid not null references perumahan(id) on delete cascade,
  tgl date not null default current_date,
  jenis text not null check (jenis in ('masuk','keluar')),
  kategori text default '',
  nominal bigint not null default 0,
  keterangan text default '',
  user_id uuid,
  created_at timestamptz not null default now()
);

-- ── Komunitas ───────────────────────────────────────────────
create table if not exists pengumuman (
  id uuid primary key default gen_random_uuid(),
  perumahan_id uuid not null references perumahan(id) on delete cascade,
  judul text not null,
  isi text default '',
  penting boolean not null default false,
  tgl date not null default current_date,
  user_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists kegiatan (
  id uuid primary key default gen_random_uuid(),
  perumahan_id uuid not null references perumahan(id) on delete cascade,
  nama text not null,
  tgl date,
  lokasi text default '',
  deskripsi text default ''
);

create table if not exists polling (
  id uuid primary key default gen_random_uuid(),
  perumahan_id uuid not null references perumahan(id) on delete cascade,
  judul text not null,
  opsi_json text not null default '[]',
  tgl_mulai date default current_date,
  tgl_selesai date,
  aktif boolean not null default true
);

create table if not exists polling_suara (
  id uuid primary key default gen_random_uuid(),
  perumahan_id uuid not null references perumahan(id) on delete cascade,
  polling_id uuid not null references polling(id) on delete cascade,
  rumah_id uuid references rumah(id) on delete cascade,
  opsi text not null,
  created_at timestamptz not null default now(),
  unique (polling_id, rumah_id)
);

create table if not exists direktori_usaha (
  id uuid primary key default gen_random_uuid(),
  perumahan_id uuid not null references perumahan(id) on delete cascade,
  warga_id uuid references warga(id) on delete set null,
  nama_usaha text not null,
  kategori text default '',
  no_hp text default '',
  deskripsi text default '',
  foto_url text
);

-- ── Layanan ─────────────────────────────────────────────────
create table if not exists keluhan (
  id uuid primary key default gen_random_uuid(),
  perumahan_id uuid not null references perumahan(id) on delete cascade,
  warga_id uuid references warga(id) on delete set null,
  kategori text default '',
  judul text not null,
  isi text default '',
  status text not null default 'baru' check (status in ('baru','diproses','selesai')),
  assignee uuid,
  tgl_selesai date,
  created_at timestamptz not null default now()
);

create table if not exists fasilitas (
  id uuid primary key default gen_random_uuid(),
  perumahan_id uuid not null references perumahan(id) on delete cascade,
  nama text not null,
  kapasitas integer default 0,
  biaya bigint not null default 0,
  foto_url text
);

create table if not exists booking (
  id uuid primary key default gen_random_uuid(),
  perumahan_id uuid not null references perumahan(id) on delete cascade,
  fasilitas_id uuid not null references fasilitas(id) on delete cascade,
  warga_id uuid references warga(id) on delete set null,
  tgl date not null,
  jam_mulai text default '',
  jam_selesai text default '',
  keperluan text default '',
  status text not null default 'menunggu' check (status in ('menunggu','disetujui','ditolak','selesai')),
  created_at timestamptz not null default now()
);

create table if not exists surat (
  id uuid primary key default gen_random_uuid(),
  perumahan_id uuid not null references perumahan(id) on delete cascade,
  no_surat text not null unique,
  jenis text default '',
  warga_id uuid references warga(id) on delete set null,
  keperluan text default '',
  tgl date not null default current_date,
  status text not null default 'diajukan' check (status in ('diajukan','terbit','batal'))
);

-- ── Keamanan ────────────────────────────────────────────────
create table if not exists buku_tamu (
  id uuid primary key default gen_random_uuid(),
  perumahan_id uuid not null references perumahan(id) on delete cascade,
  tgl date not null default current_date,
  nama text not null,
  tujuan_rumah_id uuid references rumah(id) on delete set null,
  keperluan text default '',
  jam_masuk text default '',
  jam_keluar text default '',
  petugas_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists kendaraan_log (
  id uuid primary key default gen_random_uuid(),
  perumahan_id uuid not null references perumahan(id) on delete cascade,
  tgl date not null default current_date,
  plat text not null,
  jenis text default '',
  arah text not null check (arah in ('masuk','keluar')),
  jam text default '',
  petugas_id uuid,
  created_at timestamptz not null default now()
);

-- ── Aset ────────────────────────────────────────────────────
create table if not exists aset (
  id uuid primary key default gen_random_uuid(),
  perumahan_id uuid not null references perumahan(id) on delete cascade,
  nama text not null,
  kategori text default '',
  jumlah integer not null default 1,
  kondisi text default 'baik',
  lokasi text default '',
  tgl_beli date,
  harga bigint not null default 0,
  foto_url text
);

create table if not exists pemeliharaan (
  id uuid primary key default gen_random_uuid(),
  perumahan_id uuid not null references perumahan(id) on delete cascade,
  aset_id uuid references aset(id) on delete cascade,
  tgl date not null default current_date,
  jenis text default '',
  biaya bigint not null default 0,
  keterangan text default ''
);

-- ── Dokumen & kontak ────────────────────────────────────────
create table if not exists dokumen (
  id uuid primary key default gen_random_uuid(),
  perumahan_id uuid not null references perumahan(id) on delete cascade,
  judul text not null,
  kategori text default '',
  file_url text,
  tgl date not null default current_date
);

create table if not exists kontak_penting (
  id uuid primary key default gen_random_uuid(),
  perumahan_id uuid not null references perumahan(id) on delete cascade,
  nama text not null,
  kategori text default '',
  no_hp text default '',
  alamat text default ''
);

-- ── Sistem ──────────────────────────────────────────────────
create table if not exists log_aktivitas (
  id uuid primary key default gen_random_uuid(),
  perumahan_id uuid not null references perumahan(id) on delete cascade,
  user_id uuid,
  aksi text default '',
  detail text default '',
  tgl timestamptz not null default now()
);

create table if not exists pengaturan (
  perumahan_id uuid not null references perumahan(id) on delete cascade,
  key text not null,
  value text default '',
  primary key (perumahan_id, key)
);

-- ── Index umum ──────────────────────────────────────────────
create index if not exists idx_profiles_perumahan on profiles(perumahan_id);
create index if not exists idx_rumah_perumahan on rumah(perumahan_id);
create index if not exists idx_warga_perumahan on warga(perumahan_id);
create index if not exists idx_iuran_perumahan on iuran_jenis(perumahan_id);
create index if not exists idx_tagihan_perumahan on tagihan(perumahan_id);
create index if not exists idx_tagihan_status on tagihan(perumahan_id, bulan, tahun, status);
create index if not exists idx_pembayaran_perumahan on pembayaran(perumahan_id);
create index if not exists idx_kas_perumahan on kas_transaksi(perumahan_id, tgl);
create index if not exists idx_pengumuman_perumahan on pengumuman(perumahan_id, tgl desc);
create index if not exists idx_keluhan_perumahan on keluhan(perumahan_id);
create index if not exists idx_booking_perumahan on booking(perumahan_id, tgl);
create index if not exists idx_log_perumahan on log_aktivitas(perumahan_id);
