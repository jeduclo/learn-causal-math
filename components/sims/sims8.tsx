"use client";
import { useMemo, useState } from "react";
import { Bars, Legend, Plot, Seg, SimShell, Slider, Stat, curve, fmt, histogram, normInv, normPdf, rng, useSeed } from "./kit";
import { avg, combinations, ols, sd } from "./kit2";

const C1 = "var(--s1)", C2 = "var(--s2)", C3 = "var(--s3)", C4 = "var(--s4)";
const TOP = 12; // top margin of <Plot>, used for full-height reference lines

/** Random k-subset indicator of length n (complete randomisation). */
function assign(n: number, k: number, u: () => number) {
  const order = Array.from({ length: n }, (_, i) => [u(), i]).sort((a, b) => a[0] - b[0]);
  const t = new Array(n).fill(false);
  for (let j = 0; j < k; j++) t[order[j][1]] = true;
  return t as boolean[];
}
const varS = (x: number[]) => { const m = avg(x); return x.reduce((s, v) => s + (v - m) ** 2, 0) / (x.length - 1); };

/* ---------------- Day 36: Neyman's variance ---------------- */
export function NeymanLab() {
  const [het, setHet] = useState(1.5);
  const [N, setN] = useState(40);
  const [seed, reseed] = useSeed();
  const pop = useMemo(() => {
    const r = rng(seed * 3 + 36);
    return Array.from({ length: N }, () => {
      const y0 = 130 + 10 * r.n();                         // systolic BP without the drug
      return { y0, y1: y0 - 8 + het * 6 * r.n() };         // drug lowers BP by 8 on average
    });
  }, [N, het, seed]);
  const n1 = N / 2;
  const S1 = varS(pop.map((u) => u.y1)), S0 = varS(pop.map((u) => u.y0)), St = varS(pop.map((u) => u.y1 - u.y0));
  const vTrue = S1 / n1 + S0 / (N - n1) - St / N, vCons = S1 / n1 + S0 / (N - n1);
  const ate = avg(pop.map((u) => u.y1 - u.y0));
  const sim = useMemo(() => {
    const r = rng(seed * 7 + N + Math.round(het * 100));
    const est: number[] = [], vh: number[] = [];
    let cover = 0;
    for (let k = 0; k < 3000; k++) {
      const t = assign(N, n1, r.u);
      const a = pop.filter((_, i) => t[i]).map((u) => u.y1), b = pop.filter((_, i) => !t[i]).map((u) => u.y0);
      const e = avg(a) - avg(b), v = varS(a) / a.length + varS(b) / b.length;
      est.push(e); vh.push(v);
      if (Math.abs(e - ate) <= 1.96 * Math.sqrt(v)) cover++;
    }
    return { est, vh, cover: cover / 3000 };
  }, [pop, seed, N, n1, het, ate]);
  const lo = ate - 5 * Math.sqrt(vCons), hi = ate + 5 * Math.sqrt(vCons);
  const bins = histogram(sim.est, lo, hi, 40);
  const ymax = Math.max(...bins.map((b) => b.density), normPdf(0) / Math.sqrt(vTrue)) * 1.15;
  return (
    <SimShell note="A fixed group of patients; only the assignment is random. The true variance of the difference in means subtracts S²τ/N, which the data cannot estimate, so Neyman's estimator is conservative: exact when effects are constant, too large when they vary.">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Plot x={[lo, hi]} y={[0, ymax]} height={300} xLabel="difference in mean blood pressure (mmHg), 3,000 re-randomisations" yTicks={[]}>
          {(sx, sy) => (
            <>
              <Bars bins={bins} sx={sx} sy={sy} color={C1} opacity={0.55} />
              <path d={curve((x) => normPdf((x - ate) / Math.sqrt(vTrue)) / Math.sqrt(vTrue), lo, hi, sx, sy)} fill="none" stroke={C3} strokeWidth={2.5} />
              <path d={curve((x) => normPdf((x - ate) / Math.sqrt(avg(sim.vh))) / Math.sqrt(avg(sim.vh)), lo, hi, sx, sy)} fill="none" stroke={C2} strokeWidth={2.5} strokeDasharray="6 4" />
              <line x1={sx(ate)} x2={sx(ate)} y1={sy(0)} y2={TOP} stroke="var(--text)" strokeDasharray="3 3" />
            </>
          )}
        </Plot>
        <div className="space-y-3">
          <Slider label="Heterogeneity of effects (sd of τᵢ ÷ 6)" value={het} min={0} max={3} step={0.1} onChange={setHet} />
          <Slider label="Number of patients N" value={N} min={10} max={200} step={10} onChange={setN} />
          <button className="btn" onClick={reseed}>New patients</button>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="true variance" value={fmt(vTrue, 3)} color={C3} sub="S₁²/n₁ + S₀²/n₀ − S²τ/N" />
            <Stat label="mean of Neyman V̂" value={fmt(avg(sim.vh), 3)} color={C2} sub={`≈ ${fmt(vCons, 3)} (no S²τ term)`} />
            <Stat label="simulated variance" value={fmt(sd(sim.est) ** 2, 3)} />
            <Stat label="95% CI coverage" value={`${(100 * sim.cover).toFixed(1)}%`} sub="≥ 95% ⇒ conservative" />
          </div>
        </div>
      </div>
      <Legend items={[{ color: C1, label: "estimates", area: true }, { color: C3, label: "normal with the true variance" }, { color: C2, label: "normal with the average estimated variance", dash: true }]} />
    </SimShell>
  );
}

