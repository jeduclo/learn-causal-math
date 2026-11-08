"use client";
import { useMemo, useState } from "react";
import { Legend, Plot, Seg, SimShell, Slider, Stat, curve, fmt, normCdf, normPdf, rng, useSeed } from "./kit";
import { avg, logitFit, logistic, ols } from "./kit2";

const C1 = "var(--s1)", C2 = "var(--s2)", C3 = "var(--s3)", C4 = "var(--s4)";

/** Local-linear regression with a Gaussian kernel. */
export function llPredict(xs: number[], ys: number[], x0s: number[], h: number) {
  return x0s.map((x0) => {
    let s0 = 0, s1 = 0, s2 = 0, t0 = 0, t1 = 0;
    for (let i = 0; i < xs.length; i++) {
      const d = xs[i] - x0, w = Math.exp(-0.5 * (d / h) ** 2);
      s0 += w; s1 += w * d; s2 += w * d * d; t0 += w * ys[i]; t1 += w * d * ys[i];
    }
    const det = s0 * s2 - s1 * s1;
    return Math.abs(det) < 1e-12 ? t0 / Math.max(s0, 1e-12) : (s2 * t0 - s1 * t1) / det;
  });
}
const poly = (x: number, k: number) => Array.from({ length: k + 1 }, (_, j) => x ** j);

