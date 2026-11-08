/** Small numerical helpers for the Phase 3 simulators. */

/** Solve A x = b for a small dense system (Gaussian elimination with partial pivoting). */
export function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c] || 1e-12;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / d;
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / (row[i] || 1e-12));
}

/** OLS coefficients for rows X (each row a regressor vector) and outcome y. */
export function ols(X: number[][], y: number[]): number[] {
  const k = X[0].length;
  const XtX = Array.from({ length: k }, () => new Array(k).fill(0));
  const Xty = new Array(k).fill(0);
  for (let i = 0; i < X.length; i++) {
    const r = X[i];
    for (let a = 0; a < k; a++) {
      Xty[a] += r[a] * y[i];
      for (let b = a; b < k; b++) XtX[a][b] += r[a] * r[b];
    }
  }
  for (let a = 0; a < k; a++) for (let b = 0; b < a; b++) XtX[a][b] = XtX[b][a];
  return solve(XtX, Xty);
}

/** Logit by Newton–Raphson; returns fitted probabilities. */
export function logitFit(X: number[][], t: boolean[], iters = 8): number[] {
  const k = X[0].length;
  let b = new Array(k).fill(0);
  for (let it = 0; it < iters; it++) {
    const H = Array.from({ length: k }, () => new Array(k).fill(0));
    const g = new Array(k).fill(0);
    for (let i = 0; i < X.length; i++) {
      const r = X[i];
      const z = r.reduce((s, v, j) => s + v * b[j], 0);
      const p = 1 / (1 + Math.exp(-z)), w = p * (1 - p);
      for (let a = 0; a < k; a++) {
        g[a] += ((t[i] ? 1 : 0) - p) * r[a];
        for (let c = 0; c < k; c++) H[a][c] += w * r[a] * r[c];
      }
    }
    for (let a = 0; a < k; a++) H[a][a] += 1e-8;
    const step = solve(H, g);
    b = b.map((v, j) => v + step[j]);
  }
  return X.map((r) => 1 / (1 + Math.exp(-r.reduce((s, v, j) => s + v * b[j], 0))));
}

export const logistic = (z: number) => 1 / (1 + Math.exp(-z));
export const sd = (x: number[]) => {
  const m = x.reduce((s, v) => s + v, 0) / x.length;
  return Math.sqrt(x.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, x.length - 1));
};
export const avg = (x: number[]) => x.reduce((s, v) => s + v, 0) / Math.max(1, x.length);

/** k-subsets of {0..n-1} (only for small n). */
export function combinations(n: number, k: number): number[][] {
  const out: number[][] = [];
  const cur: number[] = [];
  const rec = (start: number) => {
    if (cur.length === k) { out.push([...cur]); return; }
    for (let i = start; i <= n - (k - cur.length); i++) { cur.push(i); rec(i + 1); cur.pop(); }
  };
  rec(0);
  return out;
}