/* ---------------- Day 37: Fisher randomisation test ---------------- */
export function FisherLab() {
  const [n, setN] = useState(12);
  const [effect, setEffect] = useState(4);
  const [stat, setStat] = useState<"mean" | "rank">("mean");
  const [seed, reseed] = useSeed();
  const data = useMemo(() => {
    const r = rng(seed * 11 + n);
    const t = assign(n, n / 2, r.u);
    const y = t.map((ti) => Math.round(10 * (6 + 3 * r.n() + (ti ? effect : 0))) / 10); // sick days avoided per worker
    return { t, y };
  }, [n, effect, seed]);
  const ranks = useMemo(() => {
    const idx = data.y.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
    const r = new Array(n).fill(0);
    idx.forEach(([, i], k) => (r[i] = k + 1));
    return r as number[];
  }, [data, n]);
  const values = stat === "mean" ? data.y : ranks;
  const T = (set: Set<number>) => {
    let a = 0, b = 0;
    values.forEach((v, i) => (set.has(i) ? (a += v) : (b += v)));
    return a / (n / 2) - b / (n / 2);
  };
  const obs = T(new Set(data.t.map((v, i) => (v ? i : -1)).filter((i) => i >= 0)));
  const dist = useMemo(() => combinations(n, n / 2).map((c) => T(new Set(c))), [values, n]); // eslint-disable-line react-hooks/exhaustive-deps
  const p2 = dist.filter((d) => Math.abs(d) >= Math.abs(obs) - 1e-9).length / dist.length;
  const p1 = dist.filter((d) => d >= obs - 1e-9).length / dist.length;
  const lo = Math.min(...dist), hi = Math.max(...dist);
  const bins = histogram(dist, lo - 1e-6, hi + 1e-6, 36);
  return (
    <SimShell note="Sharp null: the programme changed nobody's outcome. Then every outcome is fixed, and we can recompute the statistic under all possible assignments. The p-value is the share of assignments at least as extreme as the one that happened — exact, with no distributional assumptions.">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Seg value={stat} onChange={setStat} options={[{ value: "mean", label: "Difference in means" }, { value: "rank", label: "Difference in mean ranks" }]} />
        <button className="btn" onClick={reseed}>New experiment</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Plot x={[lo - 0.05 * (hi - lo), hi + 0.05 * (hi - lo)]} y={[0, Math.max(...bins.map((b) => b.density)) * 1.15]} height={290}
          xLabel={`statistic under all ${dist.length.toLocaleString()} assignments`} yTicks={[]}>
          {(sx, sy) => (
            <>
              {bins.map((b, i) => {
                const mid = (b.x0 + b.x1) / 2, extreme = Math.abs(mid) >= Math.abs(obs);
                return <rect key={i} x={sx(b.x0)} y={sy(b.density)} width={Math.max(0, sx(b.x1) - sx(b.x0) - 1)} height={sy(0) - sy(b.density)} fill={extreme ? C2 : C1} opacity={extreme ? 0.85 : 0.5} />;
              })}
              {[obs, -obs].map((v, i) => <line key={i} x1={sx(v)} x2={sx(v)} y1={sy(0)} y2={TOP} stroke={i ? "var(--text-3)" : "var(--text)"} strokeWidth={2} strokeDasharray={i ? "3 3" : undefined} />)}
              <text x={sx(obs) + (obs > (lo + hi) / 2 ? -6 : 6)} y={TOP + 12} textAnchor={obs > (lo + hi) / 2 ? "end" : "start"} style={{ fill: "var(--text)", fontWeight: 700 }}>observed {fmt(obs, 2)}</text>
            </>
          )}
        </Plot>
        <div className="space-y-3">
          <Slider label="Clinic size n (half treated)" value={n} min={6} max={16} step={2} onChange={setN} />
          <Slider label="True effect (fewer sick days)" value={effect} min={0} max={8} step={0.5} onChange={setEffect} />
          <div className="grid grid-cols-2 gap-2">
            <Stat label="one-sided p" value={fmt(p1, 3)} />
            <Stat label="two-sided p" value={fmt(p2, 3)} color={C2} />
            <Stat label="assignments" value={dist.length.toLocaleString()} sub={`C(${n}, ${n / 2})`} />
            <Stat label="smallest possible p" value={fmt(2 / dist.length, 4)} sub="two-sided" />
          </div>
          <div className="flex flex-wrap gap-1 text-xs">
            {data.y.map((v, i) => (
              <span key={i} className="rounded px-1.5 py-0.5 font-mono" style={{ background: data.t[i] ? "color-mix(in oklab, var(--s1) 25%, transparent)" : "var(--surface-2)" }}>
                {stat === "mean" ? v.toFixed(1) : ranks[i]}
              </span>
            ))}
          </div>
          <div className="text-xs muted">Blue chips: treated workers. With n = 6 the smallest attainable two-sided p is 0.1 — no data can ever be "significant" at 5%.</div>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 38: blocking ---------------- */
export function BlockingLab() {
  const [between, setBetween] = useState(0.7);
  const [m, setM] = useState(10);
  const [seed, reseed] = useSeed();
  const res = useMemo(() => {
    const r = rng(seed * 5 + 38 + m);
    const blocks = 4;
    const mu = [-1.5, -0.5, 0.5, 1.5].map((v) => v * Math.sqrt(between) * 10 / 1.118);
    const pop = Array.from({ length: blocks * m }, (_, i) => {
      const b = Math.floor(i / m);
      return { b, y0: 50 + mu[b] + Math.sqrt(1 - between) * 10 * r.n() };
    });
    const comp: number[] = [], blk: number[] = [];
    for (let k = 0; k < 2500; k++) {
      const t = assign(pop.length, pop.length / 2, r.u);
      comp.push(avg(pop.filter((_, i) => t[i]).map((u) => u.y0 + 3)) - avg(pop.filter((_, i) => !t[i]).map((u) => u.y0)));
      let e = 0;
      for (let b = 0; b < blocks; b++) {
        const tb = assign(m, Math.floor(m / 2), r.u);
        const g = pop.filter((u) => u.b === b);
        e += (avg(g.filter((_, i) => tb[i]).map((u) => u.y0 + 3)) - avg(g.filter((_, i) => !tb[i]).map((u) => u.y0))) / blocks;
      }
      blk.push(e);
    }
    return { comp, blk };
  }, [between, m, seed]);
  const s1 = sd(res.comp), s2 = sd(res.blk);
  const lo = 3 - 4.5 * s1, hi = 3 + 4.5 * s1;
  const b1 = histogram(res.comp, lo, hi, 40), b2 = histogram(res.blk, lo, hi, 40);
  return (
    <SimShell note="Test scores in four districts that differ in baseline level. Randomising within each district removes the between-district variation from the estimator's variance; the gain grows with the share of variance that lies between blocks. True effect: +3 points.">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Plot x={[lo, hi]} y={[0, Math.max(...b2.map((b) => b.density), ...b1.map((b) => b.density)) * 1.12]} height={290} xLabel="estimated effect on test scores (2,500 experiments)" yTicks={[]}>
          {(sx, sy) => (
            <>
              <Bars bins={b1} sx={sx} sy={sy} color={C4} opacity={0.45} />
              <Bars bins={b2} sx={sx} sy={sy} color={C3} opacity={0.6} key0="k" />
              <line x1={sx(3)} x2={sx(3)} y1={sy(0)} y2={TOP} stroke="var(--text)" strokeDasharray="4 3" />
            </>
          )}
        </Plot>
        <div className="space-y-3">
          <Slider label="Share of variance between districts" value={between} min={0} max={0.95} step={0.05} onChange={setBetween} format={(v) => `${(100 * v).toFixed(0)}%`} />
          <Slider label="Pupils per district" value={m} min={4} max={40} step={2} onChange={setM} />
          <button className="btn" onClick={reseed}>New pupils</button>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="sd, complete randomisation" value={fmt(s1, 3)} color={C4} />
            <Stat label="sd, blocked by district" value={fmt(s2, 3)} color={C3} />
            <Stat label="variance ratio" value={fmt((s2 / s1) ** 2, 2)} sub="blocked ÷ complete" />
            <Stat label="equivalent sample gain" value={`${fmt(100 * ((s1 / s2) ** 2 - 1), 0)}%`} />
          </div>
        </div>
      </div>
      <Legend items={[{ color: C4, label: "complete randomisation", area: true }, { color: C3, label: "blocked randomisation", area: true }]} />
    </SimShell>
  );
}

/* ---------------- Day 39: regression adjustment ---------------- */
export function RegAdjustLab() {
  const [rho, setRho] = useState(0.7);
  const [slopeGap, setSlopeGap] = useState(1);
  const [share, setShare] = useState(0.3);
  const [n, setN] = useState(60);
  const [seed, reseed] = useSeed();
  const res = useMemo(() => {
    const r = rng(seed * 13 + 39);
    const pop = Array.from({ length: n }, () => {
      const x = r.n();                                    // standardised baseline earnings
      const e = r.n();
      const y0 = 20 + 4 * (rho * x + Math.sqrt(1 - rho * rho) * e);
      return { x, y0, y1: y0 + 2 + 4 * slopeGap * rho * x };
    });
    const ate = avg(pop.map((u) => u.y1 - u.y0));
    const xbar = avg(pop.map((u) => u.x));
    const raw: number[] = [], anc: number[] = [], lin: number[] = [];
    const n1 = Math.max(3, Math.round(share * n));
    for (let k = 0; k < 1500; k++) {
      const t = assign(n, n1, r.u);
      const y = pop.map((u, i) => (t[i] ? u.y1 : u.y0));
      raw.push(avg(y.filter((_, i) => t[i])) - avg(y.filter((_, i) => !t[i])));
      anc.push(ols(pop.map((u, i) => [1, t[i] ? 1 : 0, u.x]), y)[1]);
      lin.push(ols(pop.map((u, i) => { const xc = u.x - xbar, ti = t[i] ? 1 : 0; return [1, ti, xc, ti * xc]; }), y)[1]);
    }
    return { raw, anc, lin, ate };
  }, [rho, slopeGap, share, n, seed]);
  const rows = [
    { k: "raw", label: "raw difference", v: res.raw, c: "var(--text-3)" },
    { k: "anc", label: "ANCOVA", v: res.anc, c: C4 },
    { k: "lin", label: "Lin (interacted)", v: res.lin, c: C3 },
  ];
  const s0 = sd(res.raw);
  const lo = res.ate - 4 * s0, hi = res.ate + 4 * s0;
  const allBins = rows.map((r) => histogram(r.v, lo, hi, 40));
  const ymax = Math.max(...allBins.flat().map((b) => b.density)) * 1.1;
  return (
    <SimShell note="Job training with baseline earnings as a covariate. ANCOVA forces a common slope; when slopes differ by arm and the arms are unequal it can even lose to the raw difference. Lin's fully interacted, centred regression never does worse asymptotically.">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Plot x={[lo, hi]} y={[0, ymax]} height={300} xLabel="estimated effect ($1,000), 1,500 re-randomisations" yTicks={[]}>
          {(sx, sy) => (
            <>
              {allBins.map((b, i) => <Bars key={i} bins={b} sx={sx} sy={sy} color={rows[i].c} opacity={0.4} key0={rows[i].k} />)}
              <line x1={sx(res.ate)} x2={sx(res.ate)} y1={sy(0)} y2={TOP} stroke="var(--text)" strokeDasharray="4 3" />
            </>
          )}
        </Plot>
        <div className="space-y-3">
          <Slider label="corr(baseline, outcome)" value={rho} min={0} max={0.95} step={0.05} onChange={setRho} format={(v) => v.toFixed(2)} />
          <Slider label="Slope difference treated vs control" value={slopeGap} min={-1.5} max={1.5} step={0.1} onChange={setSlopeGap} format={(v) => v.toFixed(1)} />
          <Slider label="Share treated" value={share} min={0.1} max={0.9} step={0.05} onChange={setShare} format={(v) => `${(100 * v).toFixed(0)}%`} />
          <Slider label="Sample size" value={n} min={20} max={200} step={10} onChange={setN} />
          <button className="btn" onClick={reseed}>New workers</button>
          <div className="grid grid-cols-3 gap-2">
            {rows.map((r) => <Stat key={r.k} label={r.label} value={fmt(sd(r.v), 3)} sub={`bias ${fmt(avg(r.v) - res.ate, 3)}`} color={r.c} />)}
          </div>
          <div className="text-xs muted">Values are standard deviations across re-randomisations.</div>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 40: cluster randomisation ---------------- */
export function ClusterLab() {
  const [icc, setIcc] = useState(0.1);
  const [m, setM] = useState(25);
  const [r2, setR2] = useState(0);
  const [mde, setMde] = useState(0.25);
  const z = normInv(0.975) + normInv(0.8);
  const deff = (rho: number) => 1 + (m - 1) * rho;
  const mdeAt = (J: number, rho: number) => z * Math.sqrt((4 * deff(rho) * (1 - r2)) / (J * m));
  const Jneed = Math.ceil((z * z * 4 * deff(icc) * (1 - r2)) / (mde * mde * m));
  const Jmax = 300;
  const jInf = (z * z * 4 * icc * (1 - r2)) / (mde * mde);
  return (
    <SimShell note="Schools are randomised, pupils are measured. With intraclass correlation ρ, each school of m pupils counts like 1 + (m − 1)ρ fewer pupils. Adding pupils per school hits a ceiling; adding schools does not. Power 80%, two-sided 5%, half the schools treated, outcome in standard deviations.">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Plot x={[10, Jmax]} y={[0, 1]} height={300} xLabel="number of schools J" yLabel="minimum detectable effect (sd)"
          hover={(J) => [`J = ${Math.round(J)}`, `MDE = ${fmt(mdeAt(J, icc), 3)}`, `ignoring clustering: ${fmt(mdeAt(J, 0), 3)}`]}>
          {(sx, sy) => (
            <>
              <path d={curve((J) => Math.min(1.2, mdeAt(J, 0)), 10, Jmax, sx, sy)} fill="none" stroke="var(--text-3)" strokeWidth={2} strokeDasharray="5 4" />
              <path d={curve((J) => Math.min(1.2, mdeAt(J, icc)), 10, Jmax, sx, sy)} fill="none" stroke={C1} strokeWidth={3} />
              <line x1={sx(10)} x2={sx(Jmax)} y1={sy(mde)} y2={sy(mde)} stroke={C2} strokeDasharray="3 3" />
              {Jneed <= Jmax && <circle cx={sx(Jneed)} cy={sy(mde)} r={5} fill={C2} />}
            </>
          )}
        </Plot>
        <div className="space-y-3">
          <Slider label="Intraclass correlation ρ" value={icc} min={0} max={0.4} step={0.01} onChange={setIcc} format={(v) => v.toFixed(2)} />
          <Slider label="Pupils per school m" value={m} min={2} max={200} step={1} onChange={setM} />
          <Slider label="R² of baseline test score" value={r2} min={0} max={0.8} step={0.05} onChange={setR2} format={(v) => v.toFixed(2)} />
          <Slider label="Target effect (sd)" value={mde} min={0.1} max={0.5} step={0.01} onChange={setMde} format={(v) => v.toFixed(2)} />
          <div className="grid grid-cols-2 gap-2">
            <Stat label="design effect" value={fmt(deff(icc), 2)} sub="1 + (m − 1)ρ" />
            <Stat label="effective pupils per school" value={fmt(m / deff(icc), 1)} sub={`limit 1/ρ = ${icc > 0 ? fmt(1 / icc, 1) : "∞"}`} />
            <Stat label="schools needed" value={Jneed.toLocaleString()} color={C2} sub={`${(Jneed * m).toLocaleString()} pupils`} />
            <Stat label="schools needed as m → ∞" value={icc > 0 ? Math.ceil(jInf).toString() : "→ 0"} />
          </div>
        </div>
      </div>
      <Legend items={[{ color: C1, label: "MDE with clustering" }, { color: "var(--text-3)", label: "if pupils were independent", dash: true }, { color: C2, label: "target effect" }]} />
    </SimShell>
  );
}
