"use client";
import { useMemo, useState } from "react";
import { Bars, Legend, Plot, Seg, SimShell, Slider, Stat, curve, fmt, histogram, rng, useSeed } from "./kit";
import { avg, logitFit, logistic, ols, solve } from "./kit2";

const C1 = "var(--s1)", C2 = "var(--s2)", C3 = "var(--s3)", C4 = "var(--s4)";

/* ---------------- shared helpers for Phase 6 ---------------- */
export const wmean = (y: number[], w: number[]) => {
  let a = 0, b = 0;
  for (let i = 0; i < y.length; i++) { a += w[i] * y[i]; b += w[i]; }
  return a / b;
};
export const ess = (w: number[]) => {
  const s = w.reduce((a, v) => a + v, 0), s2 = w.reduce((a, v) => a + v * v, 0);
  return (s * s) / s2;
};
/** Euclidean projection onto the probability simplex. */
export function projectSimplex(v: number[]) {
  const u = [...v].sort((a, b) => b - a);
  let css = 0, theta = 0;
  for (let i = 0; i < u.length; i++) {
    css += u[i];
    const t = (css - 1) / (i + 1);
    if (u[i] - t > 0) theta = t;
  }
  return v.map((x) => Math.max(0, x - theta));
}
/** Synthetic-control weights: min ||y1 - Y0 w||² over the simplex (projected gradient). y1: T0, Y0: J columns of length T0. */
export function scWeights(y1: number[], Y0: number[][], iters = 1500) {
  const J = Y0.length, T = y1.length;
  let w = new Array(J).fill(1 / J);
  let L = 0;
  for (let j = 0; j < J; j++) for (let t = 0; t < T; t++) L += Y0[j][t] ** 2;
  const step = 1 / Math.max(L, 1e-9);
  for (let it = 0; it < iters; it++) {
    const r = y1.map((v, t) => Y0.reduce((s, col, j) => s + col[t] * w[j], 0) - v);
    const g = Y0.map((col) => col.reduce((s, v, t) => s + v * r[t], 0));
    w = projectSimplex(w.map((v, j) => v - step * g[j]));
  }
  return w;
}

