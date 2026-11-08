"use client";
import { useMemo, useState } from "react";
import { Bars, Legend, Plot, Seg, SimShell, Slider, Stat, fmt, histogram, rng, useSeed } from "./kit";
import { avg, ols, solve } from "./kit2";

const C1 = "var(--s1)", C2 = "var(--s2)", C3 = "var(--s3)", C4 = "var(--s4)";
const TOP = 12;

/* ---------------- Day 66: over-identification ---------------- */
export function OverIdLab() {
  const [delta, setDelta] = useState(0.05);
  const [p1, setP1] = useState(0.3), [p2, setP2] = useState(0.3);
  const [seed, reseed] = useSeed();
  const n = 500;
  const res = useMemo(() => {
    const r = rng(seed * 3 + 66);
    const e1: number[] = [], e2: number[] = [], e3: number[] = [];
    let rej = 0;
    for (let k = 0; k < 400; k++) {
      const Z1: number[] = [], Z2: number[] = [], X: number[] = [], Y: number[] = [];
      for (let i = 0; i < n; i++) {
        const z1 = r.n(), z2 = r.n(), u = r.n(), v = 0.5 * u + r.n();
        const x = p1 * z1 + p2 * z2 + v;
        Z1.push(z1); Z2.push(z2); X.push(x); Y.push(0.5 * x + delta * z2 + u);
      }
      const m = (a: number[]) => avg(a);
      const c = (a: number[], b: number[]) => { const ma = m(a), mb = m(b); let s = 0; for (let i = 0; i < n; i++) s += (a[i] - ma) * (b[i] - mb); return s; };
      e1.push(c(Z1, Y) / c(Z1, X)); e2.push(c(Z2, Y) / c(Z2, X));
      const S = [[c(Z1, Z1), c(Z1, Z2)], [c(Z2, Z1), c(Z2, Z2)]];
      const zx = [c(Z1, X), c(Z2, X)], zy = [c(Z1, Y), c(Z2, Y)];
      const a = solve(S, zx), bb = solve(S, zy);
      const beta = (zx[0] * bb[0] + zx[1] * bb[1]) / (zx[0] * a[0] + zx[1] * a[1]);
      e3.push(beta);
      const res = Y.map((y, i) => y - beta * X[i]);
      const g = ols(Z1.map((z, i) => [1, z, Z2[i]]), res);
      const fit = Z1.map((z, i) => g[0] + g[1] * z + g[2] * Z2[i]);
      const mr = avg(res);
      const R2 = 1 - res.reduce((s, v, i) => s + (v - fit[i]) ** 2, 0) / res.reduce((s, v) => s + (v - mr) ** 2, 0);
      if (n * R2 > 3.841) rej++;
    }
    return { e1, e2, e3, rej: rej / 400 };
  }, [delta, p1, p2, seed]);
  const lo = 0, hi = 1.2;
  const clip = (a: number[]) => a.map((v) => Math.max(lo, Math.min(hi - 1e-6, v)));
  const b1 = histogram(clip(res.e1), lo, hi, 50), b2 = histogram(clip(res.e2), lo, hi, 50), b3 = histogram(clip(res.e3), lo, hi, 50);
  const ymax = Math.max(...[...b1, ...b2, ...b3].map((b) => b.density)) * 1.1;
  return (
    <SimShell note="Two instruments for one endogenous regressor (true effect 0.5); 400 simulated studies of 500 observations. Give instrument 2 a direct effect on the outcome and watch its estimate drift, 2SLS follow it, and the J test reject only some of the time.">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Plot x={[lo, hi]} y={[0, ymax]} height={300} xLabel="estimate of the effect" yTicks={[]}>
          {(sx, sy) => (
            <>
              <Bars bins={b1} sx={sx} sy={sy} color={C1} opacity={0.4} />
              <Bars bins={b2} sx={sx} sy={sy} color={C2} opacity={0.4} key0="b" />
              <Bars bins={b3} sx={sx} sy={sy} color={C3} opacity={0.5} key0="c" />
              <line x1={sx(0.5)} x2={sx(0.5)} y1={sy(0)} y2={TOP} stroke="var(--text)" strokeWidth={2} strokeDasharray="4 3" />
            </>
          )}
        </Plot>
        <div className="space-y-3">
          <Slider label="Direct effect of instrument 2 on the outcome" value={delta} min={0} max={0.2} step={0.01} onChange={setDelta} />
          <Slider label="Strength of instrument 1" value={p1} min={0.05} max={0.8} step={0.05} onChange={setP1} />
          <Slider label="Strength of instrument 2" value={p2} min={0.05} max={0.8} step={0.05} onChange={setP2} />
          <button className="btn" onClick={reseed}>Re-run</button>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="mean IV, instrument 1" value={fmt(avg(res.e1), 3)} color={C1} />
            <Stat label="mean IV, instrument 2" value={fmt(avg(res.e2), 3)} color={C2} sub={`theory 0.5 + δ/π₂ = ${fmt(0.5 + delta / p2, 3)}`} />
            <Stat label="mean 2SLS" value={fmt(avg(res.e3), 3)} color={C3} />
            <Stat label="J test rejection rate" value={`${(100 * res.rej).toFixed(1)}%`} sub="5% if both valid" />
          </div>
        </div>
      </div>
      <Legend items={[{ color: C1, label: "IV with instrument 1", area: true }, { color: C2, label: "IV with instrument 2", area: true }, { color: C3, label: "2SLS with both", area: true }]} />
    </SimShell>
  );
}

