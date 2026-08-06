-- ============================================================
-- RumahKita - CARA PAKAI UNTUK PERUMAHAN LAIN
--
-- Aplikasi sudah multi-perumahan: semua data dipisah pakai
-- perumahan_id + RLS. Perumahan baru TIDAK perlu app baru.
-- Cukup: (1) daftarkan perumahan, (2) ketua daftar lewat app,
-- (3) aktifkan & jadikan ketua.
--
-- GANTI nilai di dalam tanda <...> sesuai perumahan baru.
-- ============================================================

-- (1) DAFTARKAN PERUMAHAN BARU
-- Kode undangan harus UNIK, bebas mau apa (huruf besar tanpa spasi).
insert into perumahan (nama, alamat, kode_undangan)
values
  ('<NAMA PERUMAHAN>', '<ALAMAT>', '<KODE-BARU>')
on conflict (kode_undangan) do nothing;

-- Verifikasi: baris perumahan baru muncul
select id, nama, kode_undangan from perumahan order by created_at desc limit 5;

-- ============================================================
-- SETELAH ketua perumahan baru mendaftar di app (isi kode
-- undangan <KODE-BARU>), jalankan bagian (2) ini:
-- ============================================================

-- (2) AKTIFKAN & JADIKAN KETUA akun pertama perumahan baru
update profiles
set role = 'ketua', aktif = true
where perumahan_id = (select id from perumahan where kode_undangan = '<KODE-BARU>')
  and id = (select id from auth.users where email = '<EMAIL-KETUA>');

-- Verifikasi: 1 baris ter-update, role=ketua, aktif=true
select p.nama, pr.role, pr.aktif, pr.perumahan_id
from profiles pr
join perumahan p on p.id = pr.perumahan_id
where p.kode_undangan = '<KODE-BARU>';

-- ============================================================
-- SETELAHNYA: ketua itu mengelola perumahannya sendiri
-- (Warga/Iuran/Kas/Aset...) lewat dashboard seperti biasa.
-- Super Admin (kamu) tetap bisa lihat semua perumahan via SQL,
-- karena is_super_admin() menembus RLS.
-- ============================================================