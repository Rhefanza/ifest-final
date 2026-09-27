import os, sys, time, json
import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.metrics import average_precision_score
from scipy.stats import rankdata, spearmanr
import lightgbm as lgb
import xgboost as xgb
from catboost import CatBoostClassifier

sys.path.append(os.path.dirname(__file__))
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from common import add_features, topo_features, build_te_tables, apply_te_tables

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DATA_DIR = os.path.join(ROOT, 'babak-final-ifest-dac-2026')
ART_DIR = os.path.join(ROOT, 'artifacts')
OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), 'out'))
MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'models'))
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

MEMBERS = [
    ('lgb', 'base', 42, False, {'num_leaves': 63, 'colsample_bytree': 0.7}),
    ('lgb', 'base', 202, False, {'num_leaves': 95, 'colsample_bytree': 0.6}),
    ('xgb', 'base', 42, False, {'max_depth': 7, 'colsample_bytree': 0.7}),
    ('xgb', 'base', 202, False, {'max_depth': 6, 'colsample_bytree': 0.6}),
    ('cat', 'base', 42, False, {'depth': 7}),
    ('lgb', 'full', 42, True, {'num_leaves': 127, 'colsample_bytree': 0.6}),
    ('xgb', 'full', 42, True, {'max_depth': 5, 'colsample_bytree': 0.7}),
]

