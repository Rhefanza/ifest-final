import os, sys, time, json
import numpy as np
import pandas as pd
from scipy.stats import rankdata

sys.path.append(os.path.dirname(__file__))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from common import load, add_features, topo_features, apply_te_tables

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DATA_DIR = os.path.join(ROOT, 'babak-final-ifest-dac-2026')
OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), 'out'))
MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'models'))
FIXTURES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'tests', 'fixtures'))
os.makedirs(FIXTURES_DIR, exist_ok=True)

import importlib
export_module = importlib.import_module('03_export_models')
verify_bin_evaluator = export_module.verify_bin_evaluator

def main():
    print("=== Step 1: Selecting 300 Raw Rows from Origin 169 ===")
    raw_test_path = os.path.join(DATA_DIR, 'test_public.csv')
    df_raw = pd.read_csv(raw_test_path, dtype=str)
    
    # Filter origin 169
    # origin_id column might be string '169'
    o169_mask = df_raw['origin_id'].str.strip() == '169'
    df_169_raw = df_raw[o169_mask].copy().reset_index(drop=True)
    print(f"Total rows for origin 169: {len(df_169_raw)}")
    assert len(df_169_raw) == 2982
    
    # Identify rows with special edge cases
    has_comma = df_169_raw.apply(lambda col: col.str.contains(',', na=False)).any(axis=1)
    is_outlet = df_169_raw['to_id'].str.strip().str.upper() == 'OUTLET'
    to_id_dirty = ((df_169_raw['to_id'] != df_169_raw['to_id'].str.strip()) |
                   ((df_169_raw['to_id'].str.strip().str.upper() != 'OUTLET') & 
                    (df_169_raw['to_id'].str.strip() != df_169_raw['to_id'].str.strip().str.lower())))
    has_nan = df_169_raw.isna().any(axis=1)
    
    # Sample 300 rows ensuring representation of all edge cases
    idx_special = set(df_169_raw[has_comma].index[:60]) | \
                  set(df_169_raw[is_outlet].index[:30]) | \
                  set(df_169_raw[to_id_dirty].index[:30]) | \
                  set(df_169_raw[has_nan].index[:30])
    
    remaining_needed = 300 - len(idx_special)
    other_idx = [i for i in range(len(df_169_raw)) if i not in idx_special]
    sampled_idx = sorted(list(idx_special) + other_idx[:remaining_needed])
    assert len(sampled_idx) == 300
    
    golden_raw_df = df_169_raw.iloc[sampled_idx].copy()
    golden_raw_csv = os.path.join(FIXTURES_DIR, 'golden_rows_raw.csv')
    golden_raw_df.to_csv(golden_raw_csv, index=False)
    print(f"Saved {len(golden_raw_df)} rows to tests/fixtures/golden_rows_raw.csv")

    print("\n=== Step 2: Computing Features for Full Origin 169 Batch ===")
    # Clean origin 169 as a batch
    clean_169_path = os.path.join(OUT_DIR, 'clean_169_temp.csv')
    df_169_raw.to_csv(clean_169_path, index=False)
    clean_169, audit_169, _ = load(clean_169_path, is_train=False)
    os.remove(clean_169_path)
    
    X_base = add_features(clean_169)
    T_topo = topo_features(clean_169)
    with open(os.path.join(MODELS_DIR, 'te_tables.json')) as f:
        te_tables = json.load(f)
    TE_te = apply_te_tables(clean_169, te_tables)
    X_full_te = pd.concat([X_base, T_topo, TE_te], axis=1)
    
    feature_names = list(X_full_te.columns)
    print(f"Total features computed: {len(feature_names)}")
    assert len(feature_names) == 157
    
    # Save golden features for the 300 sampled rows
    golden_feats_300 = X_full_te.iloc[sampled_idx].values.astype(np.float32)
    golden_features_export = {
        'feature_names': feature_names,
        'row_indices_in_169': sampled_idx,
        'features': [row.tolist() for row in golden_feats_300]
    }
    with open(os.path.join(FIXTURES_DIR, 'golden_features.json'), 'w') as f:
        json.dump(golden_features_export, f)
    print(f"Saved tests/fixtures/golden_features.json ({len(golden_feats_300)} rows x 157 features)")

    print("\n=== Step 3: Computing Golden Margins for the 300 Rows ===")
    golden_margins = {}
    for i in range(1, 8):
        m_fname = f"m{i}_{'lgb' if i in [1,2,6] else ('xgb' if i in [3,4,7] else 'cat')}.bin"
        bin_path = os.path.join(MODELS_DIR, m_fname)
        
        # Select 140 base or 157 full
        X_sample = golden_feats_300[:, :140] if i <= 5 else golden_feats_300
        preds = verify_bin_evaluator(bin_path, X_sample)
        golden_margins[f"m{i}"] = [float(p) for p in preds]
        print(f"Computed margins for {m_fname}: mean={np.mean(preds):.4f}, std={np.std(preds):.4f}")
        
    with open(os.path.join(FIXTURES_DIR, 'golden_margins.json'), 'w') as f:
        json.dump(golden_margins, f)
    print("Saved tests/fixtures/golden_margins.json")

    print("\n=== Step 4: Computing Full Golden Run 169 Predictions and Tiers ===")
    all_margins_169 = []
    X_full_base_np = X_base.values.astype(np.float32)
    X_full_te_np = X_full_te.values.astype(np.float32)
    
    for i in range(1, 8):
        m_fname = f"m{i}_{'lgb' if i in [1,2,6] else ('xgb' if i in [3,4,7] else 'cat')}.bin"
        bin_path = os.path.join(MODELS_DIR, m_fname)
        X_sample = X_full_base_np if i <= 5 else X_full_te_np
        preds = verify_bin_evaluator(bin_path, X_sample)
        all_margins_169.append(preds)
        
    n_rows = len(clean_169)
    member_ranks = [rankdata(m) / n_rows for m in all_margins_169]
    blend_score = np.mean(member_ranks, axis=0)
    
    # Tier assignment: rank descending, method='first'
    # pct <= 0.10 -> SIAGA, <= 0.30 -> WASPADA, else NORMAL
    ranks_desc = pd.Series(blend_score).rank(ascending=False, method='first').values.astype(int)
    pcts = ranks_desc / n_rows
    
    tiers = np.where(pcts <= 0.10, 'SIAGA', np.where(pcts <= 0.30, 'WASPADA', 'NORMAL'))
    
    n_siaga = (tiers == 'SIAGA').sum()
    n_waspada = (tiers == 'WASPADA').sum()
    n_normal = (tiers == 'NORMAL').sum()
    print(f"Origin 169 tier counts: SIAGA={n_siaga}, WASPADA={n_waspada}, NORMAL={n_normal}")
    assert n_siaga == 298
    assert n_waspada == 596
    assert n_normal == 2088
    
    golden_run_169 = []
    for idx in range(n_rows):
        golden_run_169.append({
            'id': str(clean_169['id'].iloc[idx]),
            'to_id': str(clean_169['to_id'].iloc[idx]),
            'score': round(float(blend_score[idx]), 6),
            'rank': int(ranks_desc[idx]),
            'pct': round(float(pcts[idx]), 6),
            'tier': str(tiers[idx])
        })
        
    with open(os.path.join(FIXTURES_DIR, 'golden_run169.json'), 'w') as f:
        json.dump(golden_run_169, f, indent=2)
    print(f"Saved tests/fixtures/golden_run169.json ({len(golden_run_169)} rows)")

    # Print top 5 sub-DAS
    top5 = sorted(golden_run_169, key=lambda x: x['rank'])[:5]
    print("\nTop 5 sub-DAS for origin 169:")
    for item in top5:
        print(f"  #{item['rank']}: id={item['id']}, score={item['score']}, tier={item['tier']}")
        
    print("\n=== Golden Vectors Generated Successfully! ===")

if __name__ == '__main__':
    main()
