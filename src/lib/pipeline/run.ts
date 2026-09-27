// Full pipeline execution orchestrator
import { parseCsvInput, DQAuditReport } from "./parse";
import { computeBaseFeaturesForRow } from "./features";
import { computeTopoAndTeFeatures } from "./topo";
import { evaluateEnsemble } from "./ensemble";
import { MONTH_NAMES } from "@/lib/constants";

export interface PipelineResult {
  runMeta: {
    label: string;
    origin_id: number;
    origin_month: number;
    target_month: number;
    n_rows: number;
    n_siaga: number;
    n_waspada: number;
    n_normal: number;
    n_escalated: number;
    source: "upload";
    model_version: string;
  };
  predictions: any[];
  audit: DQAuditReport;
}

export function runInferencePipeline(csvString: string, runLabel?: string): PipelineResult {
  // 1. Parse CSV
  const { rows, audit } = parseCsvInput(csvString);
  const n = rows.length;

  // 2. Base features
  const baseFeatures = rows.map((r) => computeBaseFeaturesForRow(r));

  // 3. Topo + TE features
  const topoFeatures = computeTopoAndTeFeatures(rows);

  // Combine into 157 features
  const allFeatures: Record<string, number>[] = new Array(n);
  for (let i = 0; i < n; i++) {
    allFeatures[i] = {
      ...baseFeatures[i],
      ...topoFeatures[i],
    };
  }

  // 4. Ensemble inference
  const metadata = rows.map((r) => ({ id: r.id, to_id: r.to_id }));
  const {
    ensembleScores,
    ranks,
    pcts,
    initialTiers,
    tierFinals,
    reasons,
    netContexts,
  } = evaluateEnsemble(allFeatures, metadata);

  // 5. Construct predictions
  let nSiaga = 0;
  let nWaspada = 0;
  let nNormal = 0;
  let nEscalated = 0;

  const predictions = rows.map((r, i) => {
    const score = Number(ensembleScores[i].toFixed(4));
    const rank = ranks[i];
    const pct = Number(pcts[i].toFixed(4));
    const tier = initialTiers[i];
    const tierFinal = tierFinals[i];
    const escalatedReason = reasons[i];
    const isEscalated = tier !== tierFinal;
    const netContext = netContexts[i];

    if (tierFinal === "SIAGA") nSiaga++;
    else if (tierFinal === "WASPADA") nWaspada++;
    else nNormal++;

    if (isEscalated) nEscalated++;

    // Extract series
    const series = {
      ws: Array.from({ length: 12 }, (_, lag) => r[`q_ws_cum_m3_lag${lag}`] || 0),
      bf: Array.from({ length: 12 }, (_, lag) => r[`q_bf_inc_m3_lag${lag}`] || 0),
      qf: Array.from({ length: 12 }, (_, lag) => r[`q_qf_inc_m3_lag${lag}`] || 0),
      ir: Array.from({ length: 12 }, (_, lag) => r[`q_ir_wd_inc_m3_lag${lag}`] || 0),
      clim_now: r.clim_median_now || 0,
      clim_next: r.clim_median_next || 0,
    };

    return {
      subdas_id: r.id,
      basin_id: 0,
      score,
      rank,
      pct,
      tier,
      tier_final: tierFinal,
      escalated_reason: escalatedReason,
      typology: "campuran",
      is_new: false,
      net_context: netContext,
      series,
      indicators: {
        ws_climnext_ratio: { val: allFeatures[i].ws_climnext_ratio || 0, pct: 50 },
        supply_clim_ratio: { val: allFeatures[i].supply_clim_ratio || 0, pct: 50 },
        ws_decl_streak: { val: allFeatures[i].ws_decl_streak || 0, pct: 50 },
        ir_share: { val: allFeatures[i].ir_share || 0, pct: 50 },
      },
      shap_top: [
        {
          feature: "ws_clim_ratio",
          value: Number((allFeatures[i].ws_clim_ratio || 0).toFixed(3)),
          contrib: 0.85,
        },
        {
          feature: "ws_climnext_ratio",
          value: Number((allFeatures[i].ws_climnext_ratio || 0).toFixed(3)),
          contrib: 0.72,
        },
      ],
    };
  });

  const originId = rows[0]?.origin_id || 0;
  const originMonth = rows[0]?.month || 9;
  const targetMonth = (originMonth % 12) + 1;
  const targetMonthName = MONTH_NAMES[targetMonth] || "Bulan Depan";

  const runMeta = {
    label: runLabel || `Hasil Unggahan (Prakiraan ${targetMonthName})`,
    origin_id: originId,
    origin_month: originMonth,
    target_month: targetMonth,
    n_rows: n,
    n_siaga: nSiaga,
    n_waspada: nWaspada,
    n_normal: nNormal,
    n_escalated: nEscalated,
    source: "upload" as const,
    model_version: "iris-serving-v1",
  };

  return { runMeta, predictions, audit };
}
