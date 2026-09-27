// Computation of 140 base features matching Python ml/common.py add_features()

const TC = [5.5, 4.5, 3.5, 2.5, 1.5, 0.5, -0.5, -1.5, -2.5, -3.5, -4.5, -5.5];
const ST = 143.0;
const EPS = 1.0;

const FAM_PREFIXES: Record<string, string> = {
  bf: "q_bf_inc_m3",
  qf: "q_qf_inc_m3",
  ws: "q_ws_cum_m3",
  ir: "q_ir_wd_inc_m3",
  th: "q_th_wd_inc_m3",
  ps: "q_ps_wd_inc_m3",
};

export function computeBaseFeaturesForRow(row: Record<string, any>): Record<string, number> {
  const out: Record<string, number> = {};
  const filled: Record<string, number[]> = {};

  // 1. Process 6 families
  for (const [fam, pref] of Object.entries(FAM_PREFIXES)) {
    // Extract 12 lags
    const lags = new Array(12);
    let sum = 0;
    let nonNanCount = 0;

    for (let i = 0; i < 12; i++) {
      const val = row[`${pref}_lag${i}`];
      if (val !== undefined && val !== null && !isNaN(val)) {
        lags[i] = val;
        sum += val;
        nonNanCount++;
      } else {
        lags[i] = NaN;
      }
    }

    const rowMean = nonNanCount > 0 ? sum / nonNanCount : 0.0;
    // Impute NaNs with rowMean
    for (let i = 0; i < 12; i++) {
      if (isNaN(lags[i])) lags[i] = rowMean;
    }
    filled[fam] = lags;

    // Compute stats
    let m = 0;
    let mn = lags[0];
    let mx = lags[0];
    for (let i = 0; i < 12; i++) {
      m += lags[i];
      if (lags[i] < mn) mn = lags[i];
      if (lags[i] > mx) mx = lags[i];
    }
    const mean = m / 12.0;

    // Population std (ddof=0)
    let variance = 0;
    for (let i = 0; i < 12; i++) {
      variance += (lags[i] - mean) ** 2;
    }
    const std = Math.sqrt(variance / 12.0);

    const last = lags[0];
    const oldest = lags[11];
    const recent3 = (lags[0] + lags[1] + lags[2]) / 3.0;
    const older6 =
      (lags[6] + lags[7] + lags[8] + lags[9] + lags[10] + lags[11]) / 6.0;

    let slopeSum = 0;
    for (let i = 0; i < 12; i++) {
      slopeSum += lags[i] * TC[i];
    }
    const slope = slopeSum / ST;

    let pctCount = 0;
    for (let i = 0; i < 12; i++) {
      if (lags[i] <= last) pctCount++;
    }
    const pctLast = pctCount / 12.0;

    // decl_streak: consecutive lag[j] < lag[j+1]
    let streak = 0;
    for (let j = 0; j < 11; j++) {
      if (lags[j] < lags[j + 1]) {
        streak++;
      } else {
        break;
      }
    }

    out[`${fam}_mean`] = Math.fround(mean);
    out[`${fam}_std`] = Math.fround(std);
    out[`${fam}_min`] = Math.fround(mn);
    out[`${fam}_max`] = Math.fround(mx);
    out[`${fam}_range`] = Math.fround(mx - mn);
    out[`${fam}_last`] = Math.fround(last);
    out[`${fam}_slope`] = Math.fround(slope);
    out[`${fam}_yoy`] = Math.fround(last - oldest);
    out[`${fam}_last_vs_mean`] = Math.fround(last - mean);
    out[`${fam}_z_last`] = Math.fround((last - mean) / (std + EPS));
    out[`${fam}_drawdown`] = Math.fround(last - mx);
    out[`${fam}_last_over_mean`] = Math.fround(last / (Math.abs(mean) + EPS));
    out[`${fam}_recent3`] = Math.fround(recent3);
    out[`${fam}_recent_vs_base`] = Math.fround(recent3 - older6);
    out[`${fam}_pct_last`] = Math.fround(pctLast);
    out[`${fam}_decl_streak`] = Math.fround(streak);
  }

  // 2. Water balance: supply vs demand
  const sup = new Array(12);
  const dem = new Array(12);
  const deficit = new Array(12);

  let supSum = 0;
  let demSum = 0;
  let defSum = 0;
  let defMax = -Infinity;

  for (let i = 0; i < 12; i++) {
    sup[i] = filled.bf[i] + filled.qf[i];
    dem[i] = filled.ir[i] + filled.th[i] + filled.ps[i];
    deficit[i] = dem[i] - sup[i];

    supSum += sup[i];
    demSum += dem[i];
    defSum += deficit[i];
    if (deficit[i] > defMax) defMax = deficit[i];
  }

  const supMean = supSum / 12.0;
  const demMean = demSum / 12.0;
  const defMean = defSum / 12.0;

  let supVar = 0;
  let supSlopeSum = 0;
  for (let i = 0; i < 12; i++) {
    supVar += (sup[i] - supMean) ** 2;
    supSlopeSum += sup[i] * TC[i];
  }
  const supStd = Math.sqrt(supVar / 12.0);
  const supSlope = supSlopeSum / ST;

  out["supply_last"] = Math.fround(sup[0]);
  out["demand_last"] = Math.fround(dem[0]);
  out["supply_mean"] = Math.fround(supMean);
  out["demand_mean"] = Math.fround(demMean);
  out["deficit_last"] = Math.fround(deficit[0]);
  out["deficit_mean"] = Math.fround(defMean);
  out["deficit_sum"] = Math.fround(defSum);
  out["deficit_max"] = Math.fround(defMax);
  out["use_ratio_last"] = Math.fround(dem[0] / (Math.abs(sup[0]) + EPS));
  out["use_ratio_mean"] = Math.fround(demMean / (Math.abs(supMean) + EPS));
  out["supply_slope"] = Math.fround(supSlope);
  out["supply_z_last"] = Math.fround((sup[0] - supMean) / (supStd + EPS));

  out["ir_share"] = Math.fround(filled.ir[0] / (dem[0] + EPS));
  out["th_share"] = Math.fround(filled.th[0] / (dem[0] + EPS));
  out["ps_share"] = Math.fround(filled.ps[0] / (dem[0] + EPS));

  // 3. Climatology anomalies
  const cn = row.clim_median_now !== undefined ? row.clim_median_now : 0.0;
  const cx = row.clim_median_next !== undefined ? row.clim_median_next : 0.0;
  const ws = filled.ws[0];

  out["clim_now"] = Math.fround(cn);
  out["clim_next"] = Math.fround(cx);
  out["clim_drop"] = Math.fround(cx - cn);
  out["clim_ratio"] = Math.fround(cx / (Math.abs(cn) + EPS));
  out["supply_vs_clim"] = Math.fround(sup[0] - cn);
  out["supply_clim_ratio"] = Math.fround(sup[0] / (Math.abs(cn) + EPS));
  out["ws_vs_clim"] = Math.fround(ws - cn);
  out["ws_clim_ratio"] = Math.fround(ws / (Math.abs(cn) + EPS));
  out["ws_vs_climnext"] = Math.fround(ws - cx);
  out["ws_climnext_ratio"] = Math.fround(ws / (Math.abs(cx) + EPS));
  out["supply_vs_climnext"] = Math.fround(sup[0] - cx);
  out["clim_next_rel_supplymean"] = Math.fround(cx / (Math.abs(supMean) + EPS));

  // 4. Calendar
  const m = row.month !== undefined ? row.month : 1.0;
  const tm = (m % 12) + 1;

  out["month"] = Math.fround(m);
  out["target_month"] = Math.fround(tm);
  out["month_sin"] = Math.fround(Math.sin((2 * Math.PI * m) / 12));
  out["month_cos"] = Math.fround(Math.cos((2 * Math.PI * m) / 12));
  out["tmonth_sin"] = Math.fround(Math.sin((2 * Math.PI * tm) / 12));
  out["tmonth_cos"] = Math.fround(Math.cos((2 * Math.PI * tm) / 12));

  // 5. Static
  const incArea = row.inc_aream2 !== undefined ? row.inc_aream2 : 0.0;
  const cumArea = row.cum_aream2 !== undefined ? row.cum_aream2 : 0.0;
  const p2000 = row.pop_dec_2000 !== undefined ? row.pop_dec_2000 : 0.0;
  const p2010 = row.pop_dec_2010 !== undefined ? row.pop_dec_2010 : 0.0;
  const p2020 = row.pop_dec_2020 !== undefined ? row.pop_dec_2020 : 0.0;
  const pAcs = row.pop_acs_2020 !== undefined ? row.pop_acs_2020 : 0.0;

  out["inc_aream2"] = Math.fround(incArea);
  out["cum_aream2"] = Math.fround(cumArea);
  out["pop_dec_2000"] = Math.fround(p2000);
  out["pop_dec_2010"] = Math.fround(p2010);
  out["pop_dec_2020"] = Math.fround(p2020);
  out["pop_acs_2020"] = Math.fround(pAcs);
  out["pop_growth"] = Math.fround(p2020 - p2000);
  out["area_ratio"] = Math.fround(cumArea / (Math.abs(incArea) + EPS));
  out["pop_density"] = Math.fround(pAcs / (Math.abs(incArea) + EPS));

  const inc = Math.abs(incArea) + EPS;
  out["supply_per_area"] = Math.fround(sup[0] / inc);
  out["demand_per_area"] = Math.fround(dem[0] / inc);

  return out;
}
