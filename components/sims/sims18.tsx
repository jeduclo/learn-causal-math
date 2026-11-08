"use client";
import { useMemo, useState } from "react";
import { Bars, Legend, Plot, Seg, SimShell, Slider, Stat, fmt, histogram, rng, useSeed } from "./kit";
import { avg, logitFit, logistic, ols, sd } from "./kit2";
import { scData, scWeights } from "./sims17";

const C1 = "var(--s1)", C2 = "var(--s2)", C3 = "var(--s3)", C4 = "var(--s4)";

/* ---------------- Day 86: placebo inference for synthetic control ---------------- */
export function ScPlaceboLab() {
  const [eff, setEff] = useState(-2), [cut, setCut] = useState(5), [seed, reseed] = useSeed();
  const T = 30, T0 = 20, J = 20;
  const res = useMemo(() => {
    const Y = scData(seed * 23 + 86, J, T, T0, eff, false, 0.2);
    const runs = Y.map((y, k) => {
      const donors = Y.filter((_, j) => j !== k && j !== (k === 0 ? -1 : 0));
      const w = scWeights(y.slice(0, T0), donors.map((d) => d.slice(0, T0)), 800);
      const gap = y.map((v, t) => v - donors.reduce((s, d, j) => s + w[j] * d[t], 0));
      const pre = Math.sqrt(avg(gap.slice(0, T0).map((g) => g * g))), post = Math.sqrt(avg(gap.slice(T0).map((g) => g * g)));
      return { gap, pre, ratio: post / pre };
    });
    return runs;
  }, [eff, seed]);
  const kept = res.filter((r, k) => k === 0 || r.pre <= cut * res[0].pre);
  const rank = 1 + kept.slice(1).filter((r) => r.ratio >= res[0].ratio).length;
  const lim = Math.max(...kept.flatMap((r) => r.gap.map(Math.abs))) + 0.2;
  return (
    <SimShell note="Each donor state is treated in turn as if it had passed the tax, and its synthetic-control gap is computed (grey). If the real state's gap (coloured) stands out, the effect is unlikely to be chance. The p-value is the treated state's rank by post/pre RMSPE ratio among all units. Placebos that fit badly before the policy can be excluded.">
      <Plot x={[0, T - 1]} y={[-lim, lim]} height={280} xLabel="year" yLabel="gap: actual − synthetic">
        {(sx, sy) => (
          <>
            <line x1={sx(0)} x2={sx(T - 1)} y1={sy(0)} y2={sy(0)} stroke="var(--text-3)" />
            <line x1={sx(T0 - 0.5)} x2={sx(T0 - 0.5)} y1={sy(-lim)} y2={sy(lim)} stroke="var(--text-3)" strokeDasharray="4 4" />
            {kept.slice(1).map((r, k) => <path key={k} d={r.gap.map((v, t) => `${t ? "L" : "M"}${sx(t)},${sy(v)}`).join("")} stroke="var(--text-3)" opacity={0.4} fill="none" />)}
            <path d={res[0].gap.map((v, t) => `${t ? "L" : "M"}${sx(t)},${sy(v)}`).join("")} stroke={C1} strokeWidth={3} fill="none" />
          </>
        )}
      </Plot>
      <Legend items={[{ color: C1, label: "treated state" }, { color: "var(--text-3)", label: "placebo (donor) states" }]} />
      <div className="mt-3 grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <div className="grid grid-cols-2 gap-3">
          <Slider label="True effect" value={eff} min={-3} max={1} step={0.25} onChange={setEff} />
          <Slider label="Drop placebos with pre-RMSPE > k × treated" value={cut} min={1} max={20} step={1} onChange={setCut} />
          <button className="btn w-fit" onClick={reseed}>New sample</button>
        </div>
        <div className="grid grid-cols-2 content-start gap-2">
          <Stat label="post-period effect" value={fmt(avg(res[0].gap.slice(T0)), 2)} color={C1} sub={`truth ${fmt(eff, 2)}`} />
          <Stat label="post/pre RMSPE ratio" value={fmt(res[0].ratio, 1)} />
          <Stat label="rank of treated" value={`${rank} of ${kept.length}`} />
          <Stat label="placebo p-value" value={fmt(rank / kept.length, 3)} color={C3} sub={`smallest possible ${fmt(1 / kept.length, 3)}`} />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 87: influence functions ---------------- */
type EstK = "mean" | "ratio" | "slope";
export function InfluenceLab() {
  const [kind, setKind] = useState<EstK>("ratio"), [out, setOut] = useState(0), [seed, reseed] = useSeed();
  const res = useMemo(() => {
    const r = rng(seed * 29 + 87), n = 40;
    const x = Array.from({ length: n }, () => 200 + 600 * r.u());                       // admissions
    const y = x.map((v) => 0.5 + 0.0045 * v + 0.35 * r.n());                              // costs ($m)
    y[0] += out;                                                                           // an outlying hospital
    const est = (ix: number[]): number => {
      const xs = ix.map((i) => x[i]), ys = ix.map((i) => y[i]);
      if (kind === "mean") return avg(ys);
      if (kind === "ratio") return (1000 * avg(ys)) / avg(xs);
      const b = ols(xs.map((v) => [1, v]), ys); return 1000 * b[1];
    };
    const all = x.map((_, i) => i), th = est(all);
    const mx = avg(x), my = avg(y), vx = avg(x.map((v) => (v - mx) ** 2));
    const b = ols(x.map((v) => [1, v]), y);
    const IF = x.map((xi, i) =>
      kind === "mean" ? y[i] - my : kind === "ratio" ? (1000 * (y[i] - (th / 1000) * xi)) / mx : (1000 * (xi - mx) * (y[i] - b[0] - b[1] * xi)) / vx);
    const jack = x.map((_, i) => (n - 1) * (th - est(all.filter((j) => j !== i))));
    const seIF = Math.sqrt(avg(IF.map((v) => v * v)) / n);
    const pm = avg(jack);
    const seJack = Math.sqrt(((n - 1) / n) * jack.reduce((s, v) => s + ((v - pm) / (n - 1)) ** 2, 0));   // jackknife SE
    return { IF, jack, th, seIF, seJack, x, y };
  }, [kind, out, seed]);
  const lo = Math.min(...res.IF, ...res.jack), hi = Math.max(...res.IF, ...res.jack), pad = (hi - lo) * 0.08 + 1e-6;
  const units: Record<EstK, string> = { mean: "mean cost ($m)", ratio: "cost per admission ($1,000)", slope: "marginal cost per admission ($1,000)" };
  return (
    <SimShell note="For 40 hospitals, each point compares an observation's influence-function value with its jackknife influence, (n−1)(θ̂ − θ̂ without i). They line up on the 45° line: the influence function is the derivative of the estimator with respect to each observation's weight. Push hospital #1's cost up and its influence (coloured) grows; the IF-based standard error tracks the jackknife.">
      <Plot x={[lo - pad, hi + pad]} y={[lo - pad, hi + pad]} height={300} xLabel="influence function value" yLabel="jackknife influence">
        {(sx, sy) => (
          <>
            <line x1={sx(lo - pad)} y1={sy(lo - pad)} x2={sx(hi + pad)} y2={sy(hi + pad)} stroke="var(--text-3)" strokeDasharray="4 4" />
            {res.IF.map((v, i) => <circle key={i} cx={sx(v)} cy={sy(res.jack[i])} r={i === 0 ? 7 : 4.5} fill={i === 0 ? C3 : C1} opacity={0.85} />)}
          </>
        )}
      </Plot>
      <div className="mt-3 grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <div className="grid gap-3">
          <Seg options={[{ value: "mean", label: "mean" }, { value: "ratio", label: "ratio" }, { value: "slope", label: "OLS slope" }]} value={kind} onChange={setKind} />
          <Slider label="Extra cost at hospital #1 ($m)" value={out} min={0} max={4} step={0.1} onChange={setOut} />
          <button className="btn w-fit" onClick={reseed}>New sample</button>
        </div>
        <div className="grid grid-cols-2 content-start gap-2">
          <Stat label={units[kind]} value={fmt(res.th, 3)} color={C1} />
          <Stat label="influence of #1" value={fmt(res.IF[0], 2)} color={C3} />
          <Stat label="SE from influence function" value={fmt(res.seIF, 4)} />
          <Stat label="jackknife SE" value={fmt(res.seJack, 4)} />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 88: efficiency bounds ---------------- */
export function EfficiencyLab() {
  const [g, setG] = useState(1.2), [h, setH] = useState(1), [seed, reseed] = useSeed();
  const res = useMemo(() => {
    const r = rng(seed * 31 + 88), n = 500, R = 150;
    const e = (x: number) => logistic(g * x), tau = (x: number) => 1 + h * x;
    // Hahn bound by quadrature: sigma^2 = 1 in both arms
    let B = 0, Z = 0;
    for (let x = -5; x <= 5; x += 0.01) {
      const p = Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI) * 0.01;
      B += p * (1 / e(x) + 1 / (1 - e(x)) + (h * x) ** 2); Z += p;
    }
    B /= Z;
    const est: number[][] = [[], [], []];
    for (let k = 0; k < R; k++) {
      const X = Array.from({ length: n }, () => r.n());
      const D = X.map((x) => r.u() < e(x));
      const Y = X.map((x, i) => x + (D[i] ? tau(x) : 0) + r.n());
      est[0].push(avg(Y.map((y, i) => (D[i] ? y / e(X[i]) : -y / (1 - e(X[i]))))));
      const eh = logitFit(X.map((x) => [1, x]), D).map((p) => Math.min(0.99, Math.max(0.01, p)));
      est[1].push(avg(Y.map((y, i) => (D[i] ? y / eh[i] : -y / (1 - eh[i])))));
      const t = X.map((_, i) => i).filter((i) => D[i]), c = X.map((_, i) => i).filter((i) => !D[i]);
      const b1 = ols(t.map((i) => [1, X[i]]), t.map((i) => Y[i])), b0 = ols(c.map((i) => [1, X[i]]), c.map((i) => Y[i]));
      est[2].push(avg(X.map((x, i) => {
        const m1 = b1[0] + b1[1] * x, m0 = b0[0] + b0[1] * x;
        return m1 - m0 + (D[i] ? (Y[i] - m1) / eh[i] : -(Y[i] - m0) / (1 - eh[i]));
      })));
    }
    const nv = est.map((v) => n * sd(v) ** 2);
    return { B, nv, means: est.map(avg), e };
  }, [g, h, seed]);
  const labels = ["IPW, true e", "IPW, estimated e", "AIPW"], cols = [C2, C4, C1];
  const top = Math.max(res.B, ...res.nv) * 1.15;
  return (
    <SimShell note="n × variance of three ATE estimators across 150 simulated studies of 500 patients, against Hahn's semiparametric efficiency bound (dashed). IPW with the true propensity is inefficient; estimating the propensity helps; AIPW attains the bound. Worse overlap (steeper selection) and more effect heterogeneity both raise the bound itself.">
      <Plot x={[0, 3]} y={[0, top]} height={260} xTicks={[]} yLabel="n × variance">
        {(sx, sy) => (
          <>
            {res.nv.map((v, i) => (
              <g key={i}>
                <rect x={sx(i + 0.2)} width={sx(0.6) - sx(0)} y={sy(v)} height={sy(0) - sy(v)} fill={cols[i]} rx={4} />
                <text x={sx(i + 0.5)} y={sy(v) - 6} textAnchor="middle" style={{ fontWeight: 600 }}>{fmt(v, 1)}</text>
                <text x={sx(i + 0.5)} y={sy(0) + 16} textAnchor="middle">{labels[i]}</text>
              </g>
            ))}
            <line x1={sx(0)} x2={sx(3)} y1={sy(res.B)} y2={sy(res.B)} stroke={C3} strokeWidth={2.5} strokeDasharray="6 4" />
            <text x={sx(3) - 4} y={sy(res.B) - 6} textAnchor="end" style={{ fill: "var(--text)", fontWeight: 600 }}>bound {fmt(res.B, 2)}</text>
          </>
        )}
      </Plot>
      <div className="mt-3 grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <div className="grid grid-cols-2 gap-3">
          <Slider label="Selection on x (worse overlap →)" value={g} min={0} max={2.5} step={0.1} onChange={setG} />
          <Slider label="Effect heterogeneity" value={h} min={0} max={2} step={0.1} onChange={setH} />
          <button className="btn w-fit" onClick={reseed}>New simulations</button>
        </div>
        <div className="grid grid-cols-2 content-start gap-2">
          <Stat label="Hahn bound" value={fmt(res.B, 2)} color={C3} />
          <Stat label="AIPW / bound" value={fmt(res.nv[2] / res.B, 2)} color={C1} />
          <Stat label="IPW (true e) / bound" value={fmt(res.nv[0] / res.B, 2)} color={C2} />
          <Stat label="mean AIPW estimate" value={fmt(res.means[2], 3)} sub="truth 1.000" />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 89: Neyman orthogonality ---------------- */
export function OrthogonalityLab() {
  const [r0, setR0] = useState(0.2), [conf, setConf] = useState(1), [seed, reseed] = useSeed();
  const res = useMemo(() => {
    const rr = rng(seed * 37 + 89), N = 40000;
    const x = Array.from({ length: N }, () => rr.n());
    const m = x.map((v) => conf * Math.tanh(v)), g = x.map((v) => v * v);
    const D = m.map((v) => v + rr.n()), Y = D.map((d, i) => 0.5 * d + g[i] + rr.n());
    const ell = m.map((v, i) => 0.5 * v + g[i]);
    const DD = avg(D.map((d) => d * d));
    const bias = (r: number) => {
      let a = 0, b = 0, c = 0;
      for (let i = 0; i < N; i++) {
        const err = r * Math.sin(2 * x[i]) + r;
        a += (Y[i] - g[i] - err) * D[i];
        const rD = D[i] - m[i] - r * Math.cos(x[i]);
        b += (Y[i] - ell[i] - err) * rD; c += rD * rD;
      }
      return [a / N / DD - 0.5, b / c - 0.5];
    };
    const grid = Array.from({ length: 25 }, (_, k) => (0.6 * k) / 24);
    const base = bias(0);
    const curves = grid.map((r) => { const v = bias(r); return [v[0] - base[0], v[1] - base[1]]; });
    return { grid, curves, at: (() => { const v = bias(r0); return [v[0] - base[0], v[1] - base[1]]; })() };
  }, [r0, conf, seed]);
  const ymax = Math.max(0.05, ...res.curves.map((c) => Math.max(Math.abs(c[0]), Math.abs(c[1])))) * 1.1;
  const path = (k: number, sx: (v: number) => number, sy: (v: number) => number) => res.grid.map((r, i) => `${i ? "L" : "M"}${sx(r)},${sy(res.curves[i][k])}`).join("");
  return (
    <SimShell note="Nuisance functions are perturbed by r × (a fixed error) and the resulting bias in the treatment effect is traced out. The naive plug-in score's bias grows linearly in r; the partialling-out (orthogonal) score's bias grows only quadratically, so small first-stage errors barely matter. The naive bias also scales with how strongly the covariates drive treatment.">
      <Plot x={[0, 0.6]} y={[-ymax, ymax]} height={280} xLabel="size of nuisance error r" yLabel="bias in effect estimate"
        hover={(xv) => { const i = Math.round((xv / 0.6) * 24); const c = res.curves[Math.max(0, Math.min(24, i))]; return [`r = ${fmt(res.grid[Math.max(0, Math.min(24, i))], 2)}`, `naive ${fmt(c[0], 4)}`, `orthogonal ${fmt(c[1], 4)}`]; }}>
        {(sx, sy) => (
          <>
            <line x1={sx(0)} x2={sx(0.6)} y1={sy(0)} y2={sy(0)} stroke="var(--text-3)" />
            <path d={path(0, sx, sy)} stroke={C2} strokeWidth={3} fill="none" />
            <path d={path(1, sx, sy)} stroke={C1} strokeWidth={3} fill="none" />
            <line x1={sx(r0)} x2={sx(r0)} y1={sy(-ymax)} y2={sy(ymax)} stroke={C3} strokeDasharray="4 4" />
            <circle cx={sx(r0)} cy={sy(res.at[0])} r={6} fill={C2} />
            <circle cx={sx(r0)} cy={sy(res.at[1])} r={6} fill={C1} />
          </>
        )}
      </Plot>
      <Legend items={[{ color: C2, label: "naive score: bias ∝ r" }, { color: C1, label: "orthogonal score: bias ∝ r²" }]} />
      <div className="mt-3 grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <div className="grid grid-cols-2 gap-3">
          <Slider label="Nuisance error r" value={r0} min={0} max={0.6} step={0.02} onChange={setR0} />
          <Slider label="Covariates' effect on treatment" value={conf} min={0.2} max={2} step={0.1} onChange={setConf} />
          <button className="btn w-fit" onClick={reseed}>New sample</button>
        </div>
        <div className="grid grid-cols-2 content-start gap-2">
          <Stat label="naive bias" value={fmt(res.at[0], 4)} color={C2} />
          <Stat label="orthogonal bias" value={fmt(res.at[1], 4)} color={C1} />
          <Stat label="ratio naive / orthogonal" value={fmt(Math.abs(res.at[0] / (res.at[1] || 1e-9)), 1)} />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 90: cross-fitting ---------------- */
function knnPredict(xTr: number[], yTr: number[], xTe: number[], k: number) {
  const idx = xTr.map((_, i) => i).sort((a, b) => xTr[a] - xTr[b]);
  const xs = idx.map((i) => xTr[i]), ys = idx.map((i) => yTr[i]);
  return xTe.map((x0) => {
    let lo = 0, hi = xs.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (xs[mid] < x0) lo = mid + 1; else hi = mid; }
    let L = lo - 1, R = lo, s = 0;
    for (let c = 0; c < k; c++) {
      if (R >= xs.length || (L >= 0 && x0 - xs[L] <= xs[R] - x0)) { s += ys[L]; L--; } else { s += ys[R]; R++; }
    }
    return s / k;
  });
}
export function DmlLab() {
  const [k, setK] = useState(2), [seed, reseed] = useSeed();
  const res = useMemo(() => {
    const r = rng(seed * 41 + 90), n = 300, reps = 80, kM = 40;
    const ins: number[] = [], cf: number[] = [], seC: number[] = [];
    for (let rep = 0; rep < reps; rep++) {
      const X = Array.from({ length: n }, () => 2 * r.u() - 1);
      const D = X.map((x) => Math.sin(2 * x) + r.n()), Y = X.map((x, i) => 0.5 * D[i] + 2 * x * x + r.n());
      const fin = (rY: number[], rD: number[]) => rD.reduce((s, v, i) => s + v * rY[i], 0) / rD.reduce((s, v) => s + v * v, 0);
      const lh = knnPredict(X, Y, X, k), mh = knnPredict(X, D, X, kM);
      ins.push(fin(Y.map((y, i) => y - lh[i]), D.map((d, i) => d - mh[i])));
      const fold = X.map((_, i) => i % 5), rY = new Array(n), rD = new Array(n);
      for (let f = 0; f < 5; f++) {
        const tr = X.map((_, i) => i).filter((i) => fold[i] !== f), te = X.map((_, i) => i).filter((i) => fold[i] === f);
        const l2 = knnPredict(tr.map((i) => X[i]), tr.map((i) => Y[i]), te.map((i) => X[i]), k);
        const m2 = knnPredict(tr.map((i) => X[i]), tr.map((i) => D[i]), te.map((i) => X[i]), kM);
        te.forEach((i, q) => { rY[i] = Y[i] - l2[q]; rD[i] = D[i] - m2[q]; });
      }
      const th = fin(rY, rD); cf.push(th);
      const J = avg(rD.map((v: number) => v * v)), psi = rD.map((v: number, i: number) => (rY[i] - th * v) * v);
      seC.push(Math.sqrt(avg(psi.map((p: number) => p * p)) / (J * J) / n));
    }
    const cov = avg(cf.map((t, i) => (Math.abs(t - 0.5) < 1.96 * seC[i] ? 1 : 0)));
    return { ins, cf, cov };
  }, [k, seed]);
  const lo = 0, hi = 1;
  const hI = histogram(res.ins, lo, hi, 40), hC = histogram(res.cf, lo, hi, 40);
  const top = Math.max(...hI.map((b) => b.density), ...hC.map((b) => b.density)) * 1.1;
  return (
    <SimShell note="80 simulated studies of community-health-worker visits (true effect 0.5). The outcome nuisance is a k-nearest-neighbour fit; with small k it memorises each household's own outcome. Residualising in-sample then removes part of the treatment signal and the estimate collapses toward zero. Cross-fitting (fit on four folds, residualise the fifth) removes this own-observation bias with the very same learner.">
      <Plot x={[lo, hi]} y={[0, top]} height={260} xLabel="estimated effect" yLabel="density">
        {(sx, sy) => (
          <>
            <Bars bins={hI} sx={sx} sy={sy} color={C2} opacity={0.75} key0="i" />
            <Bars bins={hC} sx={sx} sy={sy} color={C1} opacity={0.75} key0="c" />
            <line x1={sx(0.5)} x2={sx(0.5)} y1={sy(0)} y2={sy(top)} stroke={C3} strokeWidth={2.5} strokeDasharray="5 4" />
          </>
        )}
      </Plot>
      <Legend items={[{ color: C2, label: "in-sample residuals", area: true }, { color: C1, label: "5-fold cross-fitting", area: true }, { color: C3, label: "truth 0.5", dash: true }]} />
      <div className="mt-3 grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <div className="grid gap-3">
          <Slider label="Neighbours k in the outcome learner (small = overfits)" value={k} min={1} max={40} step={1} onChange={setK} />
          <button className="btn w-fit" onClick={reseed}>New simulations</button>
        </div>
        <div className="grid grid-cols-2 content-start gap-2">
          <Stat label="in-sample: mean" value={fmt(avg(res.ins), 3)} color={C2} sub={`SD ${fmt(sd(res.ins), 3)}`} />
          <Stat label="cross-fit: mean" value={fmt(avg(res.cf), 3)} color={C1} sub={`SD ${fmt(sd(res.cf), 3)}`} />
          <Stat label="cross-fit 95% CI coverage" value={fmt(res.cov, 2)} />
        </div>
      </div>
    </SimShell>
  );
}
