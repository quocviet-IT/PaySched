/** Levenshtein-based similarity in [0,1]. */
export function similarity(a: string, b: string): number {
  const s1 = String(a ?? "").toLowerCase().trim();
  const s2 = String(b ?? "").toLowerCase().trim();
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array(n + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = s1[i - 1] === s2[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return 1 - dp[m][n] / Math.max(m, n);
}

export function fuzzyMatch<T extends { vendorName?: string; vendor?: string }>(
  text: string,
  candidates: T[],
): { match: T | null; score: number } {
  let best: T | null = null;
  let score = 0;
  for (const c of candidates) {
    const target = c.vendorName ?? c.vendor ?? "";
    const sc = similarity(text, target);
    if (sc > score) {
      score = sc;
      best = c;
    }
  }
  return { match: best, score };
}
