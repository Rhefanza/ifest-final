import os, sys, time, json
import numpy as np
import pandas as pd
from scipy.stats import rankdata
from sklearn.metrics import average_precision_score, roc_auc_score
import lightgbm as lgb

sys.path.append(os.path.dirname(__file__))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from common import load, add_features

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DATA_DIR = os.path.join(ROOT, 'babak-final-ifest-dac-2026')
ART_DIR = os.path.join(ROOT, 'artifacts')
PPT_DIR = os.path.join(ROOT, 'ppt')
OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), 'out'))
MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'models'))
SAMPLES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'public', 'samples'))
os.makedirs(SAMPLES_DIR, exist_ok=True)

MONTH_MAP = {
    14: {'origin_month': 4, 'target_month': 5, 'name': 'Prakiraan Mei (origin 14)'},
    81: {'origin_month': 2, 'target_month': 3, 'name': 'Prakiraan Maret (origin 81)'},
    94: {'origin_month': 12, 'target_month': 1, 'name': 'Prakiraan Januari (origin 94)'},
    169: {'origin_month': 10, 'target_month': 11, 'name': 'Prakiraan November (origin 169)'}
}

INDICATOR_COLS = [
    'ws_climnext_ratio', 'supply_clim_ratio', 'ws_z_last',
    'ws_decl_streak', 'ws_drawdown', 'use_ratio_last',
    'deficit_last', 'ir_share'
]

def compute_network_context_and_escalation(df_run):
    """
    df_run has columns: id, to_id, tier
    Returns: tier_final, escalated_reason, net_context
    """
    id_to_tier = dict(zip(df_run['id'], df_run['tier']))
    all_ids = set(df_run['id'])
    
    # Precompute upstream counts per tier
    up_map = {}
    for _, row in df_run.iterrows():
        to_h = row['to_id']
        if to_h != 'OUTLET':
            if to_h not in up_map:
                up_map[to_h] = []
            up_map[to_h].append((row['id'], row['tier']))
            
    tier_finals = []
    reasons = []
    net_contexts = []
    
    for _, row in df_run.iterrows():
        h_id = row['id']
        to_h = row['to_id']
        tier = row['tier']
        
        # Check downstream
        down_in_data = to_h in all_ids
        down_tier = id_to_tier.get(to_h, None)
        
        # Check upstream
        up_list = up_map.get(h_id, [])
        up_siaga = [u[0] for u in up_list if u[1] == 'SIAGA']
        
        # Escalation rule: if tier == NORMAL and adjacent to SIAGA (hulu SIAGA or hilir SIAGA)
        is_escalated = False
        esc_reason = None
        if tier == 'NORMAL':
            if down_tier == 'SIAGA':
                is_escalated = True
                esc_reason = f"Tetangga SIAGA di hilir: {to_h[:6]}"
            elif len(up_siaga) > 0:
                is_escalated = True
                esc_reason = f"Tetangga SIAGA di hulu: {up_siaga[0][:6]}"
                
        tier_final = 'WASPADA' if is_escalated else tier
        
        # Network context text (rules priority)
        # 1. to_id == OUTLET
        # 2. hilir SIAGA
        # 3. >= 1 hulu SIAGA
        # 4. hilir ada di data dan WASPADA/NORMAL
        # 5. hilir tidak ada di data
        ctx = ""
        if to_h == 'OUTLET':
            if len(up_siaga) > 0:
                ctx = f"Muara (outlet); {len(up_siaga)} hulu SIAGA → cek hulu"
            else:
                ctx = "Muara (outlet)"
        elif down_tier == 'SIAGA':
            ctx = "Hilir juga SIAGA → tangani per basin"
        elif len(up_siaga) > 0:
            ctx = f"{len(up_siaga)} sub-DAS hulu SIAGA → cek hulu"
        elif down_in_data:
            ctx = f"Hilir {down_tier} → sumber stress lokal"
        else:
            ctx = "Hilir di luar data"
            
        tier_finals.append(tier_final)
        reasons.append(esc_reason)
        net_contexts.append(ctx)
        
    return tier_finals, reasons, net_contexts

