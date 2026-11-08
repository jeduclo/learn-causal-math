"use client";
import { useMemo, useState } from "react";
import { Bars, Legend, Plot, SimShell, Slider, Stat, fmt, histogram, rng, useSeed } from "./kit";
import { avg } from "./kit2";

const C1 = "var(--s1)", C2 = "var(--s2)", C3 = "var(--s3)", C4 = "var(--s4)";
const TOP = 12;
const cov = (a: number[], b: number[]) => { const ma = avg(a), mb = avg(b); let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - ma) * (b[i] - mb); return s / (a.length - 1); };

/* ---------------- Day 61: endogeneity and IV ---------------- */
export function IvIntroLab() {
  const [conf, setConf] = useState(1.5);
  const [pi, setPi] = useState(0.8);
  const [me, setMe] = useState(0);
  const [n, setN] = useState(800);
  const [seed, reseed] = useSeed();
  const d = useMemo(() => {
    const r = rng(seed * 3 + 61);
    return Array.from({ length: n }, () => {
      const A = r.n(), Z = r.n() > 0 ? 1 : 0;                 // ability; Z = lives near a college
      const S = 12 + pi * 2 * Z + conf * A + 1.5 * r.n();
      const W = 1 + 0.08 * S + 0.1 * A + 0.25 * r.n();
      return { S: S + me * r.n(), W, Z };
    });
  }, [conf, pi, me, n, seed]);
  const S = d.map((u) => u.S), W = d.map((u) => u.W), Z = d.map((u) => u.Z);
  const ols = cov(S, W) / cov(S, S), iv = cov(Z, W) / cov(Z, S);
  const fs = avg(d.filter((u) => u.Z).map((u) => u.S)) - avg(d.filter((u) => !u.Z).map((u) => u.S));
  const rf = avg(d.filter((u) => u.Z).map((u) => u.W)) - avg(d.filter((u) => !u.Z).map((u) => u.W));
  const mS = avg(S), mW = avg(W);
  const g = [0, 1].map((z) => ({ s: avg(d.filter((u) => u.Z === z).map((u) => u.S)), w: avg(d.filter((u) => u.Z === z).map((u) => u.W)) }));
  return (
    <SimShell note="Simulated workers: ability raises both schooling and log wages (true return 0.08). Living near a college (the instrument) raises schooling but has no other route to wages. OLS (orange) absorbs ability bias and measurement-error attenuation; IV (green) uses only the schooling differences created by the instrument: the slope through the two group means (large dots).">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Plot x={[mS - 7, mS + 7]} y={[mW - 1, mW + 1]} height={320} xLabel="years of schooling (as measured)" yLabel="log wage">
          {(sx, sy) => (
            <>
              {d.map((u, i) => <circle key={i} cx={sx(Math.max(mS - 7, Math.min(mS + 7, u.S)))} cy={sy(Math.max(mW - 1, Math.min(mW + 1, u.W)))} r={2} fill={u.Z ? C4 : "var(--text-3)"} opacity={0.35} />)}
              <line x1={sx(mS - 7)} x2={sx(mS + 7)} y1={sy(mW - 7 * ols)} y2={sy(mW + 7 * ols)} stroke={C2} strokeWidth={3} />
              <line x1={sx(mS - 7)} x2={sx(mS + 7)} y1={sy(mW - 7 * iv)} y2={sy(mW + 7 * iv)} stroke={C3} strokeWidth={3} strokeDasharray="7 4" />
              {g.map((p, i) => <circle key={"g" + i} cx={sx(p.s)} cy={sy(p.w)} r={8} fill={i ? C4 : "var(--text-2)"} stroke="var(--surface)" strokeWidth={2} />)}
            </>
          )}
        </Plot>
        <div className="space-y-3">
          <Slider label="Ability confounding (ability → schooling)" value={conf} min={0} max={3} step={0.1} onChange={setConf} />
          <Slider label="Instrument strength (years added by proximity ÷ 2)" value={pi} min={0} max={2} step={0.05} onChange={setPi} />
          <Slider label="Measurement error in schooling (sd)" value={me} min={0} max={3} step={0.1} onChange={setMe} />
          <Slider label="Sample size" value={n} min={200} max={3000} step={100} onChange={setN} />
          <button className="btn" onClick={reseed}>New sample</button>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="OLS" value={fmt(ols, 3)} color={C2} />
            <Stat label="IV = RF ÷ FS" value={fmt(iv, 3)} color={C3} sub={`${fmt(rf, 3)} ÷ ${fmt(fs, 2)}`} />
            <Stat label="truth" value="0.080" />
          </div>
        </div>
      </div>
      <Legend items={[{ color: C2, label: "OLS slope" }, { color: C3, label: "IV slope through group means", dash: true }, { color: C4, label: "near a college (Z = 1)" }, { color: "var(--text-3)", label: "far (Z = 0)" }]} />
    </SimShell>
  );
}

