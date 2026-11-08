"use client";
import { useMemo, useRef, useState } from "react";
import {
  Bars, Legend, Plot, Seg, SimShell, Slider, Stat, binomPmf, curve, fmt, histogram, mean, normPdf, poisPmf, rng, useSeed, variance,
} from "./kit";

const C1 = "var(--s1)", C2 = "var(--s2)", C3 = "var(--s3)";

/* ---------------- Day 1: inclusion–exclusion & Fréchet bounds ---------------- */
export function ProbabilityRules() {
  const [pa, setPa] = useState(0.7);
  const [pb, setPb] = useState(0.5);
  const lo = Math.max(0, pa + pb - 1), hi = Math.min(pa, pb);
  const [pabRaw, setPab] = useState(0.35);
  const pab = Math.min(hi, Math.max(lo, pabRaw));
  const union = pa + pb - pab;
  const W = 600, x0 = 20, sc = (v: number) => x0 + v * W;
  const bStart = pa - pab;
  return (
    <SimShell note="The overlap can only move inside the Fréchet bounds (the shaded band). Without linked data, that band is all the marginals tell you.">
      <div className="grid gap-4 md:grid-cols-[1fr_260px]">
        <div>
          <svg viewBox="0 0 640 170" className="w-full">
            <text x={x0} y={18}>The sample space Ω has length 1. A and B are intervals inside it.</text>
            <rect x={sc(0)} y={30} width={W} height={110} rx={8} fill="var(--surface-2)" stroke="var(--border)" />
            <rect x={sc(lo)} y={30} width={Math.max(0, sc(hi) - sc(lo))} height={110} fill="var(--s4)" opacity={0.12} />
            <rect x={sc(0) + 1} y={48} width={Math.max(0, pa * W - 2)} height={30} rx={4} fill={C1} opacity={0.85} />
            <text x={sc(0) + 8} y={68} style={{ fill: "white", fontWeight: 700 }}>A  ({fmt(pa)})</text>
            <rect x={sc(bStart) + 1} y={92} width={Math.max(0, pb * W - 2)} height={30} rx={4} fill={C2} opacity={0.85} />
            <text x={sc(bStart) + 8} y={112} style={{ fill: "white", fontWeight: 700 }}>B  ({fmt(pb)})</text>
            {pab > 0 && (
              <>
                <line x1={sc(bStart)} x2={sc(bStart)} y1={40} y2={132} stroke="var(--text)" strokeDasharray="3 3" />
                <line x1={sc(pa)} x2={sc(pa)} y1={40} y2={132} stroke="var(--text)" strokeDasharray="3 3" />
              </>
            )}
            <text x={(sc(bStart) + sc(pa)) / 2} y={160} textAnchor="middle" style={{ fill: "var(--text)", fontWeight: 600 }}>
              A∩B = {fmt(pab)}
            </text>
          </svg>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="P(A ∪ B)" value={fmt(union)} sub="P(A)+P(B)−P(A∩B)" color={C1} />
            <Stat label="P(neither)" value={fmt(1 - union)} sub="De Morgan" />
            <Stat label="P(A | B)" value={pb > 0 ? fmt(pab / pb) : "—"} sub={`P(A) = ${fmt(pa)}`} />
            <Stat label="Fréchet range of P(A∩B)" value={`${fmt(lo)}–${fmt(hi)}`} sub={`independent: ${fmt(pa * pb, 3)}`} color="var(--s4)" />
          </div>
        </div>
        <div className="space-y-3">
          <Slider label="P(A)" value={pa} min={0} max={1} step={0.01} onChange={setPa} format={(v) => fmt(v)} />
          <Slider label="P(B)" value={pb} min={0} max={1} step={0.01} onChange={setPb} format={(v) => fmt(v)} />
          <Slider label="P(A ∩ B)" value={pab} min={0} max={1} step={0.005} onChange={setPab} format={(v) => fmt(v, 3)} />
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={() => setPab(pa * pb)}>Make independent</button>
            <button className="btn" onClick={() => setPab(lo)}>Min overlap</button>
            <button className="btn" onClick={() => setPab(hi)}>Max overlap</button>
          </div>
          <p className="text-sm muted">
            {Math.abs(pab - pa * pb) < 0.003 ? "A and B are independent: P(A∩B) = P(A)P(B)." : pab > pa * pb ? "Positive dependence: B makes A more likely." : "Negative dependence: B makes A less likely."}
          </p>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 2: Bayes calculator ---------------- */
export function BayesCalc() {
  const [prev, setPrev] = useState(0.05);
  const [sens, setSens] = useState(0.9);
  const [fpr, setFpr] = useState(0.1);
  const tp = prev * sens, fp = (1 - prev) * fpr, fn = prev * (1 - sens), tn = (1 - prev) * (1 - fpr);
  const post = tp / (tp + fp);
  // 1,000-person grid
  const N = 1000, nTP = Math.round(N * tp), nFN = Math.round(N * fn), nFP = Math.round(N * fp);
  const cells = Array.from({ length: N }, (_, i) =>
    i < nTP ? "tp" : i < nTP + nFN ? "fn" : i < nTP + nFN + nFP ? "fp" : "tn");
  const col: Record<string, string> = { tp: C1, fn: "var(--s4)", fp: C2, tn: "var(--grid)" };
  const branch = (x1: number, y1: number, x2: number, y2: number, label: string, p: number) => (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--text-3)" strokeWidth={1 + 6 * p} strokeLinecap="round" opacity={0.6} />
      <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6} textAnchor="middle">{label}</text>
    </g>
  );
  return (
    <SimShell note="Each dot is one person in a city of 1,000. The posterior P(V | +) is the share of blue among all dots that tested positive (blue + orange).">
      <div className="grid gap-4 lg:grid-cols-2">
        <svg viewBox="0 0 420 250" className="w-full">
          {branch(30, 125, 150, 60, `V: ${fmt(prev, 3)}`, prev)}
          {branch(30, 125, 150, 190, `Vᶜ: ${fmt(1 - prev, 3)}`, 1 - prev)}
          {branch(150, 60, 290, 25, `+ ${fmt(sens)}`, sens)}
          {branch(150, 60, 290, 95, `− ${fmt(1 - sens)}`, 1 - sens)}
          {branch(150, 190, 290, 155, `+ ${fmt(fpr)}`, fpr)}
          {branch(150, 190, 290, 225, `− ${fmt(1 - fpr)}`, 1 - fpr)}
          <circle cx={30} cy={125} r={7} fill="var(--text-3)" />
          {[["True positive", tp, 25, C1], ["False negative", fn, 95, "var(--s4)"], ["False positive", fp, 155, C2], ["True negative", tn, 225, "var(--text-3)"]].map(([l, v, y, c]) => (
            <g key={l as string}>
              <rect x={296} y={(y as number) - 12} width={10} height={10} rx={2} fill={c as string} />
              <text x={312} y={(y as number) - 3} style={{ fill: "var(--text)" }}>{l as string}</text>
              <text x={312} y={(y as number) + 11}>{fmt(v as number, 4)}</text>
            </g>
          ))}
        </svg>
        <svg viewBox="0 0 400 250" className="w-full" aria-label="1,000-person grid">
          {cells.map((c, i) => (
            <rect key={i} x={(i % 40) * 10} y={Math.floor(i / 40) * 10} width={8} height={8} rx={2} fill={col[c]} />
          ))}
        </svg>
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-[1fr_1fr]">
        <div className="space-y-3">
          <Slider label="Prevalence P(V)" value={prev} min={0.001} max={0.6} step={0.001} onChange={setPrev} format={(v) => `${(100 * v).toFixed(1)}%`} />
          <Slider label="Sensitivity P(+ | V)" value={sens} min={0.5} max={1} step={0.01} onChange={setSens} format={(v) => `${(100 * v).toFixed(0)}%`} />
          <Slider label="False-positive rate P(+ | Vᶜ)" value={fpr} min={0} max={0.5} step={0.005} onChange={setFpr} format={(v) => `${(100 * v).toFixed(1)}%`} />
        </div>
        <div className="grid grid-cols-2 gap-2 self-start">
          <Stat label="Posterior P(V | +)" value={`${(100 * post).toFixed(1)}%`} color={C1} sub="Bayes' theorem" />
          <Stat label="P(+)" value={`${(100 * (tp + fp)).toFixed(1)}%`} sub="law of total probability" />
          <Stat label="Positives that are false" value={`${(100 * (1 - post)).toFixed(1)}%`} color={C2} />
          <Stat label="P(Vᶜ | −)" value={`${(100 * tn / (tn + fn)).toFixed(1)}%`} sub="negative predictive value" />
        </div>
      </div>
      <div className="mt-2"><Legend items={[{ color: C1, label: "true positive", area: true }, { color: C2, label: "false positive", area: true }, { color: "var(--s4)", label: "false negative", area: true }, { color: "var(--grid)", label: "true negative", area: true }]} /></div>
    </SimShell>
  );
}