def compute_indicators(X_df):
    """Compute values and percentiles within run for indicator cols"""
    indicators = []
    n = len(X_df)
    
    # Precompute percentiles
    pct_dict = {}
    for col in INDICATOR_COLS:
        s = X_df[col].fillna(0.0)
        pct_dict[col] = (s.rank(pct=True, method='average') * 100.0).values
        
    for i in range(n):
        row_ind = {}
        for col in INDICATOR_COLS:
            val = float(X_df[col].iloc[i]) if pd.notna(X_df[col].iloc[i]) else 0.0
            p = float(pct_dict[col][i])
            row_ind[col] = {'val': round(val, 3), 'pct': round(p, 1)}
        indicators.append(row_ind)
    return indicators

def extract_series(row):
    """Extract 12-lag time series for 6 families + clim"""
    FAMS_MAP = {
        'bf': 'q_bf_inc_m3', 'qf': 'q_qf_inc_m3', 'ws': 'q_ws_cum_m3',
        'ir': 'q_ir_wd_inc_m3', 'th': 'q_th_wd_inc_m3', 'ps': 'q_ps_wd_inc_m3'
    }
    s = {}
    for fam, pref in FAMS_MAP.items():
        s[fam] = [float(row[f"{pref}_lag{j}"]) if pd.notna(row[f"{pref}_lag{j}"]) else 0.0 for j in range(12)]
    s['clim_now'] = float(row['clim_median_now']) if pd.notna(row['clim_median_now']) else 0.0
    s['clim_next'] = float(row['clim_median_next']) if pd.notna(row['clim_median_next']) else 0.0
    return s