/* ---------------- Day 81: matching ---------------- */
export function MatchingLab() {
  const [k, setK] = useState(1), [cal, setCal] = useState(10), [bc, setBc] = useState<"off" | "on">("off");
  const [seed, reseed] = useSeed();
  const mu0 = (x: number) => 18 + 0.9 * (x - 20) - 0.012 * (x - 20) ** 2; // earnings ($1,000) without training
  const tau = 1.8;
  const data = useMemo(() => {
    const r = rng(seed * 7 + 81);
    const T = Array.from({ length: 50 }, () => { const x = 35 + 25 * r.beta(3, 1.6); return { x, y: mu0(x) + tau + 2 * r.n() }; });
    const C = Array.from({ length: 200 }, () => { const x = 20 + 45 * r.beta(1.3, 2.5); return { x, y: mu0(x) + 2 * r.n() }; });
    return { T, C };
  }, [seed]);
  const res = useMemo(() => {
    const { T, C } = data;
    const b = ols(C.map((c) => [1, c.x, c.x * c.x]), C.map((c) => c.y));
    const m0 = (x: number) => b[0] + b[1] * x + b[2] * x * x;
    const links: { t: number; c: number }[] = [];
    const eff: number[] = [], effBc: number[] = [];
    let dropped = 0;
    T.forEach((t, ti) => {
      const nn = C.map((c, ci) => ({ ci, d: Math.abs(c.x - t.x) })).sort((a, b2) => a.d - b2.d).slice(0, k).filter((m) => m.d <= cal);
      if (!nn.length) { dropped++; return; }
      nn.forEach((m) => links.push({ t: ti, c: m.ci }));
      const yc = avg(nn.map((m) => C[m.ci].y)), adj = avg(nn.map((m) => m0(t.x) - m0(C[m.ci].x)));
      eff.push(t.y - yc); effBc.push(t.y - yc - adj);
    });
    return { links, att: avg(eff), attBc: avg(effBc), dropped, naive: avg(T.map((t) => t.y)) - avg(C.map((c) => c.y)) };
  }, [data, k, cal]);
  const used = new Set(res.links.map((l) => l.c));
  return (
    <SimShell note="Each job-training participant (coloured) is matched to the nearest non-participant(s) by age. Participants are older, and few non-participants are in their 50s and 60s, so matches are far apart where the earnings–age curve bends. More matches or a wider caliper add bias; the bias correction adjusts for the remaining age gap with a regression fitted on controls.">
      <Plot x={[20, 65]} y={[10, 45]} height={300} xLabel="age" yLabel="earnings ($1,000)">
        {(sx, sy) => (
          <>
            <path d={curve(mu0, 20, 65, sx, sy)} stroke="var(--text-3)" strokeDasharray="5 4" strokeWidth={1.5} fill="none" />
            <path d={curve((x) => mu0(x) + tau, 20, 65, sx, sy)} stroke={C1} strokeDasharray="5 4" strokeWidth={1.5} fill="none" />
            {res.links.map((l, i) => (
              <line key={i} x1={sx(data.T[l.t].x)} y1={sy(data.T[l.t].y)} x2={sx(data.C[l.c].x)} y2={sy(data.C[l.c].y)} stroke={C3} strokeWidth={1} opacity={0.5} />
            ))}
            {data.C.map((c, i) => <circle key={"c" + i} cx={sx(c.x)} cy={sy(c.y)} r={used.has(i) ? 3.6 : 2.6} fill={used.has(i) ? C2 : "var(--text-3)"} opacity={used.has(i) ? 0.9 : 0.35} />)}
            {data.T.map((t, i) => <circle key={"t" + i} cx={sx(t.x)} cy={sy(t.y)} r={3.6} fill={C1} />)}
          </>
        )}
      </Plot>
      <Legend items={[{ color: C1, label: "participants" }, { color: C2, label: "matched controls" }, { color: "var(--text-3)", label: "true no-training curve", dash: true }]} />
      <div className="mt-3 grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <div className="grid grid-cols-2 gap-3">
          <Slider label="Matches per participant (k)" value={k} min={1} max={10} step={1} onChange={setK} />
          <Slider label="Caliper (years)" value={cal} min={0.5} max={15} step={0.5} onChange={setCal} />
          <div className="flex items-end gap-2"><span className="text-sm muted">Bias correction</span><Seg options={[{ value: "off", label: "off" }, { value: "on", label: "on" }]} value={bc} onChange={setBc} /></div>
          <button className="btn" onClick={reseed}>New sample</button>
        </div>
        <div className="grid grid-cols-2 content-start gap-2">
          <Stat label="naive difference" value={fmt(res.naive, 2)} color="var(--text-3)" />
          <Stat label={bc === "on" ? "bias-corrected ATT" : "matching ATT"} value={fmt(bc === "on" ? res.attBc : res.att, 2)} color={C3} sub={`truth ${fmt(tau, 2)}`} />
          <Stat label="participants dropped" value={`${res.dropped} / 50`} sub="no control within caliper" />
          <Stat label="controls used" value={used.size} />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 82: propensity-score weighting ---------------- */
type WScheme = "none" | "ate" | "att" | "ato";
export function PsMatchLab() {
  const [g, setG] = useState(1.5), [scheme, setScheme] = useState<WScheme>("ate"), [seed, reseed] = useSeed();
  const res = useMemo(() => {
    const r = rng(seed * 11 + 82), n = 2000;
    const X = Array.from({ length: n }, () => [r.n(), r.n()]);
    const D = X.map((x) => r.u() < logistic(g * (x[0] + 0.5 * x[1]))), tau = X.map((x) => 1 + x[0]);
    const Y = X.map((x, i) => 2 * x[0] + x[1] + (D[i] ? tau[i] : 0) + r.n());
    const e = logitFit(X.map((x) => [1, x[0], x[1]]), D);
    const W: Record<WScheme, number[]> = {
      none: D.map(() => 1),
      ate: e.map((p, i) => (D[i] ? 1 / p : 1 / (1 - p))),
      att: e.map((p, i) => (D[i] ? 1 : p / (1 - p))),
      ato: e.map((p, i) => (D[i] ? 1 - p : p)),
    };
    const est = (w: number[]) => {
      const t = D.map((d, i) => i).filter((i) => D[i]), c = D.map((d, i) => i).filter((i) => !D[i]);
      return wmean(t.map((i) => Y[i]), t.map((i) => w[i])) - wmean(c.map((i) => Y[i]), c.map((i) => w[i]));
    };
    const tr: Record<WScheme, number> = {
      none: NaN, ate: avg(tau), att: avg(tau.filter((_, i) => D[i])),
      ato: tau.reduce((s, v, i) => s + v * e[i] * (1 - e[i]), 0) / e.reduce((s, p) => s + p * (1 - p), 0),
    };
    const ests = Object.fromEntries((Object.keys(W) as WScheme[]).map((k) => [k, est(W[k])])) as Record<WScheme, number>;
    const bins = (idx: number[], w: number[]) => {
      const h = new Array(20).fill(0);
      idx.forEach((i) => { h[Math.min(19, Math.floor(e[i] * 20))] += w[i]; });
      return h;
    };
    const ti = D.map((d, i) => i).filter((i) => D[i]), ci = D.map((d, i) => i).filter((i) => !D[i]);
    return { e, D, W, ests, tr, ti, ci, bins };
  }, [g, seed]);
  const ht = res.bins(res.ti, res.W[scheme]), hc = res.bins(res.ci, res.W[scheme]);
  const top = Math.max(...ht, ...hc) * 1.05;
  const wt = res.W[scheme];
  const labels: Record<WScheme, string> = { none: "unweighted", ate: "ATE (1/e, 1/(1−e))", att: "ATT (1, e/(1−e))", ato: "overlap (1−e, e)" };
  return (
    <SimShell note="Mirrored histograms of the estimated propensity score: participants above the axis, non-participants below, each bar the sum of weights. ATE weights inflate units in the thin tails; ATT weights reshape controls to look like the treated; overlap weights focus on the region where both groups are common, giving the most stable estimate of a different (overlap-weighted) effect.">
      <Plot x={[0, 1]} y={[-top, top]} height={280} xLabel="estimated propensity score e(x)" yLabel="weighted count" yFormat={(v) => String(Math.abs(Math.round(v)))}>
        {(sx, sy) => (
          <>
            {ht.map((h, i) => <rect key={"t" + i} x={sx(i / 20) + 1} width={sx(0.05) - sx(0) - 2} y={sy(h)} height={sy(0) - sy(h)} fill={C1} rx={2} opacity={0.85} />)}
            {hc.map((h, i) => <rect key={"c" + i} x={sx(i / 20) + 1} width={sx(0.05) - sx(0) - 2} y={sy(0)} height={sy(-h) - sy(0)} fill={C2} rx={2} opacity={0.85} />)}
          </>
        )}
      </Plot>
      <Legend items={[{ color: C1, label: "participants (above)", area: true }, { color: C2, label: "non-participants (below)", area: true }]} />
      <div className="mt-3 grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <div className="grid gap-3">
          <Seg options={[{ value: "none", label: "none" }, { value: "ate", label: "ATE" }, { value: "att", label: "ATT" }, { value: "ato", label: "overlap" }]} value={scheme} onChange={setScheme} />
          <Slider label="Selection strength (worse overlap →)" value={g} min={0} max={3} step={0.1} onChange={setG} />
          <button className="btn w-fit" onClick={reseed}>New sample</button>
        </div>
        <div className="grid grid-cols-2 content-start gap-2">
          <Stat label={`estimate · ${labels[scheme]}`} value={fmt(res.ests[scheme], 3)} color={C3} sub={scheme === "none" ? "naive difference" : `its estimand ${fmt(res.tr[scheme], 3)}`} />
          <Stat label="max weight / mean" value={fmt(Math.max(...wt) / avg(wt), 1)} />
          <Stat label="ESS (controls)" value={fmt(ess(res.ci.map((i) => wt[i])), 0)} sub={`of ${res.ci.length}`} />
          <Stat label="ATE · ATT · overlap truths" value={`${fmt(res.tr.ate, 2)} · ${fmt(res.tr.att, 2)} · ${fmt(res.tr.ato, 2)}`} />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 83: balance diagnostics ---------------- */
const BAL_VARS = ["age", "income", "smoker", "BMI"];
export function BalanceLab() {
  const [inc, setInc] = useState([true, true, false, true]), [seed, reseed] = useSeed();
  const res = useMemo(() => {
    const r = rng(seed * 13 + 83), n = 1500;
    const X = Array.from({ length: n }, () => [r.n(), r.n(), r.u() < 0.3 ? 1 : 0, r.n()]);
    const D = X.map((x) => r.u() < logistic(-0.6 + 0.6 * x[0] - 0.5 * x[1] + 1.3 * x[2] + 0.4 * x[3]));
    const Y = X.map((x, i) => 2 + 0.5 * x[0] - 0.4 * x[1] + 1.5 * x[2] + 0.3 * x[3] + (D[i] ? 1 : 0) + r.n());
    const cols = [0, 1, 2, 3].filter((j) => inc[j]);
    const e = cols.length ? logitFit(X.map((x) => [1, ...cols.map((j) => x[j])]), D) : X.map(() => avg(D.map(Number)));
    const w = e.map((p, i) => (D[i] ? 1 : p / (1 - p)));                 // ATT weights
    const t = D.map((d, i) => i).filter((i) => D[i]), c = D.map((d, i) => i).filter((i) => !D[i]);
    const smd = (j: number, ww: number[]) => {
      const mt = avg(t.map((i) => X[i][j])), vt = avg(t.map((i) => (X[i][j] - mt) ** 2));
      const mc0 = avg(c.map((i) => X[i][j])), vc = avg(c.map((i) => (X[i][j] - mc0) ** 2));
      const mc = wmean(c.map((i) => X[i][j]), c.map((i) => ww[i]));
      return (mt - mc) / Math.sqrt((vt + vc) / 2);
    };
    const raw = [0, 1, 2, 3].map((j) => smd(j, X.map(() => 1))), wtd = [0, 1, 2, 3].map((j) => smd(j, w));
    const est = avg(t.map((i) => Y[i])) - wmean(c.map((i) => Y[i]), c.map((i) => w[i]));
    const cw = c.map((i) => w[i]), s = cw.reduce((a, v) => a + v, 0);
    const kl = cw.reduce((a, v) => a + (v / s) * Math.log((v / s) * cw.length), 0);
    return { raw, wtd, est, essC: ess(cw), nC: c.length, kl };
  }, [inc, seed]);
  return (
    <SimShell note="A Love plot: standardised mean differences between participants and (ATT-weighted) non-participants in a smoking-cessation programme. Leave a confounder out of the propensity model and it stays imbalanced, and the effect estimate (truth 1) is biased. Balance is checked on the covariates, never on the outcome.">
      <Plot x={[-0.6, 1.0]} y={[-0.5, 3.5]} height={240} xLabel="standardised mean difference" yTicks={[0, 1, 2, 3]} yFormat={(v) => BAL_VARS[Math.round(v)] ?? ""}>
        {(sx, sy) => (
          <>
            <rect x={sx(-0.1)} width={sx(0.1) - sx(-0.1)} y={sy(3.5)} height={sy(-0.5) - sy(3.5)} fill={C4} opacity={0.12} />
            <line x1={sx(0)} x2={sx(0)} y1={sy(3.5)} y2={sy(-0.5)} stroke="var(--text-3)" />
            {res.raw.map((v, j) => (
              <g key={j}>
                <line x1={sx(v)} x2={sx(res.wtd[j])} y1={sy(j)} y2={sy(j)} stroke="var(--text-3)" strokeDasharray="3 3" />
                <circle cx={sx(v)} cy={sy(j)} r={6} fill="var(--text-3)" opacity={0.6} />
                <circle cx={sx(res.wtd[j])} cy={sy(j)} r={7} fill={Math.abs(res.wtd[j]) > 0.1 ? C3 : C1} />
              </g>
            ))}
          </>
        )}
      </Plot>
      <Legend items={[{ color: "var(--text-3)", label: "before weighting" }, { color: C1, label: "after (|SMD| ≤ 0.1)" }, { color: C3, label: "after (still imbalanced)" }, { color: C4, label: "±0.1 band", area: true }]} />
      <div className="mt-3 grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="mb-2 text-sm muted">Covariates in the propensity model</div>
          <div className="flex flex-wrap gap-2">
            {BAL_VARS.map((v, j) => (
              <button key={v} className="btn" aria-pressed={inc[j]} style={{ opacity: inc[j] ? 1 : 0.5 }} onClick={() => setInc(inc.map((b, i) => (i === j ? !b : b)))}>
                {inc[j] ? "✓ " : ""}{v}
              </button>
            ))}
            <button className="btn" onClick={reseed}>New sample</button>
          </div>
        </div>
        <div className="grid grid-cols-2 content-start gap-2">
          <Stat label="ATT estimate" value={fmt(res.est, 3)} color={C3} sub="truth 1.000" />
          <Stat label="max |SMD| after" value={fmt(Math.max(...res.wtd.map(Math.abs)), 3)} />
          <Stat label="ESS of controls" value={fmt(res.essC, 0)} sub={`of ${res.nC}`} />
          <Stat label="KL(weights ‖ uniform)" value={fmt(res.kl, 3)} />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 84: entropy balancing ---------------- */
function entropyBalance(Xc: number[][], target: number[], iters = 60) {
  // Dual: minimise log Σ exp(λ'(x_i − m)); the gradient is the weighted moment gap.
  const k = target.length;
  const C = Xc.map((x) => x.map((v, j) => v - target[j]));
  const evalAt = (lam: number[]) => {
    const z = C.map((c) => c.reduce((s, v, j) => s + lam[j] * v, 0));
    const mz = Math.max(...z), ex = z.map((v) => Math.exp(v - mz)), S = ex.reduce((a, v) => a + v, 0);
    return { f: mz + Math.log(S), w: ex.map((v) => v / S) };
  };
  let lam = new Array(k).fill(0), cur = evalAt(lam);
  for (let it = 0; it < iters; it++) {
    const w = cur.w;
    const g = target.map((_, j) => C.reduce((s, c, i) => s + w[i] * c[j], 0));
    if (Math.max(...g.map(Math.abs)) < 1e-10) break;
    const H = target.map((_, a) => target.map((__, b) => C.reduce((s, c, i) => s + w[i] * c[a] * c[b], 0) - g[a] * g[b]));
    H.forEach((row, a) => (row[a] += 1e-8));
    const step = solve(H, g);
    let t = 1, next = evalAt(lam.map((v, j) => v - step[j]));
    while (next.f > cur.f - 1e-4 * t * g.reduce((s, v, j) => s + v * step[j], 0) && t > 1e-6) {
      t /= 2; next = evalAt(lam.map((v, j) => v - t * step[j]));
    }
    lam = lam.map((v, j) => v - t * step[j]); cur = next;
  }
  return cur.w;
}
export function EntropyBalanceLab() {
  const [second, setSecond] = useState<"no" | "yes">("yes"), [nl, setNl] = useState(0.8), [seed, reseed] = useSeed();
  const res = useMemo(() => {
    const r = rng(seed * 17 + 84), n = 1500;
    const X = Array.from({ length: n }, () => [r.n(), r.n()]);
    const D = X.map((x) => r.u() < logistic(-1 + 0.5 * x[0] + 0.4 * x[1] + nl * (x[0] * x[0] - 1)));
    const Y = X.map((x, i) => 3 + x[0] + 0.5 * x[1] + 1.5 * nl * x[0] * x[0] + (D[i] ? 2 : 0) + r.n());
    const t = D.map((d, i) => i).filter((i) => D[i]), c = D.map((d, i) => i).filter((i) => !D[i]);
    const feats = (x: number[]) => (second === "yes" ? [x[0], x[1], x[0] * x[0]] : [x[0], x[1]]);
    const target = feats([0, 0]).map((_, j) => avg(t.map((i) => feats(X[i])[j])));
    const wEB = entropyBalance(c.map((i) => feats(X[i])), target);
    const e = logitFit(X.map((x) => [1, x[0], x[1]]), D);
    const wIPW = c.map((i) => e[i] / (1 - e[i]));
    const yt = avg(t.map((i) => Y[i]));
    const est = (w: number[]) => yt - wmean(c.map((i) => Y[i]), w);
    const dens = (w: number[]) => histogram(c.map((i) => X[i][0]), -3.5, 3.5, 28).map((b, k) => {
      const s = c.reduce((a, i, q) => a + (X[i][0] >= b.x0 && X[i][0] < b.x1 ? w[q] : 0), 0) / w.reduce((a, v) => a + v, 0);
      return { ...b, density: s / (b.x1 - b.x0), k };
    });
    const ht = histogram(t.map((i) => X[i][0]), -3.5, 3.5, 28);
    return { eb: est(wEB), ipw: est(wIPW), naive: yt - avg(c.map((i) => Y[i])), essEB: ess(wEB), essIPW: ess(wIPW), nC: c.length, dEB: dens(wEB), dIPW: dens(wIPW), ht };
  }, [second, nl, seed]);
  const top = Math.max(...res.ht.map((b) => b.density), ...res.dEB.map((b) => b.density)) * 1.1;
  const line = (bins: { x0: number; x1: number; density: number }[], sx: (v: number) => number, sy: (v: number) => number) =>
    bins.map((b, i) => `${i ? "L" : "M"}${sx((b.x0 + b.x1) / 2)},${sy(b.density)}`).join("");
  return (
    <SimShell note="Entropy balancing finds the control weights closest to uniform (in KL divergence) that exactly match the treated means of the chosen moments. Here enrolment in a diabetes education programme depends on age squared. Matching only means leaves the age distribution's spread wrong; adding the second moment fixes the distribution and the estimate. A logit with linear terms (IPW) is misspecified in the same way.">
      <Plot x={[-3.5, 3.5]} y={[0, top]} height={260} xLabel="standardised age" yLabel="density">
        {(sx, sy) => (
          <>
            <Bars bins={res.ht} sx={sx} sy={sy} color={C1} opacity={0.35} />
            <path d={line(res.dEB, sx, sy)} stroke={C3} strokeWidth={2.5} fill="none" />
            <path d={line(res.dIPW, sx, sy)} stroke={C2} strokeWidth={2} strokeDasharray="5 4" fill="none" />
          </>
        )}
      </Plot>
      <Legend items={[{ color: C1, label: "participants", area: true }, { color: C3, label: "controls, entropy-balanced" }, { color: C2, label: "controls, IPW (linear logit)", dash: true }]} />
      <div className="mt-3 grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <div className="grid gap-3">
          <div className="flex items-center gap-2"><span className="text-sm muted">Balance age²?</span><Seg options={[{ value: "no", label: "means only" }, { value: "yes", label: "+ second moment" }]} value={second} onChange={setSecond} /></div>
          <Slider label="Nonlinearity of selection in age" value={nl} min={0} max={1.5} step={0.1} onChange={setNl} />
          <button className="btn w-fit" onClick={reseed}>New sample</button>
        </div>
        <div className="grid grid-cols-2 content-start gap-2">
          <Stat label="entropy balancing" value={fmt(res.eb, 3)} color={C3} sub="truth 2.000" />
          <Stat label="IPW (linear logit)" value={fmt(res.ipw, 3)} color={C2} />
          <Stat label="naive" value={fmt(res.naive, 3)} />
          <Stat label="ESS: EB · IPW" value={`${fmt(res.essEB, 0)} · ${fmt(res.essIPW, 0)}`} sub={`of ${res.nC} controls`} />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 85: synthetic control ---------------- */
export function scData(seed: number, J: number, T: number, T0: number, effect: number, outside: boolean, noise: number) {
  const r = rng(seed);
  const f1 = Array.from({ length: T }, (_, t) => 0.6 * t / T + 0.4 * Math.sin(t / 3));
  const f2 = Array.from({ length: T }, (_, t) => (t / T) ** 2 * 1.5);
  const load = Array.from({ length: J + 1 }, () => [r.u() * 2, r.u() * 2 - 0.5]);
  if (outside) load[0] = [2.6, 1.9];
  else load[0] = [0.45 * load[1][0] + 0.35 * load[2][0] + 0.2 * load[3][0], 0.45 * load[1][1] + 0.35 * load[2][1] + 0.2 * load[3][1]];
  const Y = load.map((l, j) => Array.from({ length: T }, (_, t) => 10 + 0.05 * t + l[0] * f1[t] * 3 + l[1] * f2[t] * 2 + noise * r.n() + (j === 0 && t >= T0 ? effect : 0)));
  return Y;
}
export function SynthLab() {
  const [T0, setT0] = useState(20), [eff, setEff] = useState(-2), [outside, setOutside] = useState<"in" | "out">("in"), [noise, setNoise] = useState(0.15);
  const [seed, reseed] = useSeed();
  const T = 30, J = 20;
  const res = useMemo(() => {
    const Y = scData(seed * 19 + 85, J, T, T0, eff, outside === "out", noise);
    const w = scWeights(Y[0].slice(0, T0), Y.slice(1).map((y) => y.slice(0, T0)));
    const synth = Array.from({ length: T }, (_, t) => Y.slice(1).reduce((s, y, j) => s + w[j] * y[t], 0));
    const gap = Y[0].map((v, t) => v - synth[t]);
    const pre = Math.sqrt(avg(gap.slice(0, T0).map((g) => g * g)));
    const donorAvg = Array.from({ length: T }, (_, t) => avg(Y.slice(1).map((y) => y[t])));
    const did = avg(Y[0].slice(T0)) - avg(Y[0].slice(0, T0)) - (avg(donorAvg.slice(T0)) - avg(donorAvg.slice(0, T0)));
    const top = w.map((v, j) => ({ j: j + 1, v })).sort((a, b) => b.v - a.v).slice(0, 3);
    return { Y, synth, sc: avg(gap.slice(T0)), pre, did, top, donorAvg };
  }, [T0, eff, outside, noise, seed]);
  const all = res.Y.flat();
  return (
    <SimShell note="A state raises its tobacco tax in the year marked by the dashed line. The synthetic control is the convex combination of 20 untreated states that best tracks its pre-policy cigarette sales; the post-policy gap estimates the effect. If the treated state lies outside the donors' range, no convex combination fits, the pre-period error is large and the estimate should not be trusted.">
      <Plot x={[0, T - 1]} y={[Math.min(...all) - 0.5, Math.max(...all) + 0.5]} height={290} xLabel="year" yLabel="packs per capita (index)">
        {(sx, sy) => (
          <>
            {res.Y.slice(1).map((y, j) => <path key={j} d={y.map((v, t) => `${t ? "L" : "M"}${sx(t)},${sy(v)}`).join("")} stroke="var(--text-3)" opacity={0.25} fill="none" />)}
            <line x1={sx(T0 - 0.5)} x2={sx(T0 - 0.5)} y1={sy(Math.min(...all) - 0.5)} y2={sy(Math.max(...all) + 0.5)} stroke="var(--text-3)" strokeDasharray="4 4" />
            <path d={res.synth.map((v, t) => `${t ? "L" : "M"}${sx(t)},${sy(v)}`).join("")} stroke={C2} strokeWidth={2.5} strokeDasharray="6 4" fill="none" />
            <path d={res.Y[0].map((v, t) => `${t ? "L" : "M"}${sx(t)},${sy(v)}`).join("")} stroke={C1} strokeWidth={3} fill="none" />
          </>
        )}
      </Plot>
      <Legend items={[{ color: C1, label: "treated state" }, { color: C2, label: "synthetic control", dash: true }, { color: "var(--text-3)", label: "donor states" }]} />
      <div className="mt-3 grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <div className="grid grid-cols-2 gap-3">
          <Slider label="Policy year (pre-periods)" value={T0} min={8} max={26} step={1} onChange={setT0} />
          <Slider label="True effect" value={eff} min={-4} max={2} step={0.25} onChange={setEff} />
          <Slider label="Noise" value={noise} min={0} max={0.6} step={0.05} onChange={setNoise} />
          <div className="flex items-end gap-2"><Seg options={[{ value: "in", label: "inside hull" }, { value: "out", label: "outside hull" }]} value={outside} onChange={setOutside} /></div>
          <button className="btn w-fit" onClick={reseed}>New sample</button>
        </div>
        <div className="grid grid-cols-2 content-start gap-2">
          <Stat label="synthetic-control effect" value={fmt(res.sc, 2)} color={C2} sub={`truth ${fmt(eff, 2)}`} />
          <Stat label="DiD vs donor average" value={fmt(res.did, 2)} />
          <Stat label="pre-period RMSPE" value={fmt(res.pre, 3)} color={res.pre > 0.4 ? C3 : undefined} />
          <Stat label="largest weights" value={res.top.map((t) => `#${t.j} ${t.v.toFixed(2)}`).join(" · ")} />
        </div>
      </div>
    </SimShell>
  );
}
