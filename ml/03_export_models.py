import os, sys, time, json, struct, hashlib
import numpy as np
import pandas as pd
import lightgbm as lgb
from scipy.special import logit

sys.path.append(os.path.dirname(__file__))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), 'out'))
RAW_MODELS_DIR = os.path.join(OUT_DIR, 'serving_models')
MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'models'))
os.makedirs(MODELS_DIR, exist_ok=True)

with open(os.path.join(OUT_DIR, 'feature_columns.json')) as f:
    FEATURE_COLS = json.load(f)

def export_lgb(model_txt_path, out_bin_path, expected_features):
    booster = lgb.Booster(model_file=model_txt_path)
    dump = booster.dump_model()
    fnames = dump['feature_names']
    assert fnames == expected_features, f"Feature mismatch in LGB: {len(fnames)} vs {len(expected_features)}"
    
    trees = dump['tree_info']
    num_trees = len(trees)
    num_features = len(fnames)
    
    # Flatten trees
    tree_offsets = []
    flat_nodes = []
    
    for t_idx, tree in enumerate(trees):
        tree_offsets.append(len(flat_nodes))
        
        # Traverse tree recursively and allocate sequential node indices
        def add_node(node):
            node_idx = len(flat_nodes)
            flat_nodes.append(None) # placeholder
            
            if 'leaf_value' in node:
                flat_nodes[node_idx] = {
                    'feat': -1,
                    'flags': 1, # bit 0: is_leaf
                    'left': -1,
                    'right': -1,
                    'threshold': 0.0,
                    'leaf_value': float(node['leaf_value'])
                }
            else:
                f_idx = node['split_feature']
                thr = float(node['threshold'])
                d_left = 1 if node.get('default_left', True) else 0
                
                # In LightGBM: <= threshold -> left
                left_idx = add_node(node['left_child'])
                right_idx = add_node(node['right_child'])
                
                flags = (d_left << 1) # bit 0=0 (not leaf), bit 1=d_left, bit 2=0 (<=)
                flat_nodes[node_idx] = {
                    'feat': f_idx,
                    'flags': flags,
                    'left': left_idx,
                    'right': right_idx,
                    'threshold': thr,
                    'leaf_value': 0.0
                }
            return node_idx
            
        add_node(tree['tree_structure'])
        
    total_nodes = len(flat_nodes)
    
    # Write binary file
    # Header: magic (4s), algo (B), num_trees (I), num_features (I), base_score_logit (d), total_nodes (I)
    buf = bytearray()
    buf.extend(struct.pack('=4sB I I d I', b'TR01', 0, num_trees, num_features, 0.0, total_nodes))
    # Tree offsets
    for off in tree_offsets:
        buf.extend(struct.pack('=I', off))
    # Nodes: feat (h), flags (B), pad (B), left (i), right (i), thr (d), leaf (d)
    for n in flat_nodes:
        buf.extend(struct.pack('=hBBii dd', n['feat'], n['flags'], 0, n['left'], n['right'], n['threshold'], n['leaf_value']))
        
    with open(out_bin_path, 'wb') as f:
        f.write(buf)
        
    return {
        'num_trees': num_trees,
        'num_features': num_features,
        'total_nodes': total_nodes,
        'file_size': len(buf)
    }