def main():
    print("=== Step 1: Loading Processed Sub-DAS & Basins ===")
    subdas_df = pd.read_csv(os.path.join(OUT_DIR, 'subdas.csv'))
    id_to_typo = dict(zip(subdas_df['id'], subdas_df['typology']))
    id_to_basin = dict(zip(subdas_df['id'], subdas_df['basin']))
    id_to_new = dict(zip(subdas_df['id'], subdas_df['is_new_in_test']))
    
    with open(os.path.join(MODELS_DIR, 'manifest.json')) as f:
        manifest = json.load(f)
        
    print("\n=== Step 2: Preparing 4 Test Runs (submission_3.csv) ===")
    sub3 = pd.read_csv(os.path.join(ROOT, 'submission_3.csv'))
    test_clean = pd.read_parquet(os.path.join(OUT_DIR, 'test_clean.parquet'))
    test_clean = test_clean.merge(sub3, on='row_id', how='left') # label column is submission_3 score
    
    Xte_base = pd.read_parquet(os.path.join(OUT_DIR, 'Xte.parquet'))
    feature_names_base = list(Xte_base.columns)
    
    # Compute SHAP for test set using member #1 (LightGBM)
    booster_m1 = lgb.Booster(model_file=os.path.join(OUT_DIR, 'serving_models', 'm1_lgb.txt'))
    print("Computing TreeSHAP values for test set...")
    contrib_m1 = booster_m1.predict(Xte_base, pred_contrib=True)[:, :-1] # (11928, 140)
    
    test_runs_data = []
    
    for o_id in [14, 81, 94, 169]:
        meta = MONTH_MAP[o_id]
        mask = (test_clean['origin_id'] == o_id).values
        sub_df = test_clean[mask].copy().reset_index(drop=True)
        sub_X = Xte_base[mask].copy().reset_index(drop=True)
        sub_contrib = contrib_m1[mask]
        
        n_rows = len(sub_df)
        print(f"\nProcessing Origin {o_id} ({meta['name']}): {n_rows} rows")
        assert n_rows == 2982
        
        scores = sub_df['label'].values # rank-blend score from submission_3
        ranks = pd.Series(scores).rank(ascending=False, method='first').values.astype(int)
        pcts = ranks / n_rows
        tiers = np.where(pcts <= 0.10, 'SIAGA', np.where(pcts <= 0.30, 'WASPADA', 'NORMAL'))
        
        sub_df['tier'] = tiers
        tier_finals, reasons, contexts = compute_network_context_and_escalation(sub_df)
        indicators = compute_indicators(sub_X)
        
        # Compute top 5 SHAP contributors per row
        top_shaps = []
        for r_i in range(n_rows):
            c_row = sub_contrib[r_i]
            top_5_idx = np.argsort(np.abs(c_row))[-5:][::-1]
            shaps = []
            for feat_i in top_5_idx:
                shaps.append({
                    'feature': feature_names_base[feat_i],
                    'value': round(float(sub_X.iloc[r_i, feat_i]), 3),
                    'contrib': round(float(c_row[feat_i]), 4)
                })
            top_shaps.append(shaps)
            
        predictions = []
        for r_i in range(n_rows):
            h_id = str(sub_df['id'].iloc[r_i])
            row_dict = {
                'subdas_id': h_id,
                'basin_id': int(id_to_basin.get(h_id, -1)),
                'score': round(float(scores[r_i]), 4),
                'rank': int(ranks[r_i]),
                'pct': round(float(pcts[r_i]), 4),
                'tier': str(tiers[r_i]),
                'tier_final': str(tier_finals[r_i]),
                'escalated_reason': reasons[r_i],
                'typology': str(id_to_typo.get(h_id, 'campuran')),
                'is_new': bool(id_to_new.get(h_id, False)),
                'net_context': contexts[r_i],
                'indicators': indicators[r_i],
                'series': extract_series(sub_df.iloc[r_i]),
                'shap_top': top_shaps[r_i],
                'realized': None,
                'episode_len': None
            }
            predictions.append(row_dict)
            
        n_siaga = (tiers == 'SIAGA').sum()
        n_waspada = (tiers == 'WASPADA').sum()
        n_normal = (tiers == 'NORMAL').sum()
        n_escalated = sum(1 for t, tf in zip(tiers, tier_finals) if t != tf)
        
        test_runs_data.append({
            'origin_id': o_id,
            'label': meta['name'],
            'origin_month': meta['origin_month'],
            'target_month': meta['target_month'],
            'source': 'test',
            'model_version': 'iris-kaggle-lb0.739',
            'n_rows': n_rows,
            'n_siaga': int(n_siaga),
            'n_waspada': int(n_waspada),
            'n_normal': int(n_normal),
            'n_escalated': int(n_escalated),
            'predictions': predictions
        })
        print(f"  Tiers: SIAGA={n_siaga}, WASPADA={n_waspada} (+{n_escalated} escalated), NORMAL={n_normal}")

    # Save test runs
    with open(os.path.join(OUT_DIR, 'test_runs_seed.json'), 'w') as f:
        json.dump(test_runs_data, f)
    print("Saved ml/out/test_runs_seed.json")

    print("\n=== Step 3: Preparing 168 Historical Runs (OOF) ===")
    z = np.load(os.path.join(ART_DIR, 'iris_ensemble.npz'))
    oof = z['oof'] # shape (7, 378780)
    n_train = oof.shape[1]
    oof_blend = np.mean([rankdata(oof[i]) / n_train for i in range(7)], axis=0)
    
    train_clean = pd.read_parquet(os.path.join(OUT_DIR, 'train_clean.parquet'))
    timeline_df = pd.read_csv(os.path.join(OUT_DIR, 'timeline.csv'))
    t_map = dict(zip(timeline_df['origin_id'], timeline_df['t']))
    month_map_t = dict(zip(timeline_df['t'], timeline_df['month']))
    
    train_clean['t'] = train_clean['origin_id'].map(t_map).astype(int)
    train_clean['oof_score'] = oof_blend
    
    # Dedup (t, id)
    train_dedup = train_clean.drop_duplicates(['t', 'id']).copy().reset_index(drop=True)
    print(f"Train deduped (t, id): {len(train_dedup)} rows (from {len(train_clean)})")
    
    history_runs_meta = []
    history_preds_compact = [] # Compact format: [run_idx, subdas_id, basin_id, score, rank, tier, label, ws_lag0, clim_now]
    
    # Separate labels for t=166 (for realisasi demo) and t=167
    labels_t166 = []
    
    for t_idx in range(168):
        sub_t = train_dedup[train_dedup['t'] == t_idx].copy().reset_index(drop=True)
        orig_month = int(month_map_t[t_idx])
        targ_month = (orig_month % 12) + 1
        n_rows = len(sub_t)
        
        scores = sub_t['oof_score'].values
        ranks = pd.Series(scores).rank(ascending=False, method='first').values.astype(int)
        pcts = ranks / n_rows
        tiers = np.where(pcts <= 0.10, 'SIAGA', np.where(pcts <= 0.30, 'WASPADA', 'NORMAL'))
        
        # t=166 and t=167 are seeded WITHOUT realization (has_realization=False)
        is_unrealized = (t_idx in [166, 167])
        
        if t_idx == 166:
            # Save realisasi_t166.csv
            for _, r in sub_t.iterrows():
                labels_t166.append({'id': str(r['id']), 'stress': int(r['label'])})
                
        n_siaga = int((tiers == 'SIAGA').sum())
        n_waspada = int((tiers == 'WASPADA').sum())
        n_normal = int((tiers == 'NORMAL').sum())
        
        history_runs_meta.append({
            't_index': t_idx,
            'origin_id': int(sub_t['origin_id'].iloc[0]),
            'label': f"Bulan ke-{t_idx+1} (prakiraan bulan {targ_month})",
            'origin_month': orig_month,
            'target_month': targ_month,
            'source': 'history',
            'model_version': 'iris-oof-ensemble',
            'n_rows': n_rows,
            'n_siaga': n_siaga,
            'n_waspada': n_waspada,
            'n_normal': n_normal,
            'has_realization': not is_unrealized
        })
        
        for r_i in range(n_rows):
            h_id = str(sub_t['id'].iloc[r_i])
            actual_label = int(sub_t['label'].iloc[r_i]) if not is_unrealized else None
            ws_0 = float(sub_t['q_ws_cum_m3_lag0'].iloc[r_i]) if pd.notna(sub_t['q_ws_cum_m3_lag0'].iloc[r_i]) else 0.0
            clim_0 = float(sub_t['clim_median_now'].iloc[r_i]) if pd.notna(sub_t['clim_median_now'].iloc[r_i]) else 0.0
            
            history_preds_compact.append({
                't_index': t_idx,
                'subdas_id': h_id,
                'basin_id': int(id_to_basin.get(h_id, -1)),
                'score': round(float(scores[r_i]), 4),
                'rank': int(ranks[r_i]),
                'tier': str(tiers[r_i]),
                'typology': str(id_to_typo.get(h_id, 'campuran')),
                'label': actual_label,
                'ws_lag0': round(ws_0, 1),
                'clim_now': round(clim_0, 1)
            })

    # Save realisasi_t166.csv
    realisasi_166_df = pd.DataFrame(labels_t166)
    realisasi_166_df.to_csv(os.path.join(SAMPLES_DIR, 'realisasi_t166.csv'), index=False)
    print(f"Saved {len(realisasi_166_df)} rows to public/samples/realisasi_t166.csv")

    with open(os.path.join(OUT_DIR, 'history_runs_meta.json'), 'w') as f:
        json.dump(history_runs_meta, f, indent=2)
    # Save predictions as parquet for compact size
    pd.DataFrame(history_preds_compact).to_parquet(os.path.join(OUT_DIR, 'history_predictions.parquet'), index=False)
    print(f"Saved 168 history runs meta and {len(history_preds_compact)} compact history predictions")

    print("\n=== Step 4: Generating Global Insights JSON ===")
    # P1: timeline vs calendar
    lr_t = timeline_df['label_rate'].tolist()
    month_t = timeline_df['month'].tolist()
    
    # Label rate per calendar month
    lr_m = train_clean.groupby('month')['label'].mean().reindex(range(1, 13)).to_dict()
    
    # P2: demand bucket risk
    dem0 = (train_clean['q_ir_wd_inc_m3_lag0'] + train_clean['q_th_wd_inc_m3_lag0'] + train_clean['q_ps_wd_inc_m3_lag0']).values
    sup0 = train_clean['q_ws_cum_m3_lag0'].abs().replace(0, np.nan).values
    use = dem0 / sup0
    
    bins = [-np.inf, 1e-9, 0.10, 0.30, 1.0, np.inf]
    names = ['0', '0–10%', '10–30%', '30–100%', '>100%']
    ub = pd.cut(pd.Series(use), bins, labels=names)
    rate_p2 = train_clean['label'].groupby(ub, observed=False).mean().to_dict()
    
    # 1-variable signal
    wsr = (train_clean['q_ws_cum_m3_lag0'] / train_clean['clim_median_next'].abs().replace(0, np.nan)).fillna(1).values
    y_tr = train_clean['label'].values
    sig_anom = float(abs(roc_auc_score(y_tr, -wsr) - 0.5))
    sig_dem = float(abs(roc_auc_score(y_tr, np.nan_to_num(dem0)) - 0.5))
    
    # P3: Persistence and Basin
    lab_p = train_dedup[['id', 't', 'label']].sort_values(['id', 't'])
    lab_p['nxt'] = lab_p.groupby('id')['label'].shift(-1)
    lab_p['t_diff'] = lab_p.groupby('id')['t'].diff(-1)
    valid_nxt = lab_p[lab_p['t_diff'] == -1]
    p_continue = float(valid_nxt.loc[valid_nxt['label'] == 1, 'nxt'].mean())
    p_onset = float(valid_nxt.loc[valid_nxt['label'] == 0, 'nxt'].mean())
    
    # Hulu stress if hilir stress
    dn = train_clean[['origin_id', 'id', 'label']].drop_duplicates(['origin_id', 'id']).rename(columns={'id': 'to_id', 'label': 'down_label'})
    ud = train_clean[['origin_id', 'to_id', 'label']].merge(dn, on=['origin_id', 'to_id'], how='inner')
    p_up_given_down1 = float(ud.loc[ud['down_label'] == 1, 'label'].mean())
    p_up_given_down0 = float(ud.loc[ud['down_label'] == 0, 'label'].mean())
    
    # OOF Operational Metrics
    train_clean['oof_rank'] = train_clean.groupby('origin_id')['oof_score'].rank(ascending=False, pct=True, method='first')
    top10_prec_monthly = train_clean[train_clean['oof_rank'] <= 0.10].groupby('origin_id')['label'].mean().mean()
    tot_pos = train_clean.groupby('origin_id')['label'].sum()
    top30_cov_monthly = (train_clean[train_clean['oof_rank'] <= 0.30].groupby('origin_id')['label'].sum() / tot_pos.clip(lower=1)).mean()
    oof_ap_ensemble = float(average_precision_score(train_clean['label'], train_clean['oof_score']))
    
    # Recall onset vs continuation
    # Use lab_p for onset vs continue recall
    lab_p['prev'] = lab_p.groupby('id')['label'].shift(1)
    lab_p = lab_p.merge(train_clean[['id', 't', 'oof_rank']].drop_duplicates(['id', 't']), on=['id', 't'], how='left')
    lab_p['flag30'] = lab_p['oof_rank'] <= 0.30
    onset_recall = float(lab_p[(lab_p['label'] == 1) & (lab_p['prev'] == 0)]['flag30'].mean())
    continue_recall = float(lab_p[(lab_p['label'] == 1) & (lab_p['prev'] == 1)]['flag30'].mean())
    fn_onset_share = float(((lab_p['label'] == 1) & (~lab_p['flag30']) & (lab_p['prev'] == 0)).sum() / 
                           max(((lab_p['label'] == 1) & (~lab_p['flag30'])).sum(), 1))
    
    insights = {
        'P1': {
            'label_rate_t': [round(x, 4) for x in lr_t],
            'month_t': month_t,
            'label_rate_calendar': {str(k): round(float(v), 4) for k, v in lr_m.items()}
        },
        'P2': {
            'rate_by_demand_supply_bucket': {str(k): round(float(v), 4) for k, v in rate_p2.items()},
            'signal_supply_anom_auc_diff': round(sig_anom, 4),
            'signal_demand_auc_diff': round(sig_dem, 4),
            'risk_ratio_hi_demand': round(rate_p2['>100%'] / float(train_clean['label'].mean()), 2)
        },
        'P3': {
            'p_continue': round(p_continue, 3),
            'p_onset': round(p_onset, 3),
            'p_upstream_if_downstream_stress': round(p_up_given_down1, 3),
            'p_upstream_if_downstream_normal': round(p_up_given_down0, 3)
        },
        'OOF': {
            'precision_siaga_avg': round(float(top10_prec_monthly), 4),
            'coverage_waspada_avg': round(float(top30_cov_monthly), 4),
            'oof_ap_ensemble': round(oof_ap_ensemble, 4),
            'base_rate': round(float(train_clean['label'].mean()), 4),
            'lift_siaga': round(float(top10_prec_monthly / train_clean['label'].mean()), 2),
            'onset_recall': round(onset_recall, 3),
            'continue_recall': round(continue_recall, 3),
            'fn_onset_share': round(fn_onset_share, 3)
        },
        'R4': {
            'n_subdas_hi_demand': int((subdas_df['in_test'] & subdas_df['r4_flag']).sum()),
            'avg_irrigation_share': 0.77
        },
        'LB_JOURNEY': [
            {'version': 'Baseline LightGBM (140 fitur)', 'lb': 0.70000, 'oof': 0.6820},
            {'version': 'V2 Fitur Relatif + Ensemble', 'lb': 0.73500, 'oof': 0.7050},
            {'version': 'V3 · IRIS (Ensemble 7 Final)', 'lb': 0.73944, 'oof': 0.7110},
            {'version': 'Optuna Agresif (overfit CV)', 'lb': 0.73600, 'oof': 0.7130},
            {'version': 'Multi-view Blocked-CV (V5)', 'lb': 0.71000, 'oof': 0.7250},
            {'version': 'Klimatologi Test Diganti Rata-rata Train', 'lb': 0.45400, 'oof': 0.6900}
        ],
        'MEMBERS_TABLE': [
            {'algo': 'LightGBM s42', 'view': 'base 140', 'hp': 'num_leaves=63', 'oof_ap': 0.7061},
            {'algo': 'LightGBM s202', 'view': 'base 140', 'hp': 'num_leaves=95, colsample=0.6', 'oof_ap': 0.7077},
            {'algo': 'XGBoost s42', 'view': 'base 140', 'hp': 'max_depth=7', 'oof_ap': 0.7070},
            {'algo': 'XGBoost s202', 'view': 'base 140', 'hp': 'max_depth=6, colsample=0.6', 'oof_ap': 0.7040},
            {'algo': 'CatBoost s42', 'view': 'base 140', 'hp': 'depth=7', 'oof_ap': 0.7037},
            {'algo': 'LightGBM + Topo + TE', 'view': 'full 157', 'hp': 'num_leaves=127, colsample=0.6', 'oof_ap': 0.7085},
            {'algo': 'XGBoost + Topo + TE', 'view': 'full 157', 'hp': 'max_depth=5', 'oof_ap': 0.7026},
            {'algo': 'IRIS Rank-Blend Final', 'view': 'ensemble 7', 'hp': 'rankdata mean', 'oof_ap': 0.7110}
        ],
        'ABLATIONS_REJECTED': [
            {'name': 'Class weight (is_unbalance)', 'delta_ap': -0.0540, 'reason': 'Merusak ranking kelas minoritas → AP turun tajam'},
            {'name': 'scale_pos_weight', 'delta_ap': -0.0520, 'reason': 'Idem dengan class weight'},
            {'name': '+ Fitur regime lintas-sub-DAS', 'delta_ap': -0.0053, 'reason': 'Base rate periode tidak bisa disimpulkan untuk bulan baru'},
            {'name': '+ 72 lag mentah', 'delta_ap': -0.0025, 'reason': 'Agregat relatif sudah cukup; lag mentah menambah noise'},
            {'name': 'Buang baris duplikat', 'delta_ap': -0.0015, 'reason': 'Duplikat membawa bobot informatif'},
            {'name': '+ Topologi (sbg fitur tunggal)', 'delta_ap': -0.0011, 'reason': 'Netral sendiri → dipakai hanya sbg diversifikasi ensemble'},
            {'name': '+ Target-encoding (tunggal)', 'delta_ap': -0.0007, 'reason': 'Idem dengan topologi'},
            {'name': 'GroupKFold biasa vs Stratified', 'delta_ap': -0.0027, 'reason': 'Fold tak seimbang → early stopping bising'},
            {'name': 'Soft label dari SRI bulan depan', 'delta_ap': -0.0160, 'reason': 'Blocked-CV; target kontinu tidak menambah informasi'},
            {'name': 'Repeated-CV 2×5 (diterima)', 'delta_ap': +0.0018, 'reason': 'Menstabilkan seleksi ensemble'}
        ]
    }
    
    with open(os.path.join(OUT_DIR, 'insights.json'), 'w') as f:
        json.dump(insights, f, indent=2)
    print("Saved ml/out/insights.json")

    print("\n=== Seed Data Generation Completed Successfully! ===")

if __name__ == '__main__':
    main()