/* ---------------- Day 67: the 2×2 DiD ---------------- */
export function Did2x2Lab() {
  const [gap, setGap] = useState(10), [trend, setTrend] = useState(6), [eff, setEff] = useState(6), [viol, setViol] = useState(0);
  const [cf, setCf] = useState<"level" | "prop">("level");
  const c0 = 35, c1 = c0 + trend, t0 = c0 + gap;
  const t1cf = cf === "level" ? t0 + trend + viol : t0 * (c1 / c0) + viol;
  const t1 = t1cf + eff;
  const did = (t1 - t0) - (c1 - c0);
  const didLog = Math.log(t1 / t0) - Math.log(c1 / c0);
  const lo = Math.min(c0, t0, c1, t1, t1cf) - 8, hi = Math.max(c0, t0, c1, t1, t1cf) + 8;
  return (
    <SimShell note="Mean outcomes before and after a policy for the treated group (blue) and a comparison group (grey). DiD assumes the treated group would have followed the dashed path, parallel to the comparison group in levels. Choose how the untreated world really evolves (parallel in levels or proportional growth) and add a violation to see the bias.">
      <div className="mb-3"><Seg value={cf} onChange={setCf} options={[{ value: "level", label: "True counterfactual: same change in levels" }, { value: "prop", label: "True counterfactual: same % growth" }]} /></div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Plot x={[-0.3, 1.3]} y={[lo, hi]} height={300} xTicks={[0, 1]} xFormat={(v) => (v === 0 ? "before" : "after")} yLabel="outcome">
          {(sx, sy) => (
            <>
              <line x1={sx(0)} x2={sx(1)} y1={sy(c0)} y2={sy(c1)} stroke="var(--text-3)" strokeWidth={3} />
              <line x1={sx(0)} x2={sx(1)} y1={sy(t0)} y2={sy(t1)} stroke={C1} strokeWidth={3} />
              <line x1={sx(0)} x2={sx(1)} y1={sy(t0)} y2={sy(t0 + trend)} stroke={C1} strokeWidth={2} strokeDasharray="6 4" opacity={0.7} />
              <line x1={sx(1)} x2={sx(1)} y1={sy(t0 + trend)} y2={sy(t1)} stroke={C3} strokeWidth={4} />
              <text x={sx(1) + 8} y={(sy(t0 + trend) + sy(t1)) / 2} style={{ fill: C3, fontWeight: 700 }}>DiD {fmt(did, 1)}</text>
              {[[0, c0], [1, c1], [0, t0], [1, t1]].map(([x, y], i) => <circle key={i} cx={sx(x)} cy={sy(y)} r={6} fill={i < 2 ? "var(--text-3)" : C1} />)}
              <circle cx={sx(1)} cy={sy(t1cf)} r={6} fill="none" stroke={C2} strokeWidth={2.5} />
              <text x={sx(1) - 10} y={sy(t1cf) + 4} textAnchor="end" style={{ fill: C2 }}>true Y(0)</text>
            </>
          )}
        </Plot>
        <div className="space-y-3">
          <Slider label="Treated − comparison gap before" value={gap} min={-20} max={30} step={1} onChange={setGap} />
          <Slider label="Comparison group change" value={trend} min={-10} max={15} step={0.5} onChange={setTrend} />
          <Slider label="True effect (ATT)" value={eff} min={-10} max={15} step={0.5} onChange={setEff} />
          <Slider label="Extra untreated trend of the treated (violation)" value={viol} min={-8} max={8} step={0.5} onChange={setViol} />
          <div className="grid grid-cols-2 gap-2">
            <Stat label="DiD (levels)" value={fmt(did, 2)} color={C3} />
            <Stat label="true ATT" value={fmt(eff, 2)} />
            <Stat label="bias" value={fmt(did - eff, 2)} color={Math.abs(did - eff) < 1e-9 ? C3 : C2} />
            <Stat label="DiD in logs" value={fmt(didLog, 3)} sub={`ATT in logs ${fmt(Math.log(t1 / t1cf), 3)}`} />
          </div>
        </div>
      </div>
      <Legend items={[{ color: C1, label: "treated" }, { color: "var(--text-3)", label: "comparison" }, { color: C1, label: "DiD counterfactual (parallel)", dash: true }, { color: C2, label: "true untreated outcome" }]} />
    </SimShell>
  );
}

