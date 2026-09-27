import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  smallint,
  serial,
  timestamp,
  jsonb,
  primaryKey,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";

// Enums
export const tierEnum = pgEnum("tier", ["SIAGA", "WASPADA", "NORMAL"]);
export const typologyEnum = pgEnum("typology", ["kilat", "airtanah", "irigasi", "campuran"]);
export const runSourceEnum = pgEnum("run_source", ["test", "history", "upload"]);
export const runStatusEnum = pgEnum("run_status", ["processing", "ready", "failed"]);

// 1. Sub-DAS static master
export const subdas = pgTable("subdas", {
  id: text("id").primaryKey(),
  to_id: text("to_id").notNull(),
  basin_id: integer("basin_id").notNull(),
  typology: typologyEnum("typology").notNull(),
  in_train: boolean("in_train").notNull().default(true),
  is_new_in_test: boolean("is_new_in_test").notNull().default(false),
  inc_area: real("inc_area"),
  cum_area: real("cum_area"),
  pop_2020: real("pop_2020"),
  bfi: real("bfi"),
  amplitude: real("amplitude"),
  demand_load: real("demand_load"),
  irrigation_share: real("irrigation_share"),
  demand_supply_ratio: real("demand_supply_ratio"),
  r4_flag: boolean("r4_flag").notNull().default(false),
});

// 2. Basins master
export const basins = pgTable("basins", {
  id: integer("id").primaryKey(),
  n_subdas: integer("n_subdas").notNull(),
  is_new: boolean("is_new").notNull().default(false),
  outlet_ids: text("outlet_ids"), // semicolon separated or json string
});

// 3. Forecast Runs
export const forecastRuns = pgTable("forecast_runs", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  source: runSourceEnum("source").notNull(),
  origin_id: integer("origin_id"),
  t_index: integer("t_index"),
  origin_month: integer("origin_month").notNull(),
  target_month: integer("target_month").notNull(),
  n_rows: integer("n_rows").notNull(),
  n_siaga: integer("n_siaga").notNull().default(0),
  n_waspada: integer("n_waspada").notNull().default(0),
  n_normal: integer("n_normal").notNull().default(0),
  n_escalated: integer("n_escalated").notNull().default(0),
  status: runStatusEnum("status").notNull().default("ready"),
  dq_report: jsonb("dq_report"),
  timings: jsonb("timings"),
  model_version: text("model_version").notNull().default("iris-serving-v1"),
  has_realization: boolean("has_realization").notNull().default(false),
  blob_url: text("blob_url"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  released_at: timestamp("released_at", { withTimezone: true }),
});

// 4. Predictions per run
export const predictions = pgTable(
  "predictions",
  {
    run_id: integer("run_id")
      .notNull()
      .references(() => forecastRuns.id, { onDelete: "cascade" }),
    subdas_id: text("subdas_id").notNull(),
    basin_id: integer("basin_id").notNull(),
    score: real("score").notNull(),
    rank: integer("rank").notNull(),
    pct: real("pct").notNull(),
    tier: tierEnum("tier").notNull(),
    tier_final: tierEnum("tier_final").notNull(),
    escalated_reason: text("escalated_reason"),
    typology: typologyEnum("typology").notNull(),
    is_new: boolean("is_new").notNull().default(false),
    net_context: text("net_context").notNull(),
    indicators: jsonb("indicators"),
    series: jsonb("series"),
    shap_top: jsonb("shap_top"),
    ws_lag0: real("ws_lag0"),
    clim_now: real("clim_now"),
    realized: smallint("realized"),
    episode_len: integer("episode_len"),
  },
  (table) => [
    primaryKey({ columns: [table.run_id, table.subdas_id] }),
    index("pred_run_rank_idx").on(table.run_id, table.rank),
    index("pred_run_basin_idx").on(table.run_id, table.basin_id),
    index("pred_subdas_idx").on(table.subdas_id),
  ]
);

// 5. Inspections
export const inspections = pgTable("inspections", {
  id: serial("id").primaryKey(),
  run_id: integer("run_id")
    .notNull()
    .references(() => forecastRuns.id, { onDelete: "cascade" }),
  subdas_id: text("subdas_id").notNull(),
  status: text("status").notNull().default("belum"), // 'belum' | 'dijadwalkan' | 'selesai'
  result: text("result"), // 'terkonfirmasi' | 'tidak' | 'belum_pasti'
  note: text("note"),
  source: text("source").notNull().default("manual"), // 'manual' | 'label_asli'
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 6. Basin Plans
export const basinPlans = pgTable(
  "basin_plans",
  {
    run_id: integer("run_id")
      .notNull()
      .references(() => forecastRuns.id, { onDelete: "cascade" }),
    basin_id: integer("basin_id").notNull(),
    has_plan: boolean("has_plan").notNull().default(false),
    note: text("note"),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.run_id, table.basin_id] })]
);

// 7. Run Metrics
export const runMetrics = pgTable("run_metrics", {
  run_id: integer("run_id")
    .primaryKey()
    .references(() => forecastRuns.id, { onDelete: "cascade" }),
  ap: real("ap").notNull(),
  base_rate: real("base_rate").notNull(),
  lift: real("lift").notNull(),
  p_at_10: real("p_at_10").notNull(),
  r_at_30: real("r_at_30").notNull(),
  by_tier: jsonb("by_tier"),
  by_type: jsonb("by_type"),
  onset_recall: real("onset_recall"),
  cont_recall: real("cont_recall"),
  computed_at: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
});

// 8. Uploads record
export const uploads = pgTable("uploads", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull(), // 'data' | 'realisasi'
  filename: text("filename").notNull(),
  blob_url: text("blob_url").notNull(),
  run_id: integer("run_id"),
  status: text("status").notNull().default("processing"), // 'processing' | 'ready' | 'failed'
  error: text("error"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 9. Insights
export const insights = pgTable("insights", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});
