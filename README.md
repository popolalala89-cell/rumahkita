# 🏘️ RumahKita

Aplikasi manajemen perumahan (RT/RW) — **super lengkap, multi-perumahan, online**. Bisa dipakai di laptop (sidebar) dan HP (bottom-nav).

**Stack:** React 19 + TypeScript + Vite · Supabase (Auth + Postgres + Realtime + Storage) · Material 3 · GitHub Pages (deploy otomatis).

## Fitur (per fase)

| Fase | Modul |
|------|-------|
| 0 | Fondasi: login/daftar (kode undangan), role, dashboard |
| 1 ✅ | Warga & Rumah, Iuran, Tagihan, Pembayaran, Kas, Laporan Excel |
| 2 ✅ | Pengumuman, Kegiatan, Polling, Direktori Usaha warga |
| 3 | Keluhan, Booking fasilitas, Permohonan surat |
| 4 | Keamanan (tamu & kendaraan), Aset & pemeliharaan, Dokumen & kontak |
| 5 | PWA (install dari HP), notifikasi WhatsApp, landing publik |

## Struktur proyek

```
src/
  lib/        auth.tsx, supabase.ts, types.ts, format.ts, toast.tsx
  pages/      EntryScreen, Login, Daftar, AdminLayout, Dashboard, Placeholder
  components/ui/  Modal, ...
supabase/
  schema.sql       tabel GUI (multi-tenant via perumahan_id)
  rls_policies.sql RLS + fungsi helper + storage bucket
  seed.sql         tenant pertama (blok B × 32 rumah, iuran Sampah/Infaq)
```

## Set Up (sekali saja)

### 1. Project Supabase (gratis)
1. Buka **app.supabase.com** → New project → region **Singapore** (dekat).
2. Catat **Project URL** dan **anon key** (Settings → API).

### 2. Jalankan SQL (urutan penting)
Buka **SQL Editor** project, jalankan satu per satu:
1. `supabase/schema.sql`
2. `supabase/rls_policies.sql`
3. `supabase/seed.sql`

### 3. Auth settings
**Authentication → Sign In / Providers:** aktifkan `Email`.  
**Authentication → Auth settings:** matikan **Confirm email** (biar warga langsung bisa masuk).

### 4. Buat akun Ketua (Pa)
Buka web app, **Daftar** dengan kode undangan `RUMAHKITA`, email `popolalala89@gmail.com`. Lalu di SQL Editor jalankan:

```sql
update profiles p
set role='ketua', aktif=true,
    rumah_id=(select id from rumah where perumahan_id='10000000-0000-4000-8000-000000000001' and blok='B' and nomor='3')
from auth.users u
where u.id=p.id and u.email='popolalala89@gmail.com';
```

### 5. GitHub Secrets (biar build/deploy jalan)
Repo → **Settings → Secrets and variables → Actions**:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Workflow `.github/workflows/deploy-pages.yml` otomatis build + deploy tiap push ke `main`.

### 6. Domain rumahkita.my.id
Beli di SumoPod, lalu arahkan DNS ke GitHub Pages (A records / CNAME — pola sama seperti proyek Pa sebelumnya). Setelah DNS aktif, commit file `public/CNAME` berisi `rumahkita.my.id` supaya domain dipakai.

## Develop lokal (Termux / laptop)

```bash
cp .env.example .env   # isi URL + anon key
npm install
npm run dev            # http://localhost:5173
```

Build produksi: `npm run build` → hasil di `dist/`.