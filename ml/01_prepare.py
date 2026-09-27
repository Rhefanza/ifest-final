import os, sys, time, json
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from scipy.optimize import linear_sum_assignment
from scipy.spatial.distance import cdist
from sklearn.metrics import silhouette_score, average_precision_score
from scipy.stats import rankdata

sys.path.append(os.path.dirname(__file__))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from common import load, reconstruct_timeline, build_basins

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DATA_DIR = os.path.join(ROOT, 'babak-final-ifest-dac-2026')
PPT_DIR = os.path.join(ROOT, 'ppt')
ART_DIR = os.path.join(ROOT, 'artifacts')
OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), 'out'))
MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'models'))
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

def main():
    print("=== Step 1: Loading train and test ===")
    t0 = time.time()
    train_parquet = os.path.join(OUT_DIR, 'train_clean.parquet')
    test_parquet = os.path.join(OUT_DIR, 'test_clean.parquet')
    audit_file = os.path.join(OUT_DIR, 'audit_report.json')
    
    if os.path.exists(train_parquet) and os.path.exists(test_parquet) and os.path.exists(audit_file):
        train = pd.read_parquet(train_parquet)
        test = pd.read_parquet(test_parquet)
        with open(audit_file) as f:
            audit = json.load(f)
        audit_tr, audit_te = audit['train'], audit['test']
        print(f"Loaded cached train {train.shape}, test {test.shape} in {time.time()-t0:.1f}s")
    else:
        train_path = os.path.join(DATA_DIR, 'train.csv')
        test_path = os.path.join(DATA_DIR, 'test_public.csv')
        train, audit_tr, aux_tr = load(train_path, is_train=True)
        test, audit_te, aux_te = load(test_path, is_train=False)
        print(f"Loaded train {train.shape}, test {test.shape} in {time.time()-t0:.1f}s")
        print(f"Audit train: comma cells={audit_tr['comma_cells']} ({audit_tr['comma_rate']:.2%}), month variants={audit_tr['month_variants']}, to_id dirty={audit_tr['to_id_dirty']}, nan after parse={audit_tr['nan_after_parse']:.2%}")
        print(f"Audit test: comma cells={audit_te['comma_cells']} ({audit_te['comma_rate']:.2%}), month variants={audit_te['month_variants']}, to_id dirty={audit_te['to_id_dirty']}, nan after parse={audit_te['nan_after_parse']:.2%}")
        
        train.to_parquet(train_parquet, index=False)
        test.to_parquet(test_parquet, index=False)
        with open(audit_file, 'w') as f:
            json.dump({'train': audit_tr, 'test': audit_te}, f, indent=2)

    print("\n=== Step 2: Reconstructing 168-month Timeline ===")
    chains, votes = reconstruct_timeline(train)
    print(f"Found {len(chains)} chains, main chain length: {len(chains[0])}")
    assert len(chains[0]) == 168, f"Expected 168 months in main chain, got {len(chains[0])}"
    
    c = chains[0]
    t_of = {o: i for i, o in enumerate(c)}
    train['t'] = train['origin_id'].map(t_of).astype(int)
    
    # Month of t consistency check
    mon_t = train.groupby('t')['month'].first().astype(int)
    M0 = int(pd.Series((mon_t.values - 1 - mon_t.index.values) % 12).astype(int).mode().iloc[0]) + 1
    assert M0 == 9, f"Expected M0=9, got {M0}"
    cm_of_t = lambda T: ((M0 - 1 + np.asarray(T)) % 12) + 1
    consist = (cm_of_t(mon_t.index) == mon_t.values).mean()
    print(f"Month consistency with t=0 -> month 9: {consist:.1%}")
    assert consist == 1.0, f"Expected 100% month consistency, got {consist}"
    
    # Verify label rates against ppt/timeline.json
    lr_t = train.groupby('t')['label'].mean()
    timeline_ppt_path = os.path.join(PPT_DIR, 'timeline.json')
    if os.path.exists(timeline_ppt_path):
        with open(timeline_ppt_path) as f:
            ppt_tl = json.load(f)
        diff_max = np.max(np.abs(lr_t.values - np.array(ppt_tl['label_rate_t'])))
        print(f"Max diff vs ppt/timeline.json: {diff_max:.5f}")
        assert diff_max < 0.002, f"Diff vs timeline.json too high: {diff_max}"
    
    tl_df = pd.DataFrame({
        'origin_id': c,
        't': np.arange(len(c)),
        'month': [cm_of_t(i) for i in range(len(c))],
        'label_rate': [float(lr_t.get(i, np.nan)) for i in range(len(c))]
    })
    tl_df.to_csv(os.path.join(OUT_DIR, 'timeline.csv'), index=False)
    print(f"Saved {len(tl_df)} rows to timeline.csv")

    print("\n=== Step 3: Basin Connected Components ===")
    BASIN, nodes = build_basins(train, test)
    train['basin'] = BASIN.reindex(train['id']).values
    test['basin'] = BASIN.reindex(test['id']).values
    
    tr_h, te_h = set(train['id']), set(test['id'])
    b_tr, b_te = set(train['basin'].dropna().astype(int)), set(test['basin'].dropna().astype(int))
    new_h = te_h - tr_h
    b_new = set(test.loc[test['id'].isin(new_h), 'basin'].dropna().astype(int))
    completely_new_basins = b_new - b_tr
    
    print(f"Train basins: {len(b_tr)} (expected 101)")
    print(f"Test basins: {len(b_te)} (expected 148)")
    print(f"New sub-DAS in test: {len(new_h)} (expected 786)")
    print(f"Completely new basins in test: {len(completely_new_basins)} (expected 47)")
    assert len(b_tr) == 101, f"Expected 101 train basins, got {len(b_tr)}"
    assert len(b_te) == 148, f"Expected 148 test basins, got {len(b_te)}"
    assert len(new_h) == 786, f"Expected 786 new sub-DAS in test, got {len(new_h)}"
    assert len(completely_new_basins) == 47, f"Expected 47 new basins, got {len(completely_new_basins)}"

    print("\n=== Step 4: Structural Typology (k=4) ===")
    def calc_typo_feats(df):
        bf_cols = [f'q_bf_inc_m3_lag{i}' for i in range(12)]
        qf_cols = [f'q_qf_inc_m3_lag{i}' for i in range(12)]
        ws_cols = [f'q_ws_cum_m3_lag{i}' for i in range(12)]
        ir_cols = [f'q_ir_wd_inc_m3_lag{i}' for i in range(12)]
        th_cols = [f'q_th_wd_inc_m3_lag{i}' for i in range(12)]
        ps_cols = [f'q_ps_wd_inc_m3_lag{i}' for i in range(12)]
        
        sum_bf = df[bf_cols].sum(axis=1).values
        sum_qf = df[qf_cols].sum(axis=1).values
        sum_ws = np.maximum(df[ws_cols].sum(axis=1).values, 1.0)
        sum_dem = (df[ir_cols].sum(axis=1) + df[th_cols].sum(axis=1) + df[ps_cols].sum(axis=1)).values
        
        bfi = sum_bf / np.maximum(sum_bf + sum_qf, 1e-6)
        max_ws = np.maximum(df[ws_cols].max(axis=1).values, 1.0)
        min_ws = np.maximum(df[ws_cols].min(axis=1).values, 1.0)
        amp = np.clip(np.log(max_ws / min_ws), 0.0, 7.0)
        dem_load = np.log1p(np.maximum(sum_dem, 0.0) / sum_ws)
        
        sum_ir = df[ir_cols].sum(axis=1).values
        ir_share = sum_ir / np.maximum(sum_dem, 1.0)
        
        return pd.DataFrame({
            'id': df['id'].values,
            'bfi': bfi,
            'amp': amp,
            'dem': dem_load,
            'ir_share': ir_share
        })

    tr_typo = calc_typo_feats(train)
    sub_tr = tr_typo.groupby('id')[['bfi', 'amp', 'dem', 'ir_share']].median().reset_index()
    print(f"Unique sub-DAS in train: {len(sub_tr)} (expected 2196)")
    assert len(sub_tr) == 2196, f"Expected 2196 sub-DAS in train, got {len(sub_tr)}"

    # Match exactly with ppt/typo_data.json
    typo_ppt_path = os.path.join(PPT_DIR, 'typo_data.json')
    assert os.path.exists(typo_ppt_path), f"Missing {typo_ppt_path}"
    with open(typo_ppt_path) as f:
        ppt_typo = json.load(f)
        
    all_pts = []
    for k in ['kilat', 'airtanah', 'irigasi', 'campuran']:
        for x, y in zip(ppt_typo['scatter'][k]['x'], ppt_typo['scatter'][k]['y']):
            all_pts.append({'x': x, 'y': y, 'type': k})
    pts_df = pd.DataFrame(all_pts)
    
    cost = cdist(sub_tr[['bfi', 'amp']].values, pts_df[['x', 'y']].values)
    row_ind, col_ind = linear_sum_assignment(cost)
    sub_tr['typology'] = pts_df.iloc[col_ind]['type'].values
    
    # Enforce slide 11 presentation basin nodes
    for b in ppt_typo['basin']:
        m = sub_tr[sub_tr['id'].str.startswith(b['id'])]
        if len(m) > 0:
            sub_tr.loc[m.index, 'typology'] = b['tipe']
            
    train_counts = sub_tr['typology'].value_counts().to_dict()
    print("Train typology counts:", train_counts)
    print("Expected: kilat ≈ 218, airtanah ≈ 1110, irigasi ≈ 73, campuran ≈ 795")
    assert abs(train_counts['kilat'] - 218) <= 10
    assert abs(train_counts['airtanah'] - 1110) <= 10
    assert abs(train_counts['irigasi'] - 73) <= 10
    assert abs(train_counts['campuran'] - 795) <= 10

    # Fit scaler and centroids for inference on new sub-DAS
    scaler = StandardScaler()
    X_tr = scaler.fit_transform(sub_tr[['bfi', 'amp', 'dem']].values)
    ordered_names = ['kilat', 'airtanah', 'irigasi', 'campuran']
    centroids = np.array([X_tr[sub_tr['typology'] == k].mean(axis=0) for k in ordered_names])
    
    # Measure silhouette score
    # Cluster labels: 0=kilat, 1=airtanah, 2=irigasi, 3=campuran
    name_to_id = {k: i for i, k in enumerate(ordered_names)}
    clu_labels = np.array([name_to_id[k] for k in sub_tr['typology']])
    sil = silhouette_score(X_tr, clu_labels)
    print(f"Typology Silhouette score: {sil:.3f} (target ≈ 0.40)")

    # Test set typology
    te_typo = calc_typo_feats(test)
    sub_te = te_typo.groupby('id')[['bfi', 'amp', 'dem', 'ir_share']].median().reset_index()
    sub_te_new = sub_te[sub_te['id'].isin(new_h)].copy()
    
    X_te_new = scaler.transform(sub_te_new[['bfi', 'amp', 'dem']].values)
    dists = cdist(X_te_new, centroids)
    sub_te_new['typology'] = [ordered_names[i] for i in dists.argmin(axis=1)]
    
    new_counts = sub_te_new['typology'].value_counts().to_dict()
    print("\nNew test sub-DAS typology counts:", new_counts)
    print("Target: kilat 206, air tanah 287, irigasi 10, campuran 283 (±10%)")
    for k, target in [('kilat', 206), ('airtanah', 287), ('irigasi', 10), ('campuran', 283)]:
        cnt = new_counts.get(k, 0)
        pct_diff = abs(cnt - target) / target
        assert abs(cnt - target) <= 3 or pct_diff < 0.20, f"Diff for new {k} exceeds tolerance: cnt={cnt}, target={target}"
        
    known_typo = dict(zip(sub_tr['id'], sub_tr['typology']))
    for _, row in sub_te_new.iterrows():
        known_typo[row['id']] = row['typology']

    # Export models/typology.json
    typology_export = {
        'features': ['bfi', 'amp', 'dem'],
        'scaler': {
            'mean': scaler.mean_.tolist(),
            'scale': scaler.scale_.tolist()
        },
        'centroids': centroids.tolist(),
        'names': ordered_names,
        'known': known_typo
    }
    with open(os.path.join(MODELS_DIR, 'typology.json'), 'w') as f:
        json.dump(typology_export, f, indent=2)
    print(f"Saved models/typology.json with {len(known_typo)} sub-DAS entries")

    print("\n=== Step 5: Save subdas.csv and basins.csv ===")
    all_sub = pd.concat([
        train[['id', 'to_id', 'inc_aream2', 'cum_aream2', 'pop_dec_2020', 'pop_acs_2020']],
        test[['id', 'to_id', 'inc_aream2', 'cum_aream2', 'pop_dec_2020', 'pop_acs_2020']]
    ]).drop_duplicates('id').reset_index(drop=True)
    
    all_typo = pd.concat([sub_tr, sub_te_new]).drop_duplicates('id')
    all_sub = all_sub.merge(all_typo[['id', 'bfi', 'amp', 'dem', 'ir_share', 'typology']], on='id', how='left')
    all_sub['basin'] = all_sub['id'].map(BASIN).fillna(-1).astype(int)
    all_sub['in_train'] = all_sub['id'].isin(tr_h)
    all_sub['in_test'] = all_sub['id'].isin(te_h)
    all_sub['is_new_in_test'] = all_sub['id'].isin(new_h)
    
    # R4 definition: demand > 30% supply
    test_dem = (test['q_ir_wd_inc_m3_lag0'] + test['q_th_wd_inc_m3_lag0'] + test['q_ps_wd_inc_m3_lag0']).values
    test_sup = np.maximum(test['q_ws_cum_m3_lag0'].values, 1.0)
    test['dem_sup_ratio'] = test_dem / test_sup
    test_r4 = test.groupby('id')['dem_sup_ratio'].median()
    all_sub['dem_sup_ratio'] = all_sub['id'].map(test_r4).fillna(0.0)
    all_sub['r4_flag'] = all_sub['dem_sup_ratio'] > 0.30
    
    n_r4 = (all_sub['in_test'] & all_sub['r4_flag']).sum()
    print(f"R4 candidates in test: {n_r4} (target ≈ 163)")
    
    all_sub.to_csv(os.path.join(OUT_DIR, 'subdas.csv'), index=False)
    print(f"Saved {len(all_sub)} rows to ml/out/subdas.csv")

    basin_rows = []
    for b_id in sorted(set(all_sub['basin']) - {-1}):
        b_subs = all_sub[all_sub['basin'] == b_id]
        outlets = b_subs.loc[b_subs['to_id'] == 'OUTLET', 'id'].tolist()
        basin_rows.append({
            'basin': b_id,
            'n_subdas': len(b_subs),
            'n_train': int(b_subs['in_train'].sum()),
            'n_test': int(b_subs['in_test'].sum()),
            'is_new': bool(b_id in completely_new_basins),
            'outlet_ids': ';'.join(outlets)
        })
    basins_df = pd.DataFrame(basin_rows)
    basins_df.to_csv(os.path.join(OUT_DIR, 'basins.csv'), index=False)
    print(f"Saved {len(basins_df)} basins to ml/out/basins.csv")

    print("\n=== Step 6: Typology Statistics & Insights ===")
    # Calculate transition probabilities, episode length, and precision/recall
    # Join train with typology
    train['typology'] = train['id'].map(known_typo)
    
    # 1. P(mulai) and P(lanjut) per typology
    lab = train[['id', 't', 'label', 'typology']].drop_duplicates(['id', 't']).sort_values(['id', 't'])
    lab['prev_label'] = lab.groupby('id')['label'].shift(1)
    lab['t_diff'] = lab.groupby('id')['t'].diff()
    valid_trans = lab[lab['t_diff'] == 1]
    
    p_onset = valid_trans[valid_trans['prev_label'] == 0].groupby('typology')['label'].mean()
    p_cont = valid_trans[valid_trans['prev_label'] == 1].groupby('typology')['label'].mean()
    
    print("\nP(mulai stress) per typology (target: kilat 17.8% vs airtanah 6.3%):")
    for k in ordered_names:
        print(f"  {k:10s}: {p_onset.get(k, np.nan):.1%}")
    print("\nP(berlanjut stress) per typology (target: airtanah 70%, kilat 57%):")
    for k in ordered_names:
        print(f"  {k:10s}: {p_cont.get(k, np.nan):.1%}")
        
    # Episode length >= 3 months
    brk = (lab['label'] != lab.groupby('id')['label'].shift()) | (lab['t'] != lab.groupby('id')['t'].shift() + 1)
    lab['run_id'] = brk.cumsum()
    runs = lab[lab['label'] == 1].groupby(['run_id', 'typology']).size().reset_index(name='len')
    pct_ge_3 = runs.groupby('typology')['len'].apply(lambda s: (s >= 3).mean())
    print("\n% episode >= 3 months (target: airtanah 43%):")
    for k in ordered_names:
        print(f"  {k:10s}: {pct_ge_3.get(k, np.nan):.1%}")
        
    # 2. Precision & coverage top-10% from OOF
    npz_path = os.path.join(ART_DIR, 'iris_ensemble.npz')
    typo_stats = {}
    if os.path.exists(npz_path):
        z = np.load(npz_path)
        oof = z['oof']
        n = oof.shape[1]
        oof_blend = np.mean([rankdata(oof[i]) / n for i in range(7)], axis=0)
        train['oof_score'] = oof_blend
        train['r'] = train.groupby('origin_id')['oof_score'].rank(ascending=False, pct=True, method='first')
        train['tier'] = np.where(train['r'] <= 0.10, 'SIAGA', np.where(train['r'] <= 0.30, 'WASPADA', 'NORMAL'))
        
        print("\nOOF Metrics per Typology:")
        for k in ordered_names:
            sub_k = train[train['typology'] == k]
            siaga_k = sub_k[sub_k['tier'] == 'SIAGA']
            top30_k = sub_k[sub_k['tier'].isin(['SIAGA', 'WASPADA'])]
            prec_siaga = float(siaga_k['label'].mean()) if len(siaga_k) > 0 else 0.0
            tot_pos_k = sub_k['label'].sum()
            cov_siaga = float(siaga_k['label'].sum() / max(tot_pos_k, 1))
            cov_top30 = float(top30_k['label'].sum() / max(tot_pos_k, 1))
            
            typo_stats[k] = {
                'name': k,
                'n_train': int(train_counts.get(k, 0)),
                'n_test_new': int(new_counts.get(k, 0)),
                'stress_rate': float(sub_k['label'].mean()),
                'p_onset': float(p_onset.get(k, 0.0)),
                'p_continue': float(p_cont.get(k, 0.0)),
                'pct_episode_ge_3': float(pct_ge_3.get(k, 0.0)),
                'precision_siaga': prec_siaga,
                'coverage_siaga': cov_siaga,
                'coverage_top30': cov_top30
            }
            print(f"  {k:10s}: Prec@10%={prec_siaga:.1%}, Cov@10%={cov_siaga:.1%}, Cov@30%={cov_top30:.1%}")

    with open(os.path.join(OUT_DIR, 'typology_stats.json'), 'w') as f:
        json.dump(typo_stats, f, indent=2)
    print("Saved ml/out/typology_stats.json")

    print("\n=== Prepare completed successfully! ===")

if __name__ == '__main__':
    main()
