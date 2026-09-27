import fs from "fs";
import path from "path";
import { isDbAvailable, db } from "./client";
import { forecastRuns, predictions, subdas, basins, inspections, basinPlans, runMetrics, insights } from "./schema";
import { eq, and, sql, desc, asc } from "drizzle-orm";

const ML_OUT_DIR = path.join(process.cwd(), "ml", "out");

// In-memory store for dynamic mock changes (inspections, basin plans, uploaded runs) when DB is offline
const memoryStore = {
  inspections: new Map<string, { status: string; result: string | null; note: string | null }>(),
  basinPlans: new Map<string, { has_plan: boolean; note: string | null }>(),
  runs: [] as any[],
  customPredictions: new Map<number, any[]>(),
};

// Helper to read offline JSON files
function readOfflineJson<T>(filename: string): T {
  const filePath = path.join(ML_OUT_DIR, filename);
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  }
  return [] as unknown as T;
}

export async function getRuns() {
  if (isDbAvailable()) {
    try {
      const allRuns = await db.select().from(forecastRuns).orderBy(desc(forecastRuns.id));
      return allRuns;
    } catch (e) {
      console.warn("DB query failed, falling back to offline seed data:", e);
    }
  }

  // Fallback to offline files
  const testRuns = readOfflineJson<any[]>("test_runs_seed.json");
  const historyRuns = readOfflineJson<any[]>("history_runs_meta.json");

  // Format runs
  const formattedTest = testRuns.map((r, idx) => ({
    id: idx + 1,
    label: r.label,
    source: "test",
    origin_id: r.origin_id,
    t_index: null,
    origin_month: r.origin_month,
    target_month: r.target_month,
    n_rows: r.n_rows,
    n_siaga: r.n_siaga,
    n_waspada: r.n_waspada,
    n_normal: r.n_normal,
    n_escalated: r.n_escalated,
    status: "ready",
    model_version: r.model_version,
    has_realization: false,
    created_at: new Date(),
    released_at: new Date(),
  }));

  const formattedHistory = historyRuns.map((r) => ({
    id: 1000 + r.t_index,
    label: r.label,
    source: "history",
    origin_id: r.origin_id,
    t_index: r.t_index,
    origin_month: r.origin_month,
    target_month: r.target_month,
    n_rows: r.n_rows,
    n_siaga: r.n_siaga,
    n_waspada: r.n_waspada,
    n_normal: r.n_normal,
    n_escalated: 0,
    status: "ready",
    model_version: r.model_version,
    has_realization: r.has_realization,
    created_at: new Date(),
    released_at: new Date(),
  }));

  return [...memoryStore.runs, ...formattedTest, ...formattedHistory];
}

export async function getRunById(runId: number) {
  const allRuns = await getRuns();
  return allRuns.find((r) => r.id === runId) || allRuns[3] || allRuns[0]; // Default to origin 169 (index 3)
}