/* ---------------- Day 3: linearity ---------------- */
export function Linearity() {
  const [a, setA] = useState(1);
  const [b, setB] = useState(0);
  const mx = 10, sdx = 2, my = a * mx + b, sdy = Math.abs(a) * sdx;
  const lo = Math.min(mx - 4 * sdx, my - 4 * Math.max(sdy, 0.5)), hi = Math.max(mx + 4 * sdx, my + 4 * Math.max(sdy, 0.5));
  const peak = Math.max(normPdf(0, 0, sdx), sdy > 0.05 ? normPdf(0, 0, sdy) : 0) * 1.1;
  const presets: [string, number, number][] = [["Identity", 1, 0], ["Shift only", 1, 10], ["Scale only", 2, 0], ["Invert & shift", -1.5, 5]];
  return (
    <SimShell note="Shifting by b moves the centre but not the spread; multiplying by a stretches the spread by |a| and the variance by a².">
      <Plot x={[lo, hi]} y={[0, peak]} xLabel="value" yLabel="density" height={280}
        hover={(x) => [`x = ${fmt(x)}`, `f_X = ${fmt(normPdf(x, mx, sdx), 3)}`, sdy > 0.05 ? `f_Y = ${fmt(normPdf(x, my, sdy), 3)}` : "Y is constant"]}>
        {(sx, sy) => (
          <>
            <path d={curve((x) => normPdf(x, mx, sdx), lo, hi, sx, sy)} fill="none" stroke={C1} strokeWidth={2} />
            {sdy > 0.05 ? (
              <path d={curve((x) => normPdf(x, my, sdy), lo, hi, sx, sy)} fill="none" stroke={C2} strokeWidth={2} />
            ) : (
              <line x1={sx(my)} x2={sx(my)} y1={sy(0)} y2={sy(peak * 0.95)} stroke={C2} strokeWidth={3} />
            )}
            <line x1={sx(mx)} x2={sx(mx)} y1={sy(0)} y2={sy(peak)} stroke={C1} strokeDasharray="4 3" />
            <line x1={sx(my)} x2={sx(my)} y1={sy(0)} y2={sy(peak)} stroke={C2} strokeDasharray="4 3" />
          </>
        )}
      </Plot>
      <Legend items={[{ color: C1, label: "X ~ N(10, 4)" }, { color: C2, label: "Y = aX + b" }]} />
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Slider label="Multiplier a" value={a} min={-3} max={3} step={0.1} onChange={setA} format={(v) => v.toFixed(1)} />
          <Slider label="Shift b" value={b} min={-20} max={20} step={0.5} onChange={setB} format={(v) => v.toFixed(1)} />
          <div className="flex flex-wrap gap-2">
            {presets.map(([l, pa, pb]) => <button key={l} className="btn" onClick={() => { setA(pa); setB(pb); }}>{l}</button>)}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 self-start">
          <Stat label="E[Y] = aE[X] + b" value={fmt(my)} sub={`${a.toFixed(1)} × 10 + ${b.toFixed(1)}`} color={C2} />
          <Stat label="Var(Y) = a²Var(X)" value={fmt(a * a * 4)} sub={`${(a * a).toFixed(2)} × 4`} color={C2} />
          <Stat label="sd(Y) = |a| sd(X)" value={fmt(sdy)} />
          <Stat label="E[X], Var(X)" value="10.00, 4.00" color={C1} />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 4: distributions ---------------- */
type DistKey = "bern" | "binom" | "pois" | "unif" | "norm" | "exp" | "lnorm";
export function Distributions() {
  const [d, setD] = useState<DistKey>("binom");
  const [p1, setP1] = useState<Record<DistKey, [number, number]>>({
    bern: [0.3, 0], binom: [10, 0.3], pois: [4, 0], unif: [20, 40], norm: [50, 10], exp: [0.5, 0], lnorm: [0, 0.5],
  });
  const [seed, reseed] = useSeed();
  const [a, b] = p1[d];
  const set = (i: 0 | 1, v: number) => setP1((s) => ({ ...s, [d]: (i === 0 ? [v, s[d][1]] : [s[d][0], v]) as [number, number] }));
  const discrete = d === "bern" || d === "binom" || d === "pois";
  const spec = useMemo(() => {
    switch (d) {
      case "bern": return { m: a, v: a * (1 - a), lo: -0.5, hi: 1.5, pmf: (k: number) => (k === 0 ? 1 - a : k === 1 ? a : 0) };
      case "binom": return { m: a * b, v: a * b * (1 - b), lo: -0.5, hi: a + 0.5, pmf: (k: number) => (k >= 0 && k <= a ? binomPmf(k, a, b) : 0) };
      case "pois": return { m: a, v: a, lo: -0.5, hi: Math.ceil(a + 5 * Math.sqrt(a) + 2) + 0.5, pmf: (k: number) => poisPmf(k, a) };
      case "unif": return { m: (a + b) / 2, v: (b - a) ** 2 / 12, lo: a - (b - a) * 0.2, hi: b + (b - a) * 0.2, pdf: (x: number) => (x >= a && x <= b ? 1 / (b - a) : 0) };
      case "norm": return { m: a, v: b * b, lo: a - 4 * b, hi: a + 4 * b, pdf: (x: number) => normPdf(x, a, b) };
      case "exp": return { m: 1 / a, v: 1 / (a * a), lo: 0, hi: 6 / a, pdf: (x: number) => (x >= 0 ? a * Math.exp(-a * x) : 0) };
      case "lnorm": return { m: Math.exp(a + (b * b) / 2), v: (Math.exp(b * b) - 1) * Math.exp(2 * a + b * b), lo: 0, hi: Math.exp(a + 3 * b), pdf: (x: number) => (x > 0 ? normPdf(Math.log(x), a, b) / x : 0) };
    }
  }, [d, a, b]);
  const draws = useMemo(() => {
    const r = rng(seed * 97 + 3);
    return Array.from({ length: 3000 }, () => {
      switch (d) {
        case "bern": return r.u() < a ? 1 : 0;
        case "binom": { let s = 0; for (let i = 0; i < a; i++) s += r.u() < b ? 1 : 0; return s; }
        case "pois": return r.pois(a);
        case "unif": return a + (b - a) * r.u();
        case "norm": return a + b * r.n();
        case "exp": return r.exp(a);
        case "lnorm": return Math.exp(a + b * r.n());
      }
    });
  }, [d, a, b, seed]);
  const ks = discrete ? Array.from({ length: Math.round(spec.hi - spec.lo) }, (_, i) => Math.round(spec.lo + 0.5) + i) : [];
  const bins = discrete ? ks.map((k) => ({ x0: k - 0.5, x1: k + 0.5, density: draws.filter((v) => v === k).length / draws.length })) : histogram(draws, spec.lo, spec.hi, 40);
  const ymax = Math.max(...(discrete ? ks.map((k) => spec.pmf!(k)) : Array.from({ length: 100 }, (_, i) => spec.pdf!(spec.lo + ((spec.hi - spec.lo) * (i + 0.5)) / 100))), ...bins.map((x) => x.density)) * 1.12;
  const params: Record<DistKey, [string, number, number, number, string?, number?, number?, number?]> = {
    bern: ["p", 0.01, 0.99, 0.01],
    binom: ["n", 1, 40, 1, "p", 0.01, 0.99, 0.01],
    pois: ["λ", 0.2, 20, 0.1],
    unif: ["a", 0, 50, 1, "b", 51, 100, 1],
    norm: ["μ", 0, 100, 1, "σ", 1, 30, 0.5],
    exp: ["λ (rate)", 0.1, 3, 0.05],
    lnorm: ["μ (of ln X)", -1, 2, 0.05, "σ (of ln X)", 0.1, 1.2, 0.05],
  };
  const pr = params[d];
  return (
    <SimShell note="Bars are 3,000 simulated draws; the line or dots are the exact distribution. Compare the theoretical and simulated moments.">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Seg value={d} onChange={setD} options={[{ value: "bern", label: "Bernoulli" }, { value: "binom", label: "Binomial" }, { value: "pois", label: "Poisson" }, { value: "unif", label: "Uniform" }, { value: "norm", label: "Normal" }, { value: "exp", label: "Exponential" }, { value: "lnorm", label: "Log-normal" }]} />
        <button className="btn" onClick={reseed}>Draw again</button>
      </div>
      <Plot x={[spec.lo, spec.hi]} y={[0, ymax]} xLabel="x" yLabel={discrete ? "probability" : "density"} height={280}
        hover={(x) => discrete ? [`k = ${Math.round(x)}`, `P(X=k) = ${fmt(spec.pmf!(Math.round(x)), 4)}`] : [`x = ${fmt(x)}`, `f(x) = ${fmt(spec.pdf!(x), 4)}`]}>
        {(sx, sy) => (
          <>
            <Bars bins={bins} sx={sx} sy={sy} color={C1} opacity={0.35} />
            {discrete
              ? ks.map((k) => <g key={k}><line x1={sx(k)} x2={sx(k)} y1={sy(0)} y2={sy(spec.pmf!(k))} stroke={C2} strokeWidth={2} /><circle cx={sx(k)} cy={sy(spec.pmf!(k))} r={4} fill={C2} stroke="var(--surface)" strokeWidth={2} /></g>)
              : <path d={curve(spec.pdf!, spec.lo, spec.hi, sx, sy, 300)} fill="none" stroke={C2} strokeWidth={2} />}
          </>
        )}
      </Plot>
      <Legend items={[{ color: C1, label: "simulated draws", area: true }, { color: C2, label: "exact distribution" }]} />
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Slider label={pr[0]} value={a} min={pr[1]} max={pr[2]} step={pr[3]} onChange={(v) => set(0, v)} format={(v) => fmt(v, pr[3] < 1 ? 2 : 0)} />
          {pr[4] && <Slider label={pr[4]} value={b} min={pr[5]!} max={pr[6]!} step={pr[7]!} onChange={(v) => set(1, v)} format={(v) => fmt(v, pr[7]! < 1 ? 2 : 0)} />}
        </div>
        <div className="grid grid-cols-2 gap-2 self-start">
          <Stat label="Mean: theory / simulated" value={`${fmt(spec.m)} / ${fmt(mean(draws))}`} color={C2} />
          <Stat label="Variance: theory / simulated" value={`${fmt(spec.v)} / ${fmt(variance(draws, 1))}`} color={C2} />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 5: bivariate normal in 3D ---------------- */
export function BivariateNormal() {
  const [rho, setRho] = useState(0.5);
  const [az, setAz] = useState(-0.7);
  const [el, setEl] = useState(0.55);
  const [seed, reseed] = useSeed();
  const drag = useRef<{ x: number; y: number } | null>(null);
  const G = 26, R = 3;
  const dens = (x: number, y: number) => Math.exp(-(x * x - 2 * rho * x * y + y * y) / (2 * (1 - rho * rho))) / (2 * Math.PI * Math.sqrt(1 - rho * rho));
  const zScale = 2.4 / dens(0, 0); // peak height fixed so the shape stays readable
  const proj = (x: number, y: number, z: number) => {
    const ca = Math.cos(az), sa = Math.sin(az), ce = Math.cos(el), se = Math.sin(el);
    const X = x * ca - y * sa, Y = x * sa + y * ca;
    const sx = X, sy = Y * se - z * ce, depth = Y * ce + z * se;
    return { px: 210 + sx * 40, py: 175 + sy * 40, depth };
  };
  const quads = useMemo(() => {
    const out: { pts: string; depth: number; h: number }[] = [];
    for (let i = 0; i < G; i++)
      for (let j = 0; j < G; j++) {
        const xs = [i, i + 1, i + 1, i].map((k) => -R + (2 * R * k) / G);
        const ys = [j, j, j + 1, j + 1].map((k) => -R + (2 * R * k) / G);
        const ps = xs.map((x, k) => {
          const z = dens(x, ys[k]) * zScale;
          return proj(x, ys[k], z);
        });
        const h = dens((xs[0] + xs[1]) / 2, (ys[0] + ys[2]) / 2) / dens(0, 0);
        out.push({ pts: ps.map((p) => `${p.px.toFixed(1)},${p.py.toFixed(1)}`).join(" "), depth: ps.reduce((s, p) => s + p.depth, 0) / 4, h });
      }
    return out.sort((a, b) => a.depth - b.depth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rho, az, el]);
  const pts = useMemo(() => {
    const r = rng(seed * 31 + 5);
    return Array.from({ length: 400 }, () => {
      const z1 = r.n(), z2 = r.n();
      return [z1, rho * z1 + Math.sqrt(1 - rho * rho) * z2];
    });
  }, [rho, seed]);
  const sampleR = (() => {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const mx = mean(xs), my = mean(ys);
    const c = mean(pts.map((p) => (p[0] - mx) * (p[1] - my)));
    return c / Math.sqrt(variance(xs) * variance(ys));
  })();
  const ellipse = (r: number) => {
    let d = "";
    for (let k = 0; k <= 64; k++) {
      const t = (2 * Math.PI * k) / 64;
      const u = r * Math.sqrt(1 + rho) * Math.cos(t), v = r * Math.sqrt(1 - rho) * Math.sin(t);
      d += `${k ? "L" : "M"}${((u + v) / Math.SQRT2).toFixed(3)},${((u - v) / Math.SQRT2).toFixed(3)}`;
    }
    return d;
  };
  return (
    <SimShell note="Left: the joint density surface (drag to rotate). Right: its contour ellipses, 400 draws, and the conditional-mean line E[Y | X = x] = ρx (standardised variables).">
      <div className="grid gap-4 lg:grid-cols-2">
        <svg viewBox="0 0 420 300" className="w-full cursor-grab touch-none rounded-xl" style={{ background: "var(--surface-2)" }}
          onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY }; (e.target as Element).setPointerCapture?.(e.pointerId); }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            setAz((a) => a + (e.clientX - drag.current!.x) * 0.01);
            setEl((v) => Math.max(0.1, Math.min(1.45, v + (e.clientY - drag.current!.y) * 0.01)));
            drag.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerUp={() => (drag.current = null)}>
          {quads.map((q, i) => (
            <polygon key={i} points={q.pts} fill={`color-mix(in oklab, var(--s1) ${Math.round(12 + 88 * q.h)}%, var(--surface))`} stroke="var(--surface)" strokeWidth={0.4} />
          ))}
          {(() => {
            const o = proj(-R, -R, 0), xa = proj(R, -R, 0), ya = proj(-R, R, 0);
            return (<g><text x={xa.px} y={xa.py + 14}>X</text><text x={ya.px - 10} y={ya.py + 14}>Y</text><circle cx={o.px} cy={o.py} r={2} fill="var(--text-3)" /></g>);
          })()}
        </svg>
        <Plot x={[-3, 3]} y={[-3, 3]} height={600} xLabel="X (standardised)" yLabel="Y (standardised)"
          hover={(x) => [`x = ${fmt(x)}`, `E[Y | X=x] = ${fmt(rho * x)}`, `sd(Y | X) = ${fmt(Math.sqrt(1 - rho * rho))}`]}>
          {(sx, sy) => (
            <>
              {pts.map((p, i) => <circle key={i} cx={sx(p[0])} cy={sy(p[1])} r={2.4} fill={C1} opacity={0.45} />)}
              {[0.5, 1, 1.5, 2, 2.5].map((r) => (
                <path key={r} transform={`translate(${sx(0)} ${sy(0)}) scale(${sx(1) - sx(0)} ${sy(1) - sy(0)})`} d={ellipse(r)} fill="none" stroke="var(--text-3)" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
              ))}
              <line x1={sx(-3)} y1={sy(-3 * rho)} x2={sx(3)} y2={sy(3 * rho)} stroke={C2} strokeWidth={2.5} />
            </>
          )}
        </Plot>
      </div>
      <Legend items={[{ color: C1, label: "simulated draws", area: true }, { color: "var(--text-3)", label: "density contours" }, { color: C2, label: "E[Y | X] = ρx" }]} />
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Slider label="Correlation ρ" value={rho} min={-0.95} max={0.95} step={0.05} onChange={setRho} format={(v) => v.toFixed(2)} />
          <div className="flex gap-2"><button className="btn" onClick={reseed}>New draws</button><button className="btn" onClick={() => { setAz(-0.7); setEl(0.55); }}>Reset view</button></div>
        </div>
        <div className="grid grid-cols-3 gap-2 self-start">
          <Stat label="ρ (true)" value={rho.toFixed(2)} color={C2} />
          <Stat label="sample r" value={fmt(sampleR)} color={C1} />
          <Stat label="Var(Y | X)" value={fmt(1 - rho * rho)} sub="1 − ρ²" />
        </div>
      </div>
    </SimShell>
  );
}