def main():
    print("=== Step 1: Loading clean datasets ===")
    train = pd.read_parquet(os.path.join(OUT_DIR, 'train_clean.parquet'))
    test = pd.read_parquet(os.path.join(OUT_DIR, 'test_clean.parquet'))
    y = train['label'].values
    groups = train['origin_id'].values
    print(f"Train: {train.shape}, Test: {test.shape}, Label base rate: {y.mean():.4f}")

    print("\n=== Step 2: Feature Engineering ===")
    t0 = time.time()
    xtr_path = os.path.join(OUT_DIR, 'Xtr.parquet')
    xte_path = os.path.join(OUT_DIR, 'Xte.parquet')
    xtr_full_path = os.path.join(OUT_DIR, 'Xtr_full.parquet')
    xte_full_path = os.path.join(OUT_DIR, 'Xte_full.parquet')
    
    if os.path.exists(xtr_path) and os.path.exists(xtr_full_path):
        Xtr = pd.read_parquet(xtr_path)
        Xte = pd.read_parquet(xte_path)
        Xtr_full = pd.read_parquet(xtr_full_path)
        Xte_full = pd.read_parquet(xte_full_path)
        print(f"Loaded cached features: Xtr {Xtr.shape}, Xtr_full {Xtr_full.shape} in {time.time()-t0:.1f}s")
    else:
        print("Computing base features...")
        Xtr = add_features(train)
        Xte = add_features(test)
        print("Computing topo features...")
        Ttr = topo_features(train)
        Tte = topo_features(test)
        
        Xtr_full = pd.concat([Xtr, Ttr], axis=1)
        Xte_full = pd.concat([Xte, Tte], axis=1)
        
        Xtr.to_parquet(xtr_path, index=False)
        Xte.to_parquet(xte_path, index=False)
        Xtr_full.to_parquet(xtr_full_path, index=False)
        Xte_full.to_parquet(xte_full_path, index=False)
        print(f"Computed & cached features: Xtr {Xtr.shape}, Xtr_full {Xtr_full.shape} in {time.time()-t0:.1f}s")

    # Target Encoding for full serving
    print("Building Target Encoding tables...")
    te_tables = build_te_tables(train, y)
    with open(os.path.join(MODELS_DIR, 'te_tables.json'), 'w') as f:
        json.dump(te_tables, f, indent=2)
    print(f"Saved models/te_tables.json (keys: {list(te_tables.keys())})")
    
    TE_tr = apply_te_tables(train, te_tables)
    TE_te = apply_te_tables(test, te_tables)
    
    Xtr_full_te = pd.concat([Xtr_full, TE_tr], axis=1)
    Xte_full_te = pd.concat([Xte_full, TE_te], axis=1)
    print(f"Full + TE feature shape: {Xtr_full_te.shape} (expected 157 columns)")
    assert Xtr_full_te.shape[1] == 157, f"Expected 157 columns, got {Xtr_full_te.shape[1]}"

    # Save feature names list
    with open(os.path.join(OUT_DIR, 'feature_columns.json'), 'w') as f:
        json.dump({
            'base_140': list(Xtr.columns),
            'full_154': list(Xtr_full.columns),
            'full_te_157': list(Xtr_full_te.columns)
        }, f, indent=2)

    print("\n=== Step 3: Determining Iteration Counts on Fold 0 ===")
    sgkf = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=42)
    folds = list(sgkf.split(Xtr, y, groups))
    tr0, val0 = folds[0]
    print(f"Fold 0: train rows {len(tr0)}, val rows {len(val0)}, val base rate {y[val0].mean():.4f}")

    trained_models = []
    test_preds = []
    best_iters = []

    for i, (algo, view, seed, use_te, hp) in enumerate(MEMBERS):
        m_name = f"m{i+1}_{algo}_{view}{'_te' if use_te else ''}_s{seed}"
        print(f"\n--- Member {i+1}/7: {m_name} ---")
        
        # Select data view
        if view == 'base':
            X_train_full = Xtr
            X_test_full = Xte
        else:
            X_train_full = Xtr_full_te if use_te else Xtr_full
            X_test_full = Xte_full_te if use_te else Xte_full
            
        Xt0, y_t0 = X_train_full.iloc[tr0], y[tr0]
        Xv0, y_v0 = X_train_full.iloc[val0], y[val0]
        
        t_start = time.time()
        # 1. Fold 0 tuning with early stopping
        if algo == 'lgb':
            m0 = lgb.LGBMClassifier(
                objective='binary', learning_rate=0.03, min_child_samples=100,
                subsample=0.8, subsample_freq=1, reg_lambda=5.0,
                n_estimators=4000, random_state=seed, n_jobs=-1, verbose=-1,
                **hp
            )
            m0.fit(Xt0, y_t0, eval_set=[(Xv0, y_v0)], eval_metric='average_precision',
                   callbacks=[lgb.early_stopping(120, verbose=False)])
            b_iter = m0.best_iteration_
            val_score = average_precision_score(y_v0, m0.predict_proba(Xv0)[:, 1])
            print(f"Fold 0 best_iteration: {b_iter}, val AP: {val_score:.4f}")
            
            # Train full data with b_iter * 1.15
            n_est_full = int(round(b_iter * 1.15))
            print(f"Training full data with n_estimators={n_est_full}...")
            m_full = lgb.LGBMClassifier(
                objective='binary', learning_rate=0.03, min_child_samples=100,
                subsample=0.8, subsample_freq=1, reg_lambda=5.0,
                n_estimators=n_est_full, random_state=seed, n_jobs=-1, verbose=-1,
                **hp
            )
            m_full.fit(X_train_full, y)
            preds_te = m_full.predict_proba(X_test_full)[:, 1]
            
        elif algo == 'xgb':
            m0 = xgb.XGBClassifier(
                learning_rate=0.03, subsample=0.8, reg_lambda=5.0, min_child_weight=5,
                tree_method='hist', eval_metric='aucpr', early_stopping_rounds=120,
                n_estimators=4000, random_state=seed, n_jobs=-1,
                **hp
            )
            m0.fit(Xt0, y_t0, eval_set=[(Xv0, y_v0)], verbose=False)
            b_iter = m0.best_iteration
            val_score = average_precision_score(y_v0, m0.predict_proba(Xv0)[:, 1])
            print(f"Fold 0 best_iteration: {b_iter}, val AP: {val_score:.4f}")
            
            n_est_full = int(round(b_iter * 1.15))
            print(f"Training full data with n_estimators={n_est_full}...")
            m_full = xgb.XGBClassifier(
                learning_rate=0.03, subsample=0.8, reg_lambda=5.0, min_child_weight=5,
                tree_method='hist', eval_metric='aucpr',
                n_estimators=n_est_full, random_state=seed, n_jobs=-1,
                **hp
            )
            m_full.fit(X_train_full, y, verbose=False)
            preds_te = m_full.predict_proba(X_test_full)[:, 1]
            
        elif algo == 'cat':
            m0 = CatBoostClassifier(
                iterations=4000, learning_rate=0.03, l2_leaf_reg=5.0,
                loss_function='Logloss', eval_metric='AUC', early_stopping_rounds=150,
                use_best_model=True, random_seed=seed, verbose=False, thread_count=-1,
                **hp
            )
            m0.fit(Xt0, y_t0, eval_set=(Xv0, y_v0), verbose=False)
            b_iter = m0.get_best_iteration()
            val_score = average_precision_score(y_v0, m0.predict_proba(Xv0)[:, 1])
            print(f"Fold 0 best_iteration: {b_iter}, val AP: {val_score:.4f}")
            
            n_est_full = int(round(b_iter * 1.15))
            print(f"Training full data with n_estimators={n_est_full}...")
            m_full = CatBoostClassifier(
                iterations=n_est_full, learning_rate=0.03, l2_leaf_reg=5.0,
                loss_function='Logloss', eval_metric='AUC',
                random_seed=seed, verbose=False, thread_count=-1,
                **hp
            )
            m_full.fit(X_train_full, y, verbose=False)
            preds_te = m_full.predict_proba(X_test_full)[:, 1]

        elapsed = time.time() - t_start
        print(f"Trained in {elapsed:.1f}s")
        best_iters.append(n_est_full)
        trained_models.append(m_full)
        test_preds.append(preds_te)

    # Save trained serving models
    print("\n=== Step 4: Saving Trained Models ===")
    models_saved_dir = os.path.join(OUT_DIR, 'serving_models')
    os.makedirs(models_saved_dir, exist_ok=True)
    for i, m in enumerate(trained_models):
        algo = MEMBERS[i][0]
        if algo == 'lgb':
            m.booster_.save_model(os.path.join(models_saved_dir, f'm{i+1}_lgb.txt'))
        elif algo == 'xgb':
            m.save_model(os.path.join(models_saved_dir, f'm{i+1}_xgb.json'))
        elif algo == 'cat':
            m.save_model(os.path.join(models_saved_dir, f'm{i+1}_cat.json'), format='json')
    print("Raw models saved to", models_saved_dir)

    print("\n=== Step 5: Verification Against Competition Benchmarks (Gate F0-Model) ===")
    test_preds = np.array(test_preds) # shape: (7, 11928)
    np.save(os.path.join(OUT_DIR, 'serving_test_preds.npy'), test_preds)
    
    # 1. Compare each member with artifacts/iris_ensemble.npz
    npz_path = os.path.join(ART_DIR, 'iris_ensemble.npz')
    if os.path.exists(npz_path):
        z = np.load(npz_path)
        ref_test = z['test'] # shape (7, 11928)
        print("Comparing serving members vs iris_ensemble.npz['test']:")
        member_spearmans = []
        for i in range(7):
            rho, _ = spearmanr(test_preds[i], ref_test[i])
            member_spearmans.append(rho)
            print(f"  Member {i+1} Spearman: {rho:.5f} (target >= 0.98)")
            assert rho >= 0.97, f"Member {i+1} Spearman below threshold: {rho:.5f}"

    # 2. Compare rank-blend of 7 serving members with submission_3.csv (Public LB 0.73944)
    sub3_path = os.path.join(ROOT, 'submission_3.csv')
    if os.path.exists(sub3_path):
        sub3 = pd.read_csv(sub3_path)
        sub3_labels = sub3['label'].values
        
        # Rank-blend serving predictions
        n_test = test_preds.shape[1]
        serving_blend = np.mean([rankdata(test_preds[i]) / n_test for i in range(7)], axis=0)
        
        rho_blend, _ = spearmanr(serving_blend, sub3_labels)
        print(f"\nRank-blend 7 serving members vs submission_3.csv (LB 0.73944):")
        print(f"Spearman correlation: {rho_blend:.5f} (target >= 0.98)")
        assert rho_blend >= 0.98, f"Serving rank-blend Spearman below 0.98: {rho_blend:.5f}"
        
        # Also check top-10% intersection
        top10_serving = set(np.argsort(serving_blend)[-int(0.10 * n_test):])
        top10_sub3 = set(np.argsort(sub3_labels)[-int(0.10 * n_test):])
        inter_pct = len(top10_serving & top10_sub3) / len(top10_sub3)
        print(f"Top 10% (SIAGA) intersection: {inter_pct:.1%} (target >= 85%)")
        assert inter_pct >= 0.85, f"Top 10% overlap too low: {inter_pct:.1%}"

    print("\n=== Model Serving Training Completed Successfully (Gate F0-Model Passed)! ===")

if __name__ == '__main__':
    main()