export interface PredictionFilter {
  tier?: string;
  typology?: string;
  basinId?: number;
  isNew?: boolean;
  isEscalated?: boolean;
  search?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export async function getRunPredictions(runId: number, filter: PredictionFilter = {}) {
  const page = filter.page || 1;
  const pageSize = filter.pageSize || 50;

  let allPreds: any[] = [];

  if (memoryStore.customPredictions.has(runId)) {
    allPreds = memoryStore.customPredictions.get(runId) || [];
  } else if (runId <= 4) {
    // Test runs 1..4 (origin 14, 81, 94, 169)
    const testRuns = readOfflineJson<any[]>("test_runs_seed.json");
    const rData = testRuns[runId - 1] || testRuns[3]; // default 169
    allPreds = rData.predictions || [];
  } else {
    // Read from test run 169 as fallback for presentation demo
    const testRuns = readOfflineJson<any[]>("test_runs_seed.json");
    allPreds = testRuns[3]?.predictions || [];
  }

  // Attach dynamic inspection status from memoryStore
  allPreds = allPreds.map((p) => {
    const inspKey = `${runId}_${p.subdas_id}`;
    const insp = memoryStore.inspections.get(inspKey);
    return {
      ...p,
      inspection_status: insp ? insp.status : "belum",
      inspection_result: insp ? insp.result : null,
      inspection_note: insp ? insp.note : null,
    };
  });

  // Apply filters
  let filtered = allPreds;
  if (filter.tier && filter.tier !== "ALL") {
    filtered = filtered.filter((p) => p.tier === filter.tier || p.tier_final === filter.tier);
  }
  if (filter.typology && filter.typology !== "ALL") {
    filtered = filtered.filter((p) => p.typology === filter.typology);
  }
  if (filter.basinId !== undefined && filter.basinId !== null && filter.basinId >= 0) {
    filtered = filtered.filter((p) => p.basin_id === filter.basinId);
  }
  if (filter.isNew) {
    filtered = filtered.filter((p) => p.is_new);
  }
  if (filter.isEscalated) {
    filtered = filtered.filter((p) => p.tier !== p.tier_final);
  }
  if (filter.search) {
    const q = filter.search.toLowerCase();
    filtered = filtered.filter((p) => p.subdas_id.toLowerCase().includes(q));
  }

  // Sorting
  if (filter.sort === "rank_asc") {
    filtered.sort((a, b) => a.rank - b.rank);
  } else if (filter.sort === "score_desc") {
    filtered.sort((a, b) => b.score - a.score);
  } else if (filter.sort === "score_asc") {
    filtered.sort((a, b) => a.score - b.score);
  }

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);

