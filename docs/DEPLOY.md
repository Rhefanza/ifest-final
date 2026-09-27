# Panduan Deployment IRIS Siaga Air ke Vercel

Aplikasi **IRIS Siaga Air** dibangun dengan arsitektur **Next.js 15 App Router** modern yang dioptimalkan untuk di-deploy langsung ke platform cloud **Vercel** tanpa memerlukan server background Python terpisah.

---

## 1. Arsitektur Deployment Vercel

* **Framework:** Next.js 15.1.6
* **Runtime:** Node.js 20.x / Serverless Functions
* **Ukuran Bundel Model:** Seluruh 7 model machine learning disimpan dalam format biner seragam (`models/*.bin`) dengan ukuran total **6,41 MB** (jauh di bawah batas ukuran paket serverless Vercel 50 MB / 250 MB).
* **Konfigurasi Tracing:** File `next.config.ts` telah dikonfigurasi dengan `outputFileTracingIncludes` untuk memastikan direktori `./models/**` dan `./ml/out/**` ikut disertakan dalam bundel serverless.

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/**": ["./models/**", "./ml/out/**"],
  },
};
```

---

## 2. Langkah-Langkah Deploy ke Vercel

### Opsi A: Deploy via GitHub (Direkomendasikan)
1. Repositori GitHub proyek: `https://github.com/Rhefanza/ifest-final`.
2. Masuk ke dashboard [Vercel](https://vercel.com/) dan klik **"Add New Project"**.
3. Hubungkan akun GitHub Anda dan pilih repositori `Rhefanza/ifest-final`.
4. Jika repositori di-root pada subfolder `iris-siaga`, atur **Root Directory** ke `iris-siaga` (atau letakkan file langsung di root repositori).
5. Pengaturan Build:
   * **Framework Preset:** Next.js
   * **Build Command:** `next build`
   * **Output Directory:** `.next`
   * **Install Command:** `npm install`
6. Variabel Lingkungan (Opsional jika ingin menghubungkan ke database Neon Postgres):
   * `DATABASE_URL`: `postgres://...`
   * *(Catatan: Aplikasi memiliki fallback lokal mandiri 100% menggunakan data biner/JSON di direktori `models/` dan `ml/out/`, sehingga aplikasi dapat langsung berjalan sempurna meskipun database Postgres belum diatur).*
7. Klik **Deploy**. Vercel akan mengompilasi dan merilis aplikasi dalam waktu 1–2 menit.

---

## 3. Verifikasi Pasca Deployment

Setelah URL produksi aktif di Vercel:
1. **Verifikasi Dashboard:** Buka halaman utama `/`, pastikan 6 KPI cards, grafik komposisi, dan tabel 2.982 baris terisi penuh.
2. **Verifikasi Cetak A4:** Buka `/laporan/4/cetak`, pastikan dokumen cetak resmi BBWS muncul dengan rapi.
3. **Verifikasi Graf Basin:** Buka `/basin/40`, pastikan graf aliran sungai DAG 35 node dan 12 SIAGA ter-render interaktif dengan panah hulu-hilir.
4. **Verifikasi Ekspor CSV:** Unduh CSV dari dashboard atau klik tombol *Ekspor CSV*, pastikan file CSV berukuran lengkap dapat dibuka di Excel.
5. **Verifikasi Inferensi Mandiri:** Buka `/unggah`, pilih salah satu sampel uji (misal Origin 169), dan jalankan inferensi. Pastikan hasil perhitungan selesai dalam &lt; 5 detik.
