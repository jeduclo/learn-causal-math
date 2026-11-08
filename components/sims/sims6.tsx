"use client";
import { useMemo, useState } from "react";
import { Legend, Plot, SimShell, Slider, Stat, curve, fmt, mean, normCdf, rng, useSeed, variance } from "./kit";

const C1 = "var(--s1)", C2 = "var(--s2)", C3 = "var(--s3)", C4 = "var(--s4)";

/* ---------------- Day 26: Lagrange — utility maximisation ---------------- */
export function LagrangeLab() {
  const [alpha, setAlpha] = useState(0.3);
  const [px, setPx] = useState(2);
  const [py, setPy] = useState(7);
  const [M, setM] = useState(100);
  const [share, setShare] = useState(0.6); // budget share on x for the candidate bundle
  const U = (x: number, y: number) => x ** alpha * y ** (1 - alpha);
  const xs = (alpha * M) / px, ys = ((1 - alpha) * M) / py, Us = U(xs, ys);
  const lam = Us / M; // marginal utility of income for CD with exponents summing to 1
  const xc = (share * M) / px, yc = ((1 - share) * M) / py, Uc = U(xc, yc);
  const xmax = Math.max(M / px, 10) * 1.1, ymax = Math.max(M / py, 10) * 1.1;
  const indiff = (u: number) => (x: number) => (u / x ** alpha) ** (1 / (1 - alpha));
  const mrs = (x: number, y: number) => (alpha / (1 - alpha)) * (y / x);
  return (
    <SimShell note="Maximise U = x^α y^(1−α) on the budget line. At the optimum the indifference curve is tangent to the budget line (MRS = pₓ/p_y), i.e. ∇U = λ∇g. The multiplier λ is the utility gained from one more dollar of income.">
      <div className="grid gap-4 md:grid-cols-[1fr_290px]">
        <Plot x={[0, xmax]} y={[0, ymax]} height={420} xLabel="good x" yLabel="good y"
          hover={(x) => (x > 0 ? [`x = ${fmt(x, 1)}`, `budget y = ${fmt((M - px * x) / py, 1)}`, `optimal-curve y = ${fmt(indiff(Us)(x), 1)}`] : null)}>
          {(sx, sy) => (
            <>
              <path d={`M${sx(0)},${sy(M / py)} L${sx(M / px)},${sy(0)} L${sx(0)},${sy(0)}Z`} fill={C1} opacity={0.08} />
              <line x1={sx(0)} y1={sy(M / py)} x2={sx(M / px)} y2={sy(0)} stroke={C1} strokeWidth={2.5} />
              {[0.6, 1, 1.4].map((k) => (
                <path key={k} d={curve((x) => { const v = indiff(Us * k)(x); return v > ymax ? NaN : v; }, xmax * 0.01, xmax, sx, sy, 300)}
                  fill="none" stroke={k === 1 ? C2 : "var(--text-3)"} strokeWidth={k === 1 ? 2.5 : 1.3} strokeDasharray={k === 1 ? undefined : "5 4"} />
              ))}
              <circle cx={sx(xc)} cy={sy(yc)} r={6} fill={C4} stroke="var(--surface)" strokeWidth={2} />
              <circle cx={sx(xs)} cy={sy(ys)} r={7} fill={C2} stroke="var(--surface)" strokeWidth={2} />
              <text x={sx(xs) + 10} y={sy(ys) - 8} style={{ fill: "var(--text)", fontWeight: 700 }}>optimum</text>
            </>
          )}
        </Plot>
        <div className="space-y-3">
          <Slider label="α (taste for x)" value={alpha} min={0.05} max={0.95} step={0.01} onChange={setAlpha} format={(v) => v.toFixed(2)} />
          <Slider label="price pₓ" value={px} min={0.5} max={10} step={0.1} onChange={setPx} format={(v) => v.toFixed(1)} />
          <Slider label="price p_y" value={py} min={0.5} max={10} step={0.1} onChange={setPy} format={(v) => v.toFixed(1)} />
          <Slider label="income M" value={M} min={20} max={200} step={1} onChange={setM} />
          <Slider label="Candidate bundle: share spent on x" value={share} min={0.02} max={0.98} step={0.01} onChange={setShare} format={(v) => `${(100 * v).toFixed(0)}%`} />
          <div className="grid grid-cols-2 gap-2">
            <Stat label="optimum (x*, y*)" value={`(${fmt(xs, 1)}, ${fmt(ys, 1)})`} sub="x* = αM/pₓ" color={C2} />
            <Stat label="λ (shadow price)" value={fmt(lam, 4)} sub="dU*/dM" color={C2} />
            <Stat label="candidate utility" value={fmt(Uc, 2)} sub={`optimum ${fmt(Us, 2)}`} color={C4} />
            <Stat label="MRS at candidate" value={fmt(mrs(xc, yc), 3)} sub={`price ratio ${fmt(px / py, 3)}`} color={C4} />
          </div>
        </div>
      </div>
      <Legend items={[{ color: C1, label: "budget line" }, { color: C2, label: "indifference curve through the optimum" }, { color: C4, label: "candidate bundle", area: true }]} />
    </SimShell>
  );
}

