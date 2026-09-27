// Computation of 14 topological batch features + 3 target encoding features

import fs from "fs";
import path from "path";

const EPS = 1.0;

interface TeTables {
  global_mean: number;
  id: Record<string, number>;
  to_id: Record<string, number>;
  month: Record<string, number>;
}

let cachedTeTables: TeTables | null = null;

export function loadTeTables(): TeTables {
  if (cachedTeTables) return cachedTeTables;
  const p = path.join(process.cwd(), "models", "te_tables.json");
  if (fs.existsSync(p)) {
    cachedTeTables = JSON.parse(fs.readFileSync(p, "utf-8"));
  } else {
    cachedTeTables = {
      global_mean: 0.204,
      id: {},
      to_id: {},
      month: {},
    };
  }
  return cachedTeTables!;
}

export function computeTopoAndTeFeatures(
  rows: Record<string, any>[]
): Record<string, number>[] {
  const n = rows.length;
  const teTables = loadTeTables();
  const gm = teTables.global_mean;

  // 1. Precalculate supply, demand, deficit, clim per row
  const nodeMap = new Map<
    string,
    { supply: number; demand: number; deficit: number; clim: number }
  >();

  const baseData = rows.map((r) => {
    const id = r.id;
    const toId = r.to_id;
    const supply = (r.q_bf_inc_m3_lag0 || 0) + (r.q_qf_inc_m3_lag0 || 0);
    const demand =
      (r.q_ir_wd_inc_m3_lag0 || 0) +
      (r.q_th_wd_inc_m3_lag0 || 0) +
      (r.q_ps_wd_inc_m3_lag0 || 0);
    const deficit = demand - supply;
    const clim = r.clim_median_now || 0;

    nodeMap.set(id, { supply, demand, deficit, clim });
    return { id, toId, supply, demand, deficit, clim, month: r.month };
  });

  // 2. Aggregate upstream stats: group by to_id
  const upstreamAgg = new Map<
    string,
    { count: number; supplySum: number; demandSum: number; deficitSum: number }
  >();

  for (const b of baseData) {
    if (b.toId && b.toId !== "OUTLET") {
      if (!upstreamAgg.has(b.toId)) {
        upstreamAgg.set(b.toId, {
          count: 0,
          supplySum: 0,
          demandSum: 0,
          deficitSum: 0,
        });
      }
      const agg = upstreamAgg.get(b.toId)!;
      agg.count++;
      agg.supplySum += b.supply;
      agg.demandSum += b.demand;
      agg.deficitSum += b.deficit;
    }
  }

  // 3. Build features for each row
  return baseData.map((b) => {
    const isOutlet = b.toId === "OUTLET" ? 1.0 : 0.0;
    const up = upstreamAgg.get(b.id);

    const upN = up ? up.count : 0.0;
    const upSupplySum = up ? up.supplySum : 0.0;
    const upDemandSum = up ? up.demandSum : 0.0;
    const upDeficitSum = up ? up.deficitSum : 0.0;
    const upSupplyMean = upN > 0 ? upSupplySum / upN : 0.0;

    const upSupplyRel = upSupplySum / (Math.abs(b.supply) + EPS);
    const upDeficitRel = upDeficitSum / (Math.abs(b.supply) + EPS);

    // Downstream lookup
    const down = b.toId && b.toId !== "OUTLET" ? nodeMap.get(b.toId) : null;

    const downSupply = down ? down.supply : NaN;
    const downDemand = down ? down.demand : NaN;
    const downDeficit = down ? down.deficit : NaN;
    const downClim = down ? down.clim : NaN;

    const supplyVsDown = down ? b.supply - downSupply : NaN;
    const supplyDownRatio = down
      ? b.supply / (Math.abs(downSupply) + EPS)
      : NaN;

    // Target encoding
    const teId = teTables.id[b.id] !== undefined ? teTables.id[b.id] : gm;
    const teToId =
      teTables.to_id[b.toId] !== undefined ? teTables.to_id[b.toId] : gm;
    const monthKey = String(b.month);
    const teMonth =
      teTables.month[monthKey] !== undefined ? teTables.month[monthKey] : gm;

    return {
      is_outlet: Math.fround(isOutlet),
      up_n: Math.fround(upN),
      up_supply_sum: Math.fround(upSupplySum),
      up_demand_sum: Math.fround(upDemandSum),
      up_deficit_sum: Math.fround(upDeficitSum),
      up_supply_mean: Math.fround(upSupplyMean),
      up_supply_rel: Math.fround(upSupplyRel),
      up_deficit_rel: Math.fround(upDeficitRel),
      down_supply: Math.fround(downSupply),
      down_demand: Math.fround(downDemand),
      down_deficit: Math.fround(downDeficit),
      down_clim: Math.fround(downClim),
      supply_vs_down: Math.fround(supplyVsDown),
      supply_down_ratio: Math.fround(supplyDownRatio),
      te_id: Math.fround(teId),
      te_to_id: Math.fround(teToId),
      te_month: Math.fround(teMonth),
    };
  });
}
