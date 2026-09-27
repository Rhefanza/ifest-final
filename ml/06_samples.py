import os, sys, time, json
import pandas as pd

sys.path.append(os.path.dirname(__file__))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DATA_DIR = os.path.join(ROOT, 'babak-final-ifest-dac-2026')
OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), 'out'))
SAMPLES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'public', 'samples'))
os.makedirs(SAMPLES_DIR, exist_ok=True)

def main():
    print("=== Step 1: Extracting Raw Test Origin Samples ===")
    raw_test_path = os.path.join(DATA_DIR, 'test_public.csv')
    df_test_raw = pd.read_csv(raw_test_path, dtype=str)
    
    origin_files = {
        14: 'data_origin14_apr.csv',
        81: 'data_origin81_feb.csv',
        94: 'data_origin94_des.csv',
        169: 'data_origin169_okt.csv'
    }
    
    for o_id, fname in origin_files.items():
        sub = df_test_raw[df_test_raw['origin_id'].str.strip() == str(o_id)].copy()
        out_path = os.path.join(SAMPLES_DIR, fname)
        sub.to_csv(out_path, index=False)
        size_mb = os.path.getsize(out_path) / (1024 * 1024)
        print(f"Saved {fname}: {len(sub)} rows, {size_mb:.2f} MB")
        assert len(sub) == 2982

    print("\n=== Step 2: Extracting Raw Train Sample for t=166 (without label) ===")
    timeline_df = pd.read_csv(os.path.join(OUT_DIR, 'timeline.csv'))
    origin_t166 = int(timeline_df.loc[timeline_df['t'] == 166, 'origin_id'].iloc[0])
    print(f"t=166 corresponds to origin_id={origin_t166}")
    
    raw_train_path = os.path.join(DATA_DIR, 'train.csv')
    # train.csv has first column as unnamed index
    df_train_raw = pd.read_csv(raw_train_path, dtype=str, index_col=0)
    sub_166 = df_train_raw[df_train_raw['origin_id'].str.strip() == str(origin_t166)].copy()
    
    # Drop label column for simulation
    if 'label' in sub_166.columns:
        sub_166 = sub_166.drop(columns=['label'])
        
    out_hist_path = os.path.join(SAMPLES_DIR, 'data_hist_t166.csv')
    sub_166.to_csv(out_hist_path, index=False)
    size_hist_mb = os.path.getsize(out_hist_path) / (1024 * 1024)
    print(f"Saved data_hist_t166.csv: {len(sub_166)} rows, {size_hist_mb:.2f} MB")

    print("\n=== Step 3: Writing README.txt ===")
    readme_content = """IRIS Siaga Air — File Contoh Data Uji & Realisasi
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
"""
    with open(os.path.join(SAMPLES_DIR, 'README.txt'), 'w', encoding='utf-8') as f:
        f.write(readme_content)
    print("Saved public/samples/README.txt")
    print("=== Sample Files Preparation Completed! ===")

if __name__ == '__main__':
    main()
