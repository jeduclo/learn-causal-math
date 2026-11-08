"use client";
import { useMemo, useState } from "react";
import {
  Bars, Legend, Plot, Seg, SimShell, Slider, Stat, areaPath, curve, fmt, histogram, mean, median, normCdf, normInv, normPdf, rng, useSeed, variance,
} from "./kit";

const C1 = "var(--s1)", C2 = "var(--s2)", C3 = "var(--s3)", C4 = "var(--s4)";

/* ---------------- Day 6: CEF & law of total variance ---------------- */
export function CefLab() {
  const [p, setP] = useState(0.4);
  const [m0, setM0] = useState(40);
  const [m1, setM1] = useState(70);
  const [s0, setS0] = useState(10);
  const [s1, setS1] = useState(20);
  const ey = (1 - p) * m0 + p * m1;
  const within = (1 - p) * s0 * s0 + p * s1 * s1;
  const between = p * (1 - p) * (m1 - m0) ** 2;
  const total = within + between;
  const f0 = (x: number) => (1 - p) * normPdf(x, m0, s0), f1 = (x: number) => p * normPdf(x, m1, s1);
  const lo = 0, hi = 140;
  const ymax = Math.max(...Array.from({ length: 141 }, (_, i) => f0(i) + f1(i))) * 1.15;
  return (
    <SimShell note="The overall distribution (grey) is a mixture of the two groups. Its mean is the share-weighted average of group means (LIE); its variance is within + between.">
      <Plot x={[lo, hi]} y={[0, ymax]} xLabel="wage ($ thousands)" yLabel="density" height={270}
        hover={(x) => [`wage = ${fmt(x, 0)}`, `P(college | wage) = ${fmt(f1(x) / (f0(x) + f1(x)))}`]}>
        {(sx, sy) => (
          <>
            <path d={areaPath((x) => f0(x) + f1(x), lo, hi, sx, sy)} fill="var(--text-3)" opacity={0.15} />
            <path d={curve(f0, lo, hi, sx, sy)} fill="none" stroke={C1} strokeWidth={2} />
            <path d={curve(f1, lo, hi, sx, sy)} fill="none" stroke={C2} strokeWidth={2} />
            {[[m0, C1, "E[W|HS]", 0.95], [m1, C2, "E[W|Col]", 0.95], [ey, "var(--text)", "E[W]", 0.84]].map(([m, c, l, h]) => (
              <g key={l as string}>
                <line x1={sx(m as number)} x2={sx(m as number)} y1={sy(0)} y2={sy(ymax * ((h as number) - 0.04))} stroke={c as string} strokeDasharray="4 3" />
                <text x={sx(m as number)} y={sy(ymax * (h as number))} textAnchor="middle" style={{ fill: "var(--text)", fontWeight: 600 }}>{l as string}</text>
              </g>
            ))}
          </>
        )}
      </Plot>
      <Legend items={[{ color: C1, label: "high school (weighted by share)" }, { color: C2, label: "college (weighted by share)" }, { color: "var(--text-3)", label: "all workers", area: true }]} />
      <div className="mt-3">
        <div className="mb-1 text-xs faint">Var(W) = E[Var(W|X)] + Var(E[W|X])</div>
        <div className="flex h-7 w-full overflow-hidden rounded-lg">
          <div className="grid place-items-center text-xs font-semibold text-white" style={{ width: `${(100 * within) / total}%`, background: C1 }}>within {fmt(within, 0)}</div>
          <div className="ml-[2px] grid place-items-center text-xs font-semibold text-white" style={{ width: `${(100 * between) / total}%`, background: C2 }}>{between / total > 0.12 ? `between ${fmt(between, 0)}` : ""}</div>
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          <Slider label="College share" value={p} min={0.05} max={0.95} step={0.05} onChange={setP} format={(v) => fmt(v)} />
          <span />
          <Slider label="HS mean" value={m0} min={20} max={100} step={1} onChange={setM0} />
          <Slider label="HS sd" value={s0} min={3} max={30} step={1} onChange={setS0} />
          <Slider label="College mean" value={m1} min={20} max={100} step={1} onChange={setM1} />
          <Slider label="College sd" value={s1} min={3} max={30} step={1} onChange={setS1} />
        </div>
        <div className="grid grid-cols-2 gap-2 self-start">
          <Stat label="E[W] (LIE)" value={fmt(ey, 1)} />
          <Stat label="Var(W)" value={fmt(total, 0)} />
          <Stat label="Share explained (R²)" value={fmt(between / total)} color={C2} sub="between ÷ total" />
          <Stat label="Within-group share" value={fmt(within / total)} color={C1} />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 7: CLT ---------------- */
type Parent = "unif" | "exp" | "bimodal" | "bern" | "lnorm";
const PARENTS: Record<Parent, { label: string; mu: number; sd: number; draw: (r: ReturnType<typeof rng>) => number; lo: number; hi: number }> = {
  unif: { label: "Uniform(0,1)", mu: 0.5, sd: Math.sqrt(1 / 12), draw: (r) => r.u(), lo: 0, hi: 1 },
  exp: { label: "Exponential(1)", mu: 1, sd: 1, draw: (r) => r.exp(1), lo: 0, hi: 5 },
  bimodal: { label: "Bimodal", mu: 0, sd: Math.sqrt(1 + 0.25), draw: (r) => (r.u() < 0.5 ? -1 : 1) + 0.5 * r.n(), lo: -3, hi: 3 },
  bern: { label: "Bernoulli(0.1)", mu: 0.1, sd: Math.sqrt(0.09), draw: (r) => (r.u() < 0.1 ? 1 : 0), lo: -0.1, hi: 1.1 },
  lnorm: { label: "Log-normal(0,1)", mu: Math.exp(0.5), sd: Math.sqrt((Math.E - 1) * Math.E), draw: (r) => Math.exp(r.n()), lo: 0, hi: 8 },
};
export function CltSim() {
  const [par, setPar] = useState<Parent>("exp");
  const [n, setN] = useState(30);
  const [seed, reseed] = useSeed();
  const P = PARENTS[par];
  const { means, parent } = useMemo(() => {
    const r = rng(seed * 13 + n);
    const means = Array.from({ length: 4000 }, () => {
      let s = 0;
      for (let i = 0; i < n; i++) s += P.draw(r);
      return s / n;
    });
    const parent = Array.from({ length: 4000 }, () => P.draw(r));
    return { means, parent };
  }, [par, n, seed, P]);
  const se = P.sd / Math.sqrt(n);
  const lo = P.mu - 4.5 * se, hi = P.mu + 4.5 * se;
  const bins = histogram(means, lo, hi, 45);
  const ymax = Math.max(normPdf(0, 0, se), ...bins.map((b) => b.density)) * 1.1;
  const m = mean(means), sd = Math.sqrt(variance(means));
  const skew = mean(means.map((v) => ((v - m) / sd) ** 3));
  const pb = histogram(parent, P.lo, P.hi, 30);
  return (
    <SimShell note="4,000 samples of size n. Even when the parent is skewed or lumpy, the sample mean's distribution approaches N(μ, σ²/n). Skewness shrinks like 1/√n.">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Seg value={par} onChange={setPar} options={(Object.keys(PARENTS) as Parent[]).map((k) => ({ value: k, label: PARENTS[k].label }))} />
        <button className="btn" onClick={reseed}>Draw again</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div>
          <Plot x={[lo, hi]} y={[0, ymax]} xLabel={`sample mean (n = ${n})`} yLabel="density" height={280}
            hover={(x) => [`x̄ = ${fmt(x, 3)}`, `normal approx. density ${fmt(normPdf(x, P.mu, se), 2)}`]}>
            {(sx, sy) => (
              <>
                <Bars bins={bins} sx={sx} sy={sy} color={C1} opacity={0.55} />
                <path d={curve((x) => normPdf(x, P.mu, se), lo, hi, sx, sy)} fill="none" stroke={C2} strokeWidth={2} />
              </>
            )}
          </Plot>
          <Legend items={[{ color: C1, label: "4,000 simulated sample means", area: true }, { color: C2, label: "CLT: N(μ, σ²/n)" }]} />
        </div>
        <div className="space-y-3">
          <div className="text-xs faint">Parent distribution</div>
          <Plot x={[P.lo, P.hi]} y={[0, Math.max(...pb.map((b) => b.density)) * 1.1]} height={170} yTicks={[]}>
            {(sx, sy) => <Bars bins={pb} sx={sx} sy={sy} color="var(--text-3)" opacity={0.6} />}
          </Plot>
          <Slider label="Sample size n" value={n} min={1} max={200} step={1} onChange={setN} />
          <div className="grid grid-cols-2 gap-2">
            <Stat label="mean of x̄" value={fmt(m, 3)} sub={`μ = ${fmt(P.mu, 3)}`} />
            <Stat label="sd of x̄" value={fmt(sd, 3)} sub={`σ/√n = ${fmt(se, 3)}`} />
            <Stat label="skewness of x̄" value={fmt(skew)} sub="normal = 0" color={C1} />
          </div>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 8: estimator race ---------------- */
export function EstimatorRace() {
  const [dist, setDist] = useState<"norm" | "t3">("norm");
  const [n, setN] = useState(25);
  const [mu, setMu] = useState(2);
  const [c, setC] = useState(0.9);
  const [seed, reseed] = useSeed();
  const sigma = 10;
  const res = useMemo(() => {
    const r = rng(seed * 7 + n);
    const draw = () => {
      if (dist === "norm") return mu + sigma * r.n();
      const z = r.n(), v = r.n() ** 2 + r.n() ** 2 + r.n() ** 2;
      return mu + (sigma / Math.sqrt(3)) * (z / Math.sqrt(v / 3)); // t(3) scaled to sd 10
    };
    const est = { mean: [] as number[], median: [] as number[], shrink: [] as number[] };
    for (let k = 0; k < 3000; k++) {
      const x = Array.from({ length: n }, draw);
      const m = mean(x);
      est.mean.push(m);
      est.median.push(median(x));
      est.shrink.push(c * m);
    }
    return est;
  }, [dist, n, mu, c, seed]);
  const rows = ([["mean", "Sample mean", C1], ["median", "Sample median", C3], ["shrink", `${c.toFixed(2)} × mean`, C2]] as const).map(([k, label, color]) => {
    const e = res[k];
    const bias = mean(e) - mu, v = variance(e);
    return { k, label, color, bias, v, mse: v + bias * bias };
  });
  const span = 4 * sigma / Math.sqrt(n);
  const lo = mu - span, hi = mu + span;
  const hs = rows.map((r) => histogram(res[r.k], lo, hi, 40));
  const ymax = Math.max(...hs.flat().map((b) => b.density)) * 1.1;
  const best = rows.reduce((a, b) => (b.mse < a.mse ? b : a));
  const maxMse = Math.max(...rows.map((r) => r.mse));
  return (
    <SimShell note="3,000 repeated samples per setting. With normal data the mean wins among unbiased estimators; with heavy tails (t₃) the median can beat it. Shrinkage wins when the truth is near zero.">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Seg value={dist} onChange={setDist} options={[{ value: "norm", label: "Normal data" }, { value: "t3", label: "Heavy tails (t₃)" }]} />
        <button className="btn" onClick={reseed}>Resample</button>
      </div>
      <Plot x={[lo, hi]} y={[0, ymax]} xLabel="estimate" yLabel="density" height={260}>
        {(sx, sy) => (
          <>
            {hs.map((bins, i) => (
              <path key={i} d={bins.map((b, j) => `${j ? "L" : "M"}${sx(b.x0)},${sy(b.density)}L${sx(b.x1)},${sy(b.density)}`).join("")} fill="none" stroke={rows[i].color} strokeWidth={2} />
            ))}
            <line x1={sx(mu)} x2={sx(mu)} y1={sy(0)} y2={sy(ymax)} stroke="var(--text)" strokeDasharray="4 3" />
            <text x={sx(mu) + 4} y={sy(ymax * 0.93)} style={{ fill: "var(--text)" }}>true μ</text>
          </>
        )}
      </Plot>
      <Legend items={rows.map((r) => ({ color: r.color, label: r.label }))} />
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Slider label="Sample size n" value={n} min={5} max={200} step={5} onChange={setN} />
          <Slider label="True mean μ" value={mu} min={0} max={10} step={0.5} onChange={setMu} />
          <Slider label="Shrinkage factor c" value={c} min={0.5} max={1} step={0.01} onChange={setC} format={(v) => v.toFixed(2)} />
        </div>
        <div>
          <table className="w-full text-sm">
            <thead><tr className="faint text-xs"><th className="text-left">estimator</th><th className="text-right">bias</th><th className="text-right">variance</th><th className="text-right">MSE</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.k} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="py-1"><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: r.color }} />{r.label}</td>
                  <td className="text-right font-mono">{fmt(r.bias, 3)}</td>
                  <td className="text-right font-mono">{fmt(r.v, 3)}</td>
                  <td className="text-right font-mono font-bold">{fmt(r.mse, 3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 space-y-1.5">
            {rows.map((r) => (
              <div key={r.k} className="flex items-center gap-2 text-xs">
                <span className="w-24 shrink-0 muted">{r.label}</span>
                <div className="flex h-3 flex-1">
                  <div style={{ width: `${(100 * r.v) / maxMse}%`, background: r.color, borderRadius: "3px 0 0 3px" }} />
                  <div style={{ width: `${(100 * r.bias * r.bias) / maxMse}%`, background: r.color, opacity: 0.4, marginLeft: 2, borderRadius: "0 3px 3px 0" }} />
                </div>
              </div>
            ))}
            <div className="text-xs faint">Solid = variance, light = bias². Lowest MSE: <b className="strong">{best.label}</b>.</div>
          </div>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 9: CI coverage ---------------- */
export function CiCoverage() {
  const [n, setN] = useState(20);
  const [level, setLevel] = useState<"90" | "95" | "99">("95");
  const [method, setMethod] = useState<"z" | "t">("t");
  const [parent, setParent] = useState<"norm" | "skew">("norm");
  const [seed, reseed] = useSeed();
  const mu = 50, sigma = 10;
  const alpha = 1 - +level / 100;
  // t quantile via Cornish–Fisher expansion (accurate to ~3 decimals for df ≥ 3)
  const tq = (p: number, df: number) => {
    const z = normInv(p);
    return z + (z ** 3 + z) / (4 * df) + (5 * z ** 5 + 16 * z ** 3 + 3 * z) / (96 * df * df) + (3 * z ** 7 + 19 * z ** 5 + 17 * z ** 3 - 15 * z) / (384 * df ** 3);
  };
  const crit = method === "z" ? normInv(1 - alpha / 2) : tq(1 - alpha / 2, n - 1);
  const { ivs, longRun } = useMemo(() => {
    const r = rng(seed * 101 + n);
    const s0 = Math.sqrt(Math.exp(1) - 1) * Math.exp(0.5); // sd of lognormal(0,1)
    const draw = () => (parent === "norm" ? mu + sigma * r.n() : mu + (sigma / s0) * (Math.exp(r.n()) - Math.exp(0.5)));
    const make = () => {
      const x = Array.from({ length: n }, draw);
      const m = mean(x), se = Math.sqrt(variance(x, 1) / n);
      return { m, lo: m - crit * se, hi: m + crit * se };
    };
    const ivs = Array.from({ length: 100 }, make);
    let hit = 0;
    for (let k = 0; k < 3000; k++) {
      const v = make();
      if (v.lo <= mu && mu <= v.hi) hit++;
    }
    return { ivs, longRun: hit / 3000 };
  }, [n, crit, parent, seed]);
  const covered = ivs.filter((v) => v.lo <= mu && mu <= v.hi).length;
  const span = Math.max(...ivs.map((v) => Math.max(Math.abs(v.lo - mu), Math.abs(v.hi - mu)))) * 1.05;
  return (
    <SimShell note="Each horizontal line is a confidence interval from a new sample. The true mean (dashed) never moves; the intervals do. Orange intervals miss it.">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Seg value={level} onChange={setLevel} options={[{ value: "90", label: "90%" }, { value: "95", label: "95%" }, { value: "99", label: "99%" }]} />
        <Seg value={method} onChange={setMethod} options={[{ value: "z", label: "z critical value" }, { value: "t", label: "t critical value" }]} />
        <Seg value={parent} onChange={setParent} options={[{ value: "norm", label: "Normal data" }, { value: "skew", label: "Skewed data" }]} />
        <button className="btn" onClick={reseed}>100 new samples</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <svg viewBox="0 0 640 420" className="w-full">
          {(() => {
            const sx = (v: number) => 30 + ((v - (mu - span)) / (2 * span)) * 590;
            return (
              <>
                {ivs.map((v, i) => {
                  const ok = v.lo <= mu && mu <= v.hi;
                  return (
                    <g key={i}>
                      <line x1={sx(v.lo)} x2={sx(v.hi)} y1={8 + i * 4} y2={8 + i * 4} stroke={ok ? C1 : C2} strokeWidth={ok ? 2 : 2.5} opacity={ok ? 0.7 : 1} strokeLinecap="round" />
                    </g>
                  );
                })}
                <line x1={sx(mu)} x2={sx(mu)} y1={0} y2={410} stroke="var(--text)" strokeDasharray="4 3" />
                <text x={sx(mu) + 4} y={418} style={{ fill: "var(--text)" }}>true μ = 50</text>
              </>
            );
          })()}
        </svg>
        <div className="space-y-3">
          <Slider label="Sample size n" value={n} min={3} max={200} step={1} onChange={setN} />
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Covered (of 100)" value={covered} color={C1} />
            <Stat label="Long-run coverage" value={`${(100 * longRun).toFixed(1)}%`} sub={`3,000 more samples; nominal ${level}%`} color={C2} />
            <Stat label="Critical value" value={fmt(crit, 3)} sub={method === "t" ? `t, df = ${n - 1}` : "standard normal"} />
          </div>
          <p className="text-sm muted">Try n = 5 with the z value: coverage falls short. Then try skewed data with small n.</p>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 10: power ---------------- */
export function PowerViz() {
  const [tau, setTau] = useState(2);
  const [sigma, setSigma] = useState(10);
  const [n, setN] = useState(200);
  const [alpha, setAlpha] = useState(0.05);
  const se = sigma * Math.sqrt(2 / n);
  const zc = normInv(1 - alpha / 2);
  const c = zc * se;
  const power = 1 - normCdf(c, tau, se) + normCdf(-c, tau, se);
  const mde = (zc + normInv(0.8)) * se;
  const nNeeded = Math.ceil((2 * sigma * sigma * (zc + normInv(0.8)) ** 2) / (tau * tau || 1e-9));
  const lo = Math.min(-4 * se, tau - 4 * se), hi = Math.max(4 * se, tau + 4 * se);
  const ymax = normPdf(0, 0, se) * 1.12;
  const f0 = (x: number) => normPdf(x, 0, se), f1 = (x: number) => normPdf(x, tau, se);
  return (
    <SimShell note="Blue: where the estimate lands if there is no effect. Orange: where it lands if the effect is τ. Shaded orange = power; shaded blue tails = α; the hatched part of the orange curve inside the critical values = β.">
      <Plot x={[lo, hi]} y={[0, ymax]} xLabel="estimated effect" yLabel="density" height={290}
        hover={(x) => [`τ̂ = ${fmt(x)}`, `z = ${fmt(x / se)}`, `two-sided p = ${fmt(2 * (1 - normCdf(Math.abs(x) / se)), 4)}`]}>
        {(sx, sy) => (
          <>
            <path d={areaPath(f1, c, hi, sx, sy)} fill={C2} opacity={0.3} />
            <path d={areaPath(f1, lo, -c, sx, sy)} fill={C2} opacity={0.3} />
            <path d={areaPath(f0, c, hi, sx, sy)} fill={C1} opacity={0.45} />
            <path d={areaPath(f0, lo, -c, sx, sy)} fill={C1} opacity={0.45} />
            <defs>
              <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="var(--s2)" strokeWidth="1.5" opacity="0.6" />
              </pattern>
            </defs>
            <path d={areaPath(f1, -c, c, sx, sy)} fill="url(#hatch)" />
            <path d={curve(f0, lo, hi, sx, sy)} fill="none" stroke={C1} strokeWidth={2} />
            <path d={curve(f1, lo, hi, sx, sy)} fill="none" stroke={C2} strokeWidth={2} />
            {[c, -c].map((v) => <line key={v} x1={sx(v)} x2={sx(v)} y1={sy(0)} y2={sy(ymax)} stroke="var(--text)" strokeDasharray="4 3" />)}
            <text x={sx(c) + 4} y={sy(ymax * 0.95)} style={{ fill: "var(--text)" }}>critical value {fmt(c)}</text>
          </>
        )}
      </Plot>
      <Legend items={[{ color: C1, label: "H₀: τ = 0" }, { color: C2, label: "H₁: true effect τ" }]} />
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          <Slider label="True effect τ" value={tau} min={0} max={10} step={0.1} onChange={setTau} format={(v) => v.toFixed(1)} />
          <Slider label="Outcome sd σ" value={sigma} min={2} max={30} step={0.5} onChange={setSigma} />
          <Slider label="n per arm" value={n} min={10} max={2000} step={10} onChange={setN} />
          <Slider label="α (two-sided)" value={alpha} min={0.005} max={0.2} step={0.005} onChange={setAlpha} format={(v) => v.toFixed(3)} />
        </div>
        <div className="grid grid-cols-2 gap-2 self-start">
          <Stat label="Power" value={`${(100 * power).toFixed(1)}%`} color={C2} sub={`β = ${(100 * (1 - power)).toFixed(1)}%`} />
          <Stat label="Standard error" value={fmt(se, 3)} sub="σ√(2/n)" color={C1} />
          <Stat label="MDE at 80% power" value={fmt(mde)} sub={`${fmt(zc + normInv(0.8))} × SE`} />
          <Stat label="n per arm for 80%" value={tau > 0 ? nNeeded.toLocaleString() : "—"} />
        </div>
      </div>
    </SimShell>
  );
}