/* ---------------- Day 62: the Wald / grouping estimator ---------------- */
export function WaldLab() {
  const [K, setK] = useState(2);
  const [effect, setEffect] = useState(-2.8);
  const [sel, setSel] = useState(1.5);
  const [seed, reseed] = useSeed();
  const res = useMemo(() => {
    const r = rng(seed * 7 + 62);
    const groups = Array.from({ length: K }, (_, k) => ({ k, fs: 0.15 + (0.35 * k) / Math.max(1, K - 1), ys: [] as number[], ds: [] as number[] }));
    const all: { d: number; y: number }[] = [];
    for (const g of groups) for (let i = 0; i < 3000; i++) {
      const vol = r.u() < 0.15;                                  // volunteers: always serve, earn more anyway
      const drafted = r.u() < (g.fs - 0.15) / 0.85;
      const d = vol || drafted ? 1 : 0;
      const y = 16 + (vol ? sel : 0) + effect * d + 4 * r.n();  // earnings, $1,000
      g.ys.push(y); g.ds.push(d); all.push({ d, y });
    }
    const pts = groups.map((g) => ({ x: avg(g.ds), y: avg(g.ys), n: g.ys.length }));
    const slope = cov(pts.map((p) => p.x), pts.map((p) => p.y)) / cov(pts.map((p) => p.x), pts.map((p) => p.x));
    const naive = avg(all.filter((u) => u.d).map((u) => u.y)) - avg(all.filter((u) => !u.d).map((u) => u.y));
    return { pts, slope, naive };
  }, [K, effect, sel, seed]);
  const xs = res.pts.map((p) => p.x), ys = res.pts.map((p) => p.y);
  const mx = avg(xs), my = avg(ys);
  const y0 = Math.min(...ys) - 1.2, y1 = Math.max(...ys) + 1.2;
  return (
    <SimShell note="Lottery groups differ only in their draft risk. Each dot is a group: its veteran share (x) and mean earnings (y). The slope through the group means is the Wald estimate (2 groups) or the grouping (2SLS) estimate (more groups). Comparing veterans with non-veterans instead mixes in volunteers, who would earn more anyway.">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Plot x={[0, 0.7]} y={[y0, y1]} height={300} xLabel="share who served" yLabel="mean earnings ($1,000)">
          {(sx, sy) => (
            <>
              <line x1={sx(0)} x2={sx(0.7)} y1={sy(my + res.slope * (0 - mx))} y2={sy(my + res.slope * (0.7 - mx))} stroke={C3} strokeWidth={3} />
              {res.pts.map((p, i) => <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={8} fill={C1} stroke="var(--surface)" strokeWidth={2} />)}
            </>
          )}
        </Plot>
        <div className="space-y-3">
          <Slider label="Number of lottery groups" value={K} min={2} max={8} step={1} onChange={setK} />
          <Slider label="True effect of service ($1,000)" value={effect} min={-6} max={3} step={0.1} onChange={setEffect} />
          <Slider label="Volunteers' earnings advantage" value={sel} min={-3} max={5} step={0.1} onChange={setSel} />
          <button className="btn" onClick={reseed}>New lottery</button>
          <div className="grid grid-cols-3 gap-2">
            <Stat label={K === 2 ? "Wald estimate" : "grouping estimate"} value={fmt(res.slope, 2)} color={C3} />
            <Stat label="veterans vs others" value={fmt(res.naive, 2)} color={C2} />
            <Stat label="truth" value={fmt(effect, 2)} />
          </div>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 63: LATE ---------------- */
export function LateLab() {
  const [pc, setPc] = useState(0.5), [pa, setPa] = useState(0.2);
  const [tc, setTc] = useState(12), [ta, setTa] = useState(12), [tn, setTn] = useState(5);
  const [sel, setSel] = useState(3);
  const pn = Math.max(0, 1 - pc - pa);
  // untreated means by type: compliers 47, always 50 + sel, never 50
  const y0 = { c: 47, a: 50 + sel, n: 50 };
  const late = tc;
  const ate = pc * tc + pa * ta + pn * tn;
  const att = (pa * ta + 0.5 * pc * tc) / (pa + 0.5 * pc);        // with Z = 1 for half the population
  const pD1 = pc + pa, pD0 = pa;
  const EY1 = pc * (y0.c + tc) + pa * (y0.a + ta) + pn * y0.n, EY0 = pc * y0.c + pa * (y0.a + ta) + pn * y0.n;
  const wald = (EY1 - EY0) / (pD1 - pD0);
  const treatedMean = (0.5 * pc * (y0.c + tc) + pa * (y0.a + ta)) / (0.5 * pc + pa);
  const untreatedMean = (0.5 * pc * y0.c + pn * y0.n) / (0.5 * pc + pn);
  const naive = treatedMean - untreatedMean;
  const rows = [
    { label: "Wald (IV)", v: wald, c: C3 }, { label: "LATE (compliers)", v: late, c: C1 },
    { label: "ATE (everyone)", v: ate, c: "var(--text-2)" }, { label: "ATT (the treated)", v: att, c: C4 },
    { label: "treated vs untreated", v: naive, c: C2 },
  ];
  const vmax = Math.max(...rows.map((r) => Math.abs(r.v)), 1) * 1.15;
  return (
    <SimShell note="A school-voucher lottery with three types (no defiers). The instrument changes only compliers' treatment, so the Wald ratio equals their average effect, whatever always- and never-takers' effects are. ATE and ATT weight the types differently; a naive comparison also mixes in who chooses to enrol. Half of the population wins the lottery.">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="mb-3 flex h-8 overflow-hidden rounded-lg text-xs font-semibold text-white">
            {[["Compliers", pc, C1], ["Always-takers", pa, C2], ["Never-takers", pn, "var(--text-3)"]].map(([k, v, c]) => (v as number) > 0.001 && (
              <div key={k as string} style={{ width: `${100 * (v as number)}%`, background: c as string }} className="flex items-center justify-center">{(v as number) > 0.12 ? `${k} ${(100 * (v as number)).toFixed(0)}%` : ""}</div>
            ))}
          </div>
          <svg viewBox="0 0 560 230" className="w-full">
            {rows.map((r, i) => (
              <g key={r.label}>
                <text x={170} y={30 + i * 42} textAnchor="end" style={{ fill: "var(--text)" }}>{r.label}</text>
                <rect x={r.v >= 0 ? 180 : 180 + (r.v / vmax) * 350} y={12 + i * 42} width={Math.abs(r.v / vmax) * 350} height={26} rx={4} fill={r.c} opacity={0.85} />
                <text x={186 + Math.max(0, r.v / vmax) * 350} y={30 + i * 42} style={{ fill: "var(--text)", fontWeight: 700 }}>{fmt(r.v, 2)}</text>
              </g>
            ))}
          </svg>
        </div>
        <div className="grid grid-cols-2 content-start gap-3">
          <Slider label="Share compliers" value={pc} min={0.05} max={1 - pa} step={0.05} onChange={setPc} format={(v) => v.toFixed(2)} />
          <Slider label="Share always-takers" value={pa} min={0} max={1 - pc} step={0.05} onChange={setPa} format={(v) => v.toFixed(2)} />
          <Slider label="Effect for compliers" value={tc} min={-5} max={20} step={0.5} onChange={setTc} />
          <Slider label="Effect for always-takers" value={ta} min={-5} max={20} step={0.5} onChange={setTa} />
          <Slider label="Effect for never-takers" value={tn} min={-5} max={20} step={0.5} onChange={setTn} />
          <Slider label="Always-takers' advantage" value={sel} min={-5} max={10} step={0.5} onChange={setSel} />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 64: two stages ---------------- */
export function TslsLab() {
  const [pi, setPi] = useState(0.5);
  const [endo, setEndo] = useState(0.8);
  const [n, setN] = useState(500);
  const [seed, reseed] = useSeed();
  const res = useMemo(() => {
    const r = rng(seed * 9 + 64);
    const d = Array.from({ length: n }, () => {
      const z = r.n(), u = r.n(), v = endo * u + Math.sqrt(1 - endo * endo) * r.n();
      const x = pi * z + v;
      return { z, x, y: 1 + 0.5 * x + u };
    });
    const z = d.map((u) => u.z), x = d.map((u) => u.x), y = d.map((u) => u.y);
    const p = cov(z, x) / cov(z, z), mz = avg(z), mx = avg(x);
    const xh = z.map((v) => mx + p * (v - mz));
    const b = cov(xh, y) / cov(xh, xh), a = avg(y) - b * avg(xh);
    const e = y.map((v, i) => v - a - b * x[i]), em = y.map((v, i) => v - a - b * xh[i]);
    const sxx = xh.reduce((s, v) => s + (v - mx) ** 2, 0);
    const se = Math.sqrt(e.reduce((s, v) => s + v * v, 0) / n / sxx), seM = Math.sqrt(em.reduce((s, v) => s + v * v, 0) / n / sxx);
    return { d, p, b, a, se, seM, ols: cov(x, y) / cov(x, x), mz, mx, xh };
  }, [pi, endo, n, seed]);
  return (
    <SimShell note="Stage 1 projects the endogenous regressor on the instrument (left); stage 2 regresses the outcome on the fitted values (right). The slope is 2SLS. Standard errors must use residuals computed with the actual x, not the fitted x̂: compare the two.">
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-1 text-xs font-semibold faint">STAGE 1: x on z</div>
          <Plot x={[-3, 3]} y={[-4, 4]} height={240} xLabel="instrument z" yLabel="regressor x">
            {(sx, sy) => (<>{res.d.map((u, i) => <circle key={i} cx={sx(Math.max(-3, Math.min(3, u.z)))} cy={sy(Math.max(-4, Math.min(4, u.x)))} r={2} fill="var(--text-3)" opacity={0.4} />)}
              <line x1={sx(-3)} x2={sx(3)} y1={sy(res.mx + res.p * (-3 - res.mz))} y2={sy(res.mx + res.p * (3 - res.mz))} stroke={C1} strokeWidth={3} /></>)}
          </Plot>
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold faint">STAGE 2: y on fitted x̂</div>
          <Plot x={[-2, 2]} y={[-2, 4]} height={240} xLabel="fitted x̂" yLabel="outcome y">
            {(sx, sy) => (<>{res.d.map((u, i) => <circle key={i} cx={sx(Math.max(-2, Math.min(2, res.xh[i])))} cy={sy(Math.max(-2, Math.min(4, u.y)))} r={2} fill="var(--text-3)" opacity={0.4} />)}
              <line x1={sx(-2)} x2={sx(2)} y1={sy(res.a - 2 * res.b)} y2={sy(res.a + 2 * res.b)} stroke={C3} strokeWidth={3} />
              <line x1={sx(-2)} x2={sx(2)} y1={sy(1 - 1)} y2={sy(1 + 1)} stroke="var(--text)" strokeDasharray="4 4" /></>)}
          </Plot>
        </div>
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-[1fr_1.4fr]">
        <div className="space-y-3">
          <Slider label="First-stage coefficient π" value={pi} min={0.05} max={1.5} step={0.05} onChange={setPi} />
          <Slider label="Endogeneity corr(u, v)" value={endo} min={-0.9} max={0.9} step={0.05} onChange={setEndo} format={(v) => v.toFixed(2)} />
          <Slider label="Sample size" value={n} min={100} max={3000} step={100} onChange={setN} />
          <button className="btn" onClick={reseed}>New sample</button>
        </div>
        <div className="grid grid-cols-3 content-start gap-2">
          <Stat label="first stage π̂" value={fmt(res.p, 3)} color={C1} />
          <Stat label="2SLS" value={fmt(res.b, 3)} color={C3} sub="truth 0.500" />
          <Stat label="OLS" value={fmt(res.ols, 3)} color={C2} />
          <Stat label="correct SE" value={fmt(res.se, 4)} sub="residuals y − b̂·x" />
          <Stat label="manual 2nd-stage SE" value={fmt(res.seM, 4)} sub="residuals y − b̂·x̂ (wrong)" />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 65: weak instruments ---------------- */
export function WeakIvLab() {
  const [pi, setPi] = useState(0.1);
  const [endo, setEndo] = useState(0.8);
  const [seed, reseed] = useSeed();
  const n = 200;
  const res = useMemo(() => {
    const r = rng(seed * 13 + 65);
    const est: number[] = [], Fs: number[] = [];
    let cw = 0, ca = 0;
    for (let k = 0; k < 1500; k++) {
      let sz = 0, szz = 0, sx = 0, sy = 0; const z: number[] = [], x: number[] = [], y: number[] = [];
      for (let i = 0; i < n; i++) {
        const zi = r.n(), e = r.n(), v = endo * e + Math.sqrt(1 - endo * endo) * r.n();
        const xi = pi * zi + v; z.push(zi); x.push(xi); y.push(xi + e);
        sz += zi; sx += xi; sy += y[i];
      }
      const mz = sz / n, mx = sx / n, my = sy / n;
      let zx = 0, zy = 0; for (let i = 0; i < n; i++) { szz += (z[i] - mz) ** 2; zx += (z[i] - mz) * (x[i] - mx); zy += (z[i] - mz) * (y[i] - my); }
      const g = zx / szz; let rv = 0, ru = 0, rw = 0;
      const b = zy / zx, h = (zy - zx) / szz;          // AR at beta0 = 1: regress y - x on z
      for (let i = 0; i < n; i++) {
        rv += (x[i] - mx - g * (z[i] - mz)) ** 2;
        ru += (y[i] - my - b * (x[i] - mx)) ** 2;
        rw += ((y[i] - x[i]) - (my - mx) - h * (z[i] - mz)) ** 2;
      }
      Fs.push((g * g * szz) / (rv / (n - 2)));
      const se = Math.sqrt((ru / (n - 2)) * szz) / Math.abs(zx);
      if (Math.abs(b - 1) < 1.96 * se) cw++;
      if (Math.abs(h) < 1.96 * Math.sqrt(rw / (n - 2) / szz)) ca++;
      est.push(b);
    }
    return { est, F: avg(Fs), cw: cw / 1500, ca: ca / 1500 };
  }, [pi, endo, seed]);
  const olsLim = 1 + endo / (pi * pi + 1);
  const lo = -1, hi = 3.5;
  const bins = histogram(res.est.map((v) => Math.max(lo, Math.min(hi - 1e-6, v))), lo, hi, 60);
  const med = [...res.est].sort((a, b) => a - b)[750];
  return (
    <SimShell note="1,500 simulated studies with 200 observations each; the true effect is 1. As the first stage weakens, the 2SLS distribution shifts towards the OLS limit (orange), grows heavy tails, and the usual t-based interval under-covers. The Anderson–Rubin test keeps its 95% coverage at every strength.">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Plot x={[lo, hi]} y={[0, Math.max(...bins.map((b) => b.density)) * 1.15]} height={300} xLabel="2SLS estimate (values beyond the axis piled at the edges)" yTicks={[]}>
          {(sx, sy) => (
            <>
              <Bars bins={bins} sx={sx} sy={sy} color={C1} opacity={0.6} />
              <line x1={sx(1)} x2={sx(1)} y1={sy(0)} y2={TOP} stroke={C3} strokeWidth={2.5} />
              <line x1={sx(olsLim)} x2={sx(olsLim)} y1={sy(0)} y2={TOP} stroke={C2} strokeWidth={2.5} strokeDasharray="6 4" />
            </>
          )}
        </Plot>
        <div className="space-y-3">
          <Slider label="First-stage coefficient π" value={pi} min={0} max={0.5} step={0.01} onChange={setPi} />
          <Slider label="Endogeneity corr(ε, v)" value={endo} min={0} max={0.95} step={0.05} onChange={setEndo} format={(v) => v.toFixed(2)} />
          <button className="btn" onClick={reseed}>Re-run</button>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="mean first-stage F" value={fmt(res.F, 1)} color={res.F > 10 ? C3 : C2} />
            <Stat label="median 2SLS" value={fmt(med, 3)} sub={`OLS limit ${fmt(olsLim, 2)}`} />
            <Stat label="t-interval coverage" value={`${(100 * res.cw).toFixed(1)}%`} color={C2} />
            <Stat label="Anderson–Rubin coverage" value={`${(100 * res.ca).toFixed(1)}%`} color={C3} />
          </div>
        </div>
      </div>
      <Legend items={[{ color: C3, label: "true effect 1" }, { color: C2, label: "OLS probability limit", dash: true }]} />
    </SimShell>
  );
}

