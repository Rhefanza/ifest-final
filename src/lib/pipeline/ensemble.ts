// Ensemble scoring, rank-blending, tiering, and escalation
import fs from "fs";
import path from "path";
import { TreeModel, loadAllServingModels } from "./trees";

interface ManifestViews {
  base: string[];
  full_te: string[];
}

let cachedViews: ManifestViews | null = null;

export function loadManifestViews(): ManifestViews {
  if (cachedViews) return cachedViews;
  const manifestPath = path.join(process.cwd(), "models", "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  cachedViews = manifest.views;
  return cachedViews!;
}

// Compute 1-based ranks (higher value = higher rank, or tie average)
export function computeRanks(values: Float64Array | number[]): Float64Array {
  const n = values.length;
  const indices = new Int32Array(n);
  for (let i = 0; i < n; i++) indices[i] = i;

  // Sort indices by value ascending
  indices.sort((a, b) => values[a] - values[b]);

  const ranks = new Float64Array(n);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n - 1 && values[indices[j]] === values[indices[j + 1]]) {
      j++;
    }
    // Equal elements from i to j get average rank (1-based)
    const avgRank = (i + 1 + (j + 1)) / 2.0;
    for (let k = i; k <= j; k++) {
      ranks[indices[k]] = avgRank;
    }
    i = j + 1;
  }
  return ranks;
}

export function computeNetworkContextAndEscalation(
  rows: { id: string; to_id: string; tier: string }[]
): {
  tierFinals: string[];
  reasons: (string | null)[];
  netContexts: string[];
} {
  const idToTier = new Map<string, string>();
  rows.forEach((r) => idToTier.set(r.id, r.tier));
  const allIds = new Set(rows.map((r) => r.id));

  // Build upstream map
  const upMap = new Map<string, { id: string; tier: string }[]>();
  for (const r of rows) {
    if (r.to_id && r.to_id !== "OUTLET") {
      if (!upMap.has(r.to_id)) upMap.set(r.to_id, []);
      upMap.get(r.to_id)!.push({ id: r.id, tier: r.tier });
    }
  }

  const tierFinals: string[] = [];
  const reasons: (string | null)[] = [];
  const netContexts: string[] = [];

  for (const r of rows) {
    const hId = r.id;
    const toH = r.to_id;
    const tier = r.tier;

    const downInData = allIds.has(toH);
    const downTier = idToTier.get(toH);

    const upList = upMap.get(hId) || [];
    const upSiaga = upList.filter((u) => u.tier === "SIAGA");

    let isEscalated = false;
    let escReason: string | null = null;

    if (tier === "NORMAL") {
      if (downTier === "SIAGA") {
        isEscalated = true;
        escReason = `Tetangga SIAGA di hilir: ${toH.slice(0, 6)}`;
      } else if (upSiaga.length > 0) {
        isEscalated = true;
        escReason = `Tetangga SIAGA di hulu: ${upSiaga[0].id.slice(0, 6)}`;
      }
    }

    const tierFinal = isEscalated ? "WASPADA" : tier;

    let ctx = "";
    if (toH === "OUTLET") {
      if (upSiaga.length > 0) {
        ctx = `Muara (outlet); ${upSiaga.length} hulu SIAGA → cek hulu`;
      } else {
        ctx = "Muara (outlet)";
      }
    } else if (downTier === "SIAGA") {
      ctx = "Hilir juga SIAGA → tangani per basin";
    } else if (upSiaga.length > 0) {
      ctx = `${upSiaga.length} sub-DAS hulu SIAGA → cek hulu`;
    } else if (downInData) {
      ctx = `Hilir ${downTier} → sumber stress lokal`;
    } else {
      ctx = "Hilir di luar data";
    }

    tierFinals.push(tierFinal);
    reasons.push(escReason);
    netContexts.push(ctx);
  }

  return { tierFinals, reasons, netContexts };
}

export function evaluateEnsemble(
  featureRows: Record<string, number>[],
  metadata: { id: string; to_id: string }[]
) {
  const models = loadAllServingModels();
  const views = loadManifestViews();
  const n = featureRows.length;

  // Build matrix for base view (140) and full_te view (157)
  const XBase: Float64Array[] = new Array(n);
  const XFull: Float64Array[] = new Array(n);

  const baseCols = views.base;
  const fullCols = views.full_te;

  for (let i = 0; i < n; i++) {
    const row = featureRows[i];
    const bArr = new Float64Array(baseCols.length);
    for (let c = 0; c < baseCols.length; c++) {
      bArr[c] = row[baseCols[c]] !== undefined ? row[baseCols[c]] : 0.0;
    }
    XBase[i] = bArr;

    const fArr = new Float64Array(fullCols.length);
    for (let c = 0; c < fullCols.length; c++) {
      fArr[c] = row[fullCols[c]] !== undefined ? row[fullCols[c]] : 0.0;
    }
    XFull[i] = fArr;
  }

  // Evaluate each model
  const marginsPerModel: Float64Array[] = [];
  const normalizedRanksPerModel: Float64Array[] = [];

  for (const model of models) {
    const X = model.view === "base" ? XBase : XFull;
    const margins = model.evaluateBatch(X);
    marginsPerModel.push(margins);

    const ranks = computeRanks(margins);
    const normRanks = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      normRanks[i] = ranks[i] / n;
    }
    normalizedRanksPerModel.push(normRanks);
  }

  // Mean blend score
  const ensembleScores = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0.0;
    for (let m = 0; m < models.length; m++) {
      sum += normalizedRanksPerModel[m][i];
    }
    ensembleScores[i] = sum / models.length;
  }

  // Compute final ranks and percentiles: higher score = lower rank number (1 is top risk)
  const sortedIndices = new Int32Array(n);
  for (let i = 0; i < n; i++) sortedIndices[i] = i;
  sortedIndices.sort((a, b) => ensembleScores[b] - ensembleScores[a]);

  const ranks = new Int32Array(n);
  const pcts = new Float64Array(n);
  const initialTiers: string[] = new Array(n);

  for (let r = 0; r < n; r++) {
    const idx = sortedIndices[r];
    const rank = r + 1;
    const pct = rank / n;
    ranks[idx] = rank;
    pcts[idx] = pct;

    if (pct <= 0.1) {
      initialTiers[idx] = "SIAGA";
    } else if (pct <= 0.3) {
      initialTiers[idx] = "WASPADA";
    } else {
      initialTiers[idx] = "NORMAL";
    }
  }

  // Apply escalation and network context
  const networkInput = metadata.map((m, i) => ({
    id: m.id,
    to_id: m.to_id,
    tier: initialTiers[i],
  }));

  const { tierFinals, reasons, netContexts } =
    computeNetworkContextAndEscalation(networkInput);

  return {
    marginsPerModel,
    ensembleScores,
    ranks,
    pcts,
    initialTiers,
    tierFinals,
    reasons,
    netContexts,
  };
}
