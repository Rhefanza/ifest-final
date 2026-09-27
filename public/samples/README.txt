IRIS Siaga Air — File Contoh Data Uji & Realisasi
=====================================================

Folder ini berisi file-file CSV mentah untuk demonstrasi pipeline unggah dan evaluasi:

1. data_origin169_okt.csv (±3,4 MB)
   - Data mentah origin 169 (bulan origin Oktober, prakiraan untuk November).
   - Berisi 2.982 baris sub-DAS lengkap dengan 4 ranjau data nyata:
     * Sel berformat angka locale (koma ribuan vs desimal)
     * Kolom month dengan penulisan string (mis. 'Oct', 'October')
     * 17 kolom jebakan aux_*
     * Kode hilir to_id kotor (spasi dan kapitalisasi acak)
   - Gunakan file ini pada tab "Unggah Data Hidrologi Bulanan" untuk menguji audit kualitas data dan inferensi model.

2. data_origin14_apr.csv (±3,4 MB)
   - Data mentah origin 14 (bulan origin April, prakiraan untuk Mei).

3. data_origin81_feb.csv (±3,4 MB)
   - Data mentah origin 81 (bulan origin Februari, prakiraan untuk Maret).

4. data_origin94_des.csv (±3,4 MB)
   - Data mentah origin 94 (bulan origin Desember, prakiraan untuk Januari).

5. data_hist_t166.csv (±2,6 MB)
   - Data mentah historis bulan ke-166 tanpa kolom label.
   - Digunakan untuk demonstrasi alur penuh: unggah data prakiraan -> rilis laporan -> unggah realisasi.

6. realisasi_t166.csv (±35 KB)
   - Realisasi label asli (id, stress) untuk bulan ke-166.
   - Digunakan pada tab "Unggah Realisasi" untuk mengukur metrik evaluasi nyata (AP, presisi@10%, recall@30%).
