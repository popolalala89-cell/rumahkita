export type Role = 'super_admin' | 'ketua' | 'bendahara' | 'sekretaris' | 'warga' | 'satpam'

export interface Profile {
  id: string
  perumahan_id: string
  rumah_id: string | null
  role: Role
  nama: string
  no_hp: string
  aktif: boolean
  created_at: string
}

export interface Perumahan {
  id: string
  nama: string
  alamat: string
  kode_undangan: string
  logo_url: string | null
  aktif: boolean
  created_at: string
}

export interface Rumah {
  id: string
  perumahan_id: string
  blok: string
  nomor: string
  tipe: string
  status_huni: 'dihuni' | 'kosong' | 'kontrakan'
  created_at: string
}

export interface Warga {
  id: string
  perumahan_id: string
  rumah_id: string | null
  nama: string
  nik: string
  no_hp: string
  status_tinggal: 'pemilik' | 'penyewa' | 'keluarga'
  pekerjaan: string
  foto_url: string | null
  aktif: boolean
  created_at: string
}

export interface IuranJenis {
  id: string
  perumahan_id: string
  nama: string
  nominal: number
  periode: 'bulanan'
  aktif: boolean
  created_at: string
}

export interface Tagihan {
  id: string
  perumahan_id: string
  rumah_id: string
  iuran_jenis_id: string
  bulan: number
  tahun: number
  nominal: number
  jatuh_tempo: string | null
  status: 'belum' | 'lunas'
  denda: number
  created_at: string
}

export interface Pembayaran {
  id: string
  perumahan_id: string
  tagihan_id: string
  tgl: string
  nominal: number
  metode: 'tunai' | 'transfer' | 'qris'
  bukti_url: string | null
  user_id: string
  catatan: string
  created_at: string
}

export interface KasTransaksi {
  id: string
  perumahan_id: string
  tgl: string
  jenis: 'masuk' | 'keluar'
  kategori: string
  nominal: number
  keterangan: string
  user_id: string | null
  sumber?: string | null
  created_at: string
}

export interface Kegiatan {
  id: string
  perumahan_id: string
  nama: string
  tgl: string | null
  lokasi: string
  deskripsi: string
}

export interface Polling {
  id: string
  perumahan_id: string
  judul: string
  opsi_json: string
  tgl_mulai: string | null
  tgl_selesai: string | null
  aktif: boolean
}

export interface PollingSuara {
  id: string
  perumahan_id: string
  polling_id: string
  rumah_id: string | null
  opsi: string
  created_at: string
}

export interface DirektoriUsaha {
  id: string
  perumahan_id: string
  warga_id: string | null
  nama_usaha: string
  kategori: string
  no_hp: string
  deskripsi: string
  foto_url: string | null
}

export interface Pengumuman {
  id: string
  perumahan_id: string
  judul: string
  isi: string
  penting: boolean
  tgl: string
  user_id: string
  created_at: string
}

export interface Keluhan {
  id: string
  perumahan_id: string
  warga_id: string
  kategori: string
  judul: string
  isi: string
  status: 'baru' | 'diproses' | 'selesai'
  assignee: string | null
  tgl_selesai: string | null
  created_at: string
}

export interface Fasilitas {
  id: string
  perumahan_id: string
  nama: string
  kapasitas: number
  biaya: number
  foto_url: string | null
}

export type BookingStatus = 'menunggu' | 'disetujui' | 'ditolak' | 'selesai' | 'batal'

export interface Booking {
  id: string
  perumahan_id: string
  fasilitas_id: string
  warga_id: string | null
  tgl: string
  jam_mulai: string
  jam_selesai: string
  keperluan: string
  status: BookingStatus
  created_at: string
}

export type SuratStatus = 'diajukan' | 'terbit' | 'batal'

export interface Surat {
  id: string
  perumahan_id: string
  no_surat: string
  jenis: string
  warga_id: string | null
  keperluan: string
  tgl: string
  status: SuratStatus
}

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: 'Super Admin',
  ketua: 'Ketua',
  bendahara: 'Bendahara',
  sekretaris: 'Sekretaris',
  warga: 'Warga',
  satpam: 'Satpam',
}