def export_xgb(model_json_path, out_bin_path, expected_features):
    with open(model_json_path) as f:
        xgb_d = json.load(f)
    fnames = xgb_d['learner']['feature_names']
    assert fnames == expected_features, f"Feature mismatch in XGB: {len(fnames)} vs {len(expected_features)}"
    
    base_score = float(xgb_d['learner']['learner_model_param']['base_score'])
    base_logit = float(logit(base_score))
    
    trees = xgb_d['learner']['gradient_booster']['model']['trees']
    num_trees = len(trees)
    num_features = len(fnames)
    
    tree_offsets = []
    flat_nodes = []
    
    for tree in trees:
        tree_offsets.append(len(flat_nodes))
        start_offset = len(flat_nodes)
        
        left = tree['left_children']
        right = tree['right_children']
        f_idx = tree['split_indices']
        cond = tree['split_conditions']
        d_left = tree['default_left']
        n_tree_nodes = len(left)
        
        for k in range(n_tree_nodes):
            is_leaf = (left[k] == -1)
            if is_leaf:
                flat_nodes.append({
                    'feat': -1,
                    'flags': 1, # bit 0: is_leaf
                    'left': -1,
                    'right': -1,
                    'threshold': 0.0,
                    'leaf_value': float(cond[k])
                })
            else:
                dl = 1 if d_left[k] else 0
                flags = 4 | (dl << 1) # bit 0=0 (not leaf), bit 1=dl, bit 2=1 (< is_less_than)
                flat_nodes.append({
                    'feat': int(f_idx[k]),
                    'flags': flags,
                    'left': start_offset + left[k],
                    'right': start_offset + right[k],
                    'threshold': float(cond[k]),
                    'leaf_value': 0.0
                })
                
    total_nodes = len(flat_nodes)
    
    buf = bytearray()
    buf.extend(struct.pack('=4sB I I d I', b'TR01', 1, num_trees, num_features, base_logit, total_nodes))
    for off in tree_offsets:
        buf.extend(struct.pack('=I', off))
    for n in flat_nodes:
        buf.extend(struct.pack('=hBBii dd', n['feat'], n['flags'], 0, n['left'], n['right'], n['threshold'], n['leaf_value']))
        
    with open(out_bin_path, 'wb') as f:
        f.write(buf)
        
    return {
        'num_trees': num_trees,
        'num_features': num_features,
        'total_nodes': total_nodes,
        'file_size': len(buf)
    }

def export_cat(model_json_path, out_bin_path, expected_features):
    with open(model_json_path) as f:
        cat_d = json.load(f)
    fnames = [f['feature_id'] for f in cat_d['features_info']['float_features']]
    assert fnames == expected_features, f"Feature mismatch in Cat: {len(fnames)} vs {len(expected_features)}"
    
    scale = float(cat_d['scale_and_bias'][0])
    bias = float(cat_d['scale_and_bias'][1][0])
    ob_trees = cat_d['oblivious_trees']
    num_trees = len(ob_trees)
    num_features = len(fnames)
    
    buf = bytearray()
    # Header: magic (4s), num_trees (I), num_features (I), scale (d), bias (d)
    buf.extend(struct.pack('=4s I I d d', b'CB01', num_trees, num_features, scale, bias))
    
    for t in ob_trees:
        splits = t['splits']
        depth = len(splits)
        leaves = t['leaf_values']
        assert len(leaves) == (1 << depth)
        
        # Depth
        buf.extend(struct.pack('=B', depth))
        # Splits: feat (h), border (f)
        for s in splits:
            f_idx = int(s['float_feature_index'])
            border = float(s['border'])
            buf.extend(struct.pack('=h f', f_idx, border))
        # Leaf values: float32 * 2^depth
        for lv in leaves:
            buf.extend(struct.pack('=f', float(lv)))
            
    with open(out_bin_path, 'wb') as f:
        f.write(buf)
        
    return {
        'num_trees': num_trees,
        'num_features': num_features,
        'total_leaves': sum(len(t['leaf_values']) for t in ob_trees),
        'file_size': len(buf)
    }

