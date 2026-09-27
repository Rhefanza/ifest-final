import fs from "fs";
import path from "path";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../src/lib/db/schema";

const ML_OUT_DIR = path.join(process.cwd(), "ml", "out");

async function main() {
  const connectionString =
    process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

  if (!connectionString) {
    console.log("No DATABASE_URL set. Seeding skipped. (App runs using offline fallback)");
    return;
  }

  console.log("Connecting to Postgres with unpooled connection...");
  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool, { schema });

  try {
    console.log("=== Step 1: Seeding Sub-DAS and Basins ===");
    // Sub-DAS
    const subdasCsv = path.join(ML_OUT_DIR, "subdas.csv");
    if (fs.existsSync(subdasCsv)) {
      const lines = fs.readFileSync(subdasCsv, "utf-8").split("\n").filter(Boolean);
      const header = lines[0].split(",");
      const subdasRows = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",");
        subdasRows.push({
          id: parts[0].trim(),
          to_id: parts[1].trim(),
          basin_id: parseInt(parts[6]),
          typology: parts[5].trim() as any,
          in_train: parts[7] === "True",
          is_new_in_test: parts[9] === "True",
          inc_area: parseFloat(parts[2]) || null,
          cum_area: parseFloat(parts[3]) || null,
          pop_2020: parseFloat(parts[4]) || null,
          bfi: parseFloat(parts[10]) || null,
          amplitude: parseFloat(parts[11]) || null,
          demand_load: parseFloat(parts[12]) || null,
          irrigation_share: parseFloat(parts[13]) || null,
          demand_supply_ratio: parseFloat(parts[14]) || null,
          r4_flag: parts[15] === "True",
        });
      }
      console.log(`Parsed ${subdasRows.length} sub-DAS rows.`);
      // Batch insert subdas
      for (let b = 0; b < subdasRows.length; b += 1000) {
        await db.insert(schema.subdas).values(subdasRows.slice(b, b + 1000)).onConflictDoNothing();
      }
      console.log("Sub-DAS seeded successfully.");
    }

    console.log("=== Step 2: Seeding Insights ===");
    const insightsJson = path.join(ML_OUT_DIR, "insights.json");
    if (fs.existsSync(insightsJson)) {
      const insData = JSON.parse(fs.readFileSync(insightsJson, "utf-8"));
      for (const [k, v] of Object.entries(insData)) {
        await db.insert(schema.insights).values({ key: k, value: v }).onConflictDoUpdate({
          target: schema.insights.key,
          set: { value: v },
        });
      }
      console.log("Insights seeded successfully.");
    }

    console.log("=== Step 3: Seeding 4 Test Runs ===");
    const testRunsJson = path.join(ML_OUT_DIR, "test_runs_seed.json");
    if (fs.existsSync(testRunsJson)) {
      const testRuns = JSON.parse(fs.readFileSync(testRunsJson, "utf-8"));
      for (const tr of testRuns) {
        const [insertedRun] = await db.insert(schema.forecastRuns).values({
          label: tr.label,
          source: "test",
          origin_id: tr.origin_id,
          origin_month: tr.origin_month,
          target_month: tr.target_month,
          n_rows: tr.n_rows,
          n_siaga: tr.n_siaga,
          n_waspada: tr.n_waspada,
          n_normal: tr.n_normal,
          n_escalated: tr.n_escalated,
          status: "ready",
          model_version: tr.model_version,
          has_realization: false,
        }).returning({ id: schema.forecastRuns.id });

        const preds = tr.predictions.map((p: any) => ({
          run_id: insertedRun.id,
          subdas_id: p.subdas_id,
          basin_id: p.basin_id,
          score: p.score,
          rank: p.rank,
          pct: p.pct,
          tier: p.tier,
          tier_final: p.tier_final,
          escalated_reason: p.escalated_reason,
          typology: p.typology,
          is_new: p.is_new,
          net_context: p.net_context,
          indicators: p.indicators,
          series: p.series,
          shap_top: p.shap_top,
        }));

        for (let b = 0; b < preds.length; b += 1000) {
          await db.insert(schema.predictions).values(preds.slice(b, b + 1000)).onConflictDoNothing();
        }
        console.log(`Seeded run ${insertedRun.id}: ${tr.label} (${preds.length} predictions)`);
      }
    }

    console.log("=== Seeding completed successfully! ===");
  } catch (err) {
    console.error("Error during seeding:", err);
  } finally {
    await pool.end();
  }
}

main();