/* ---------------- Day 27: OLS by matrices ---------------- */
function ols2(x: number[], y: number[]) {
  const n = x.length, sx = x.reduce((s, v) => s + v, 0), sxx = x.reduce((s, v) => s + v * v, 0);
  const sy = y.reduce((s, v) => s + v, 0), sxy = x.reduce((s, v, i) => s + v * y[i], 0);
  const det = n * sxx - sx * sx;
  const inv = [sxx / det, -sx / det, n / det];
  const b0 = inv[0] * sy + inv[1] * sxy, b1 = inv[1] * sy + inv[2] * sxy;
  const e = y.map((v, i) => v - b0 - b1 * x[i]);
  const s2 = e.reduce((s, v) => s + v * v, 0) / (n - 2);
  return { n, sx, sxx, sy, sxy, det, inv, b0, b1, e, s2, se0: Math.sqrt(s2 * inv[0]), se1: Math.sqrt(s2 * inv[2]) };
}
export function OlsLab() {
  const [n, setN] = useState(20);
  const [beta1, setBeta1] = useState(0.8);
  const [sigma, setSigma] = useState(1.5);
  const [spread, setSpread] = useState(2);
  const [seed, reseed] = useSeed();
  const { x, y } = useMemo(() => {
    const r = rng(seed * 3 + n);
    const x = Array.from({ length: n }, () => 5 + spread * r.n());
    return { x, y: x.map((v) => 1 + beta1 * v + sigma * r.n()) };
  }, [n, beta1, sigma, spread, seed]);
  const o = ols2(x, y);
  const M = ({ rows }: { rows: (string | number)[][] }) => (
    <span className="inline-flex items-center gap-1 align-middle">
      <span className="text-2xl font-light faint">[</span>
      <span className="inline-grid gap-x-3 font-mono text-xs" style={{ gridTemplateColumns: `repeat(${rows[0].length}, auto)` }}>
        {rows.flat().map((v, i) => <span key={i} className="text-right">{typeof v === "number" ? fmt(v, Math.abs(v) >= 100 ? 0 : 3) : v}</span>)}
      </span>
      <span className="text-2xl font-light faint">]</span>
    </span>
  );
  const tcrit = 1.96 + 2.4 / Math.max(1, n - 2); // rough small-sample t
  return (
    <SimShell note="Every number on the right is computed from the matrices: β̂ = (X′X)⁻¹X′y, s² = e′e/(n − k), Var(β̂) = s²(X′X)⁻¹. Spread out x or add data and watch (X′X)⁻¹, and with it the standard errors, shrink.">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <Plot x={[Math.min(...x) - 1, Math.max(...x) + 1]} y={[Math.min(...y) - 2, Math.max(...y) + 2]} height={320} xLabel="x" yLabel="y">
            {(sx, sy) => {
              const lo = Math.min(...x) - 1, hi = Math.max(...x) + 1;
              return (
                <>
                  <line x1={sx(lo)} y1={sy(1 + beta1 * lo)} x2={sx(hi)} y2={sy(1 + beta1 * hi)} stroke="var(--text-3)" strokeDasharray="5 4" strokeWidth={1.5} />
                  <line x1={sx(lo)} y1={sy(o.b0 + o.b1 * lo)} x2={sx(hi)} y2={sy(o.b0 + o.b1 * hi)} stroke={C2} strokeWidth={2.5} />
                  {x.map((v, i) => <circle key={i} cx={sx(v)} cy={sy(y[i])} r={4} fill={C1} opacity={0.75} />)}
                </>
              );
            }}
          </Plot>
          <Legend items={[{ color: C1, label: "data", area: true }, { color: C2, label: "OLS fit" }, { color: "var(--text-3)", label: "true line y = 1 + β₁x", dash: true }]} />
        </div>
        <div className="space-y-2 text-sm">
          <div>X′X = <M rows={[[o.n, o.sx], [o.sx, o.sxx]]} /> &nbsp; X′y = <M rows={[[o.sy], [o.sxy]]} /></div>
          <div>(X′X)⁻¹ = <M rows={[[o.inv[0], o.inv[1]], [o.inv[1], o.inv[2]]]} /></div>
          <div>β̂ = (X′X)⁻¹X′y = <M rows={[[o.b0], [o.b1]]} /></div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <Stat label="s²" value={fmt(o.s2, 3)} sub={`true σ² = ${fmt(sigma * sigma, 2)}`} />
            <Stat label="SE(β̂₁)" value={fmt(o.se1, 4)} color={C2} />
            <Stat label="t = β̂₁/SE" value={fmt(o.b1 / o.se1, 2)} />
          </div>
          <div className="text-xs faint">95% CI for β₁: [{fmt(o.b1 - tcrit * o.se1, 3)}, {fmt(o.b1 + tcrit * o.se1, 3)}]</div>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Slider label="n" value={n} min={5} max={200} step={1} onChange={setN} />
        <Slider label="true slope β₁" value={beta1} min={-1} max={2} step={0.05} onChange={setBeta1} format={(v) => v.toFixed(2)} />
        <Slider label="noise σ" value={sigma} min={0.2} max={4} step={0.1} onChange={setSigma} format={(v) => v.toFixed(1)} />
        <Slider label="spread of x" value={spread} min={0.3} max={4} step={0.1} onChange={setSpread} format={(v) => v.toFixed(1)} />
      </div>
      <button className="btn mt-2" onClick={reseed}>New sample</button>
    </SimShell>
  );
}

