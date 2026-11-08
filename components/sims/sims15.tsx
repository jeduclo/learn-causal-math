"use client";
import { useMemo, useState } from "react";
import { Legend, Plot, Seg, SimShell, Slider, Stat, curve, fmt, rng, useSeed } from "./kit";
import { avg } from "./kit2";

const C1 = "var(--s1)", C2 = "var(--s2)", C3 = "var(--s3)", C4 = "var(--s4)";

/** Weighted local polynomial intercept (and slope) at 0 for data on one side (x >= 0). */
export function localFit(x: number[], y: number[], h: number, p: number, kern: "tri" | "uni" | "epa" = "tri") {
  const K = (u: number) => (u > 1 ? 0 : kern === "tri" ? 1 - u : kern === "uni" ? 0.5 : 0.75 * (1 - u * u));
  const k = p + 1;
  const A = Array.from({ length: k }, () => new Array(k).fill(0)), b = new Array(k).fill(0);
  const rows: { w: number; r: number[]; y: number }[] = [];
  for (let i = 0; i < x.length; i++) {
    const w = K(Math.abs(x[i]) / h); if (w <= 0) continue;
    const r = Array.from({ length: k }, (_, j) => x[i] ** j);
    rows.push({ w, r, y: y[i] });
    for (let a = 0; a < k; a++) { b[a] += w * r[a] * y[i]; for (let c = 0; c < k; c++) A[a][c] += w * r[a] * r[c]; }
  }
  if (rows.length <= k) return { coef: new Array(k).fill(NaN), se: NaN };
  // invert A (small)
  const inv = A.map((row, i) => [...row, ...Array.from({ length: k }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < k; c++) {
    let pv = c; for (let r = c + 1; r < k; r++) if (Math.abs(inv[r][c]) > Math.abs(inv[pv][c])) pv = r;
    [inv[c], inv[pv]] = [inv[pv], inv[c]];
    const d = inv[c][c] || 1e-12;
    for (let j = 0; j < 2 * k; j++) inv[c][j] /= d;
    for (let r = 0; r < k; r++) if (r !== c) { const f = inv[r][c]; for (let j = 0; j < 2 * k; j++) inv[r][j] -= f * inv[c][j]; }
  }
  const Ai = inv.map((row) => row.slice(k));
  const coef = Ai.map((row) => row.reduce((s, v, j) => s + v * b[j], 0));
  // robust variance of the intercept
  let v = 0;
  for (const { w, r, y } of rows) {
    const e = y - r.reduce((s, v2, j) => s + v2 * coef[j], 0);
    const g = Ai[0].reduce((s, a, j) => s + a * r[j], 0);
    v += (w * g * e) ** 2;
  }
  return { coef, se: Math.sqrt(v) };
}

/* ---------------- Day 71: group-time ATTs ---------------- */
export function CsDidLab() {
  const [imp, setImp] = useState(2), [grow, setGrow] = useState(0.5), [het, setHet] = useState(0), [nNever, setNNever] = useState(1);
  const T = 9, cohorts = [3, 5, 7];
  const res = useMemo(() => {
    const eff = (g: number, e: number) => (e >= 0 ? (imp + grow * e) * (1 + het * (g - 5) / 2) : 0);
    const Y: Record<string, number[]> = {};
    cohorts.forEach((g, i) => (Y[g] = Array.from({ length: T }, (_, t) => 2 + i + 0.5 * (t + 1) + eff(g, t + 1 - g))));
    Y.never = Array.from({ length: T }, (_, t) => 1 + 0.5 * (t + 1));
    const att: Record<string, number> = {};
    cohorts.forEach((g) => { for (let t = 1; t <= T; t++) att[`${g},${t}`] = (Y[g][t - 1] - Y[g][g - 2]) - (Y.never[t - 1] - Y.never[g - 2]); });
    const es = Array.from({ length: 7 }, (_, e) => {
      const v = cohorts.filter((g) => g + e <= T).map((g) => att[`${g},${g + e}`]);
      return v.length ? avg(v) : NaN;
    });
    const post = cohorts.flatMap((g) => Array.from({ length: T - g + 1 }, (_, e) => att[`${g},${g + e}`]));
    // TWFE with cohort weights (each cohort size 1, never size nNever)
    const rowsY = [...cohorts.map((g) => Y[g]), Y.never];
    const rowsD = [...cohorts.map((g) => Array.from({ length: T }, (_, t) => (t + 1 >= g ? 1 : 0))), new Array(T).fill(0)];
    const w = [1, 1, 1, nNever]; const ws = w.reduce((s, v) => s + v, 0);
    const dm = (M: number[][]) => {
      const rm = M.map((r) => avg(r));
      const cm = Array.from({ length: T }, (_, t) => M.reduce((s, r, i) => s + (w[i] / ws) * r[t], 0));
      const g = rm.reduce((s, v, i) => s + (w[i] / ws) * v, 0);
      return M.map((r, i) => r.map((v, t) => v - rm[i] - cm[t] + g));
    };
    const Dd = dm(rowsD);
    let a = 0, b = 0; Dd.forEach((r, i) => r.forEach((v, t) => { a += w[i] * v * rowsY[i][t]; b += w[i] * v * v; }));
    return { att, es, overall: avg(post), twfe: a / b, eff, Y };
  }, [imp, grow, het, nNever]);
  const vals = Object.values(res.att);
  const vmax = Math.max(1, ...vals.map(Math.abs));
  return (
    <SimShell note="Three adoption cohorts (periods 3, 5, 7) and never-treated units. Each cell is a clean 2×2 DiD of a cohort against never-treated units relative to its own last pre-period: ATT(g, t). Grey cells are pre-treatment placebos. The event study averages cells with the same time since adoption; the TWFE coefficient (right) uses already-treated cohorts as controls and drifts away when effects grow or differ across cohorts.">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="mb-1 text-xs font-semibold faint">ATT(g, t) — cohort rows, period columns</div>
          <table className="w-full text-center font-mono text-xs">
            <thead><tr><th className="faint">g \ t</th>{Array.from({ length: T }, (_, t) => <th key={t} className="faint">{t + 1}</th>)}</tr></thead>
            <tbody>{cohorts.map((g) => (
              <tr key={g}><th className="faint">{g}</th>{Array.from({ length: T }, (_, t) => {
                const v = res.att[`${g},${t + 1}`], pre = t + 1 < g;
                return <td key={t} className="px-0.5 py-1" style={{ background: pre ? "var(--surface-2)" : `color-mix(in oklab, ${v >= 0 ? C1 : C2} ${Math.min(80, (Math.abs(v) / vmax) * 75)}%, var(--surface))`, color: pre ? "var(--text-3)" : "var(--text)" }}>{t + 1 === g - 1 ? "ref" : fmt(v, 1)}</td>;
              })}</tr>
            ))}</tbody>
          </table>
          <div className="mt-3">
            <Plot x={[-0.5, 6.5]} y={[Math.min(0, ...res.es.filter(Number.isFinite)) - 0.5, Math.max(...res.es.filter(Number.isFinite)) + 0.8]} height={200} xLabel="event time e" yLabel="θ(e)" xTicks={[0, 1, 2, 3, 4, 5, 6]}>
              {(sx, sy) => (
                <>
                  {res.es.map((v, e) => Number.isFinite(v) && <rect key={e} x={sx(e) - 12} y={sy(Math.max(0, v))} width={24} height={Math.abs(sy(v) - sy(0))} fill={C1} opacity={0.8} rx={3} />)}
                  <path d={curve((e) => imp + grow * e, 0, 6, sx, sy)} fill="none" stroke="var(--text)" strokeDasharray="4 3" />
                </>
              )}
            </Plot>
          </div>
        </div>
        <div className="space-y-3">
          <Slider label="Effect on impact" value={imp} min={-1} max={4} step={0.1} onChange={setImp} />
          <Slider label="Effect growth per period" value={grow} min={-0.5} max={1.5} step={0.05} onChange={setGrow} />
          <Slider label="Cohort heterogeneity (later cohorts × (1 + h·(g−5)/2))" value={het} min={-0.6} max={0.6} step={0.05} onChange={setHet} />
          <Slider label="Size of never-treated group" value={nNever} min={0.25} max={4} step={0.25} onChange={setNNever} />
          <div className="grid grid-cols-2 gap-2">
            <Stat label="overall ATT (cell average)" value={fmt(res.overall, 3)} color={C1} />
            <Stat label="static TWFE" value={fmt(res.twfe, 3)} color={C2} sub={`bias ${fmt(res.twfe - res.overall, 3)}`} />
          </div>
          <Legend items={[{ color: C1, label: "event-study θ(e), robust" }, { color: "var(--text)", label: "effect profile of the middle cohort", dash: true }]} />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 72: triple differences ---------------- */
export function DddLab() {
  const [shock, setShock] = useState(-3), [gtrend, setGtrend] = useState(1), [tau, setTau] = useState(-3), [viol, setViol] = useState(0);
  // changes (post − pre) by state (T, C) and group (A affected, B other)
  const dTA = 2 + gtrend + shock + tau + viol, dTB = 2 + shock, dCA = 2 + gtrend, dCB = 2;
  const didA = dTA - dCA, didB = dTB - dCB, ddd = didA - didB;
  const bars = [
    { k: "treated state, affected", v: dTA, c: C1 }, { k: "comparison states, affected", v: dCA, c: "var(--text-3)" },
    { k: "treated state, others", v: dTB, c: C4 }, { k: "comparison states, others", v: dCB, c: "var(--text-2)" },
  ];
  const vmax = Math.max(4, ...bars.map((b) => Math.abs(b.v))) * 1.15;
  return (
    <SimShell note="Changes in log wages (%) before and after a state mandate that raises costs of employing married women aged 20–40 (the affected group). A state-wide shock hits everyone in the treated state; a national trend hits the affected group everywhere. DiD for the affected group picks up the state shock; DDD subtracts it using other workers in the same state. Only a shock specific to the treated state and the affected group (the violation) biases DDD.">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <svg viewBox="0 0 560 260" className="w-full">
          <line x1={20} x2={540} y1={130} y2={130} stroke="var(--border)" />
          {bars.map((b, i) => {
            const x = 40 + i * 125, hgt = (b.v / vmax) * 110;
            return (
              <g key={b.k}>
                <rect x={x} y={hgt >= 0 ? 130 - hgt : 130} width={90} height={Math.abs(hgt)} fill={b.c} opacity={0.85} rx={4} />
                <text x={x + 45} y={hgt >= 0 ? 124 - hgt : 146 - hgt} textAnchor="middle" style={{ fill: "var(--text)", fontWeight: 700 }}>{fmt(b.v, 1)}</text>
                <text x={x + 45} y={238} textAnchor="middle" style={{ fill: "var(--text)", fontSize: 11 }}>{b.k.split(", ")[0]}</text>
                <text x={x + 45} y={252} textAnchor="middle" style={{ fill: "var(--text-2)", fontSize: 11 }}>{b.k.split(", ")[1]}</text>
              </g>
            );
          })}
        </svg>
        <div className="space-y-3">
          <Slider label="State-wide shock in the treated state" value={shock} min={-6} max={6} step={0.5} onChange={setShock} />
          <Slider label="National trend for the affected group" value={gtrend} min={-4} max={4} step={0.5} onChange={setGtrend} />
          <Slider label="True effect of the mandate" value={tau} min={-8} max={4} step={0.5} onChange={setTau} />
          <Slider label="Violation: shock only to treated state × affected group" value={viol} min={-4} max={4} step={0.5} onChange={setViol} />
          <div className="grid grid-cols-2 gap-2">
            <Stat label="DiD, affected group" value={fmt(didA, 2)} color={C2} />
            <Stat label="DiD, other workers" value={fmt(didB, 2)} />
            <Stat label="DDD" value={fmt(ddd, 2)} color={C3} />
            <Stat label="truth" value={fmt(tau, 2)} />
          </div>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 73: sharp RD ---------------- */
export function RdSharpLab() {
  const [tau, setTau] = useState(5), [curv, setCurv] = useState(6), [noise, setNoise] = useState(3), [h, setH] = useState(0.3);
  const [method, setMethod] = useState<"ll" | "means" | "quartic">("ll");
  const [seed, reseed] = useSeed();
  const mu0 = (x: number) => 50 + 8 * x + curv * x * x - 4 * x * x * x;
  const data = useMemo(() => {
    const r = rng(seed * 3 + 73);
    return Array.from({ length: 600 }, () => { const x = 2 * r.u() - 1; return { x, y: mu0(x) + tau * (x >= 0 ? 1 : 0) + noise * r.n() }; });
  }, [tau, curv, noise, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const R = data.filter((d) => d.x >= 0), L = data.filter((d) => d.x < 0);
  let fitR: (x: number) => number, fitL: (x: number) => number, est: number;
  if (method === "ll") {
    const a = localFit(R.map((d) => d.x), R.map((d) => d.y), h, 1, "tri").coef, b = localFit(L.map((d) => -d.x), L.map((d) => d.y), h, 1, "tri").coef;
    fitR = (x) => a[0] + a[1] * x; fitL = (x) => b[0] - b[1] * x; est = a[0] - b[0];
  } else if (method === "means") {
    const mr = avg(R.filter((d) => d.x <= h).map((d) => d.y)), ml = avg(L.filter((d) => d.x >= -h).map((d) => d.y));
    fitR = () => mr; fitL = () => ml; est = mr - ml;
  } else {
    const a = localFit(R.map((d) => d.x), R.map((d) => d.y), 1.0001, 4, "uni").coef, b = localFit(L.map((d) => -d.x), L.map((d) => d.y), 1.0001, 4, "uni").coef;
    fitR = (x) => a.reduce((s, c, j) => s + c * x ** j, 0); fitL = (x) => b.reduce((s, c, j) => s + c * (-x) ** j, 0); est = a[0] - b[0];
  }
  const ys = data.map((d) => d.y);
  const span = method === "quartic" ? 1 : h;
  return (
    <SimShell note="Scholarship-style data: treatment switches on at x = 0. Local linear fits within the bandwidth (left and right) estimate the jump; a raw comparison of means inside the window is biased by the slope; global fourth-order polynomials use the whole range and are noisier. The true jump is set by the slider.">
      <div className="mb-3 flex flex-wrap gap-3">
        <Seg value={method} onChange={setMethod} options={[{ value: "ll", label: "Local linear" }, { value: "means", label: "Window means" }, { value: "quartic", label: "Global quartic" }]} />
        <button className="btn" onClick={reseed}>New sample</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Plot x={[-1, 1]} y={[Math.min(...ys) - 1, Math.max(...ys) + 1]} height={320} xLabel="running variable (score − cutoff)" yLabel="outcome">
          {(sx, sy) => (
            <>
              {method !== "quartic" && <rect x={sx(-h)} y={sy(Math.max(...ys) + 1)} width={sx(h) - sx(-h)} height={sy(Math.min(...ys) - 1) - sy(Math.max(...ys) + 1)} fill="var(--surface-2)" />}
              {data.map((d, i) => <circle key={i} cx={sx(d.x)} cy={sy(d.y)} r={2} fill={d.x >= 0 ? C1 : "var(--text-3)"} opacity={0.4} />)}
              <path d={curve(fitL, -span, 0, sx, sy)} fill="none" stroke={C2} strokeWidth={3} />
              <path d={curve(fitR, 0, span, sx, sy)} fill="none" stroke={C2} strokeWidth={3} />
              <line x1={sx(0)} x2={sx(0)} y1={sy(fitL(0))} y2={sy(fitR(0))} stroke={C3} strokeWidth={4} />
            </>
          )}
        </Plot>
        <div className="space-y-3">
          <Slider label="True jump τ" value={tau} min={-5} max={15} step={0.5} onChange={setTau} />
          <Slider label="Curvature of E[Y(0) | x]" value={curv} min={-20} max={20} step={1} onChange={setCurv} />
          <Slider label="Noise sd" value={noise} min={0.5} max={8} step={0.5} onChange={setNoise} />
          <Slider label="Bandwidth h" value={h} min={0.05} max={1} step={0.05} onChange={setH} />
          <div className="grid grid-cols-2 gap-2">
            <Stat label="estimated jump" value={fmt(est, 2)} color={C3} />
            <Stat label="truth" value={fmt(tau, 2)} />
          </div>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 74: local polynomials at a boundary ---------------- */
export function LocalPolyLab() {
  const [kern, setKern] = useState<"tri" | "uni" | "epa">("tri");
  const [p, setP] = useState(1), [h, setH] = useState(0.5), [slope, setSlope] = useState(4), [curv, setCurv] = useState(-3);
  const [seed, reseed] = useSeed();
  const mu = (x: number) => 10 + slope * x + curv * x * x;
  const data = useMemo(() => {
    const r = rng(seed * 5 + 74);
    return Array.from({ length: 150 }, () => { const x = r.u(); return { x, y: mu(x) + 0.8 * r.n() }; });
  }, [slope, curv, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const fit = localFit(data.map((d) => d.x), data.map((d) => d.y), h, p, kern);
  const mc = useMemo(() => {
    const r = rng(seed * 11 + 7);
    const est: number[] = [];
    for (let k = 0; k < 300; k++) {
      const xs: number[] = [], ys: number[] = [];
      for (let i = 0; i < 150; i++) { const x = r.u(); xs.push(x); ys.push(mu(x) + 0.8 * r.n()); }
      est.push(localFit(xs, ys, h, p, kern).coef[0]);
    }
    const m = avg(est);
    return { bias: m - 10, sd: Math.sqrt(avg(est.map((v) => (v - m) ** 2))) };
  }, [kern, p, h, slope, curv, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const K = (u: number) => (u > 1 ? 0 : kern === "tri" ? 1 - u : kern === "uni" ? 0.5 : 0.75 * (1 - u * u));
  const ys = data.map((d) => d.y);
  return (
    <SimShell note="Estimating a regression function at the edge of its support (x = 0, true value 10), as on one side of an RD cutoff. Point size shows each observation's kernel weight. A local constant fit (order 0) is pulled up by the slope; local linear removes that first-order bias; local quadratic removes curvature bias at the cost of variance. Bias and SD come from 300 simulated samples.">
      <div className="mb-3 flex flex-wrap gap-3">
        <Seg value={kern} onChange={setKern} options={[{ value: "tri", label: "Triangular" }, { value: "uni", label: "Uniform" }, { value: "epa", label: "Epanechnikov" }]} />
        <Seg value={String(p) as "0" | "1" | "2"} onChange={(v) => setP(+v)} options={[{ value: "0", label: "Local constant" }, { value: "1", label: "Local linear" }, { value: "2", label: "Local quadratic" }]} />
        <button className="btn" onClick={reseed}>New sample</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Plot x={[0, 1]} y={[Math.min(...ys) - 1, Math.max(...ys) + 1]} height={300} xLabel="distance from the cutoff" yLabel="outcome">
          {(sx, sy) => (
            <>
              {data.map((d, i) => { const w = K(d.x / h); return <circle key={i} cx={sx(d.x)} cy={sy(d.y)} r={w > 0 ? 2 + 5 * w : 1.5} fill={w > 0 ? C1 : "var(--text-3)"} opacity={w > 0 ? 0.55 : 0.3} />; })}
              <path d={curve(mu, 0, 1, sx, sy)} fill="none" stroke="var(--text)" strokeDasharray="5 4" />
              <path d={curve((x) => fit.coef.reduce((s, c, j) => s + c * x ** j, 0), 0, h, sx, sy)} fill="none" stroke={C2} strokeWidth={3} />
              <circle cx={sx(0)} cy={sy(fit.coef[0])} r={6} fill={C2} />
              <circle cx={sx(0)} cy={sy(10)} r={6} fill="none" stroke="var(--text)" strokeWidth={2} />
            </>
          )}
        </Plot>
        <div className="space-y-3">
          <Slider label="Bandwidth h" value={h} min={0.1} max={1} step={0.05} onChange={setH} />
          <Slider label="Slope of the true function" value={slope} min={-8} max={8} step={0.5} onChange={setSlope} />
          <Slider label="Curvature of the true function" value={curv} min={-10} max={10} step={0.5} onChange={setCurv} />
          <div className="grid grid-cols-2 gap-2">
            <Stat label="estimate at the boundary" value={fmt(fit.coef[0], 2)} color={C2} sub="truth 10.00" />
            <Stat label="observations used" value={data.filter((d) => d.x <= h).length} />
            <Stat label="bias (300 samples)" value={fmt(mc.bias, 3)} />
            <Stat label="SD (300 samples)" value={fmt(mc.sd, 3)} />
          </div>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 75: bandwidth and bias correction ---------------- */
export function RdBandwidthLab() {
  const [curv, setCurv] = useState(30), [n, setN] = useState(1000);
  const [seed, reseed] = useSeed();
  const hs = [0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8];
  const res = useMemo(() => {
    const r = rng(seed * 7 + 75);
    const mu0 = (x: number) => 50 + 8 * x + curv * x * x - (curv * 2 / 3) * x * x * x;
    const reps = 120;
    const out = hs.map(() => ({ ll: [] as number[], c1: 0, c2: 0 }));
    for (let k = 0; k < reps; k++) {
      const xr: number[] = [], yr: number[] = [], xl: number[] = [], yl: number[] = [];
      for (let i = 0; i < n; i++) {
        const x = 2 * r.u() - 1, y = mu0(x) + 5 * (x >= 0 ? 1 : 0) + 3 * r.n();
        if (x >= 0) { xr.push(x); yr.push(y); } else { xl.push(-x); yl.push(y); }
      }
      hs.forEach((h, j) => {
        const a1 = localFit(xr, yr, h, 1), b1 = localFit(xl, yl, h, 1), a2 = localFit(xr, yr, h, 2), b2 = localFit(xl, yl, h, 2);
        const t1 = a1.coef[0] - b1.coef[0], s1 = Math.hypot(a1.se, b1.se), t2 = a2.coef[0] - b2.coef[0], s2 = Math.hypot(a2.se, b2.se);
        out[j].ll.push(t1);
        if (Math.abs(t1 - 5) < 1.96 * s1) out[j].c1++;
        if (Math.abs(t2 - 5) < 1.96 * s2) out[j].c2++;
      });
    }
    return out.map((o) => {
      const m = avg(o.ll), s = Math.sqrt(avg(o.ll.map((v) => (v - m) ** 2)));
      return { bias: m - 5, sd: s, rmse: Math.hypot(m - 5, s), cov1: o.c1 / reps, cov2: o.c2 / reps };
    });
  }, [curv, n, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const best = res.reduce((b, v, i) => (v.rmse < res[b].rmse ? i : b), 0);
  const ymax = Math.max(...res.map((r) => Math.max(Math.abs(r.bias), r.sd, r.rmse))) * 1.1;
  return (
    <SimShell note="120 simulated RD studies at each bandwidth (true jump 5). Left: bias, SD and RMSE of the local linear estimate; the RMSE is smallest at an intermediate bandwidth. Right: coverage of conventional local linear 95% intervals versus robust bias-corrected intervals (local quadratic at the same bandwidth). Raise curvature to see conventional coverage collapse at wide bandwidths.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Plot x={[0.05, 0.85]} y={[0, ymax]} height={270} xLabel="bandwidth h" yLabel="local linear">
          {(sx, sy) => (
            <>
              {[["bias", C2, (r: typeof res[0]) => Math.abs(r.bias)], ["sd", C1, (r: typeof res[0]) => r.sd], ["rmse", "var(--text)", (r: typeof res[0]) => r.rmse]].map(([k, c, f]) => (
                <polyline key={k as string} points={res.map((r, i) => `${sx(hs[i])},${sy((f as (r: typeof res[0]) => number)(r))}`).join(" ")} fill="none" stroke={c as string} strokeWidth={2.5} />
              ))}
              <circle cx={sx(hs[best])} cy={sy(res[best].rmse)} r={6} fill="var(--text)" />
            </>
          )}
        </Plot>
        <Plot x={[0.05, 0.85]} y={[0.5, 1]} height={270} xLabel="bandwidth h" yLabel="coverage of 95% CI" yFormat={(v) => `${Math.round(v * 100)}%`}>
          {(sx, sy) => (
            <>
              <line x1={sx(0.05)} x2={sx(0.85)} y1={sy(0.95)} y2={sy(0.95)} stroke="var(--text-3)" strokeDasharray="4 3" />
              <polyline points={res.map((r, i) => `${sx(hs[i])},${sy(Math.max(0.5, r.cov1))}`).join(" ")} fill="none" stroke={C2} strokeWidth={2.5} />
              <polyline points={res.map((r, i) => `${sx(hs[i])},${sy(Math.max(0.5, r.cov2))}`).join(" ")} fill="none" stroke={C3} strokeWidth={2.5} />
            </>
          )}
        </Plot>
      </div>
      <Legend items={[{ color: C2, label: "|bias| / conventional coverage" }, { color: C1, label: "SD" }, { color: "var(--text)", label: "RMSE" }, { color: C3, label: "robust bias-corrected coverage" }]} />
      <div className="mt-3 grid gap-4 md:grid-cols-[1fr_1fr]">
        <div className="space-y-3">
          <Slider label="Curvature near the cutoff" value={curv} min={0} max={80} step={5} onChange={setCurv} />
          <Slider label="Sample size" value={n} min={300} max={3000} step={100} onChange={setN} />
          <button className="btn" onClick={reseed}>Re-run</button>
        </div>
        <div className="grid grid-cols-2 content-start gap-2">
          <Stat label="RMSE-best bandwidth" value={fmt(hs[best], 2)} />
          <Stat label="coverage there: conventional / RBC" value={`${(100 * res[best].cov1).toFixed(0)}% / ${(100 * res[best].cov2).toFixed(0)}%`} />
        </div>
      </div>
    </SimShell>
  );
}