/* ---------------- Day 91: PLR versus IRM ---------------- */
export function DmlPlrLab() {
  const [g, setG] = useState(1.5), [h, setH] = useState(1.5), [seed, reseed] = useSeed();
  const res = useMemo(() => {
    const r = rng(seed * 43 + 91), n = 3000;
    const e = (x: number) => logistic(g * x - 0.3), tau = (x: number) => 1 + h * (x * x - 1);
    const X = Array.from({ length: n }, () => r.n());
    const D = X.map((x) => r.u() < e(x)), Y = X.map((x, i) => Math.sin(x) + 0.5 * x * x + (D[i] ? tau(x) : 0) + r.n());
    let a = 0, b = 0, c = 0, z = 0;
    for (let x = -5; x <= 5; x += 0.01) { const p = normPdf(x), w = e(x) * (1 - e(x)); a += p * w * tau(x); b += p * w; c += p * tau(x); z += p; }
    const plrT = a / b, ate = c / z;
    const eh = logitFit(X.map((x) => [1, x, x * x]), D).map((p) => Math.min(0.98, Math.max(0.02, p)));
    const bl = ols(X.map((x) => poly(x, 4)), Y), lh = X.map((x) => poly(x, 4).reduce((s, v, j) => s + v * bl[j], 0));
    const rD = D.map((d, i) => (d ? 1 : 0) - eh[i]), rY = Y.map((y, i) => y - lh[i]);
    const plr = rD.reduce((s, v, i) => s + v * rY[i], 0) / rD.reduce((s, v) => s + v * v, 0);
    const t = X.map((_, i) => i).filter((i) => D[i]), cc = X.map((_, i) => i).filter((i) => !D[i]);
    const b1 = ols(t.map((i) => poly(X[i], 3)), t.map((i) => Y[i])), b0 = ols(cc.map((i) => poly(X[i], 3)), cc.map((i) => Y[i]));
    const f = (bb: number[], x: number) => poly(x, 3).reduce((s, v, j) => s + v * bb[j], 0);
    const phi = X.map((x, i) => { const m1 = f(b1, x), m0 = f(b0, x); return m1 - m0 + (D[i] ? (Y[i] - m1) / eh[i] : -(Y[i] - m0) / (1 - eh[i])); });
    return { plrT, ate, plr, irm: avg(phi), e, tau, Ew: b / z };
  }, [g, h, seed]);
  return (
    <SimShell note="A job-training programme with heterogeneous earnings effects τ(x) (dashed). The ATE averages τ over everyone (grey density). The partially linear model (PLR) averages it with weights e(x)(1 − e(x)), concentrated where enrolment is a toss-up (coloured density). When effects are largest where enrolment is nearly certain or nearly impossible, the two estimands diverge. Both DML estimators hit their own target.">
      <Plot x={[-3, 3]} y={[-2, 6]} height={280} xLabel="prior labour-market attachment x" yLabel="effect τ(x) · weights">
        {(sx, sy) => (
          <>
            <path d={curve((x) => -2 + 5 * normPdf(x), -3, 3, sx, sy)} stroke="var(--text-3)" strokeWidth={2} fill="none" />
            <path d={curve((x) => -2 + (5 * normPdf(x) * res.e(x) * (1 - res.e(x))) / res.Ew, -3, 3, sx, sy)} stroke={C1} strokeWidth={2.5} fill="none" />
            <path d={curve(res.tau, -3, 3, sx, sy)} stroke={C3} strokeWidth={2.5} strokeDasharray="6 4" fill="none" />
            <line x1={sx(-3)} x2={sx(3)} y1={sy(res.ate)} y2={sy(res.ate)} stroke="var(--text-3)" strokeDasharray="2 3" />
            <line x1={sx(-3)} x2={sx(3)} y1={sy(res.plrT)} y2={sy(res.plrT)} stroke={C1} strokeDasharray="2 3" />
          </>
        )}
      </Plot>
      <Legend items={[{ color: C3, label: "τ(x)", dash: true }, { color: "var(--text-3)", label: "ATE weights (density of x)" }, { color: C1, label: "PLR weights ∝ density × e(1 − e)" }]} />
      <div className="mt-3 grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <div className="grid grid-cols-2 gap-3">
          <Slider label="Selection on x" value={g} min={0} max={3} step={0.1} onChange={setG} />
          <Slider label="Effect heterogeneity" value={h} min={0} max={2} step={0.1} onChange={setH} />
          <button className="btn w-fit" onClick={reseed}>New sample</button>
        </div>
        <div className="grid grid-cols-2 content-start gap-2">
          <Stat label="DML-IRM (AIPW)" value={fmt(res.irm, 3)} color={C3} sub={`ATE ${fmt(res.ate, 3)}`} />
          <Stat label="DML-PLR" value={fmt(res.plr, 3)} color={C1} sub={`PLR estimand ${fmt(res.plrT, 3)}`} />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 92: meta-learners ---------------- */
type ML = "S" | "T" | "X" | "DR";
export function MetaLearnersLab() {
  const [p, setP] = useState(0.08), [bw, setBw] = useState(0.06), [seed, reseed] = useSeed();
  const res = useMemo(() => {
    const r = rng(seed * 47 + 92), n = 800;
    const mu0 = (x: number) => 2 * Math.sin(3 * x) + 2 * x * x, tau = (x: number) => 1 + x;
    const X = Array.from({ length: n }, () => 2 * r.u() - 1);
    const D = X.map(() => r.u() < p), Y = X.map((x, i) => mu0(x) + (D[i] ? tau(x) : 0) + 0.5 * r.n());
    const grid = Array.from({ length: 41 }, (_, k) => -1 + k / 20);
    const t = X.map((_, i) => i).filter((i) => D[i]), c = X.map((_, i) => i).filter((i) => !D[i]);
    const xt = t.map((i) => X[i]), yt = t.map((i) => Y[i]), xc = c.map((i) => X[i]), yc = c.map((i) => Y[i]);
    const bS = ols(X.map((x, i) => [...poly(x, 3), D[i] ? 1 : 0]), Y);
    const S = grid.map(() => bS[4]);
    const m1g = llPredict(xt, yt, grid, bw), m0g = llPredict(xc, yc, grid, bw);
    const T = grid.map((_, k) => m1g[k] - m0g[k]);
    const d1 = yt.map((y, q) => y - llPredict(xc, yc, [xt[q]], bw)[0]);
    const d0 = xc.map((x, q) => llPredict(xt, yt, [x], bw)[0] - yc[q]);
    const g1 = llPredict(xt, d1, grid, Math.max(bw, 0.25)), g0 = llPredict(xc, d0, grid, Math.max(bw, 0.25));
    const Xl = grid.map((_, k) => p * g0[k] + (1 - p) * g1[k]);
    const m1 = llPredict(xt, yt, X, bw), m0 = llPredict(xc, yc, X, bw);
    const phi = X.map((_, i) => m1[i] - m0[i] + (D[i] ? (Y[i] - m1[i]) / p : -(Y[i] - m0[i]) / (1 - p)));
    const bD = ols(X.map((x) => [1, x]), phi), DR = grid.map((x) => bD[0] + bD[1] * x);
    const est: Record<ML, number[]> = { S, T, X: Xl, DR };
    const pehe = Object.fromEntries((Object.keys(est) as ML[]).map((k) => [k, Math.sqrt(avg(grid.map((x, q) => (est[k][q] - tau(x)) ** 2)))])) as Record<ML, number>;
    return { grid, est, pehe, tau, nt: t.length };
  }, [p, bw, seed]);
  const cols: Record<ML, string> = { S: "var(--text-3)", T: C2, X: C1, DR: C4 };
  return (
    <SimShell note="A cash-transfer pilot whose effect on school attendance rises with a poverty index x (truth: dashed line), while attendance without the transfer varies in a complicated way. With few treated households, the T-learner's treated-arm fit is crude and imports the wiggles of the baseline curve; the S-learner (a regression with a treatment dummy) reports a constant effect; the X- and DR-learners recover the slope.">
      <Plot x={[-1, 1]} y={[-1.5, 3.5]} height={290} xLabel="poverty index x" yLabel="estimated effect τ̂(x)">
        {(sx, sy) => (
          <>
            {(Object.keys(res.est) as ML[]).map((k) => (
              <path key={k} d={res.grid.map((x, q) => `${q ? "L" : "M"}${sx(x)},${sy(Math.max(-1.5, Math.min(3.5, res.est[k][q])))}`).join("")} stroke={cols[k]} strokeWidth={k === "S" ? 2 : 2.5} fill="none" />
            ))}
            <path d={curve(res.tau, -1, 1, sx, sy)} stroke={C3} strokeWidth={3} strokeDasharray="6 4" fill="none" />
          </>
        )}
      </Plot>
      <Legend items={[{ color: C3, label: "true CATE", dash: true }, { color: "var(--text-3)", label: "S-learner" }, { color: C2, label: "T-learner" }, { color: C1, label: "X-learner" }, { color: C4, label: "DR-learner (linear final stage)" }]} />
      <div className="mt-3 grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <div className="grid grid-cols-2 gap-3">
          <Slider label="Share treated" value={p} min={0.05} max={0.5} step={0.01} onChange={setP} format={(v) => v.toFixed(2)} />
          <Slider label="Smoother bandwidth" value={bw} min={0.04} max={0.4} step={0.01} onChange={setBw} format={(v) => v.toFixed(2)} />
          <button className="btn w-fit" onClick={reseed}>New sample</button>
        </div>
        <div className="grid grid-cols-2 content-start gap-2">
          {(Object.keys(res.pehe) as ML[]).map((k) => <Stat key={k} label={`PEHE · ${k}-learner`} value={fmt(res.pehe[k], 3)} color={cols[k]} />)}
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 93: causal trees and honesty ---------------- */
function dm(Y: number[], D: boolean[]) {
  const a = Y.filter((_, i) => D[i]), b = Y.filter((_, i) => !D[i]);
  const ma = avg(a), mb = avg(b);
  const va = a.reduce((s, v) => s + (v - ma) ** 2, 0) / Math.max(1, a.length - 1), vb = b.reduce((s, v) => s + (v - mb) ** 2, 0) / Math.max(1, b.length - 1);
  return { t: ma - mb, se: Math.sqrt(va / Math.max(1, a.length) + vb / Math.max(1, b.length)) };
}
const THR = Array.from({ length: 15 }, (_, k) => 0.15 + k * 0.05);
function bestSplit(X: number[][], Y: number[], D: boolean[]) {
  let best = { crit: -Infinity, j: 0, c: 0.5 };
  const base = dm(Y, D).t ** 2;                      // criterion of the unsplit root
  const curves: number[][] = X[0].map(() => []);
  for (let j = 0; j < X[0].length; j++) for (const c of THR) {
    const L = X.map((x) => x[j] <= c);
    const yl = Y.filter((_, i) => L[i]), dl = D.filter((_, i) => L[i]), yr = Y.filter((_, i) => !L[i]), dr = D.filter((_, i) => !L[i]);
    const crit = yl.length * dm(yl, dl).t ** 2 + yr.length * dm(yr, dr).t ** 2;
    curves[j].push(crit / Y.length - base);
    if (crit > best.crit) best = { crit, j, c };
  }
  return { ...best, curves };
}
export function CausalTreeLab() {
  const [delta, setDelta] = useState(0), [mode, setMode] = useState<"adaptive" | "honest">("honest"), [seed, reseed] = useSeed();
  const P = 5;
  const gen = (r: ReturnType<typeof rng>, n: number) => {
    const X = Array.from({ length: n }, () => Array.from({ length: P }, () => r.u()));
    const D = X.map(() => r.u() < 0.5), Y = X.map((x, i) => x[1] + (D[i] ? 1 + delta * (x[0] > 0.5 ? 1 : 0) : 0) + r.n());
    return { X, D, Y };
  };
  const leafTruth = (j: number, c: number) => (j === 0 ? [1 + (delta * Math.max(0, c - 0.5)) / c, 1 + (delta * (1 - Math.max(c, 0.5))) / (1 - c)] : [1 + delta / 2, 1 + delta / 2]);
  const fitTree = (X: number[][], Y: number[], D: boolean[], honest: boolean, r: ReturnType<typeof rng>) => {
    const A = X.map(() => !honest || r.u() < 0.5);
    const sp = bestSplit(X.filter((_, i) => A[i]), Y.filter((_, i) => A[i]), D.filter((_, i) => A[i]));
    const E = honest ? A.map((a) => !a) : A;
    const L = X.map((x) => x[sp.j] <= sp.c);
    const sel = (side: boolean) => X.map((_, i) => E[i] && L[i] === side);
    const lv = [true, false].map((side) => { const s = sel(side); return dm(Y.filter((_, i) => s[i]), D.filter((_, i) => s[i])); });
    return { sp, lv };
  };
  const res = useMemo(() => {
    const r = rng(seed * 53 + 93), d = gen(r, 1000);
    const one = fitTree(d.X, d.Y, d.D, mode === "honest", r);
    let cov = 0, gap = 0, pick = 0;
    const R = 120;
    for (let k = 0; k < R; k++) {
      const s = gen(r, 1000), f = fitTree(s.X, s.Y, s.D, mode === "honest", r), tr = leafTruth(f.sp.j, f.sp.c);
      cov += f.lv.filter((l, q) => Math.abs(l.t - tr[q]) < 1.96 * l.se).length / 2;
      gap += Math.abs(f.lv[0].t - f.lv[1].t) - Math.abs(tr[0] - tr[1]);
      pick += f.sp.j === 0 ? 1 : 0;
    }
    return { one, cov: cov / R, gap: gap / R, pick: pick / R, truth: leafTruth(one.sp.j, one.sp.c) };
  }, [delta, mode, seed]);
  const cmax = Math.max(0.01, ...res.one.sp.curves.flat()) * 1.1;
  return (
    <SimShell note="A trial of text reminders for medication adherence with five baseline covariates. The tree tries every split on every covariate (curves: the splitting criterion) and picks the highest. Estimating leaf effects on the same data overstates differences and gives confidence intervals that undercover; honest trees choose the split on one half and estimate on the other. Statistics on the right come from 120 fresh replications.">
      <Plot x={[0.1, 0.9]} y={[0, cmax]} height={260} xLabel="split threshold" yLabel="gain in criterion over no split">
        {(sx, sy) => (
          <>
            {res.one.sp.curves.map((cv, j) => (
              <path key={j} d={cv.map((v, q) => `${q ? "L" : "M"}${sx(THR[q])},${sy(v)}`).join("")} stroke={j === 0 ? C1 : "var(--text-3)"} strokeWidth={j === 0 ? 3 : 1.5} opacity={j === 0 ? 1 : 0.6} fill="none" />
            ))}
            <line x1={sx(res.one.sp.c)} x2={sx(res.one.sp.c)} y1={sy(0)} y2={sy(cmax)} stroke={C3} strokeWidth={2} strokeDasharray="5 4" />
          </>
        )}
      </Plot>
      <Legend items={[{ color: C1, label: "splits on x₁ (the true modifier)" }, { color: "var(--text-3)", label: "splits on noise covariates" }, { color: C3, label: "chosen split", dash: true }]} />
      <div className="mt-3 grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <div className="grid gap-3">
          <Seg options={[{ value: "adaptive", label: "adaptive (same data)" }, { value: "honest", label: "honest (split sample)" }]} value={mode} onChange={setMode} />
          <Slider label="True extra effect when x₁ > 0.5" value={delta} min={0} max={2} step={0.1} onChange={setDelta} />
          <button className="btn w-fit" onClick={reseed}>New sample</button>
        </div>
        <div className="grid grid-cols-2 content-start gap-2">
          <Stat label={`leaf effects (split x${res.one.sp.j + 1} ≤ ${res.one.sp.c.toFixed(2)})`} value={`${fmt(res.one.lv[0].t, 2)} | ${fmt(res.one.lv[1].t, 2)}`} sub={`truth ${fmt(res.truth[0], 2)} | ${fmt(res.truth[1], 2)}`} />
          <Stat label="leaf CI coverage" value={fmt(res.cov, 2)} color={res.cov < 0.9 ? C3 : C1} sub="nominal 0.95" />
          <Stat label="excess |gap| between leaves" value={fmt(res.gap, 3)} />
          <Stat label="share splitting on x₁" value={fmt(res.pick, 2)} />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 94: policy learning ---------------- */
export function PolicyLab() {
  const [cost, setCost] = useState(0.8), [n, setN] = useState(2000), [seed, reseed] = useSeed();
  const tau = (x: number[]) => 1.5 - 2 * x[0] + 0.5 * x[1];
  const res = useMemo(() => {
    const r = rng(seed * 59 + 94);
    const X = Array.from({ length: n }, () => [r.u(), r.u()]), D = X.map(() => r.u() < 0.5);
    const Y = X.map((x, i) => 2 + (D[i] ? tau(x) : 0) + 2 * r.n());
    const t = X.map((_, i) => i).filter((i) => D[i]), c = X.map((_, i) => i).filter((i) => !D[i]);
    const b1 = ols(t.map((i) => [1, ...X[i]]), t.map((i) => Y[i])), b0 = ols(c.map((i) => [1, ...X[i]]), c.map((i) => Y[i]));
    const phi = X.map((x, i) => { const m1 = b1[0] + b1[1] * x[0] + b1[2] * x[1], m0 = b0[0] + b0[1] * x[0] + b0[2] * x[1]; return m1 - m0 + (D[i] ? 2 * (Y[i] - m1) : -2 * (Y[i] - m0)); });
    let best = { w: -Infinity, j: 0, t: 0, s: 1 };
    for (let j = 0; j < 2; j++) for (let k = 0; k <= 50; k++) for (const s of [1, -1]) {
      const th = k / 50, w = avg(X.map((x, i) => (s * x[j] <= s * th ? phi[i] - cost : 0)));
      if (w > best.w) best = { w, j, t: th, s };
    }
    const G = 120; let tw = 0, all = 0, fb = 0;
    for (let a = 0; a < G; a++) for (let b = 0; b < G; b++) {
      const x = [(a + 0.5) / G, (b + 0.5) / G], nb = tau(x) - cost;
      all += nb; fb += Math.max(0, nb); if (best.s * x[best.j] <= best.s * best.t) tw += nb;
    }
    return { best, tw: tw / G / G, all: all / G / G, fb: fb / G / G };
  }, [cost, n, seed]);
  const cells = 24;
  const inRule = (x: number[]) => res.best.s * x[res.best.j] <= res.best.s * res.best.t;
  return (
    <SimShell note="Job-search assistance, randomised among unemployed workers. Gains (in $1,000) fall with prior employment rate and rise slightly with age. Blue cells: the gain exceeds the cost; green: it does not. EWM chooses the threshold rule (hatched region = treat) that maximises AIPW-estimated net welfare. Its in-sample welfare is optimistic relative to its true value.">
      <Plot x={[0, 1]} y={[0, 1]} height={320} xLabel="prior employment rate" yLabel="age (scaled)">
        {(sx, sy) => (
          <>
            {Array.from({ length: cells * cells }, (_, q) => {
              const a = q % cells, b = Math.floor(q / cells), x = [(a + 0.5) / cells, (b + 0.5) / cells], nb = tau(x) - cost;
              return <rect key={q} x={sx(a / cells)} y={sy((b + 1) / cells)} width={sx(1 / cells) - sx(0) + 0.5} height={sy(0) - sy(1 / cells) + 0.5} fill={nb > 0 ? C1 : C3} opacity={Math.min(0.7, 0.12 + Math.abs(nb) * 0.4)} />;
            })}
            {Array.from({ length: cells * cells }, (_, q) => {
              const a = q % cells, b = Math.floor(q / cells), x = [(a + 0.5) / cells, (b + 0.5) / cells];
              return inRule(x) ? <circle key={"h" + q} cx={sx(x[0])} cy={sy(x[1])} r={2} fill="var(--text)" opacity={0.55} /> : null;
            })}
            <path d={curve((x0) => { const v = (2 * x0 - 1.5 + cost) / 0.5; return v < 0 || v > 1 ? NaN : v; }, 0, 1, sx, sy, 400)} stroke="var(--text)" strokeWidth={2} strokeDasharray="5 4" fill="none" />
          </>
        )}
      </Plot>
      <Legend items={[{ color: C1, label: "gain > cost", area: true }, { color: C3, label: "gain < cost", area: true }, { color: "var(--text)", label: "first-best boundary", dash: true }]} />
      <div className="mt-3 grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <div className="grid grid-cols-2 gap-3">
          <Slider label="Cost per participant ($1,000)" value={cost} min={0} max={2} step={0.05} onChange={setCost} />
          <Slider label="Sample size" value={n} min={300} max={6000} step={100} onChange={setN} />
          <button className="btn w-fit" onClick={reseed}>New sample</button>
        </div>
        <div className="grid grid-cols-2 content-start gap-2">
          <Stat label="EWM rule" value={`treat if ${res.best.j === 0 ? "employment" : "age"} ${res.best.s === 1 ? "≤" : "≥"} ${res.best.t.toFixed(2)}`} />
          <Stat label="in-sample welfare" value={fmt(res.best.w, 3)} color={C2} />
          <Stat label="true welfare of rule" value={fmt(res.tw, 3)} color={C1} sub={`first-best ${fmt(res.fb, 3)}`} />
          <Stat label="treat everyone" value={fmt(res.all, 3)} />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 95: sensitivity analysis ---------------- */
export function SensitivityLab() {
  const [est, setEst] = useState(-0.465), [t, setT] = useState(-6), [bk, setBk] = useState(1);
  const df = 1000, se = Math.abs(est / t), k = se * Math.sqrt(df);
  const bench = [0.04, 0.06];                                   // income: R²(D~Z|X), R²(Y~Z|D,X)
  const bias = (rd: number, ry: number) => k * Math.sqrt((ry * rd) / (1 - rd));
  const adj = (rd: number, ry: number) => Math.sign(est) * (Math.abs(est) - bias(rd, ry));
  const f = Math.abs(t) / Math.sqrt(df), RV = 0.5 * (Math.sqrt(f ** 4 + 4 * f ** 2) - f ** 2);
  const fa = Math.max(0, f - 1.96 / Math.sqrt(df - 1)), RVa = 0.5 * (Math.sqrt(fa ** 4 + 4 * fa ** 2) - fa ** 2);
  const bp = [Math.min(0.6, bk * bench[0]), Math.min(0.6, bk * bench[1])];
  const zeroLine = (rd: number) => (est * est * (1 - rd)) / (k * k * rd);
  const ciLine = (rd: number) => ((Math.abs(est) - 1.96 * se) ** 2 * (1 - rd)) / (k * k * rd);
  const G = 30;
  return (
    <SimShell note="Each point is a hypothetical unobserved confounder, described by how much residual variation it explains in exposure (horizontal) and in the outcome (vertical). Shading shows the bias-adjusted estimate of the effect of PM2.5 on children's lung function. The solid curve is where it reaches zero, the dashed curve where the 95% interval would include zero. The diamond is a confounder k times as strong as household income; the dot on the diagonal is the robustness value.">
      <Plot x={[0, 0.6]} y={[0, 0.6]} height={320} xLabel="R² of confounder with exposure" yLabel="R² of confounder with outcome">
        {(sx, sy) => (
          <>
            {Array.from({ length: G * G }, (_, q) => {
              const a = q % G, b = Math.floor(q / G), rd = (a + 0.5) * 0.6 / G, ry = (b + 0.5) * 0.6 / G, v = adj(rd, ry) / Math.abs(est);
              return <rect key={q} x={sx((a * 0.6) / G)} y={sy(((b + 1) * 0.6) / G)} width={sx(0.6 / G) - sx(0) + 0.5} height={sy(0) - sy(0.6 / G) + 0.5} fill={v * Math.sign(est) > 0 ? C1 : C3} opacity={Math.min(0.55, 0.08 + Math.abs(v) * 0.45)} />;
            })}
            <path d={curve((x) => { const v = zeroLine(x); return v > 0.62 ? NaN : v; }, 0.002, 0.6, sx, sy)} stroke="var(--text)" strokeWidth={2.5} fill="none" />
            {Math.abs(est) > 1.96 * se && <path d={curve((x) => { const v = ciLine(x); return v > 0.62 ? NaN : v; }, 0.002, 0.6, sx, sy)} stroke="var(--text)" strokeWidth={2} strokeDasharray="5 4" fill="none" />}
            <line x1={sx(0)} y1={sy(0)} x2={sx(0.6)} y2={sy(0.6)} stroke="var(--text-3)" strokeDasharray="2 4" />
            <circle cx={sx(RV)} cy={sy(RV)} r={6} fill={C4} />
            <rect x={sx(bp[0]) - 7} y={sy(bp[1]) - 7} width={14} height={14} transform={`rotate(45 ${sx(bp[0])} ${sy(bp[1])})`} fill={C2} />
          </>
        )}
      </Plot>
      <Legend items={[{ color: "var(--text)", label: "adjusted estimate = 0" }, { color: "var(--text)", label: "95% CI reaches 0", dash: true }, { color: C4, label: "robustness value" }, { color: C2, label: `${bk}× income` }]} />
      <div className="mt-3 grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <div className="grid grid-cols-2 gap-3">
          <Slider label="Estimate" value={est} min={-1} max={-0.05} step={0.005} onChange={setEst} format={(v) => v.toFixed(3)} />
          <Slider label="t-statistic" value={t} min={-20} max={-1} step={0.1} onChange={setT} format={(v) => v.toFixed(1)} />
          <Slider label="Benchmark multiple of income (k)" value={bk} min={0.5} max={8} step={0.5} onChange={setBk} />
        </div>
        <div className="grid grid-cols-2 content-start gap-2">
          <Stat label="robustness value RV" value={fmt(RV, 3)} color={C4} />
          <Stat label="RV for 95% CI" value={fmt(RVa, 3)} />
          <Stat label={`adjusted estimate at ${bk}× income`} value={fmt(adj(bp[0], bp[1]), 3)} color={C2} />
          <Stat label="p-value" value={fmt(2 * (1 - normCdf(Math.abs(t))), 4)} sub="normal approximation" />
        </div>
      </div>
    </SimShell>
  );
}
