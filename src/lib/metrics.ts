/**
 * Evaluation metrics matching Scikit-Learn implementations
 */

export function calculateAveragePrecision(
  yTrue: number[],
  yScore: number[]
): number {
  if (yTrue.length === 0 || yScore.length === 0) return 0;
  const n = yTrue.length;
  
  // Count total positives
  let totalPos = 0;
  for (let i = 0; i < n; i++) {
    if (yTrue[i] === 1) totalPos++;
  }
  if (totalPos === 0) return 0;
  if (totalPos === n) return 1.0;

  // Pair scores with labels and sort descending by score
  const pairs: { score: number; label: number }[] = new Array(n);
  for (let i = 0; i < n; i++) {
    pairs[i] = { score: yScore[i], label: yTrue[i] };
  }
  // Stable sort descending
  pairs.sort((a, b) => b.score - a.score);

  // Calculate Precision-Recall curve points matching sklearn average_precision_score
  // AP = sum((R_n - R_{n-1}) * P_n)
  let tp = 0;
  let fp = 0;
  let prevRecall = 0;
  let ap = 0;

  let i = 0;
  while (i < n) {
    const currentScore = pairs[i].score;
    // Process all tied scores together
    while (i < n && pairs[i].score === currentScore) {
      if (pairs[i].label === 1) {
        tp++;
      } else {
        fp++;
      }
      i++;
    }

    const precision = tp / (tp + fp);
    const recall = tp / totalPos;
    ap += (recall - prevRecall) * precision;
    prevRecall = recall;
  }

  return ap;
}

export function calculatePrecisionAtFraction(
  yTrue: number[],
  yScore: number[],
  fraction: number = 0.10
): number {
  if (yTrue.length === 0) return 0;
  const n = yTrue.length;
  const k = Math.max(1, Math.round(n * fraction));

  const pairs = yTrue.map((yt, idx) => ({ yt, score: yScore[idx] }));
  pairs.sort((a, b) => b.score - a.score);

  let tp = 0;
  for (let i = 0; i < k; i++) {
    if (pairs[i].yt === 1) tp++;
  }
  return tp / k;
}

export function calculateRecallAtFraction(
  yTrue: number[],
  yScore: number[],
  fraction: number = 0.30
): number {
  if (yTrue.length === 0) return 0;
  const n = yTrue.length;
  const k = Math.max(1, Math.round(n * fraction));

  let totalPos = 0;
  for (let i = 0; i < n; i++) {
    if (yTrue[i] === 1) totalPos++;
  }
  if (totalPos === 0) return 0;

  const pairs = yTrue.map((yt, idx) => ({ yt, score: yScore[idx] }));
  pairs.sort((a, b) => b.score - a.score);

  let tp = 0;
  for (let i = 0; i < k; i++) {
    if (pairs[i].yt === 1) tp++;
  }
  return tp / totalPos;
}