def verify_bin_evaluator(bin_path, X_sample):
    with open(bin_path, 'rb') as f:
        data = f.read()
        
    magic = data[:4]
    if magic == b'TR01':
        # Decision tree
        algo, num_trees, num_features, base_logit, total_nodes = struct.unpack_from('=B I I d I', data, 4)
        offset = 4 + struct.calcsize('=B I I d I')
        tree_offsets = struct.unpack_from(f'={num_trees}I', data, offset)
        offset += num_trees * 4
        
        # Nodes
        node_fmt = '=hBBii dd'
        node_size = struct.calcsize(node_fmt)
        nodes = []
        for _ in range(total_nodes):
            feat, flags, pad, left, right, thr, leaf = struct.unpack_from(node_fmt, data, offset)
            nodes.append((feat, flags, left, right, thr, leaf))
            offset += node_size
            
        preds = np.full(len(X_sample), base_logit, dtype=np.float64)
        for t_off in tree_offsets:
            for row_i in range(len(X_sample)):
                curr = t_off
                row = X_sample[row_i]
                while True:
                    feat, flags, left, right, thr, leaf = nodes[curr]
                    if flags & 1: # is_leaf
                        preds[row_i] += leaf
                        break
                    d_left = (flags & 2) != 0
                    is_lt = (flags & 4) != 0
                    if algo == 0: # LGB: double
                        val = float(row[feat])
                        if np.isnan(val):
                            curr = left if d_left else right
                        else:
                            curr = left if (val <= thr) else right
                    else: # XGB: float32
                        val = np.float32(row[feat])
                        thr32 = np.float32(thr)
                        if np.isnan(val):
                            curr = left if d_left else right
                        else:
                            curr = left if (val < thr32) else right
        return preds
        
    elif magic == b'CB01':
        num_trees, num_features, scale, bias = struct.unpack_from('=I I d d', data, 4)
        offset = 4 + struct.calcsize('=I I d d')
        
        preds = np.zeros(len(X_sample), dtype=np.float64)
        for _ in range(num_trees):
            depth = data[offset]
            offset += 1
            splits = []
            for _ in range(depth):
                f_idx, border = struct.unpack_from('=h f', data, offset)
                splits.append((f_idx, border))
                offset += struct.calcsize('=h f')
            n_leaves = 1 << depth
            leaves = struct.unpack_from(f'={n_leaves}f', data, offset)
            offset += n_leaves * 4
            
            for row_i in range(len(X_sample)):
                row = X_sample[row_i]
                idx = 0
                for s_i, (f_idx, border) in enumerate(splits):
                    val = row[f_idx]
                    bit = 1 if (np.isfinite(val) and val > border) else 0
                    idx |= (bit << s_i)
                preds[row_i] += leaves[idx]
                
        preds = preds * scale + bias
        return preds
    else:
        raise ValueError(f"Unknown magic: {magic}")

