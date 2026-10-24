// Line-level diff (LCS) used to show original vs. repaired source.

export type DiffLine = { kind: "same" | "add" | "del"; text: string; a?: number; b?: number };

export function lineDiff(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const n = a.length;
  const m = b.length;
  // Guard against pathological sizes; MiniC inputs are bounded (64 KB).
  if (n * m > 4_000_000) {
    return [...a.map((t, i) => ({ kind: "del" as const, text: t, a: i + 1 })), ...b.map((t, j) => ({ kind: "add" as const, text: t, b: j + 1 }))];
  }
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ kind: "same", text: a[i], a: i + 1, b: j + 1 });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ kind: "del", text: a[i], a: i + 1 });
      i++;
    } else {
      out.push({ kind: "add", text: b[j], b: j + 1 });
      j++;
    }
  }
  while (i < n) out.push({ kind: "del", text: a[i], a: ++i });
  while (j < m) out.push({ kind: "add", text: b[j], b: ++j });
  return out;
}

/** Character-level highlight inside a changed line pair: common prefix/suffix. */
export function inlineChange(before: string, after: string): { prefix: number; suffixA: number; suffixB: number } {
  let p = 0;
  while (p < before.length && p < after.length && before[p] === after[p]) p++;
  let s = 0;
  while (s < before.length - p && s < after.length - p && before[before.length - 1 - s] === after[after.length - 1 - s]) s++;
  return { prefix: p, suffixA: before.length - s, suffixB: after.length - s };
}