/* ---------------- Day 28: Frisch–Waugh–Lovell ---------------- */
export function FwlLab() {
  const [gamma, setGamma] = useState(1);
  const [beta2, setBeta2] = useState(2);
  const [seed, reseed] = useSeed();
  const beta1 = 1;
  const d = useMemo(() => {
    const r = rng(seed * 19 + 4);
    return Array.from({ length: 150 }, () => {
      const x2 = r.n(), x1 = gamma * x2 + r.n();
      return { x1, x2, y: beta1 * x1 + beta2 * x2 + r.n() };
    });
  }, [gamma, beta2, seed]);
  const resid = (v: number[], z: number[]) => {
    const mv = mean(v), mz = mean(z);
    const b = mean(v.map((q, i) => (q - mv) * (z[i] - mz))) / variance(z);
    return v.map((q, i) => q - mv - b * (z[i] - mz));
  };
  const x1 = d.map((p) => p.x1), x2 = d.map((p) => p.x2), y = d.map((p) => p.y);
  const x1t = resid(x1, x2), yt = resid(y, x2);
  const slope = (a: number[], b: number[]) => { const ma = mean(a), mb = mean(b); return mean(a.map((v, i) => (v - ma) * (b[i] - mb))) / variance(a); };
  const naive = slope(x1, y), fwl = slope(x1t, yt);
  const ext = (v: number[]) => [Math.min(...v), Math.max(...v)] as [number, number];
  const [ax0, ax1] = ext(x1), [ay0, ay1] = ext(y), [bx0, bx1] = ext(x1t), [by0, by1] = ext(yt);
  return (
    <SimShell note="Left: raw y against x₁; the naive slope absorbs the effect of the confounder x₂. Right: the added-variable plot, residuals of y on x₂ against residuals of x₁ on x₂. Its slope is exactly the multiple-regression coefficient (true value 1).">
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-1 text-xs font-semibold faint">RAW DATA</div>
          <Plot x={[ax0 - 0.3, ax1 + 0.3]} y={[ay0 - 0.5, ay1 + 0.5]} height={300} xLabel="x₁" yLabel="y">
            {(sx, sy) => (
              <>
                {d.map((p, i) => <circle key={i} cx={sx(p.x1)} cy={sy(p.y)} r={3} fill={`color-mix(in oklab, var(--s1) ${Math.round(30 + 70 * Math.min(1, Math.max(0, (p.x2 + 2) / 4)))}%, var(--surface))`} />)}
                <line x1={sx(ax0)} y1={sy(mean(y) + naive * (ax0 - mean(x1)))} x2={sx(ax1)} y2={sy(mean(y) + naive * (ax1 - mean(x1)))} stroke={C2} strokeWidth={2.5} />
              </>
            )}
          </Plot>
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold faint">AFTER PARTIALLING OUT x₂</div>
          <Plot x={[bx0 - 0.3, bx1 + 0.3]} y={[by0 - 0.5, by1 + 0.5]} height={300} xLabel="x̃₁ = x₁ residualised on x₂" yLabel="ỹ">
            {(sx, sy) => (
              <>
                {d.map((_, i) => <circle key={i} cx={sx(x1t[i])} cy={sy(yt[i])} r={3} fill={C3} opacity={0.6} />)}
                <line x1={sx(bx0)} y1={sy(fwl * bx0)} x2={sx(bx1)} y2={sy(fwl * bx1)} stroke={C4} strokeWidth={2.5} />
              </>
            )}
          </Plot>
        </div>
      </div>
      <Legend items={[{ color: C1, label: "darker = larger x₂", area: true }, { color: C2, label: "naive slope" }, { color: C4, label: "FWL slope = multiple-regression β̂₁" }]} />
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Slider label="How strongly x₂ drives x₁ (γ)" value={gamma} min={-2} max={2} step={0.05} onChange={setGamma} format={(v) => v.toFixed(2)} />
          <Slider label="Effect of x₂ on y (β₂)" value={beta2} min={-3} max={3} step={0.1} onChange={setBeta2} format={(v) => v.toFixed(1)} />
          <button className="btn" onClick={reseed}>New sample</button>
        </div>
        <div className="grid grid-cols-3 gap-2 self-start">
          <Stat label="naive slope" value={fmt(naive, 3)} sub={`OVB ≈ β₂γ/(γ²+1) = ${fmt((beta2 * gamma) / (gamma * gamma + 1), 2)}`} color={C2} />
          <Stat label="FWL slope" value={fmt(fwl, 3)} sub="truth β₁ = 1" color={C4} />
          <Stat label="share of x₁ variance left" value={fmt(variance(x1t) / variance(x1), 2)} sub="1 − R²₁ (sets the SE)" />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 29: robust standard errors ---------------- */
export function RobustSeLab() {
  const [delta, setDelta] = useState(1.5);
  const [n, setN] = useState(100);
  const [seed, reseed] = useSeed();
  const sd = (x: number) => Math.sqrt(0.25 + delta * x * x);
  const sim = useMemo(() => {
    const r = rng(seed * 29 + n);
    let cCl = 0, cHc = 0;
    const b1s: number[] = [], seCl: number[] = [], seHc: number[] = [];
    let example: { x: number[]; y: number[] } = { x: [], y: [] };
    for (let k = 0; k < 1500; k++) {
      const x = Array.from({ length: n }, () => r.n());
      const y = x.map((v) => 1 + v + sd(v) * r.n());
      if (k === 0) example = { x, y };
      const mx = mean(x), my = mean(y);
      const sxx = x.reduce((s, v) => s + (v - mx) ** 2, 0);
      const b1 = x.reduce((s, v, i) => s + (v - mx) * (y[i] - my), 0) / sxx;
      const b0 = my - b1 * mx;
      const e = y.map((v, i) => v - b0 - b1 * x[i]);
      const s2 = e.reduce((s, v) => s + v * v, 0) / (n - 2);
      const vCl = s2 / sxx;
      const vHc = (x.reduce((s, v, i) => s + (v - mx) ** 2 * e[i] ** 2, 0) / (sxx * sxx)) * (n / (n - 2));
      b1s.push(b1); seCl.push(Math.sqrt(vCl)); seHc.push(Math.sqrt(vHc));
      if (Math.abs(b1 - 1) <= 1.96 * Math.sqrt(vCl)) cCl++;
      if (Math.abs(b1 - 1) <= 1.96 * Math.sqrt(vHc)) cHc++;
    }
    return { covCl: cCl / 1500, covHc: cHc / 1500, trueSd: Math.sqrt(variance(b1s)), mCl: mean(seCl), mHc: mean(seHc), example };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delta, n, seed]);
  const bars = [
    { label: "classical", cov: sim.covCl, se: sim.mCl, color: C2 },
    { label: "robust (HC1)", cov: sim.covHc, se: sim.mHc, color: C1 },
  ];
  return (
    <SimShell note="Errors have sd √(0.25 + δx²): they fan out at extreme x, exactly where the slope is decided. 1,500 simulated samples compare the average reported SE with the true sampling sd of β̂₁, and the coverage of 95% intervals.">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Plot x={[-3, 3]} y={[-8, 10]} height={300} xLabel="x" yLabel="y (one sample)">
          {(sx, sy) => (
            <>
              <path d={curve((x) => 1 + x + 1.96 * sd(x), -3, 3, sx, sy)} fill="none" stroke="var(--text-3)" strokeDasharray="4 4" />
              <path d={curve((x) => 1 + x - 1.96 * sd(x), -3, 3, sx, sy)} fill="none" stroke="var(--text-3)" strokeDasharray="4 4" />
              {sim.example.x.map((v, i) => <circle key={i} cx={sx(v)} cy={sy(sim.example.y[i])} r={3} fill={C1} opacity={0.55} />)}
              <line x1={sx(-3)} y1={sy(-2)} x2={sx(3)} y2={sy(4)} stroke={C2} strokeWidth={2} />
            </>
          )}
        </Plot>
        <div className="space-y-3">
          {bars.map((b) => (
            <div key={b.label}>
              <div className="flex justify-between text-xs"><span className="font-semibold">{b.label} 95% CI coverage</span><span className="font-mono">{(100 * b.cov).toFixed(1)}%</span></div>
              <div className="relative mt-1 h-4 rounded" style={{ background: "var(--surface-2)" }}>
                <div className="h-4 rounded" style={{ width: `${100 * b.cov}%`, background: b.color }} />
                <div className="absolute top-[-3px] h-[22px] w-[2px]" style={{ left: "95%", background: "var(--text)" }} />
              </div>
            </div>
          ))}
          <div className="grid grid-cols-3 gap-2">
            <Stat label="true sd of β̂₁" value={fmt(sim.trueSd, 4)} />
            <Stat label="mean classical SE" value={fmt(sim.mCl, 4)} color={C2} />
            <Stat label="mean robust SE" value={fmt(sim.mHc, 4)} color={C1} />
          </div>
          <Slider label="Heteroskedasticity δ" value={delta} min={0} max={4} step={0.1} onChange={setDelta} format={(v) => v.toFixed(1)} />
          <Slider label="Sample size n" value={n} min={20} max={400} step={10} onChange={setN} />
          <button className="btn" onClick={reseed}>Rerun</button>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 30: GMM with two Poisson moments ---------------- */
export function GmmLab() {
  const [lam, setLam] = useState(3);
  const [phi, setPhi] = useState(0);
  const [n, setN] = useState(200);
  const [seed, reseed] = useSeed();
  const data = useMemo(() => {
    const r = rng(seed * 41 + n);
    return Array.from({ length: n }, () => r.pois(phi > 0 ? lam * r.gamma(1 / phi) * phi : lam));
  }, [lam, phi, n, seed]);
  const m1 = mean(data), m2 = mean(data.map((v) => v * v));
  const g = (l: number) => [m1 - l, m2 - l - l * l];
  const QI = (l: number) => { const [a, b] = g(l); return a * a + b * b; };
  // optimal W from the sample covariance of the moment functions at the first-step estimate (W = I)
  const argmin = (Q: (l: number) => number) => {
    let lo = 0.05, hi = 15;
    for (let k = 0; k < 80; k++) { const a = lo + (hi - lo) / 3, b = hi - (hi - lo) / 3; if (Q(a) < Q(b)) hi = b; else lo = a; }
    return (lo + hi) / 2;
  };
  const l1 = argmin(QI);
  const S = (() => {
    const gi = data.map((x) => [x - l1, x * x - l1 - l1 * l1]);
    const a = mean(gi.map((v) => v[0])), b = mean(gi.map((v) => v[1]));
    const s11 = mean(gi.map((v) => (v[0] - a) ** 2)), s12 = mean(gi.map((v) => (v[0] - a) * (v[1] - b))), s22 = mean(gi.map((v) => (v[1] - b) ** 2));
    return [s11, s12, s22];
  })();
  const det = S[0] * S[2] - S[1] * S[1];
  const Wi = [S[2] / det, -S[1] / det, S[0] / det];
  const QW = (l: number) => { const [a, b] = g(l); return Wi[0] * a * a + 2 * Wi[1] * a * b + Wi[2] * b * b; };
  const l2 = argmin(QW);
  const J = n * QW(l2);
  const pJ = 2 * (1 - normCdf(Math.sqrt(Math.max(0, J))));
  const lo = Math.max(0.05, l2 - 2), hi = l2 + 2;
  const norm = (Q: (l: number) => number) => { const top = Math.max(Q(lo), Q(hi)); return (l: number) => Q(l) / top; };
  const qI = norm(QI), qW = norm(QW);
  return (
    <SimShell note="Two moments for one parameter: E[X] = λ and E[X²] = λ + λ². With W = I the noisy second moment pulls the estimate; with the optimal W = Ŝ⁻¹ it is down-weighted. When the data are overdispersed the two moments disagree and the J test rejects. Curves are rescaled to share an axis.">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Plot x={[lo, hi]} y={[0, 1.05]} height={300} xLabel="λ" yLabel="Q(λ) (rescaled)"
          hover={(l) => [`λ = ${fmt(l, 3)}`, `Q_I = ${fmt(QI(l), 3)}`, `Q_W = ${fmt(QW(l), 4)}`]}>
          {(sx, sy) => (
            <>
              <path d={curve(qI, lo, hi, sx, sy, 300)} fill="none" stroke={C2} strokeWidth={2} />
              <path d={curve(qW, lo, hi, sx, sy, 300)} fill="none" stroke={C1} strokeWidth={2.5} />
              <line x1={sx(l1)} x2={sx(l1)} y1={sy(0)} y2={sy(1)} stroke={C2} strokeDasharray="4 3" />
              <line x1={sx(l2)} x2={sx(l2)} y1={sy(0)} y2={sy(1)} stroke={C1} strokeDasharray="4 3" />
              {m1 > lo && m1 < hi && <line x1={sx(m1)} x2={sx(m1)} y1={sy(0)} y2={sy(0.3)} stroke="var(--text)" strokeWidth={2} />}
            </>
          )}
        </Plot>
        <div className="space-y-3">
          <Slider label="true λ" value={lam} min={0.5} max={8} step={0.1} onChange={setLam} format={(v) => v.toFixed(1)} />
          <Slider label="overdispersion φ (0 = Poisson)" value={phi} min={0} max={1} step={0.02} onChange={setPhi} format={(v) => v.toFixed(2)} />
          <Slider label="n" value={n} min={30} max={2000} step={10} onChange={setN} />
          <button className="btn" onClick={reseed}>New sample</button>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="sample mean, variance" value={`${fmt(m1, 2)}, ${fmt(m2 - m1 * m1, 2)}`} sub="equal under Poisson" />
            <Stat label="λ̂ with W = I" value={fmt(l1, 3)} color={C2} />
            <Stat label="λ̂ with optimal W" value={fmt(l2, 3)} color={C1} />
            <Stat label="J statistic (df = 1)" value={fmt(J, 2)} sub={`p = ${fmt(pJ, 3)}${pJ < 0.05 ? " → reject" : ""}`} color={pJ < 0.05 ? C2 : C3} />
          </div>
        </div>
      </div>
      <Legend items={[{ color: C2, label: "Q(λ) with W = I" }, { color: C1, label: "Q(λ) with W = Ŝ⁻¹" }, { color: "var(--text)", label: "sample mean" }]} />
    </SimShell>
  );
}