def compute_checksum(filepath):
    h = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def main():
    print("=== Step 1: Exporting 7 Serving Models to Binary Format ===")
    manifest = {
        'model_version': 'iris-serving-v1',
        'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'views': {
            'base': FEATURE_COLS['base_140'],
            'full_te': FEATURE_COLS['full_te_157']
        },
        'members': []
    }
    
    # Load 300 test rows for parity check
    test_clean = pd.read_parquet(os.path.join(OUT_DIR, 'test_clean.parquet'))
    Xte_base = pd.read_parquet(os.path.join(OUT_DIR, 'Xte.parquet')).iloc[:300].values.astype(np.float32)
    Xte_full = pd.read_parquet(os.path.join(OUT_DIR, 'Xte_full.parquet')).iloc[:300]
    with open(os.path.join(MODELS_DIR, 'te_tables.json')) as f:
        te_tables = json.load(f)
    from common import apply_te_tables
    TE_te = apply_te_tables(test_clean.iloc[:300], te_tables)
    Xte_full_te = pd.concat([Xte_full, TE_te], axis=1).values.astype(np.float32)
    
    total_size_bytes = 0
    
    for i in range(1, 8):
        m_id = f"m{i}"
        if i in [1, 2]:
            algo, view, fname = 'lgb', 'base', f"m{i}_lgb"
            raw_path = os.path.join(RAW_MODELS_DIR, f"{fname}.txt")
            bin_path = os.path.join(MODELS_DIR, f"{fname}.bin")
            expected_cols = FEATURE_COLS['base_140']
            X_sample = Xte_base
            stats = export_lgb(raw_path, bin_path, expected_cols)
            
            # Verify vs raw LightGBM predict
            booster = lgb.Booster(model_file=raw_path)
            raw_preds = booster.predict(X_sample, raw_score=True)
            
        elif i in [3, 4]:
            algo, view, fname = 'xgb', 'base', f"m{i}_xgb"
            raw_path = os.path.join(RAW_MODELS_DIR, f"{fname}.json")
            bin_path = os.path.join(MODELS_DIR, f"{fname}.bin")
            expected_cols = FEATURE_COLS['base_140']
            X_sample = Xte_base
            stats = export_xgb(raw_path, bin_path, expected_cols)
            
            import xgboost as xgb
            booster = xgb.Booster()
            booster.load_model(raw_path)
            raw_preds = booster.predict(xgb.DMatrix(X_sample, feature_names=expected_cols), output_margin=True)
            
        elif i == 5:
            algo, view, fname = 'cat', 'base', f"m{i}_cat"
            raw_path = os.path.join(RAW_MODELS_DIR, f"{fname}.json")
            bin_path = os.path.join(MODELS_DIR, f"{fname}.bin")
            expected_cols = FEATURE_COLS['base_140']
            X_sample = Xte_base
            stats = export_cat(raw_path, bin_path, expected_cols)
            
            from catboost import CatBoostClassifier
            cb = CatBoostClassifier()
            cb.load_model(raw_path, format='json')
            raw_preds = cb.predict(X_sample, prediction_type='RawFormulaVal')
            
        elif i == 6:
            algo, view, fname = 'lgb', 'full_te', f"m{i}_lgb"
            raw_path = os.path.join(RAW_MODELS_DIR, f"{fname}.txt")
            bin_path = os.path.join(MODELS_DIR, f"{fname}.bin")
            expected_cols = FEATURE_COLS['full_te_157']
            X_sample = Xte_full_te
            stats = export_lgb(raw_path, bin_path, expected_cols)
            
            booster = lgb.Booster(model_file=raw_path)
            raw_preds = booster.predict(X_sample, raw_score=True)
            
        elif i == 7:
            algo, view, fname = 'xgb', 'full_te', f"m{i}_xgb"
            raw_path = os.path.join(RAW_MODELS_DIR, f"{fname}.json")
            bin_path = os.path.join(MODELS_DIR, f"{fname}.bin")
            expected_cols = FEATURE_COLS['full_te_157']
            X_sample = Xte_full_te
            stats = export_xgb(raw_path, bin_path, expected_cols)
            
            import xgboost as xgb
            booster = xgb.Booster()
            booster.load_model(raw_path)
            raw_preds = booster.predict(xgb.DMatrix(X_sample, feature_names=expected_cols), output_margin=True)
            
        # Verify binary evaluation matches Python predict
        bin_preds = verify_bin_evaluator(bin_path, X_sample)
        max_abs_err = np.max(np.abs(bin_preds - raw_preds))
        print(f"[{i}/7] {fname}.bin | size: {stats['file_size']/1024:.1f} KB | trees: {stats['num_trees']} | max verification err: {max_abs_err:.2e}")
        assert max_abs_err < 1e-4, f"Verification error too high for {fname}: {max_abs_err}"
        
        checksum = compute_checksum(bin_path)
        total_size_bytes += stats['file_size']
        
        manifest['members'].append({
            'index': i,
            'name': fname,
            'algo': algo,
            'view': view,
            'num_features': len(expected_cols),
            'filename': f"{fname}.bin",
            'num_trees': stats['num_trees'],
            'file_size_bytes': stats['file_size'],
            'sha256': checksum
        })

    manifest_path = os.path.join(MODELS_DIR, 'manifest.json')
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)
        
    print(f"\nSaved models/manifest.json")
    print(f"Total size of all 7 binary models: {total_size_bytes / (1024*1024):.2f} MB (target < 60 MB)")
    assert total_size_bytes < 60 * 1024 * 1024, "Total size exceeded 60 MB!"
    print("=== Binary Model Export Completed Successfully! ===")

if __name__ == '__main__':
    main()
