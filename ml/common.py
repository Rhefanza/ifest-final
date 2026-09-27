import os, sys, time, warnings, json
import numpy as np
import pandas as pd
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components

MONTHS = {'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
          'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12}

def norm_month(s):
    s = s.astype('string').str.strip().str.lower()
    return pd.to_numeric(s, errors='coerce').fillna(s.str[:3].map(MONTHS))

def parse_num_col(s):
    # 'a,b.c' -> koma ribuan ; 'a,b' -> desimal ATAU ribuan, dipilih yang skalanya paling dekat median kolom
    s = s.astype('string').str.strip()
    has_c = s.str.contains(',', na=False); has_d = s.str.contains('.', regex=False, na=False)
    dec = s.mask(has_c & has_d, s.str.replace(',', '', regex=False))
    clean = pd.to_numeric(dec.where(~has_c), errors='coerce')
    ref = np.nanmedian(np.abs(clean[clean != 0])) if np.isfinite(clean).any() else np.nan
    onlyc = has_c & ~has_d
    as_dec = pd.to_numeric(dec.where(onlyc).str.replace(',', '.', regex=False), errors='coerce')
    as_tho = pd.to_numeric(dec.where(onlyc).str.replace(',', '', regex=False), errors='coerce')
    if np.isfinite(ref) and ref > 0:
        dd = np.abs(np.log10(as_dec.abs() + 1e-9) - np.log10(ref))
        dt = np.abs(np.log10(as_tho.abs() + 1e-9) - np.log10(ref))
        pick = np.where((dt < dd) & as_tho.notna(), as_tho, as_dec)
    else:
        pick = as_dec.values
    out = pd.to_numeric(dec, errors='coerce').where(~onlyc, pd.Series(pick, index=s.index))
    return out.astype('float32')

def norm_ids(s):
    t = s.astype('string').str.strip()
    return pd.Series(np.where(t.str.upper() == 'OUTLET', 'OUTLET', t.str.lower()), index=s.index)

def load(path, is_train=True):
    df = pd.read_csv(path, index_col=(0 if is_train else None), dtype=str)
    aux = [c for c in df.columns if c.startswith('aux_')]
    core = [c for c in df.columns if c not in ['id', 'to_id', 'origin_id', 'month', 'row_id', 'label'] + aux]
    
    # Audit metrics
    comma_cells = int(sum(df[c].str.contains(',', na=False).sum() for c in core))
    total_cells = len(df) * len(core)
    month_variants = int(df['month'].str.strip().nunique())
    to_id_dirty = int(((df['to_id'] != df['to_id'].str.strip()) |
                        ((df['to_id'].str.strip().str.upper() != 'OUTLET') & 
                         (df['to_id'].str.strip() != df['to_id'].str.strip().str.lower()))).sum())
    
    out = {'id': norm_ids(df['id']), 'to_id': norm_ids(df['to_id']),
           'origin_id': pd.to_numeric(df['origin_id']).astype('int32'),
           'month': norm_month(df['month']).astype('float32')}
    if 'row_id' in df:
        out['row_id'] = pd.to_numeric(df['row_id']).astype('int32')
    for c in core:
        out[c] = parse_num_col(df[c])
    if 'label' in df:
        out['label'] = pd.to_numeric(df['label']).astype('int8')
        
    res = pd.DataFrame(out)
    nan_after_parse = float(res[core].isna().mean().mean())
    audit = {
        'comma_cells': comma_cells,
        'cells': total_cells,
        'comma_rate': comma_cells / max(total_cells, 1),
        'month_variants': month_variants,
        'to_id_dirty': to_id_dirty,
        'aux_cols': aux,
        'nan_after_parse': nan_after_parse
    }
    aux_df = df[aux].copy() if len(aux) > 0 else None
    return res, audit, aux_df

# --- Timeline reconstruction ---
FAMS3 = ['q_bf_inc_m3', 'q_qf_inc_m3', 'q_ws_cum_m3']
def _lag_keys(d, L):
    f = d[['id'] + [f'{p}_lag{L}' for p in FAMS3]].copy()
    ok = f.iloc[:, 1:].notna().all(1).values
    for c in f.columns[1:]:
        f[c] = f[c].astype('float64').round(0)
    return pd.util.hash_pandas_object(f, index=False).values[ok], d['origin_id'].values[ok]

def reconstruct_timeline(df):
    d = df.drop_duplicates(['id', 'origin_id'])
    k0, o0 = _lag_keys(d, 0); k1, o1 = _lag_keys(d, 1)
    A = pd.DataFrame({'k': k0, 'o_a': o0}); A = A[~A['k'].duplicated(keep=False)]
    j = A.merge(pd.DataFrame({'k': k1, 'o_b': o1}), on='k'); j = j[j.o_a != j.o_b]
    v = j.groupby(['o_a', 'o_b']).size().reset_index(name='n').sort_values('n', ascending=False)
    v = v[v.n >= 0.25 * v.n.max()].drop_duplicates('o_a').drop_duplicates('o_b')
    nxt = dict(zip(v.o_a, v.o_b)); prv = {b: a for a, b in nxt.items()}
    chains = []
    for s in [o for o in d['origin_id'].unique() if o not in prv]:
        c = [s]
        while c[-1] in nxt and len(c) <= d['origin_id'].nunique():
            c.append(nxt[c[-1]])
        chains.append(c)
    return sorted(chains, key=len, reverse=True), v

# --- Basin graph construction ---
def build_basins(train_df, test_df):
    nodes = pd.Index(pd.concat([train_df['id'], test_df['id'], train_df['to_id'], test_df['to_id']]).unique()).drop('OUTLET', errors='ignore')
    E = pd.concat([train_df[['id', 'to_id']], test_df[['id', 'to_id']]]).drop_duplicates()
    E = E[E.to_id != 'OUTLET']
    ei, ej = nodes.get_indexer(E['id']), nodes.get_indexer(E['to_id'])
    _, comp = connected_components(coo_matrix((np.ones(len(ei)), (ei, ej)), shape=(len(nodes), len(nodes))), directed=False)
    BASIN = pd.Series(comp, index=nodes)
    return BASIN, nodes

# --- Feature Engineering ---
FAMS = {'bf': 'q_bf_inc_m3', 'qf': 'q_qf_inc_m3', 'ws': 'q_ws_cum_m3',
        'ir': 'q_ir_wd_inc_m3', 'th': 'q_th_wd_inc_m3', 'ps': 'q_ps_wd_inc_m3'}
_t = np.arange(12)[::-1].astype('float64'); _tc = _t - _t.mean(); _St = (_tc ** 2).sum()

def _rowstats(M, p, out):
    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        rowmean = np.nan_to_num(np.nanmean(M, axis=1, keepdims=True), nan=0.0)
    Mf = np.nan_to_num(np.where(np.isnan(M), rowmean, M), nan=0.0)
    mean = Mf.mean(1); std = Mf.std(1); mn = Mf.min(1); mx = Mf.max(1)
    last = Mf[:, 0]; oldest = Mf[:, 11]; recent3 = Mf[:, :3].mean(1); older6 = Mf[:, 6:].mean(1)
    slope = (Mf * _tc).sum(1) / _St; eps = 1.0
    out[f'{p}_mean'] = mean; out[f'{p}_std'] = std; out[f'{p}_min'] = mn; out[f'{p}_max'] = mx; out[f'{p}_range'] = mx - mn
    out[f'{p}_last'] = last; out[f'{p}_slope'] = slope; out[f'{p}_yoy'] = last - oldest; out[f'{p}_last_vs_mean'] = last - mean
    out[f'{p}_z_last'] = (last - mean) / (std + eps); out[f'{p}_drawdown'] = last - mx
    out[f'{p}_last_over_mean'] = last / (np.abs(mean) + eps)
    out[f'{p}_recent3'] = recent3; out[f'{p}_recent_vs_base'] = recent3 - older6
    out[f'{p}_pct_last'] = (Mf <= last[:, None]).sum(1) / 12.0
    dec = (Mf[:, :-1] < Mf[:, 1:]); streak = np.zeros(len(Mf)); run = np.ones(len(Mf), bool)
    for j in range(dec.shape[1]):
        run = run & dec[:, j]; streak += run
    out[f'{p}_decl_streak'] = streak
    return Mf

def add_features(df):
    out = {}; filled = {}
    for k, pref in FAMS.items():
        filled[k] = _rowstats(df[[f'{pref}_lag{i}' for i in range(12)]].to_numpy('float64'), k, out)
    F = pd.DataFrame(out, index=df.index); eps = 1.0
    sup = filled['bf'] + filled['qf']; dem = filled['ir'] + filled['th'] + filled['ps']; deficit = dem - sup
    
    # neraca air: suplai vs demand
    F['supply_last'] = sup[:, 0]; F['demand_last'] = dem[:, 0]
    F['supply_mean'] = sup.mean(1); F['demand_mean'] = dem.mean(1)
    F['deficit_last'] = deficit[:, 0]; F['deficit_mean'] = deficit.mean(1)
    F['deficit_sum'] = deficit.sum(1); F['deficit_max'] = deficit.max(1)
    F['use_ratio_last'] = dem[:, 0] / (np.abs(sup[:, 0]) + eps)
    F['use_ratio_mean'] = dem.mean(1) / (np.abs(sup.mean(1)) + eps)
    F['supply_slope'] = (sup * _tc).sum(1) / _St
    F['supply_z_last'] = (sup[:, 0] - sup.mean(1)) / (sup.std(1) + eps)
    for k in ['ir', 'th', 'ps']:
        F[f'{k}_share'] = filled[k][:, 0] / (dem[:, 0] + eps)
        
    # anomali terhadap klimatologi
    cn = df['clim_median_now'].to_numpy('float64'); cx = df['clim_median_next'].to_numpy('float64')
    ws = filled['ws'][:, 0]
    F['clim_now'] = cn; F['clim_next'] = cx; F['clim_drop'] = cx - cn; F['clim_ratio'] = cx / (np.abs(cn) + eps)
    F['supply_vs_clim'] = sup[:, 0] - cn; F['supply_clim_ratio'] = sup[:, 0] / (np.abs(cn) + eps)
    F['ws_vs_clim'] = ws - cn; F['ws_clim_ratio'] = ws / (np.abs(cn) + eps)
    F['ws_vs_climnext'] = ws - cx; F['ws_climnext_ratio'] = ws / (np.abs(cx) + eps)
    F['supply_vs_climnext'] = sup[:, 0] - cx
    F['clim_next_rel_supplymean'] = cx / (np.abs(sup.mean(1)) + eps)
    
    # musim
    m = df['month'].to_numpy('float64'); tm = (m % 12) + 1
    F['month'] = m; F['target_month'] = tm
    F['month_sin'] = np.sin(2 * np.pi * m / 12); F['month_cos'] = np.cos(2 * np.pi * m / 12)
    F['tmonth_sin'] = np.sin(2 * np.pi * tm / 12); F['tmonth_cos'] = np.cos(2 * np.pi * tm / 12)
    
    # statis
    for c in ['inc_aream2', 'cum_aream2', 'pop_dec_2000', 'pop_dec_2010', 'pop_dec_2020', 'pop_acs_2020']:
        F[c] = df[c].to_numpy('float64')
    F['pop_growth'] = (df['pop_dec_2020'] - df['pop_dec_2000']).to_numpy('float64')
    F['area_ratio'] = (df['cum_aream2'] / (df['inc_aream2'].abs() + eps)).to_numpy('float64')
    F['pop_density'] = (df['pop_acs_2020'] / (df['inc_aream2'].abs() + eps)).to_numpy('float64')
    inc = np.abs(F['inc_aream2'].to_numpy()) + eps
    F['supply_per_area'] = sup[:, 0] / inc
    F['demand_per_area'] = dem[:, 0] / inc
    return F.replace([np.inf, -np.inf], np.nan).astype('float32')

def topo_features(df):
    eps = 1.0
    base = pd.DataFrame({'pos': np.arange(len(df)), 'id': df['id'].values, 'to_id': df['to_id'].values, 'origin_id': df['origin_id'].values,
                         'supply': (df['q_bf_inc_m3_lag0'] + df['q_qf_inc_m3_lag0']).values,
                         'demand': (df['q_ir_wd_inc_m3_lag0'] + df['q_th_wd_inc_m3_lag0'] + df['q_ps_wd_inc_m3_lag0']).values,
                         'clim': df['clim_median_now'].values})
    base['deficit'] = base['demand'] - base['supply']
    out = {'is_outlet': (base['to_id'].values == 'OUTLET').astype('float32')}
    up = base.groupby(['origin_id', 'to_id']).agg(up_n=('id', 'size'), up_supply_sum=('supply', 'sum'), up_demand_sum=('demand', 'sum'),
                                                  up_deficit_sum=('deficit', 'sum'), up_supply_mean=('supply', 'mean')).reset_index().rename(columns={'to_id': 'id'})
    um = base[['pos', 'id', 'origin_id']].merge(up, on=['id', 'origin_id'], how='left').sort_values('pos')
    for c in ['up_n', 'up_supply_sum', 'up_demand_sum', 'up_deficit_sum', 'up_supply_mean']:
        out[c] = um[c].values
    out['up_n'] = np.nan_to_num(out['up_n'], nan=0.0)
    out['up_supply_rel'] = out['up_supply_sum'] / (np.abs(base['supply'].values) + eps)
    out['up_deficit_rel'] = out['up_deficit_sum'] / (np.abs(base['supply'].values) + eps)
    down = base[['origin_id', 'id', 'supply', 'demand', 'deficit', 'clim']].rename(
        columns={'id': 'to_id', 'supply': 'down_supply', 'demand': 'down_demand',
                 'deficit': 'down_deficit', 'clim': 'down_clim'}).drop_duplicates(['origin_id', 'to_id'])
    dm = base[['pos', 'to_id', 'origin_id']].merge(down, on=['to_id', 'origin_id'], how='left').sort_values('pos')
    for c in ['down_supply', 'down_demand', 'down_deficit', 'down_clim']:
        out[c] = dm[c].values
    out['supply_vs_down'] = base['supply'].values - out['down_supply']
    out['supply_down_ratio'] = base['supply'].values / (np.abs(out['down_supply']) + eps)
    return pd.DataFrame(out, index=df.index).astype('float32')

# --- Target Encoding ---
ALPHA = {'id': 20, 'to_id': 20, 'month': 50}

def build_te_tables(train_df, y):
    gm = float(np.mean(y))
    tables = {'global_mean': gm, 'alpha': ALPHA, 'id': {}, 'to_id': {}, 'month': {}}
    for col in ['id', 'to_id', 'month']:
        k = train_df[col].values
        s = pd.DataFrame({'k': k, 'y': y}).groupby('k')['y'].agg(['mean', 'count'])
        a = ALPHA[col]
        enc = ((s['mean'] * s['count'] + gm * a) / (s['count'] + a)).to_dict()
        # Ensure string keys for JSON serialization
        tables[col] = {str(k_): float(v_) for k_, v_ in enc.items()}
    return tables

def apply_te_tables(df, tables):
    gm = tables['global_mean']
    cols = {}
    for col in ['id', 'to_id', 'month']:
        enc = tables[col]
        # In df, col may be string or numeric. Map using str(x)
        s = pd.Series(df[col].values).astype(str).map(enc).fillna(gm)
        cols[f'te_{col}'] = s.values.astype('float32')
    return pd.DataFrame(cols, index=df.index)
