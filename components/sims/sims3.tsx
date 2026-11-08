"use client";
import { useMemo, useState } from "react";
import {
  Bars, Legend, Plot, Seg, SimShell, Slider, Stat, areaPath, betaPdf, curve, fmt, histogram, mean, normPdf, rng, useSeed, variance,
} from "./kit";

const C1 = "var(--s1)", C2 = "var(--s2)", C3 = "var(--s3)", C4 = "var(--s4)";

/* ---------------- Day 11: log-likelihood explorer ---------------- */
export function MleLab() {
  const [N, setN] = useState(30);
  const [Sraw, setS] = useState(18);
  const S = Math.min(Sraw, N);
  const [p, setP] = useState(0.4);
  const ll = (q: number) => S * Math.log(q) + (N - S) * Math.log(1 - q);
  const phat = Math.min(0.995, Math.max(0.005, S / N));
  const info = N / (phat * (1 - phat));
  const se = Math.sqrt(phat * (1 - phat) / N);
  const lmax = ll(phat);
  const score = S / p - (N - S) / (1 - p);
  // 95% likelihood-ratio interval: ℓ(q) ≥ ℓmax − 1.92
  const lrSet = (() => {
    const grid = Array.from({ length: 1999 }, (_, i) => (i + 1) / 2000).filter((q) => ll(q) >= lmax - 1.92);
    return grid.length ? [grid[0], grid[grid.length - 1]] : [phat, phat];
  })();
  const ylo = lmax - 12, yhi = lmax + 1;
  const LR05 = 2 * (lmax - ll(0.5));
  return (
    <SimShell note="The log-likelihood peaks at p̂ = S/N. The dashed parabola is the quadratic approximation whose curvature (Fisher information) gives the SE. The green band is the 95% likelihood-ratio interval: all p within 1.92 log-points of the peak.">
      <Plot x={[0, 1]} y={[ylo, yhi]} xLabel="parameter p" yLabel="log-likelihood ℓ(p)" height={300}
        hover={(x) => (x > 0 && x < 1 ? [`p = ${fmt(x, 3)}`, `ℓ(p) = ${fmt(ll(x))}`, `ℓ(p̂) − ℓ(p) = ${fmt(lmax - ll(x))}`] : null)}>
        {(sx, sy) => {
          const clamp = (v: number) => (v < ylo ? NaN : Math.min(yhi, v));
          return (
            <>
              <rect x={sx(lrSet[0])} y={sy(yhi)} width={sx(lrSet[1]) - sx(lrSet[0])} height={sy(ylo) - sy(yhi)} fill={C3} opacity={0.14} />
              <line x1={sx(0)} x2={sx(1)} y1={sy(lmax - 1.92)} y2={sy(lmax - 1.92)} stroke={C3} strokeDasharray="4 3" />
              <path d={curve((q) => clamp(lmax - 0.5 * info * (q - phat) ** 2), 0.001, 0.999, sx, sy, 300)} fill="none" stroke="var(--text-3)" strokeDasharray="5 4" strokeWidth={1.5} />
              <path d={curve((q) => clamp(ll(q)), 0.001, 0.999, sx, sy, 400)} fill="none" stroke={C1} strokeWidth={2.5} />
              <line x1={sx(phat)} x2={sx(phat)} y1={sy(ylo)} y2={sy(lmax)} stroke={C1} strokeDasharray="3 3" />
              {ll(p) > ylo && (
                <>
                  <line x1={sx(p - 0.08)} x2={sx(p + 0.08)} y1={sy(clamp(ll(p) - 0.08 * score))} y2={sy(clamp(ll(p) + 0.08 * score))} stroke={C2} strokeWidth={2} />
                  <circle cx={sx(p)} cy={sy(ll(p))} r={5} fill={C2} stroke="var(--surface)" strokeWidth={2} />
                </>
              )}
            </>
          );
        }}
      </Plot>
      <Legend items={[{ color: C1, label: "ℓ(p)" }, { color: "var(--text-3)", label: "quadratic approximation", dash: true }, { color: C2, label: "candidate p and its slope (score)" }, { color: C3, label: "95% LR interval", area: true }]} />
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Slider label="Sample size N" value={N} min={5} max={500} step={1} onChange={setN} />
          <Slider label="Successes S" value={S} min={0} max={N} step={1} onChange={setS} />
          <Slider label="Candidate p" value={p} min={0.01} max={0.99} step={0.01} onChange={setP} format={(v) => v.toFixed(2)} />
        </div>
        <div className="grid grid-cols-2 gap-2 self-start">
          <Stat label="MLE p̂ = S/N" value={fmt(S / N, 3)} color={C1} />
          <Stat label="SE = 1/√(Fisher info)" value={fmt(se, 4)} />
          <Stat label="Score at candidate" value={fmt(score, 2)} sub={score > 0 ? "uphill → move right" : "uphill → move left"} color={C2} />
          <Stat label="LR test of p = 0.5" value={fmt(LR05)} sub={LR05 > 3.84 ? "reject at 5% (> 3.84)" : "do not reject (≤ 3.84)"} color={C3} />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 12: delta method ---------------- */
type G = "ln" | "sqrt" | "inv" | "sq";
const GS: Record<G, { label: string; f: (x: number) => number; d: (x: number) => number; pos: boolean }> = {
  ln: { label: "ln x", f: Math.log, d: (x) => 1 / x, pos: true },
  sqrt: { label: "√x", f: Math.sqrt, d: (x) => 0.5 / Math.sqrt(x), pos: true },
  inv: { label: "1/x", f: (x) => 1 / x, d: (x) => -1 / (x * x), pos: true },
  sq: { label: "x²", f: (x) => x * x, d: (x) => 2 * x, pos: false },
};
export function DeltaLab() {
  const [g, setG] = useState<G>("ln");
  const [mu, setMu] = useState(5);
  const [se, setSe] = useState(1);
  const [seed, reseed] = useSeed();
  const G0 = GS[g];
  const sims = useMemo(() => {
    const r = rng(seed * 17 + 1);
    const out: number[] = [];
    for (let i = 0; i < 20000; i++) {
      const x = mu + se * r.n();
      if (G0.pos && x <= 0) continue;
      out.push(G0.f(x));
    }
    return out;
  }, [g, mu, se, seed, G0]);
  const center = G0.f(mu), dse = Math.abs(G0.d(mu)) * se;
  const simSd = Math.sqrt(variance(sims));
  const sorted = [...sims].sort((a, b) => a - b);
  const q = (pp: number) => sorted[Math.floor(pp * (sorted.length - 1))];
  const lo = q(0.003), hi = q(0.997);
  const bins = histogram(sims, lo, hi, 50);
  const ymax = Math.max(...bins.map((b) => b.density), dse > 0 ? normPdf(0, 0, dse) : 0) * 1.1;
  return (
    <SimShell note="The estimate x̄ ~ N(μ, SE²) is pushed through g. Bars: the true distribution of g(x̄). Orange: the delta-method normal N(g(μ), (g′(μ)·SE)²). They agree when SE is small relative to the curvature of g.">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Seg value={g} onChange={setG} options={(Object.keys(GS) as G[]).map((k) => ({ value: k, label: `g(x) = ${GS[k].label}` }))} />
        <button className="btn" onClick={reseed}>Resimulate</button>
      </div>
      <Plot x={[lo, hi]} y={[0, ymax]} xLabel="g(x̄)" yLabel="density" height={280}>
        {(sx, sy) => (
          <>
            <Bars bins={bins} sx={sx} sy={sy} color={C1} opacity={0.5} />
            {dse > 0 && <path d={curve((x) => normPdf(x, center, dse), lo, hi, sx, sy, 300)} fill="none" stroke={C2} strokeWidth={2} />}
            <line x1={sx(center)} x2={sx(center)} y1={sy(0)} y2={sy(ymax)} stroke={C2} strokeDasharray="4 3" />
            <line x1={sx(mean(sims))} x2={sx(mean(sims))} y1={sy(0)} y2={sy(ymax)} stroke={C1} strokeDasharray="2 3" />
          </>
        )}
      </Plot>
      <Legend items={[{ color: C1, label: "simulated g(x̄)", area: true }, { color: C2, label: "delta-method approximation" }]} />
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Slider label="μ (true mean of the estimate)" value={mu} min={g === "sq" ? -5 : 0.5} max={20} step={0.1} onChange={setMu} format={(v) => v.toFixed(1)} />
          <Slider label="SE of the estimate" value={se} min={0.05} max={4} step={0.05} onChange={setSe} format={(v) => v.toFixed(2)} />
          {g === "sq" && <p className="text-sm muted">Set μ = 0: g′(0) = 0, so the delta method predicts zero spread, but the truth is a scaled χ²₁.</p>}
        </div>
        <div className="grid grid-cols-2 gap-2 self-start">
          <Stat label="Delta-method SE" value={fmt(dse, 4)} sub="|g′(μ)| × SE" color={C2} />
          <Stat label="Simulated SD" value={fmt(simSd, 4)} color={C1} />
          <Stat label="g(μ)" value={fmt(center, 4)} color={C2} />
          <Stat label="Mean of g(x̄)" value={fmt(mean(sims), 4)} sub="gap = second-order bias" color={C1} />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 13: Beta–binomial ---------------- */
export function BetaBinomial() {
  const [a, setA] = useState(5);
  const [b, setB] = useState(5);
  const [k, setK] = useState(8);
  const [f, setF] = useState(12);
  const A = a + k, B = b + f;
  const pm = A / (A + B);
  const mode = A > 1 && B > 1 ? (A - 1) / (A + B - 2) : NaN;
  const cdfGrid = useMemo(() => {
    const n = 2000;
    let c = 0;
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      c += betaPdf((i + 0.5) / n, A, B) / n;
      out.push(c);
    }
    return out.map((v) => v / c);
  }, [A, B]);
  const qq = (p: number) => (cdfGrid.findIndex((v) => v >= p) + 0.5) / 2000;
  const lik = (x: number) => betaPdf(x, k + 1, f + 1);
  const xs = Array.from({ length: 200 }, (_, i) => (i + 0.5) / 200);
  const ymax = Math.min(40, Math.max(...xs.map((x) => Math.max(betaPdf(x, a, b), lik(x), betaPdf(x, A, B))))) * 1.1;
  const w = (a + b) / (a + b + k + f);
  return (
    <SimShell note="Prior (dashed) × likelihood (normalised, thin) ∝ posterior (filled). The posterior mean is a weighted average of the prior mean and the MLE, with the prior's weight (α+β)/(α+β+n).">
      <Plot x={[0, 1]} y={[0, ymax]} xLabel="θ (adoption rate)" yLabel="density" height={290}
        hover={(x) => [`θ = ${fmt(x, 3)}`, `prior ${fmt(betaPdf(x, a, b))}`, `posterior ${fmt(betaPdf(x, A, B))}`]}>
        {(sx, sy) => (
          <>
            <path d={areaPath((x) => Math.min(ymax, betaPdf(x, A, B)), 0.0005, 0.9995, sx, sy, 300)} fill={C1} opacity={0.25} />
            <path d={curve((x) => Math.min(ymax, betaPdf(x, A, B)), 0.0005, 0.9995, sx, sy, 300)} fill="none" stroke={C1} strokeWidth={2.5} />
            <path d={curve((x) => Math.min(ymax, betaPdf(x, a, b)), 0.0005, 0.9995, sx, sy, 300)} fill="none" stroke={C2} strokeWidth={2} strokeDasharray="6 4" />
            <path d={curve((x) => Math.min(ymax, lik(x)), 0.0005, 0.9995, sx, sy, 300)} fill="none" stroke={C3} strokeWidth={1.5} />
            <line x1={sx(qq(0.025))} x2={sx(qq(0.975))} y1={sy(ymax * 0.04)} y2={sy(ymax * 0.04)} stroke={C1} strokeWidth={5} strokeLinecap="round" />
          </>
        )}
      </Plot>
      <Legend items={[{ color: C2, label: `prior Beta(${a}, ${b})`, dash: true }, { color: C3, label: "likelihood (normalised)" }, { color: C1, label: `posterior Beta(${A}, ${B})`, area: true }]} />
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          <Slider label="Prior successes α" value={a} min={0.5} max={60} step={0.5} onChange={setA} />
          <Slider label="Prior failures β" value={b} min={0.5} max={60} step={0.5} onChange={setB} />
          <Slider label="Data successes k" value={k} min={0} max={200} step={1} onChange={setK} />
          <Slider label="Data failures f" value={f} min={0} max={200} step={1} onChange={setF} />
          <button className="btn col-span-2 h-fit justify-center" onClick={() => { setA(1); setB(1); }}>Flat prior Beta(1, 1)</button>
        </div>
        <div className="grid grid-cols-2 gap-2 self-start">
          <Stat label="Posterior mean" value={fmt(pm, 3)} color={C1} />
          <Stat label="MAP (mode)" value={Number.isFinite(mode) ? fmt(mode, 3) : "—"} />
          <Stat label="MLE k/n" value={k + f > 0 ? fmt(k / (k + f), 3) : "—"} color={C3} />
          <Stat label="Prior weight" value={`${(100 * w).toFixed(0)}%`} sub={`prior mean ${fmt(a / (a + b), 2)}`} color={C2} />
          <Stat label="95% credible interval" value={`${fmt(qq(0.025), 3)} – ${fmt(qq(0.975), 3)}`} color={C1} />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 14: missing data ---------------- */
export function MissingLab() {
  const [mech, setMech] = useState<"mcar" | "mar" | "mnar">("mnar");
  const [intensity, setIntensity] = useState(0.4);
  const [seed, reseed] = useSeed();
  const data = useMemo(() => {
    const r = rng(seed * 23 + 9);
    return Array.from({ length: 700 }, () => {
      const educ = 13 + 2.2 * r.n();
      const wage = 5 + 2 * educ + 6 * r.n();
      return { educ, wage, u: r.u() };
    });
  }, [seed]);
  const logistic = (z: number) => 1 / (1 + Math.exp(-z));
  const pMiss = (e: number, w: number) => {
    if (mech === "mcar") return intensity;
    const z = mech === "mar" ? (e - 13) / 2.2 : (w - 31) / 7.6;
    return Math.min(0.97, 2 * intensity * logistic(2 * z));
  };
  const pts = data.map((d) => ({ ...d, miss: d.u < pMiss(d.educ, d.wage) }));
  const obs = pts.filter((d) => !d.miss);
  const ols = (s: typeof pts) => {
    const mx = mean(s.map((d) => d.educ)), my = mean(s.map((d) => d.wage));
    const b = mean(s.map((d) => (d.educ - mx) * (d.wage - my))) / mean(s.map((d) => (d.educ - mx) ** 2));
    return { a: my - b * mx, b };
  };
  const full = ols(pts), cc = ols(obs);
  // IPW using response rates estimated within education bins (valid under MCAR/MAR, not MNAR)
  const binOf = (e: number) => Math.max(0, Math.min(7, Math.floor((e - 7) / 1.5)));
  const resp = Array.from({ length: 8 }, (_, j) => {
    const inBin = pts.filter((d) => binOf(d.educ) === j);
    return inBin.length ? inBin.filter((d) => !d.miss).length / inBin.length : 1;
  });
  const wts = obs.map((d) => 1 / Math.max(0.03, resp[binOf(d.educ)]));
  const ipw = obs.reduce((s, d, i) => s + wts[i] * d.wage, 0) / wts.reduce((s, v) => s + v, 0);
  const trueMean = mean(pts.map((d) => d.wage)), ccMean = mean(obs.map((d) => d.wage));
  return (
    <SimShell note="Hollow points are missing wages. IPW re-weights respondents by the inverse of their education group's response rate. It repairs MAR, but no model on education can repair MNAR.">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Seg value={mech} onChange={setMech} options={[{ value: "mcar", label: "MCAR" }, { value: "mar", label: "MAR (on education)" }, { value: "mnar", label: "MNAR (on wage)" }]} />
        <button className="btn" onClick={reseed}>New sample</button>
      </div>
      <Plot x={[5, 21]} y={[0, 65]} xLabel="education (years)" yLabel="wage ($/hour)" height={300}>
        {(sx, sy) => (
          <>
            {pts.map((d, i) => d.miss
              ? <circle key={i} cx={sx(d.educ)} cy={sy(d.wage)} r={2.6} fill="none" stroke="var(--text-3)" opacity={0.5} />
              : <circle key={i} cx={sx(d.educ)} cy={sy(d.wage)} r={2.6} fill={C1} opacity={0.55} />)}
            <line x1={sx(5)} x2={sx(21)} y1={sy(full.a + full.b * 5)} y2={sy(full.a + full.b * 21)} stroke="var(--text)" strokeWidth={2} strokeDasharray="6 4" />
            <line x1={sx(5)} x2={sx(21)} y1={sy(cc.a + cc.b * 5)} y2={sy(cc.a + cc.b * 21)} stroke={C2} strokeWidth={2.5} />
          </>
        )}
      </Plot>
      <Legend items={[{ color: C1, label: "observed", area: true }, { color: "var(--text-3)", label: "missing (hollow)", area: true }, { color: "var(--text)", label: "full-data regression", dash: true }, { color: C2, label: "complete-case regression" }]} />
      <div className="mt-3 grid gap-4 md:grid-cols-[1fr_1.4fr]">
        <div className="space-y-3">
          <Slider label="Missingness intensity" value={intensity} min={0} max={0.6} step={0.01} onChange={setIntensity} format={(v) => `${(100 * v).toFixed(0)}%`} />
          <div className="text-sm muted">Share missing: <b className="strong">{(100 * (1 - obs.length / pts.length)).toFixed(0)}%</b></div>
        </div>
        <div className="grid grid-cols-3 gap-2 self-start">
          <Stat label="True mean wage" value={fmt(trueMean, 2)} />
          <Stat label="Complete-case mean" value={fmt(ccMean, 2)} sub={`bias ${fmt(ccMean - trueMean, 2)}`} color={C2} />
          <Stat label="IPW mean (by education)" value={fmt(ipw, 2)} sub={`bias ${fmt(ipw - trueMean, 2)}`} color={C1} />
          <Stat label="Full-data slope" value={fmt(full.b, 3)} sub="truth 2.0" />
          <Stat label="Complete-case slope" value={fmt(cc.b, 3)} color={C2} />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 15: Simpson's paradox ---------------- */
export function SimpsonLab() {
  const [aS, setAS] = useState(0.931);
  const [aL, setAL] = useState(0.73);
  const [bS, setBS] = useState(0.867);
  const [bL, setBL] = useState(0.688);
  const [shareA, setShareA] = useState(0.75); // share of A's patients with large stones
  const [shareB, setShareB] = useState(0.23);
  const popLarge = (shareA + shareB) / 2; // equal arm sizes
  const pooledA = (1 - shareA) * aS + shareA * aL, pooledB = (1 - shareB) * bS + shareB * bL;
  const stdA = (1 - popLarge) * aS + popLarge * aL, stdB = (1 - popLarge) * bS + popLarge * bL;
  const groups = [
    { label: "Small stones", a: aS, b: bS },
    { label: "Large stones", a: aL, b: bL },
    { label: "Pooled (naive)", a: pooledA, b: pooledB },
    { label: "Standardised", a: stdA, b: stdB },
  ];
  const reversal = Math.sign(aS - bS) === Math.sign(aL - bL) && Math.sign(pooledA - pooledB) !== Math.sign(aS - bS);
  return (
    <SimShell note="Defaults are the kidney-stone study (Charig et al., 1986). The pooled comparison uses each arm's own case mix; the standardised one uses the same case mix for both arms.">
      <svg viewBox="0 0 640 260" className="w-full">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}><line x1={50} x2={630} y1={220 - t * 200} y2={220 - t * 200} stroke="var(--grid)" /><text x={44} y={224 - t * 200} textAnchor="end">{t * 100}%</text></g>
        ))}
        {groups.map((g, i) => {
          const x = 70 + i * 142;
          return (
            <g key={g.label}>
              {i === 2 && <rect x={x - 12} y={8} width={130} height={216} rx={8} fill={reversal ? "var(--s2)" : "transparent"} opacity={0.08} />}
              <rect x={x} y={220 - g.a * 200} width={50} height={g.a * 200} rx={4} fill={C1} />
              <rect x={x + 54} y={220 - g.b * 200} width={50} height={g.b * 200} rx={4} fill={C2} />
              <text x={x + 25} y={214 - g.a * 200} textAnchor="middle" style={{ fill: "var(--text)", fontWeight: 600 }}>{(100 * g.a).toFixed(1)}</text>
              <text x={x + 79} y={214 - g.b * 200} textAnchor="middle" style={{ fill: "var(--text)", fontWeight: 600 }}>{(100 * g.b).toFixed(1)}</text>
              <text x={x + 52} y={240} textAnchor="middle" style={{ fill: "var(--text)", fontWeight: 600 }}>{g.label}</text>
            </g>
          );
        })}
      </svg>
      <Legend items={[{ color: C1, label: "Treatment A success rate", area: true }, { color: C2, label: "Treatment B success rate", area: true }]} />
      <p className="mt-2 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--surface-2)" }}>
        {reversal
          ? <>⚠️ <b>Simpson&apos;s paradox:</b> {aS > bS ? "A" : "B"} is better in both strata, but the pooled comparison favours {pooledA > pooledB ? "A" : "B"}, because the arms treat different case mixes.</>
          : <>No reversal: the pooled comparison agrees in direction with the strata. Make the case mixes more unequal to create one.</>}
      </p>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          <Slider label="A: success, small" value={aS} min={0.3} max={1} step={0.005} onChange={setAS} format={(v) => (100 * v).toFixed(1)} />
          <Slider label="B: success, small" value={bS} min={0.3} max={1} step={0.005} onChange={setBS} format={(v) => (100 * v).toFixed(1)} />
          <Slider label="A: success, large" value={aL} min={0.3} max={1} step={0.005} onChange={setAL} format={(v) => (100 * v).toFixed(1)} />
          <Slider label="B: success, large" value={bL} min={0.3} max={1} step={0.005} onChange={setBL} format={(v) => (100 * v).toFixed(1)} />
        </div>
        <div className="space-y-3">
          <Slider label="Share of A's patients with large stones" value={shareA} min={0} max={1} step={0.01} onChange={setShareA} format={(v) => `${(100 * v).toFixed(0)}%`} />
          <Slider label="Share of B's patients with large stones" value={shareB} min={0} max={1} step={0.01} onChange={setShareB} format={(v) => `${(100 * v).toFixed(0)}%`} />
          <button className="btn" onClick={() => { setShareA(0.5); setShareB(0.5); }}>Randomise (equal case mix)</button>
        </div>
      </div>
    </SimShell>
  );
}
