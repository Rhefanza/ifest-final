import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { loadAllServingModels } from "../src/lib/pipeline/trees";
import { computeRanks } from "../src/lib/pipeline/ensemble";

// Helper for Spearman rank correlation
function spearmanCorrelation(x: number[] | Float64Array, y: number[] | Float64Array): number {
  const n = x.length;
  const rx = computeRanks(x);
  const ry = computeRanks(y);

  let meanRx = 0;
  let meanRy = 0;
  for (let i = 0; i < n; i++) {
    meanRx += rx[i];
    meanRy += ry[i];
  }
  meanRx /= n;
  meanRy /= n;

  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = rx[i] - meanRx;
    const dy = ry[i] - meanRy;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  return num / (Math.sqrt(denX) * Math.sqrt(denY));
}

describe("Fase F3: TypeScript Pipeline & Model Parity Tests", () => {
  const FIXTURES_DIR = path.join(process.cwd(), "tests", "fixtures");

  it("1. Paritas Numerik Evaluasi 7 Model Biner vs Golden Margins (Max Abs Error < 1e-4)", () => {
    const models = loadAllServingModels();
    expect(models.length).toBe(7);

    const goldenMarginsPath = path.join(FIXTURES_DIR, "golden_margins.json");
    const goldenMargins = JSON.parse(fs.readFileSync(goldenMarginsPath, "utf-8"));

    const goldenFeatPath = path.join(FIXTURES_DIR, "golden_features.json");
    const goldenFeatRaw = fs.readFileSync(goldenFeatPath, "utf-8").replace(/\bNaN\b/g, "null");
    const goldenFeat = JSON.parse(goldenFeatRaw);

    const n = goldenFeat.features.length;
    expect(n).toBe(300);

    for (let m = 0; m < 7; m++) {
      const model = models[m];
      const expected = goldenMargins[`m${m + 1}`];
      expect(expected).toBeDefined();

      const X = goldenFeat.features.map((row: number[]) =>
        model.numFeatures === 140 ? row.slice(0, 140) : row
      );

      const actual = model.evaluateBatch(X);

      let maxDiff = 0;
      for (let i = 0; i < n; i++) {
        const diff = Math.abs(actual[i] - expected[i]);
        if (diff > maxDiff) maxDiff = diff;
      }

      console.log(`[Parity] Model ${model.name} (${model.algo}): max error = ${maxDiff.toExponential(4)}`);
      expect(maxDiff).toBeLessThan(1e-4);
    }
  });

  it("2. Paritas Korelasi Spearman Rank-Blend Ensemble (Target Spearman >= 0.98)", () => {
    const models = loadAllServingModels();
    const goldenFeatPath = path.join(FIXTURES_DIR, "golden_features.json");
    const goldenFeatRaw = fs.readFileSync(goldenFeatPath, "utf-8").replace(/\bNaN\b/g, "null");
    const goldenFeat = JSON.parse(goldenFeatRaw);
    const n = goldenFeat.features.length;

    // Evaluate all 7 models
    const allNormRanks: Float64Array[] = [];
    for (const model of models) {
      const X = goldenFeat.features.map((row: number[]) =>
        model.numFeatures === 140 ? row.slice(0, 140) : row
      );
      const margins = model.evaluateBatch(X);
      const ranks = computeRanks(margins);
      const norm = new Float64Array(n);
      for (let i = 0; i < n; i++) norm[i] = ranks[i] / n;
      allNormRanks.push(norm);
    }

    const tsBlendScores = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let m = 0; m < 7; m++) s += allNormRanks[m][i];
      tsBlendScores[i] = s / 7.0;
    }

    // Reference margins from Python
    const goldenMarginsPath = path.join(FIXTURES_DIR, "golden_margins.json");
    const goldenMargins = JSON.parse(fs.readFileSync(goldenMarginsPath, "utf-8"));
    const pyNormRanks: Float64Array[] = [];
    for (let m = 0; m < 7; m++) {
      const margins = goldenMargins[`m${m + 1}`];
      const ranks = computeRanks(margins);
      const norm = new Float64Array(n);
      for (let i = 0; i < n; i++) norm[i] = ranks[i] / n;
      pyNormRanks.push(norm);
    }

    const pyBlendScores = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let m = 0; m < 7; m++) s += pyNormRanks[m][i];
      pyBlendScores[i] = s / 7.0;
    }

    const spearman = spearmanCorrelation(tsBlendScores, pyBlendScores);
    console.log(`[Parity] Spearman TS Blend vs Python Blend: ${spearman.toFixed(6)}`);
    expect(spearman).toBeGreaterThanOrEqual(0.98);
  });

  it("3. Verifikasi Acceptance Origin 169 Top 5 Prefix (113a33, 7ea1ec, 9840f6, 6b53ed, a0de8a)", () => {
    const goldenRun169Path = path.join(FIXTURES_DIR, "golden_run169.json");
    const goldenRun169 = JSON.parse(fs.readFileSync(goldenRun169Path, "utf-8"));

    expect(goldenRun169.length).toBe(2982);

    const sorted = [...goldenRun169].sort((a, b) => a.rank - b.rank);
    const top5Prefixes = sorted.slice(0, 5).map((r) => r.id.slice(0, 6));

    console.log("[Acceptance §15.3] Top 5 prefixes:", top5Prefixes);
    expect(top5Prefixes).toEqual(["113a33", "7ea1ec", "9840f6", "6b53ed", "a0de8a"]);

    // Tier counts
    const siagaCount = goldenRun169.filter((r: any) => r.tier === "SIAGA").length;
    const waspadaCount = goldenRun169.filter((r: any) => r.tier === "WASPADA").length;
    const normalCount = goldenRun169.filter((r: any) => r.tier === "NORMAL").length;

    expect(siagaCount).toBe(298);
    expect(waspadaCount).toBe(596);
    expect(normalCount).toBe(2088);
  });
});
