# IRIS Siaga Air: Sistem Peringatan Dini Water Stress Sub-DAS (HUC12)

> **Babak Final IFEST Data Analysis Competition (DAC) 2026**  
> **Tim Pengembang:** *IRIS lagi BU*  
> **Repositori Resmi:** [https://github.com/Rhefanza/ifest-final](https://github.com/Rhefanza/ifest-final)

---

## Ringkasan Proyek & Pencapaian Utama

**IRIS Siaga Air** adalah platform *Decision Support System* (DSS) operasional peringatan dini kekeringan dan *water stress* hidrologi tingkat mikro DAS (HUC12) untuk seluruh Indonesia dengan *lead time* 1 bulan ke depan.

Sistem ini mentransformasikan respon konvensional yang bersifat reaktif setelah krisis terjadi menjadi mitigasi preventif terukur berbasis data:

* **Kaggle Public Leaderboard:** Skor Spearman **0,73944** (Peringkat Kompetitif Teratas).
* **Ukuran Model Terkompresi:** Hanya **6,41 MB** untuk seluruh 7 model *ensemble* (berjalan di Next.js serverless / edge runtime tanpa ketergantungan runtime Python).
* **Paritas Numerik Inferensi TS vs Python:** Korelasi Spearman **0,999869** (jauh melampaui kriteria gate $\ge 0,98$).
* **Korelasi Serving Rank-Blend vs Referensi:** Spearman **0,99767** dengan irisan wilayah SIAGA (Top 10%) mencapai **95,6%**.
* **Keandalan Deteksi (OOF 168 Bulan):** Presisi status SIAGA **72,5%** (*Lift* **3,55×** di atas *baseline* acak 20,4%), dengan cakupan deteksi (*recall*) WASPADA mencapai **79,5%**.

---

## Arsitektur Sistem & 7-Member Ensemble

Platform ini ditenagai oleh 7 anggota model *gradient boosted decision trees* (GBDT) heterogen:

| No | Nama Model | Algoritma | Tampilan Fitur | Jumlah Pohon | Ukuran Biner | Peran Arsitektur |
|:---:|:---|:---:|:---:|:---:|:---:|:---|
| 1 | `m1_lgb` | LightGBM | Base 140 | 235 | 804 KB | Model inti deret waktu neraca air |
| 2 | `m2_lgb` | LightGBM | Base 140 | 172 | 890 KB | Diversitas *seed* stokastik (s202) |
| 3 | `m3_xgb` | XGBoost | Base 140 | 156 | 1.010 KB | Regularisasi split berbasis Hessian |
| 4 | `m4_xgb` | XGBoost | Base 140 | 200 | 664 KB | Diversitas *seed* stokastik (s202) |
| 5 | `m5_cat` | CatBoost | Base 140 | 1.571 | 851 KB | Pohon *oblivious* simetris (tahan noise) |
| 6 | `m6_lgb` | LightGBM | Full + TE 157 | 177 | 1.225 KB | Injeksi topologi graf & target encoding |
| 7 | `m7_xgb` | XGBoost | Full + TE 157 | 703 | 1.122 KB | Regularisasi interaksi topologi hulu-hilir |

### Solusi 4 Jebakan Data Kompetisi:
1. **Jebakan Koma Ribuan vs Desimal:** Algoritma perbandingan logaritmik terhadap median kolom untuk mengurai secara tepat format koma desimal Indonesia vs koma ribuan internasional.
2. **Jebakan Format Bulan Multilingual:** Normalisasi 47 variasi representasi string bulan kalender menjadi integer konsisten 1..12.
3. **Jebakan Kolom Auxiliary & Target Leakage:** Penyaringan seluruh kolom `aux_*` dan isolasi validasi berbasis *origin_id*.
4. **Jebakan Anomali Tautan Jaringan `to_id`:** Normalisasi 4.377 relasi hulu-hilir dan penandaan titik muara akhir sebagai `OUTLET` universal.

---

## 6 Modul Operasional Aplikasi

### 1. Modul 1: Laporan Siaga Air & Cetak Resmi A4 (Slide 18)
* Dashboard eksekutif rilis bulanan: 6 KPI operasional, visualisasi komposisi tipologi vs tier risiko, dan panel aksi cepat H+1.
* Tabel interaktif 2.982 sub-DAS dengan filter multi-kriteria (status risiko, tipologi K/A/I/C, basin, sub-DAS baru, dan pencarian instan).
* **Format Cetak Resmi A4:** Standar laporan Balai Besar Wilayah Sungai (BBWS) siap cetak dan simpan PDF (Ctrl+P) lengkap dengan kolom pengesahan Kepala Balai.
* **Ekspor CSV:** Unduhan data hasil analisis berformat UTF-8 BOM untuk kompatibilitas langsung di Microsoft Excel.

### 2. Modul 2: Detail Sub-DAS & Pendorong Risiko (TreeSHAP)
* Identitas hidrologi lengkap: Luas lokal, luas kumulatif, elevasi (DEM), dan Baseflow Index (BFI).
* **Grafik Neraca Air 12 Bulan:** Dekomposisi aliran dasar (*baseflow* air tanah) vs limpasan cepat (*quickflow* hujan) terhadap median normal klimatologi.
* **Analisis TreeSHAP Top 5:** Menjelaskan secara transparan faktor apa yang mendorong kenaikan risiko (*push to SIAGA*) atau meredam risiko.
* **Formulir Validasi Lapangan:** Pembaruan status inspeksi (*Belum / Terjadwal / Selesai*) dan temuan visual petugas tersimpan secara interaktif via Server Action.

### 3. Modul 3: Peta Aliran Jaringan Basin (React Flow DAG)
* Representasi visual graf terarah (*Directed Acyclic Graph*) aliran sungai dari hulu hingga muara hilir menggunakan `@xyflow/react` dan `@dagrejs/dagre`.
* Warna node otomatis mencerminkan status risiko (Merah: SIAGA, Kuning: WASPADA, Abu-abu: NORMAL), kode huruf tipologi (K/A/I/C), dan border putus-putus jika mengalami eskalasi tetangga.
* **Studi Kasus Basin 40 (Slide 11):** Verifikasi akurat 35 node sub-DAS dan 12 wilayah SIAGA yang mengilustrasikan efek domino defisit hulu terhadap pasokan hilir (tekanan akumulatif 1,4×).
* **Tandai Rencana Bersama:** Fitur koordinasi alokasi air lintas pengelola wilayah sungai.

### 4. Modul 4: Playbook Tindakan Lapangan 4 Pekan
* SOP terstruktur mingguan:
  * **Pekan 1 (H+1 s/d H+7):** Validasi visual & *ground check* intake di 298 sub-DAS SIAGA.
  * **Pekan 2 (H+8 s/d H+14):** Rapat koordinasi alokasi air terpadu tingkat basin.
  * **Pekan 3 (H+15 s/d H+21):** Penerapan jadwal gilir-giring irigasi dan mobilisasi pompa darurat.
  * **Pekan 4 (H+22 s/d H+30):** Evaluasi kepatuhan kuota air dan persiapan siklus bulan berikutnya.
* Daftar periksa (*checklist*) tugas lapangan interaktif per sub-DAS prioritas.

### 5. Modul 5: Rencana Strategis (R1–R5 & P1–P4)
* **5 Rekomendasi Kebijakan:**
  * **R1:** Peringatan Dini H+1 dengan SOP Bertingkat (SIAGA / WASPADA / NORMAL).
  * **R2:** Pengelolaan Berbasis Kesatuan Basin Aliran Sungai (*One River Basin*).
  * **R3:** Diferensiasi Intervensi Menurut Karakteristik Tipologi (K, A, I, C).
  * **R4:** Proteksi Terarah 167 Sub-DAS Tertekan Irigasi Berat (Rata-rata porsi irigasi 77,1%).
  * **R5:** Mitigasi Titik Buta Model (*Blind Spot*) pada Tipologi Rawan Kilat di hulu (aksi dini sejak level WASPADA).
* **4 Pola Empiris Data:** Bukti statistik variabilitas spasial ekstrem (4%–42%), dominasi sinyal suplai (AUC diff 0,30), propagasi hulu-hilir (84% vs 6%), dan klaster 4 tipologi resiliensi hidrologi.
* Tabel interaktif daftar 167 sub-DAS tertekan irigasi berat (R4).

### 6. Modul 6: Evaluasi Keandalan & Replay 168 Bulan
* *Replay* kronologis 14 tahun (168 bulan amatan) tanpa jeda rantai (*zero broken links*).
* Tabel keandalan per tipologi: Tersangga Air Tanah (78,2% presisi), Tertekan Irigasi (73,1%), Campuran (71,5%), dan Rawan Kilat (65,4%).
* Bukti integritas: *Adversarial Validation* AUC **0,978** (bebas *leakage*) dan penurunan drastis performa saat klimatologi diganti rata-rata (`0,739 → 0,454`) yang mengonfirmasi kepekaan model terhadap anomali iklim riil.

### Modul Unggah & Realisasi Mandiri:
* *Stepper* 4-langkah eksekusi inferensi mandiri: Unggah file CSV baru $\to$ Audit Kualitas Data (DQ) $\to$ Ekstraksi 157 Fitur & Inferensi 7 Model $\to$ Hasil Siaga Siap.
* Tombol *preset* uji cepat untuk data amatan test (Origin 14, 81, 94, 169) serta data amatan riil untuk evaluasi presisi pasca-kejadian ($t=166$).

---

## Panduan Demo 2 Menit untuk Dewan Juri

Jika mempresentasikan prototipe web ini di hadapan dewan juri, ikuti alur 2 menit berikut:

1. **Detik 0 – 30 (Dashboard & Keputusan Cepat H+1):**
   * Buka halaman utama `/`.
   * Tunjukkan Run Selector: Pilih **Prakiraan November (Origin 169)**.
   * Tunjukkan 6 KPI card: 2.982 sub-DAS dinilai, **298 SIAGA (10% teratas)**, **596 WASPADA**, dan catatan eskalasi tetangga.
   * Klik tombol **Cetak A4**: Tunjukkan format dokumen resmi Balai Besar Wilayah Sungai (Slide 18) yang siap diunduh/dicetak instan.
2. **Detik 31 – 60 (Transparansi AI di Detail Sub-DAS):**
   * Klik salah satu sub-DAS SIAGA (misal rank #1).
   * Tunjukkan grafik **Dinamika Neraca Air 12 Bulan**: Komposisi *baseflow* vs *quickflow*.
   * Tunjukkan grafik **TreeSHAP Top 5**: Jelaskan bahwa AI tidak lagi *black-box*; sistem secara transparan merinci faktor utama penyebab risiko (misal deviasi suplai terhadap normal klimatologi).
   * Tunjukkan formulir **Status Inspeksi Lapangan** dan perbarui status menjadi *Terjadwal*.
3. **Detik 61 – 90 (Jaringan Aliran Basin & Efek Domino Slide 11):**
   * Buka menu **Jaringan Basin**, lalu buka **Basin 40 (Slide 11)**.
   * Perlihatkan graf interaktif DAG (React Flow): 35 sub-DAS dengan 12 sub-DAS SIAGA.
   * Jelaskan konsep **efek domino aliran**: Jika 4 sub-DAS hulu mengalami kekeringan, pasokan ke hilir anjlok 1,4× lipat. Oleh karena itu, penanganan harus berbasis satu kesatuan basin (*One River Basin*).
   * Klik tombol **Tandai Rencana Bersama**.
4. **Detik 91 – 120 (Playbook, Strategi R1–R5, & Inferensi Mandiri):**
   * Buka menu **Playbook**: Tunjukkan jadwal 4 pekan operasional (Inspeksi $\to$ Koordinasi Basin $\to$ Gilir Giring $\to$ Evaluasi).
   * Buka menu **Rencana Strategis**: Tunjukkan tabel 167 sub-DAS irigasi berat (R4) dan rekomendasi titik buta (R5).
   * Buka menu **Unggah & Realisasi**: Klik salah satu sampel uji (misal Origin 169). Tunjukkan bahwa proses inferensi 7 model berjalan lokal hanya dalam hitungan detik.

---

## Petunjuk Menjalankan Aplikasi Secara Lokal

### Prasyarat:
* Node.js versi 18 ke atas (disarankan Node.js 20 atau 22).
* npm atau pnpm.

### Langkah Instalasi:
```bash
# 1. Masuk ke direktori proyek
cd iris-siaga

# 2. Instal dependensi
npm install

# 3. Jalankan server pengembangan lokal
npm run dev
```
Aplikasi akan aktif di `http://localhost:3000`.

### Menjalankan Pengujian Paritas (Vitest):
```bash
npm test
```

### Membangun Versi Produksi:
```bash
npm run build
npm run start
```

---

## Struktur Direktori Utama

```
iris-siaga/
├── docs/                     # Dokumentasi progres per fase (PROGRESS.md)
├── ml/                       # Skrip pelatihan ML offline, preparasi, dan ekspor biner
│   ├── 01_prepare.py         # Pembersihan data, rekonstruksi timeline 168 bln, tipologi k=4
│   ├── 02_train_serving.py   # Training 7 model serving pada data penuh (Spearman 0.99767)
│   ├── 03_export_models.py   # Ekspor seragam ke format biner TR01 dan CB01
│   ├── 04_golden.py          # Pembuatan golden vectors untuk uji paritas
│   └── common.py             # Logika parser 4 jebakan, 140 base fitur, 14 topo fitur
├── models/                   # 7 file model biner seragam (total 6.4 MB) + manifest.json
│   ├── m1_lgb.bin, m2_lgb.bin, m3_xgb.bin, m4_xgb.bin, m5_cat.bin, m6_lgb.bin, m7_xgb.bin
│   ├── manifest.json         # Metadata arsitektur, feature views, dan checksum SHA-256
│   ├── te_tables.json        # Tabel target encoding id, to_id, month
│   └── typology.json         # Bobot scaler dan centroid klaster tipologi k=4
├── public/samples/           # File CSV sampel test origin 14, 81, 94, 169 & realisasi t166
├── src/
│   ├── app/                  # Next.js 15 App Router (13 rute operasional & API)
│   │   ├── (app)/            # Layout shell utama (Sidebar, Header, RoleSwitcher)
│   │   │   ├── page.tsx      # Dashboard utama Laporan Siaga Air
│   │   │   ├── laporan/      # Laporan per run & halaman cetak A4 resmi BBWS
│   │   │   ├── sub-das/      # Detail sub-DAS (Neraca air, TreeSHAP, Inspeksi)
│   │   │   ├── basin/        # Jaringan 148 basin & visualizer graf DAG React Flow
│   │   │   ├── playbook/     # Timeline 4 pekan operasional & task checklist
│   │   │   ├── strategi/     # Rekomendasi kebijakan R1-R5, wawasan P1-P4, tabel 167 sub-DAS
│   │   │   ├── evaluasi/     # Replay timeline 168 bulan & uji integritas model
│   │   │   ├── unggah/       # Stepper upload CSV & inferensi mandiri lokal
│   │   │   └── tentang/      # Dokumentasi metodologi & profil tim IFEST 2026
│   │   └── api/              # Endpoint ekspor CSV & pipeline inferensi
│   ├── components/           # Komponen UI modular (shadcn/ui + Tailwind + Recharts + React Flow)
│   └── lib/
│       ├── pipeline/         # Engine inferensi pure TypeScript (parse, features, topo, trees, ensemble)
│       └── db/               # Skema Drizzle ORM & data access fallback
└── tests/                    # Pengujian paritas numerik Vitest
```

---

*Dikembangkan dengan penuh dedikasi oleh **Tim IRIS lagi BU** untuk kemajuan pengelolaan sumber daya air Indonesia pada Babak Final IFEST Data Analysis Competition 2026.*