/* ---------------- Day 68: event study ---------------- */
export function EventStudyLab() {
  const [pre, setPre] = useState(0), [imp, setImp] = useState(1), [grow, setGrow] = useState(0.5), [ant, setAnt] = useState(0);
  const [noise, setNoise] = useState(0.3), [ref, setRef] = useState<"-1" | "-2">("-1"), [M, setM] = useState(1);
  const [seed, reseed] = useSeed();
  const ks = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4];
  const truth = (k: number) => (k >= 0 ? imp + grow * k : k === -1 ? ant : 0);
  const path = useMemo(() => {
    const r = rng(seed * 5 + 68);
    return ks.map((k) => truth(k) + pre * k + noise * r.n());     // treated-minus-comparison gap by event time
  }, [pre, imp, grow, ant, noise, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const r0 = ks.indexOf(ref === "-1" ? -1 : -2);
  const beta = path.map((v) => v - path[r0]);
  const se = noise * Math.SQRT2;
  const preIdx = ks.map((k, i) => (k < (ref === "-1" ? -1 : -2) ? i : -1)).filter((i) => i >= 0);
  const maxPre = Math.max(0, ...preIdx.map((i) => Math.abs(beta[i])));
  const k2 = ks.indexOf(2);
  const lo = Math.min(...beta) - 2 * se - 0.5, hi = Math.max(...beta) + 2 * se + 0.5;
  return (
    <SimShell note="Event-study coefficients (dots, with 95% intervals) are DiDs relative to the reference period. Grey squares show the true effect plus any pre-existing trend gap. Add a linear pre-trend, anticipation or noise and see what the pre-period coefficients reveal, and how a sensitivity interval that allows post-period violations up to M times the largest pre-period one changes the conclusion at k = 2.">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Plot x={[-5.5, 4.5]} y={[lo, hi]} height={310} xLabel="event time k" yLabel="coefficient" xTicks={ks}>
          {(sx, sy) => (
            <>
              <line x1={sx(-5.5)} x2={sx(4.5)} y1={sy(0)} y2={sy(0)} stroke="var(--text-3)" />
              <line x1={sx(-0.5)} x2={sx(-0.5)} y1={sy(lo)} y2={sy(hi)} stroke="var(--text-3)" strokeDasharray="3 3" />
              <rect x={sx(2) - 6} y={sy(beta[k2] + M * maxPre + 1.96 * se)} width={12} height={Math.max(1, sy(beta[k2] - M * maxPre - 1.96 * se) - sy(beta[k2] + M * maxPre + 1.96 * se))} fill={C4} opacity={0.25} rx={3} />
              {ks.map((k, i) => (
                <g key={k}>
                  <rect x={sx(k) - 4} y={sy(truth(k) - truth(ks[r0]) + pre * (k - ks[r0])) - 4} width={8} height={8} fill="var(--text-3)" opacity={0.6} />
                  <line x1={sx(k)} x2={sx(k)} y1={sy(beta[i] - 1.96 * se)} y2={sy(beta[i] + 1.96 * se)} stroke={k < 0 ? C4 : C1} strokeWidth={2} />
                  <circle cx={sx(k)} cy={sy(beta[i])} r={5} fill={i === r0 ? "var(--surface)" : k < 0 ? C4 : C1} stroke={k < 0 ? C4 : C1} strokeWidth={2} />
                </g>
              ))}
            </>
          )}
        </Plot>
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-3">
            <Slider label="Pre-trend slope" value={pre} min={-0.5} max={0.5} step={0.05} onChange={setPre} />
            <Slider label="Effect on impact" value={imp} min={-2} max={3} step={0.1} onChange={setImp} />
            <Slider label="Effect growth per period" value={grow} min={-0.5} max={1} step={0.05} onChange={setGrow} />
            <Slider label="Anticipation at k = −1" value={ant} min={-1} max={1} step={0.05} onChange={setAnt} />
            <Slider label="Noise (SE ÷ √2)" value={noise} min={0.05} max={1} step={0.05} onChange={setNoise} />
            <Slider label="Sensitivity M" value={M} min={0} max={3} step={0.25} onChange={setM} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Seg value={ref} onChange={setRef} options={[{ value: "-1", label: "reference k = −1" }, { value: "-2", label: "reference k = −2" }]} />
            <button className="btn" onClick={reseed}>New noise</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="β at k = 2" value={fmt(beta[k2], 2)} color={C1} sub={`true effect ${fmt(truth(2), 2)}`} />
            <Stat label={`sensitivity interval (M = ${M})`} value={`[${fmt(beta[k2] - M * maxPre - 1.96 * se, 2)}, ${fmt(beta[k2] + M * maxPre + 1.96 * se, 2)}]`} color={C4} />
          </div>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 69: two-way fixed effects ---------------- */
export function TwfeLab() {
  const [spread, setSpread] = useState(3), [tau, setTau] = useState(1), [trend, setTrend] = useState(0.4);
  const [view, setView] = useState<"raw" | "unit" | "two">("raw");
  const [seed, reseed] = useSeed();
  const N = 8, T = 10;
  const data = useMemo(() => {
    const r = rng(seed * 7 + 69);
    const alpha = Array.from({ length: N }, (_, i) => spread * (i / (N - 1) - 0.5) * 2);
    const D = alpha.map((_, i) => Array.from({ length: T }, (_, t) => (i >= N / 2 && t >= 5 ? 1 : 0)));
    const Y = alpha.map((a, i) => Array.from({ length: T }, (_, t) => 10 + a + trend * t + tau * D[i][t] + 0.4 * r.n()));
    return { D, Y };
  }, [spread, tau, trend, seed]);
  const dm = (M: number[][], two: boolean) => {
    const rm = M.map((row) => avg(row));
    const cm = Array.from({ length: T }, (_, t) => avg(M.map((row) => row[t])));
    const g = avg(rm);
    return M.map((row, i) => row.map((v, t) => v - rm[i] - (two ? cm[t] - g : 0)));
  };
  const coef = (Y: number[][], D: number[][]) => {
    let a = 0, b = 0; Y.forEach((row, i) => row.forEach((v, t) => { a += D[i][t] * v; b += D[i][t] * D[i][t]; })); return a / b;
  };
  const flatD = data.D.flat(), flatY = data.Y.flat();
  const pooled = (() => { const md = avg(flatD), my = avg(flatY); let a = 0, b = 0; flatD.forEach((d, i) => { a += (d - md) * (flatY[i] - my); b += (d - md) ** 2; }); return a / b; })();
  const fe1 = coef(dm(data.Y, false), dm(data.D, false));
  const fe2 = coef(dm(data.Y, true), dm(data.D, true));
  const shown = view === "raw" ? data.Y : dm(data.Y, view === "two");
  const all = shown.flat(); const lo = Math.min(...all) - 0.5, hi = Math.max(...all) + 0.5;
  return (
    <SimShell note="Eight workers over ten years. The four with the highest permanent wage level (unit effect) join a union in year 5. Pooled OLS confuses permanent differences with the union effect; removing unit means (one-way FE) leaves the common time trend tangled with the treatment timing; removing unit and year means (TWFE) isolates within-unit changes.">
      <div className="mb-3"><Seg value={view} onChange={setView} options={[{ value: "raw", label: "Raw outcomes" }, { value: "unit", label: "Unit-demeaned" }, { value: "two", label: "Two-way demeaned" }]} /></div>
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Plot x={[0, T - 1]} y={[lo, hi]} height={300} xLabel="year" yLabel={view === "raw" ? "log wage (×10)" : "demeaned"}>
          {(sx, sy) => (
            <>
              <line x1={sx(4.5)} x2={sx(4.5)} y1={sy(lo)} y2={sy(hi)} stroke="var(--text-3)" strokeDasharray="3 3" />
              {shown.map((row, i) => (
                <polyline key={i} points={row.map((v, t) => `${sx(t)},${sy(v)}`).join(" ")} fill="none" stroke={i >= N / 2 ? C1 : "var(--text-3)"} strokeWidth={2} opacity={0.85} />
              ))}
            </>
          )}
        </Plot>
        <div className="space-y-3">
          <Slider label="Spread of unit effects (selection)" value={spread} min={0} max={6} step={0.25} onChange={setSpread} />
          <Slider label="True union effect" value={tau} min={-2} max={3} step={0.1} onChange={setTau} />
          <Slider label="Common time trend" value={trend} min={-0.5} max={1} step={0.05} onChange={setTrend} />
          <button className="btn" onClick={reseed}>New noise</button>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="pooled OLS" value={fmt(pooled, 2)} color={C2} />
            <Stat label="unit FE only" value={fmt(fe1, 2)} color={C4} />
            <Stat label="two-way FE" value={fmt(fe2, 2)} color={C3} />
            <Stat label="truth" value={fmt(tau, 2)} />
          </div>
        </div>
      </div>
      <Legend items={[{ color: C1, label: "join the union in year 5" }, { color: "var(--text-3)", label: "never join" }]} />
    </SimShell>
  );
}

/* ---------------- Day 70: Goodman-Bacon decomposition ---------------- */
export function BaconLab() {
  const [tk, setTk] = useState(4), [tl, setTl] = useState(7);
  const [nk, setNk] = useState(1), [nl, setNl] = useState(1), [nu, setNu] = useState(1);
  const [imp, setImp] = useState(1), [grow, setGrow] = useState(0.5);
  const T = 10;
  const tl2 = Math.max(tl, tk + 1);
  const res = useMemo(() => {
    const t = Array.from({ length: T }, (_, i) => i + 1);
    const eff = (e: number) => (e >= 0 ? imp + grow * e : 0);
    const Y = [t.map((s) => 1 + 0.3 * s + eff(s - tk)), t.map((s) => 2 + 0.3 * s + eff(s - tl2)), t.map((s) => 0.5 + 0.3 * s)];
    const did = (a: number, b: number, pre: boolean[], post: boolean[]) => {
      const m = (row: number[], mask: boolean[]) => avg(row.filter((_, i) => mask[i]));
      return (m(Y[a], post) - m(Y[a], pre)) - (m(Y[b], post) - m(Y[b], pre));
    };
    const pk = t.map((s) => s >= tk), pl = t.map((s) => s >= tl2);
    const not = (a: boolean[]) => a.map((v) => !v), and = (a: boolean[], b: boolean[]) => a.map((v, i) => v && b[i]);
    const b = [did(0, 2, not(pk), pk), did(1, 2, not(pl), pl), did(0, 1, and(not(pk), not(pl)), and(pk, not(pl))), did(1, 0, and(pk, not(pl)), pl)];
    const tot = nk + nl + nu, sk = nk / tot, sl = nl / tot, su = nu / tot;
    const Dk = avg(pk.map(Number)), Dl = avg(pl.map(Number));
    const sh = (a: number, c: number) => a / (a + c);
    const w = [
      (sk + su) ** 2 * sh(sk, su) * (1 - sh(sk, su)) * Dk * (1 - Dk),
      (sl + su) ** 2 * sh(sl, su) * (1 - sh(sl, su)) * Dl * (1 - Dl),
      ((sk + sl) * (1 - Dl)) ** 2 * sh(sk, sl) * (1 - sh(sk, sl)) * ((Dk - Dl) / (1 - Dl)) * ((1 - Dk) / (1 - Dl)),
      ((sk + sl) * Dk) ** 2 * sh(sk, sl) * (1 - sh(sk, sl)) * (Dl / Dk) * ((Dk - Dl) / Dk),
    ];
    const ws = w.reduce((s, v) => s + v, 0);
    const wn = w.map((v) => v / ws);
    const twfe = wn.reduce((s, v, i) => s + v * b[i], 0);
    const cellsK = T - tk + 1, cellsL = T - tl2 + 1;
    const att = (nk * Array.from({ length: cellsK }, (_, e) => eff(e)).reduce((s, v) => s + v, 0) + nl * Array.from({ length: cellsL }, (_, e) => eff(e)).reduce((s, v) => s + v, 0)) / (nk * cellsK + nl * cellsL);
    return { Y, b, wn, twfe, att, t };
  }, [tk, tl2, nk, nl, nu, imp, grow]);
  const labels = ["early vs never", "late vs never", "early vs not-yet-treated late", "late vs already-treated early"];
  const colors = [C1, C4, C3, C2];
  const all = res.Y.flat();
  return (
    <SimShell note="Three groups: early adopters, late adopters and never-treated, with a common trend. The TWFE coefficient equals the weighted sum of four 2×2 DiDs (bar heights; bar widths are the weights). With effects that grow over time, the comparison that uses already-treated early adopters as controls is biased, and TWFE drifts away from the average effect on treated unit-periods.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Plot x={[1, T]} y={[Math.min(...all) - 0.5, Math.max(...all) + 0.5]} height={260} xLabel="period" yLabel="mean outcome">
          {(sx, sy) => (
            <>
              {res.Y.map((row, g) => <polyline key={g} points={row.map((v, i) => `${sx(i + 1)},${sy(v)}`).join(" ")} fill="none" stroke={[C1, C4, "var(--text-3)"][g]} strokeWidth={3} />)}
              {[tk, tl2].map((s, i) => <line key={i} x1={sx(s - 0.5)} x2={sx(s - 0.5)} y1={sy(Math.min(...all) - 0.5)} y2={sy(Math.max(...all) + 0.5)} stroke={[C1, C4][i]} strokeDasharray="4 3" />)}
            </>
          )}
        </Plot>
        <svg viewBox="0 0 560 260" className="w-full">
          {(() => {
            const vmax = Math.max(1, ...res.b.map((v) => Math.abs(v))) * 1.15, base = 170, scale = 130 / vmax;
            let x = 30;
            return (
              <>
                <line x1={20} x2={540} y1={base} y2={base} stroke="var(--border)" />
                {res.b.map((v, i) => {
                  const w = Math.max(6, res.wn[i] * 500), el = (
                    <g key={i}>
                      <rect x={x} y={v >= 0 ? base - v * scale : base} width={w - 4} height={Math.abs(v) * scale} fill={colors[i]} opacity={0.85} rx={3} />
                      <text x={x + w / 2 - 2} y={v >= 0 ? base - v * scale - 6 : base + Math.abs(v) * scale + 14} textAnchor="middle" style={{ fill: "var(--text)", fontWeight: 700 }}>{fmt(v, 2)}</text>
                      <text x={x + w / 2 - 2} y={250} textAnchor="middle" style={{ fill: "var(--text-2)", fontSize: 10 }}>{(100 * res.wn[i]).toFixed(0)}%</text>
                    </g>
                  );
                  x += w; return el;
                })}
                <line x1={20} x2={540} y1={base - res.twfe * scale} y2={base - res.twfe * scale} stroke="var(--text)" strokeDasharray="5 4" />
                <line x1={20} x2={540} y1={base - res.att * scale} y2={base - res.att * scale} stroke={C3} strokeDasharray="2 3" strokeWidth={2} />
              </>
            );
          })()}
        </svg>
      </div>
      <Legend items={[...labels.map((l, i) => ({ color: colors[i], label: l, area: true })), { color: "var(--text)", label: "TWFE", dash: true }, { color: C3, label: "ATT", dash: true }]} />
      <div className="mt-3 grid gap-4 md:grid-cols-[1.3fr_1fr]">
        <div className="grid grid-cols-2 gap-3">
          <Slider label="Early adoption period" value={tk} min={2} max={8} step={1} onChange={(v) => { setTk(v); if (tl <= v) setTl(v + 1); }} />
          <Slider label="Late adoption period" value={tl2} min={tk + 1} max={9} step={1} onChange={setTl} />
          <Slider label="Size: early" value={nk} min={0.5} max={4} step={0.5} onChange={setNk} />
          <Slider label="Size: late" value={nl} min={0.5} max={4} step={0.5} onChange={setNl} />
          <Slider label="Size: never" value={nu} min={0.5} max={4} step={0.5} onChange={setNu} />
          <div />
          <Slider label="Effect on impact" value={imp} min={-1} max={3} step={0.1} onChange={setImp} />
          <Slider label="Effect growth per period" value={grow} min={-0.5} max={1.5} step={0.05} onChange={setGrow} />
        </div>
        <div className="grid grid-cols-2 content-start gap-2">
          <Stat label="TWFE = Σ weight × 2×2" value={fmt(res.twfe, 3)} />
          <Stat label="ATT (treated unit-periods)" value={fmt(res.att, 3)} color={C3} />
          <Stat label="weight on forbidden comparison" value={`${(100 * res.wn[3]).toFixed(1)}%`} color={C2} />
          <Stat label="bias" value={fmt(res.twfe - res.att, 3)} />
        </div>
      </div>
    </SimShell>
  );
}

