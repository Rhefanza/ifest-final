// Pure TypeScript Tree Evaluator for uniform binary models (*.bin)
import fs from "fs";
import path from "path";

export interface TreeModel {
  name: string;
  algo: "lgb" | "xgb" | "cat";
  view: "base" | "full_te";
  numFeatures: number;
  evaluateRow: (features: Float64Array | number[]) => number;
  evaluateBatch: (X: Float64Array[] | number[][]) => Float64Array;
}

export function loadBinaryModel(binPath: string, name: string, view: "base" | "full_te"): TreeModel {
  const buffer = fs.readFileSync(binPath);
  const dataView = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  // Check magic (first 4 bytes)
  const magic = String.fromCharCode(
    dataView.getUint8(0),
    dataView.getUint8(1),
    dataView.getUint8(2),
    dataView.getUint8(3)
  );

  if (magic === "TR01") {
    const algoByte = dataView.getUint8(4); // 0 = LGB, 1 = XGB
    const algo = algoByte === 0 ? "lgb" : "xgb";
    const numTrees = dataView.getUint32(5, true);
    const numFeatures = dataView.getUint32(9, true);
    const baseLogit = dataView.getFloat64(13, true);
    const totalNodes = dataView.getUint32(21, true);

    let offset = 25;
    const treeOffsets = new Uint32Array(numTrees);
    for (let t = 0; t < numTrees; t++) {
      treeOffsets[t] = dataView.getUint32(offset, true);
      offset += 4;
    }

    // Read flat nodes
    // Each node: feat (h, 2), flags (B, 1), pad (B, 1), left (i, 4), right (i, 4), thr (d, 8), leaf (d, 8) = 28 bytes
    const nodeFeat = new Int16Array(totalNodes);
    const nodeFlags = new Uint8Array(totalNodes);
    const nodeLeft = new Int32Array(totalNodes);
    const nodeRight = new Int32Array(totalNodes);
    const nodeThr = new Float64Array(totalNodes);
    const nodeLeaf = new Float64Array(totalNodes);

    for (let n = 0; n < totalNodes; n++) {
      nodeFeat[n] = dataView.getInt16(offset, true);
      nodeFlags[n] = dataView.getUint8(offset + 2);
      // offset + 3 is pad
      nodeLeft[n] = dataView.getInt32(offset + 4, true);
      nodeRight[n] = dataView.getInt32(offset + 8, true);
      nodeThr[n] = dataView.getFloat64(offset + 12, true);
      nodeLeaf[n] = dataView.getFloat64(offset + 20, true);
      offset += 28;
    }

    const isLgb = algo === "lgb";

    const evaluateRow = (row: Float64Array | number[]): number => {
      let score = baseLogit;
      for (let t = 0; t < numTrees; t++) {
        let curr = treeOffsets[t];
        while (true) {
          const flags = nodeFlags[curr];
          if ((flags & 1) !== 0) {
            // is_leaf
            score += nodeLeaf[curr];
            break;
          }
          const feat = nodeFeat[curr];
          const val = row[feat];
          const dLeft = (flags & 2) !== 0;

          if (isLgb) {
            // LightGBM: <= threshold with double precision
            if (val === undefined || isNaN(val)) {
              curr = dLeft ? nodeLeft[curr] : nodeRight[curr];
            } else {
              curr = val <= nodeThr[curr] ? nodeLeft[curr] : nodeRight[curr];
            }
          } else {
            // XGBoost: < condition with float32 precision
            if (val === undefined || isNaN(val)) {
              curr = dLeft ? nodeLeft[curr] : nodeRight[curr];
            } else {
              curr =
                Math.fround(val) < Math.fround(nodeThr[curr])
                  ? nodeLeft[curr]
                  : nodeRight[curr];
            }
          }
        }
      }
      return score;
    };

    const evaluateBatch = (X: Float64Array[] | number[][]): Float64Array => {
      const n = X.length;
      const preds = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        preds[i] = evaluateRow(X[i]);
      }
      return preds;
    };

    return {
      name,
      algo,
      view,
      numFeatures,
      evaluateRow,
      evaluateBatch,
    };
  } else if (magic === "CB01") {
    // CatBoost oblivious trees
    const numTrees = dataView.getUint32(4, true);
    const numFeatures = dataView.getUint32(8, true);
    const scale = dataView.getFloat64(12, true);
    const bias = dataView.getFloat64(20, true);

    let offset = 28;

    interface CatTree {
      depth: number;
      feats: Int16Array;
      borders: Float32Array;
      leaves: Float32Array;
    }

    const trees: CatTree[] = [];

    for (let t = 0; t < numTrees; t++) {
      const depth = dataView.getUint8(offset);
      offset += 1;

      const feats = new Int16Array(depth);
      const borders = new Float32Array(depth);
      for (let d = 0; d < depth; d++) {
        feats[d] = dataView.getInt16(offset, true);
        borders[d] = dataView.getFloat32(offset + 2, true);
        offset += 6;
      }

      const numLeaves = 1 << depth;
      const leaves = new Float32Array(numLeaves);
      for (let l = 0; l < numLeaves; l++) {
        leaves[l] = dataView.getFloat32(offset, true);
        offset += 4;
      }

      trees.push({ depth, feats, borders, leaves });
    }

    const evaluateRow = (row: Float64Array | number[]): number => {
      let sum = 0.0;
      for (let t = 0; t < numTrees; t++) {
        const tree = trees[t];
        let idx = 0;
        for (let d = 0; d < tree.depth; d++) {
          const val = row[tree.feats[d]];
          const bit = val !== undefined && isFinite(val) && val > tree.borders[d] ? 1 : 0;
          idx |= bit << d;
        }
        sum += tree.leaves[idx];
      }
      return sum * scale + bias;
    };

    const evaluateBatch = (X: Float64Array[] | number[][]): Float64Array => {
      const n = X.length;
      const preds = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        preds[i] = evaluateRow(X[i]);
      }
      return preds;
    };

    return {
      name,
      algo: "cat",
      view,
      numFeatures,
      evaluateRow,
      evaluateBatch,
    };
  } else {
    throw new Error(`Format model biner tidak dikenali: magic=${magic}`);
  }
}

let cachedModels: TreeModel[] | null = null;

export function loadAllServingModels(): TreeModel[] {
  if (cachedModels) return cachedModels;

  const manifestPath = path.join(process.cwd(), "models", "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error("models/manifest.json tidak ditemukan");
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  cachedModels = manifest.members.map((m: any) => {
    const binPath = path.join(process.cwd(), "models", m.filename);
    return loadBinaryModel(binPath, m.name, m.view);
  });

  return cachedModels!;
}