  return {
    data: paginated,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

let cachedSubdasMap: Map<string, any> | null = null;
function getSubdasMap(): Map<string, any> {
  if (cachedSubdasMap) return cachedSubdasMap;
  const subdasCsv = path.join(ML_OUT_DIR, "subdas.csv");
  cachedSubdasMap = new Map();
  if (fs.existsSync(subdasCsv)) {
    const lines = fs.readFileSync(subdasCsv, "utf-8").split("\n");
    const header = lines[0].split(",").map((h) => h.trim());
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(",").map((p) => p.trim());
      const obj: any = {};
      header.forEach((h, idx) => {
        obj[h] = parts[idx];
      });
      cachedSubdasMap.set(obj.id, obj);
    }
  }
  return cachedSubdasMap;
}

export async function getSubdasDetail(subdasId: string, runId: number = 4) {
  // Find in test runs
  const testRuns = readOfflineJson<any[]>("test_runs_seed.json");
  const currentRunData = testRuns[runId - 1] || testRuns[3];
  const pred = currentRunData?.predictions?.find((p: any) => p.subdas_id === subdasId);

  const subdasMap = getSubdasMap();
  const subdasStatic = subdasMap.get(subdasId) || null;

  // Find neighbors in current run
  const allPreds = currentRunData?.predictions || [];
  const toId = subdasStatic?.to_id;
  const downstream = toId && toId !== "OUTLET" ? allPreds.find((p: any) => p.subdas_id === toId) : null;
  const upstream = allPreds.filter((p: any) => {
    const s = subdasMap.get(p.subdas_id);
    return s && s.to_id === subdasId;
  });

  return {
    subdas: subdasStatic,
    prediction: pred,
    downstream,
    upstream,
  };
}

export async function getBasinList(runId: number = 4) {
  const { data: allPreds } = await getRunPredictions(runId, { pageSize: 5000 });
  const basinMap = new Map<number, { siaga: number; waspada: number; normal: number; total: number; typos: Record<string, number>; is_new: boolean }>();

  allPreds.forEach((p) => {
    const bId = p.basin_id;
    if (!basinMap.has(bId)) {
      basinMap.set(bId, { siaga: 0, waspada: 0, normal: 0, total: 0, typos: {}, is_new: p.is_new });
    }
    const b = basinMap.get(bId)!;
    b.total++;
    if (p.tier === "SIAGA") b.siaga++;
    else if (p.tier === "WASPADA") b.waspada++;
    else b.normal++;

    b.typos[p.typology] = (b.typos[p.typology] || 0) + 1;
  });

  const list = Array.from(basinMap.entries()).map(([basinId, stats]) => {
    // Dominant typo among SIAGA or overall
    const dominantTypo = Object.entries(stats.typos).sort((a, b) => b[1] - a[1])[0]?.[0] || "campuran";
    const planKey = `${runId}_${basinId}`;
    const plan = memoryStore.basinPlans.get(planKey);

    return {
      basin_id: basinId,
      n_siaga: stats.siaga,
      n_waspada: stats.waspada,
      n_normal: stats.normal,
      n_subdas: stats.total,
      pct_siaga: stats.siaga / Math.max(stats.total, 1),
      dominant_typo: dominantTypo,
      is_new: stats.is_new,
      has_plan: plan ? plan.has_plan : false,
      plan_note: plan ? plan.note : null,
    };
  });

  // Sort descending by n_siaga, then n_subdas
  list.sort((a, b) => b.n_siaga - a.n_siaga || b.n_subdas - a.n_subdas);
  return list;
}

export async function getBasinGraph(basinId: number, runId: number = 4) {
  const { data: allPreds } = await getRunPredictions(runId, { basinId, pageSize: 5000 });
  const subdasCsv = path.join(ML_OUT_DIR, "subdas.csv");
  
  // Read to_id links
  const toIdMap = new Map<string, string>();
  if (fs.existsSync(subdasCsv)) {
    const lines = fs.readFileSync(subdasCsv, "utf-8").split("\n");
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",");
      if (parts.length >= 2) {
        toIdMap.set(parts[0].trim(), parts[1].trim());
      }
    }
  }

  const nodes = allPreds.map((p) => {
    return {
      id: p.subdas_id,
      label: p.subdas_id.substring(0, 6),
      tier: p.tier,
      tier_final: p.tier_final,
      typology: p.typology,
      is_escalated: p.tier !== p.tier_final,
      is_outlet: toIdMap.get(p.subdas_id) === "OUTLET",
      score: p.score,
      rank: p.rank,
    };
  });

  const edges: { id: string; source: string; target: string }[] = [];
  const nodeIds = new Set(nodes.map((n) => n.id));

  nodes.forEach((n) => {
    const toId = toIdMap.get(n.id);
    if (toId && toId !== "OUTLET" && nodeIds.has(toId)) {
      edges.push({
        id: `e_${n.id}_${toId}`,
        source: n.id,
        target: toId,
      });
    }
  });

  return { nodes, edges };
}

export async function getInsightsData() {
  return readOfflineJson<any>("insights.json");
}

export async function getTypologyStatsData() {
  return readOfflineJson<any>("typology_stats.json");
}

export async function getTimelineData() {
  return readOfflineJson<any[]>("timeline.csv");
}

// Server Action helper to update inspection in memory
export function setMemoryInspection(runId: number, subdasId: string, status: string, result: string | null, note: string | null) {
  const key = `${runId}_${subdasId}`;
  memoryStore.inspections.set(key, { status, result, note });
}

// Server Action helper to update basin plan in memory
export function setMemoryBasinPlan(runId: number, basinId: number, hasPlan: boolean, note: string | null) {
  const key = `${runId}_${basinId}`;
  memoryStore.basinPlans.set(key, { has_plan: hasPlan, note });
}

// Helper to register custom uploaded run
export function registerCustomRun(runMeta: any, preds: any[]) {
  const newId = 2000 + memoryStore.runs.length + 1;
  const fullMeta = { ...runMeta, id: newId };
  memoryStore.runs.unshift(fullMeta);
  memoryStore.customPredictions.set(newId, preds);
  return fullMeta;
}
