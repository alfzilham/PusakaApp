# PusakaApp

Platform pencatatan kehadiran reuni sekolah berbasis web — terpisah
untuk kategori Laki-laki dan Perempuan, dengan import data dari Excel
dan unduh laporan dalam format Excel, PDF, dan JSON.

PusakaApp dibuat untuk menggantikan cara manual lewat file Excel yang
hanya bisa diakses satu orang. Setiap alumni bisa mengisi konfirmasi
kehadirannya sendiri lewat link, dan panitia bisa langsung melihat
rekap Hadir / Tidak Hadir / Belum Mengisi secara real-time.

## Fitur

- **Import Excel** — unggah satu file untuk seluruh peserta, otomatis
  terpisah ke kategori Laki-laki/Perempuan berdasarkan kolom Jenis Kelamin
- **Form konfirmasi kehadiran** — Hadir / Tidak Hadir + alasan, bisa
  diisi ulang/diperbarui kapan saja
- **Search bar** — cari nama peserta dengan cepat
- **Filter** — daftar Hadir, Tidak Hadir (dengan alasan), dan Belum Mengisi
- **Unduh laporan** — ekspor ke `.xlsx`, `.pdf`, dan `.json`
- **Statistik ringkas** — total peserta, jumlah hadir/tidak hadir/belum isi
- **Desain mobile-first** — dioptimalkan untuk diakses lewat HP

## Tech Stack

| Bagian        | Teknologi                             |
| ------------- | ------------------------------------- |
| Frontend      | HTML, CSS, JavaScript (vanilla)       |
| Backend       | Vercel Serverless Functions (Node.js) |
| Database      | Neon (Serverless Postgres)            |
| Import/Export | SheetJS (Excel), jsPDF (PDF)          |
| Ikon & Font   | Bootstrap Icons, Plus Jakarta Sans    |

## Struktur Folder

```
pusakaapp/
├── public/                 # Frontend statis
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── api/                     # Serverless functions (backend)
│   ├── _db.js               # Koneksi ke database Neon
│   ├── participants.js      # GET (lihat data) & DELETE (hapus kategori)
│   ├── import.js             # POST (import Excel, bulk insert)
│   └── attendance.js         # PUT (isi/perbarui kehadiran satu peserta)
├── schema.sql                # Skema tabel, jalankan sekali di Neon SQL Editor
└── package.json
```

Tidak ada `vercel.json` — Vercel otomatis menyerve folder `public/`
sebagai situs statis dan mendeteksi folder `api/` sebagai serverless
functions tanpa konfigurasi tambahan.

## Cara Deploy

### 1. Siapkan database di Neon

1. Buat akun/login di [neon.tech](https://neon.tech)
2. Buat project baru (pilih region terdekat)
3. Buka **SQL Editor**, copy-paste isi file `schema.sql`, lalu jalankan
4. Buka **Connect**, salin connection string — ini akan jadi nilai
   environment variable `DATABASE_URL`

### 2. Push ke GitHub

```bash
git init
git add .
git commit -m "PusakaApp - initial setup"
git branch -M main
git remote add origin https://github.com/USERNAME/pusakaapp.git
git push -u origin main
```

### 3. Deploy ke Vercel

1. Buka [vercel.com/new](https://vercel.com/new), pilih repo ini
2. Sebelum klik Deploy, tambahkan **Environment Variable**:
   - **Name**: `DATABASE_URL`
   - **Value**: connection string dari Neon (langkah 1)
3. Klik **Deploy**
4. Bagikan URL yang diberikan Vercel ke alumni/panitia

### Update environment variable di kemudian hari

**Vercel Dashboard → Project → Settings → Environment Variables**,
lalu redeploy lewat **Deployments → titik tiga → Redeploy**.

## Format Excel untuk Import

| Kolom A (Nama) | Kolom B (Jenis Kelamin) |
| -------------- | ----------------------- |
| Andi Saputra   | Laki-laki               |
| Sinta Dewi     | Perempuan               |

## Catatan

- Tidak ada PIN/login admin — siapa pun yang memiliki link bisa
  import ulang atau menghapus data. Bagikan link hanya ke pihak yang
  dipercaya.
- Environment variable `DATABASE_URL` **wajib** diset di Vercel,
  jangan pernah commit connection string langsung ke kode/GitHub.

## Lisensi

Bebas digunakan dan dimodifikasi untuk keperluan non-komersial seperti
acara reuni, alumni, atau komunitas sejenis.
