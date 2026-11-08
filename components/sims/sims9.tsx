"use client";
import { useMemo, useState } from "react";
import { Bars, Legend, Plot, Seg, SimShell, Slider, Stat, fmt, histogram, rng, useSeed } from "./kit";
import { avg, logistic, logitFit, ols, sd } from "./kit2";

const C1 = "var(--s1)", C2 = "var(--s2)", C3 = "var(--s3)", C4 = "var(--s4)";
const TOP = 12;
const clip = (e: number, c: number) => Math.min(1 - c, Math.max(c, e));
const ndiff = (a: number[], b: number[]) => {
  const v = (x: number[]) => { const m = avg(x); return x.reduce((s, y) => s + (y - m) ** 2, 0) / Math.max(1, x.length - 1); };
  return (avg(a) - avg(b)) / Math.sqrt((v(a) + v(b)) / 2 || 1);
};

/** Horizontal bar chart of named estimates with a reference value. */
function EstimateBars({ rows, truth, truthLabel, unit = "" }: { rows: { label: string; v: number; c: string }[]; truth: number; truthLabel: string; unit?: string }) {
  const lo = Math.min(0, truth, ...rows.map((r) => r.v)), hi = Math.max(truth, ...rows.map((r) => r.v)) * 1.15 + 0.01;
  const W = 600, L = 190, R = 20, sx = (v: number) => L + ((v - lo) / (hi - lo)) * (W - L - R);
  const H = rows.length * 46 + 30;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <line x1={sx(0)} x2={sx(0)} y1={8} y2={H - 18} stroke="var(--border)" />
      {rows.map((r, i) => (
        <g key={r.label}>
          <text x={L - 8} y={34 + i * 46} textAnchor="end" style={{ fill: "var(--text)" }}>{r.label}</text>
          <rect x={Math.min(sx(0), sx(r.v))} y={16 + i * 46} width={Math.abs(sx(r.v) - sx(0))} height={28} rx={4} fill={r.c} opacity={0.85} />
          <text x={sx(r.v) + (r.v >= 0 ? 6 : -6)} y={35 + i * 46} textAnchor={r.v >= 0 ? "start" : "end"} style={{ fill: "var(--text)", fontWeight: 700 }}>{fmt(r.v, 2)}{unit}</text>
        </g>
      ))}
      <line x1={sx(truth)} x2={sx(truth)} y1={8} y2={H - 18} stroke="var(--text)" strokeWidth={2} strokeDasharray="5 4" />
      <text x={sx(truth)} y={H - 4} textAnchor="middle" style={{ fill: "var(--text)", fontWeight: 600 }}>{truthLabel} {fmt(truth, 2)}</text>
    </svg>
  );
}

/* ---------------- Day 41: non-compliance ---------------- */
export function NoncomplianceLab() {
  const [pc, setPc] = useState(0.4);
  const [pa, setPa] = useState(0.15);
  const [tau, setTau] = useState(1.5);
  const [tauA, setTauA] = useState(1.5);
  const [selA, setSelA] = useState(2);
  const [selN, setSelN] = useState(-1);
  const pn = Math.max(0, 1 - pc - pa);
  // baseline doctor visits per year by type: compliers 3, always-takers 3 + selA, never-takers 3 + selN
  const mc = 3, ma = 3 + selA, mn = 3 + selN;
  const itt = pc * tau;
  const first = pc;
  const wald = first > 0 ? itt / first : NaN;
  const d1 = pc / 2 + pa, d0 = pn + pc / 2;
  const asTreated = (pc / 2 * (mc + tau) + pa * (ma + tauA)) / d1 - (pn * mn + pc / 2 * mc) / d0;
  const perProt = (pc * (mc + tau) + pa * (ma + tauA)) / (pc + pa) - (pc * mc + pn * mn) / (pc + pn);
  const types = [
    { k: "Compliers", v: pc, c: C1 }, { k: "Always-takers", v: pa, c: C2 }, { k: "Never-takers", v: pn, c: "var(--text-3)" },
  ];
  return (
    <SimShell note="A health-insurance lottery (Z = won) and actual enrolment (D). Outcome: doctor visits per year. Population values, no sampling noise. Only the Wald ratio ITT ÷ first stage recovers the complier effect (CACE); as-treated and per-protocol comparisons mix in who chooses to enrol. Assumes no defiers.">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="mb-2 flex h-8 overflow-hidden rounded-lg text-xs font-semibold text-white">
            {types.map((t) => t.v > 0.001 && (
              <div key={t.k} style={{ width: `${100 * t.v}%`, background: t.c }} className="flex items-center justify-center">{t.v > 0.12 ? `${t.k} ${(100 * t.v).toFixed(0)}%` : ""}</div>
            ))}
          </div>
          <EstimateBars truth={tau} truthLabel="CACE (truth)" rows={[
            { label: "ITT (Z=1 vs Z=0)", v: itt, c: C4 },
            { label: "Wald: ITT ÷ first stage", v: wald, c: C3 },
            { label: "As-treated (D=1 vs D=0)", v: asTreated, c: C2 },
            { label: "Per-protocol", v: perProt, c: C2 },
          ]} />
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Slider label="Share compliers" value={pc} min={0.05} max={1 - pa} step={0.05} onChange={setPc} format={(v) => v.toFixed(2)} />
            <Slider label="Share always-takers" value={pa} min={0} max={1 - pc} step={0.05} onChange={setPa} format={(v) => v.toFixed(2)} />
            <Slider label="Effect on compliers" value={tau} min={-2} max={4} step={0.25} onChange={setTau} />
            <Slider label="Effect on always-takers" value={tauA} min={-2} max={4} step={0.25} onChange={setTauA} />
            <Slider label="Always-takers' extra baseline visits" value={selA} min={-3} max={4} step={0.25} onChange={setSelA} />
            <Slider label="Never-takers' extra baseline visits" value={selN} min={-3} max={4} step={0.25} onChange={setSelN} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="first stage" value={fmt(first)} sub="P(D=1|Z=1) − P(D=1|Z=0)" />
            <Stat label="ITT" value={fmt(itt)} color={C4} />
            <Stat label="CACE" value={fmt(wald)} color={C3} />
          </div>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 42: overlap ---------------- */
export function OverlapLab() {
  const [strength, setStrength] = useState(1.5);
  const [shift, setShift] = useState(0);
  const [trim, setTrim] = useState(0);
  const [seed, reseed] = useSeed();
  const data = useMemo(() => {
    const r = rng(seed * 3 + 42);
    return Array.from({ length: 3000 }, () => {
      const x = r.n();                                   // standardised age-and-comorbidity index
      const e = logistic(shift + strength * x);
      return { x, e, t: r.u() < e };
    });
  }, [strength, shift, seed]);
  const kept = data.filter((d) => d.e >= trim && d.e <= 1 - trim);
  const T = kept.filter((d) => d.t), C = kept.filter((d) => !d.t);
  const w = kept.map((d) => (d.t ? 1 / d.e : 1 / (1 - d.e)));
  const ess = (ws: number[]) => ws.reduce((s, v) => s + v, 0) ** 2 / ws.reduce((s, v) => s + v * v, 0);
  const essT = ess(kept.filter((d) => d.t).map((d) => 1 / d.e)), essC = ess(kept.filter((d) => !d.t).map((d) => 1 / (1 - d.e)));
  const bT = histogram(data.filter((d) => d.t).map((d) => d.e), 0, 1, 40), bC = histogram(data.filter((d) => !d.t).map((d) => d.e), 0, 1, 40);
  const cnt = Math.max(...bT.map((b) => b.count), ...bC.map((b) => b.count), 1);
  const W = 640, H = 300, mid = 150, L = 40, R = 16, sx = (v: number) => L + v * (W - L - R), sc = (c: number) => (c / cnt) * 128;
  return (
    <SimShell note="Who gets a new statin: treated patients (top) and untreated (bottom) by propensity score. Where one group is absent, no comparison exists and weights explode. Trimming to [α, 1 − α] buys stable weights but changes the population the estimate describes.">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          {trim > 0 && <>
            <rect x={sx(0)} y={10} width={sx(trim) - sx(0)} height={H - 40} fill="var(--surface-2)" />
            <rect x={sx(1 - trim)} y={10} width={sx(1) - sx(1 - trim)} height={H - 40} fill="var(--surface-2)" />
          </>}
          {bT.map((b, i) => <rect key={"t" + i} x={sx(b.x0)} y={mid - sc(b.count)} width={sx(b.x1) - sx(b.x0) - 1} height={sc(b.count)} fill={C1} opacity={0.8} />)}
          {bC.map((b, i) => <rect key={"c" + i} x={sx(b.x0)} y={mid} width={sx(b.x1) - sx(b.x0) - 1} height={sc(b.count)} fill={C2} opacity={0.8} />)}
          <line x1={L} x2={W - R} y1={mid} y2={mid} stroke="var(--text)" />
          {[0, 0.25, 0.5, 0.75, 1].map((v) => <text key={v} x={sx(v)} y={H - 12} textAnchor="middle">{v}</text>)}
          <text x={W - R} y={24} textAnchor="end" style={{ fill: C1, fontWeight: 700 }}>treated</text>
          <text x={W - R} y={H - 34} textAnchor="end" style={{ fill: C2, fontWeight: 700 }}>untreated</text>
        </svg>
        <div className="space-y-3">
          <Slider label="How strongly the index drives treatment" value={strength} min={0} max={4} step={0.1} onChange={setStrength} />
          <Slider label="Overall treatment rate (intercept)" value={shift} min={-2} max={2} step={0.1} onChange={setShift} />
          <Slider label="Trim α" value={trim} min={0} max={0.2} step={0.01} onChange={setTrim} format={(v) => v.toFixed(2)} />
          <button className="btn" onClick={reseed}>New patients</button>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="normalised difference in x" value={fmt(ndiff(T.map((d) => d.x), C.map((d) => d.x)))} sub="|·| > 0.25 is a warning" color={C4} />
            <Stat label="kept after trimming" value={`${(100 * kept.length / data.length).toFixed(1)}%`} />
            <Stat label="largest IPW weight" value={fmt(Math.max(...w), 1)} color={C2} />
            <Stat label="effective sample size" value={`${fmt(essT, 0)} + ${fmt(essC, 0)}`} sub={`of ${T.length} treated + ${C.length} untreated`} />
          </div>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 43: propensity-score stratification ---------------- */
export function PscoreLab() {
  const [K, setK] = useState(5);
  const [conf, setConf] = useState(1);
  const [seed, reseed] = useSeed();
  const res = useMemo(() => {
    const r = rng(seed * 7 + 43);
    const n = 2000;
    const d = Array.from({ length: n }, () => {
      const age = r.n(), inc = 0.4 * age + Math.sqrt(0.84) * r.n();     // standardised age and income
      const e = logistic(conf * (0.9 * age - 0.6 * inc));
      const t = r.u() < e;
      const y = 10 + 3 * age - 2 * inc + 2 * (t ? 1 : 0) + 2 * r.n();     // self-rated health index
      return { age, inc, e, t, y };
    });
    const eHat = logitFit(d.map((u) => [1, u.age, u.inc]), d.map((u) => u.t));
    d.forEach((u, i) => (u.e = eHat[i]));
    const sorted = [...d].sort((a, b) => a.e - b.e);
    const strata = Array.from({ length: K }, (_, k) => sorted.slice(Math.floor((k * n) / K), Math.floor(((k + 1) * n) / K)));
    const rows = strata.map((s) => {
      const T = s.filter((u) => u.t), C = s.filter((u) => !u.t);
      const ok = T.length > 1 && C.length > 1;
      return {
        ndA: ok ? ndiff(T.map((u) => u.age), C.map((u) => u.age)) : NaN,
        ndI: ok ? ndiff(T.map((u) => u.inc), C.map((u) => u.inc)) : NaN,
        est: ok ? avg(T.map((u) => u.y)) - avg(C.map((u) => u.y)) : NaN,
        w: s.length / n, nT: T.length, nC: C.length,
      };
    });
    const T = d.filter((u) => u.t), C = d.filter((u) => !u.t);
    const valid = rows.filter((x) => Number.isFinite(x.est));
    const strat = valid.reduce((s, x) => s + x.w * x.est, 0) / valid.reduce((s, x) => s + x.w, 0);
    return {
      rows, strat,
      naive: avg(T.map((u) => u.y)) - avg(C.map((u) => u.y)),
      rawA: ndiff(T.map((u) => u.age), C.map((u) => u.age)), rawI: ndiff(T.map((u) => u.inc), C.map((u) => u.inc)),
    };
  }, [K, conf, seed]);
  const maxNd = Math.max(0.3, Math.abs(res.rawA), Math.abs(res.rawI)) * 1.1;
  const groups = [{ label: "all", a: res.rawA, i: res.rawI }, ...res.rows.map((x, k) => ({ label: `S${k + 1}`, a: x.ndA, i: x.ndI }))];
  return (
    <SimShell note="A health programme targeted at older, lower-income adults. Balancing theorem: within groups of similar propensity score, treated and untreated have the same covariate distribution. Bars show normalised differences — huge overall, small within strata. True effect +2.">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Plot x={[-0.5, groups.length - 0.5]} y={[-maxNd, maxNd]} height={290} xTicks={[]} yLabel="normalised difference" yFormat={(v) => v.toFixed(2)}>
          {(sx, sy) => (
            <>
              {[0.1, -0.1].map((v) => <line key={v} x1={sx(-0.5)} x2={sx(groups.length - 0.5)} y1={sy(v)} y2={sy(v)} stroke={C3} strokeDasharray="3 3" />)}
              <line x1={sx(-0.5)} x2={sx(groups.length - 0.5)} y1={sy(0)} y2={sy(0)} stroke="var(--text)" />
              {groups.map((g, k) => {
                const bw = Math.min(26, (sx(1) - sx(0)) * 0.36);
                const bar = (v: number, off: number, c: string) => Number.isFinite(v) && <rect x={sx(k) + off} y={Math.min(sy(0), sy(v))} width={bw} height={Math.abs(sy(v) - sy(0))} fill={c} opacity={k ? 0.85 : 0.55} />;
                return (
                  <g key={g.label}>
                    {bar(g.a, -bw - 1, C1)}{bar(g.i, 1, C4)}
                    <text x={sx(k)} y={sy(-maxNd) + 16} textAnchor="middle" style={{ fill: "var(--text)", fontWeight: k ? 400 : 700 }}>{g.label}</text>
                  </g>
                );
              })}
            </>
          )}
        </Plot>
        <div className="space-y-3">
          <Slider label="Number of propensity-score strata" value={K} min={1} max={10} step={1} onChange={setK} />
          <Slider label="Strength of confounding" value={conf} min={0} max={2.5} step={0.1} onChange={setConf} />
          <button className="btn" onClick={reseed}>New sample</button>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="naive difference" value={fmt(res.naive)} color={C2} />
            <Stat label="stratified estimate" value={fmt(res.strat)} color={C3} />
            <Stat label="truth" value="2.00" />
          </div>
          <div className="text-xs muted">Strata are equal-size groups of the estimated (logit) propensity score. With K = 1 there is no adjustment; about five strata remove most of the bias (Cochran's 90% rule of thumb).</div>
        </div>
      </div>
      <Legend items={[{ color: C1, label: "age", area: true }, { color: C4, label: "income", area: true }, { color: C3, label: "±0.1 balance threshold", dash: true }]} />
    </SimShell>
  );
}

/* ---------------- Day 44: Horvitz–Thompson vs Hájek ---------------- */
export function IpwLab() {
  const [strength, setStrength] = useState(1.5);
  const [level, setLevel] = useState(20);
  const [cap, setCap] = useState(0.01);
  const [n, setN] = useState(300);
  const [seed, reseed] = useSeed();
  const res = useMemo(() => {
    const r = rng(seed * 9 + 44);
    const ht: number[] = [], hj: number[] = [], essL: number[] = [];
    for (let k = 0; k < 1200; k++) {
      let a1 = 0, a0 = 0, w1 = 0, w0 = 0, sw = 0, sw2 = 0;
      for (let i = 0; i < n; i++) {
        const x = r.n();
        const e = clip(logistic(strength * x), cap);
        const t = r.u() < logistic(strength * x);
        const y = level + 2 * x + (t ? 1 : 0) + r.n();          // monthly spending on medicines, $; effect +1
        if (t) { a1 += y / e; w1 += 1 / e; } else { a0 += y / (1 - e); w0 += 1 / (1 - e); }
        const w = t ? 1 / e : 1 / (1 - e); sw += w; sw2 += w * w;
      }
      ht.push(a1 / n - a0 / n);
      hj.push(a1 / w1 - a0 / w0);
      essL.push(sw * sw / sw2);
    }
    return { ht, hj, ess: avg(essL) };
  }, [strength, level, cap, n, seed]);
  const s = Math.max(sd(res.hj), 0.05);
  const lo = 1 - 6 * s, hi = 1 + 6 * s;
  const bh = histogram(res.ht, lo, hi, 45), bj = histogram(res.hj, lo, hi, 45);
  return (
    <SimShell note="Weighting by 1/e(x) recreates a randomised comparison. Horvitz–Thompson divides by n; Hájek divides by the sum of the weights, so adding a constant to every outcome cannot move it. Raise the outcome level and watch HT spread out while Hájek stays put. True effect +1.">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Plot x={[lo, hi]} y={[0, Math.max(...bj.map((b) => b.density), ...bh.map((b) => b.density)) * 1.12]} height={290} xLabel="estimated ATE, 1,200 samples" yTicks={[]}>
          {(sx, sy) => (
            <>
              <Bars bins={bh} sx={sx} sy={sy} color={C2} opacity={0.45} />
              <Bars bins={bj} sx={sx} sy={sy} color={C1} opacity={0.6} key0="j" />
              <line x1={sx(1)} x2={sx(1)} y1={sy(0)} y2={TOP} stroke="var(--text)" strokeDasharray="4 3" />
            </>
          )}
        </Plot>
        <div className="space-y-3">
          <Slider label="Confounding / weakness of overlap" value={strength} min={0} max={3} step={0.1} onChange={setStrength} />
          <Slider label="Outcome level (baseline spending, $)" value={level} min={0} max={100} step={5} onChange={setLevel} />
          <Slider label="Clip propensity scores to [c, 1−c]" value={cap} min={0.001} max={0.1} step={0.001} onChange={setCap} format={(v) => v.toFixed(3)} />
          <Slider label="Sample size" value={n} min={100} max={1000} step={50} onChange={setN} />
          <button className="btn" onClick={reseed}>Re-run</button>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Horvitz–Thompson" value={`sd ${fmt(sd(res.ht), 3)}`} sub={`bias ${fmt(avg(res.ht) - 1, 3)}`} color={C2} />
            <Stat label="Hájek" value={`sd ${fmt(sd(res.hj), 3)}`} sub={`bias ${fmt(avg(res.hj) - 1, 3)}`} color={C1} />
            <Stat label="effective sample size" value={fmt(res.ess, 0)} sub={`of n = ${n}`} />
            <Stat label="sd ratio HT ÷ Hájek" value={fmt(sd(res.ht) / sd(res.hj), 2)} />
          </div>
        </div>
      </div>
      <Legend items={[{ color: C2, label: "Horvitz–Thompson", area: true }, { color: C1, label: "Hájek (normalised weights)", area: true }]} />
    </SimShell>
  );
}

/* ---------------- Day 45: doubly robust AIPW ---------------- */
export function AipwLab() {
  const [om, setOm] = useState<"right" | "wrong">("wrong");
  const [pm, setPm] = useState<"right" | "wrong">("right");
  const [n, setN] = useState(500);
  const [seed, reseed] = useSeed();
  const res = useMemo(() => {
    const r = rng(seed * 21 + 45);
    const reg: number[] = [], ipw: number[] = [], dr: number[] = [];
    for (let k = 0; k < 250; k++) {
      const d = Array.from({ length: n }, () => {
        const x = r.n();                                         // standardised BMI
        const e = logistic(-0.3 + 0.3 * x + 0.4 * x * x);
        const t = r.u() < e;
        const y0 = 1 + x + x * x + r.n();                       // days of work lost per quarter
        return { x, t, y: t ? y0 + 2 + x : y0 };
      });
      const feats = (x: number) => (om === "right" ? [1, x, x * x] : [1, x]);
      const T = d.filter((u) => u.t), C = d.filter((u) => !u.t);
      const b1 = ols(T.map((u) => feats(u.x)), T.map((u) => u.y));
      const b0 = ols(C.map((u) => feats(u.x)), C.map((u) => u.y));
      const m = (b: number[], x: number) => feats(x).reduce((s, v, j) => s + v * b[j], 0);
      const eh = logitFit(d.map((u) => (pm === "right" ? [1, u.x, u.x * u.x] : [1, u.x])), d.map((u) => u.t)).map((e) => clip(e, 0.01));
      let sr = 0, s1 = 0, s0 = 0, w1 = 0, w0 = 0, sd_ = 0;
      d.forEach((u, i) => {
        const m1 = m(b1, u.x), m0 = m(b0, u.x), e = eh[i];
        sr += m1 - m0;
        if (u.t) { s1 += u.y / e; w1 += 1 / e; } else { s0 += u.y / (1 - e); w0 += 1 / (1 - e); }
        sd_ += m1 - m0 + (u.t ? (u.y - m1) / e : 0) - (u.t ? 0 : (u.y - m0) / (1 - e));
      });
      reg.push(sr / n); ipw.push(s1 / w1 - s0 / w0); dr.push(sd_ / n);
    }
    return { reg, ipw, dr };
  }, [om, pm, n, seed]);
  const rows = [
    { k: "reg", label: "Regression imputation", v: res.reg, c: C4, ok: om === "right" },
    { k: "ipw", label: "IPW (Hájek)", v: res.ipw, c: C2, ok: pm === "right" },
    { k: "dr", label: "AIPW (doubly robust)", v: res.dr, c: C3, ok: om === "right" || pm === "right" },
  ];
  const all = [...res.reg, ...res.ipw, ...res.dr];
  const lo = Math.min(0.5, ...all), hi = Math.max(3.5, ...all);
  const bins = rows.map((r) => histogram(r.v, lo, hi, 50));
  const ymax = Math.max(...bins.flat().map((b) => b.density)) * 1.1;
  return (
    <SimShell note="Workplace wellness programme; outcome: days of work lost. Both the outcome and the enrolment depend on BMI non-linearly, so a model with only a linear term is wrong. AIPW is consistent if either the outcome model or the propensity model is right; it fails only if both are wrong. True ATE = 2.">
      <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
        <span className="faint">Outcome model</span>
        <Seg value={om} onChange={setOm} options={[{ value: "right", label: "correct (x, x²)" }, { value: "wrong", label: "wrong (linear)" }]} />
        <span className="faint">Propensity model</span>
        <Seg value={pm} onChange={setPm} options={[{ value: "right", label: "correct (x, x²)" }, { value: "wrong", label: "wrong (linear)" }]} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Plot x={[lo, hi]} y={[0, ymax]} height={290} xLabel="estimated ATE, 250 samples" yTicks={[]}>
          {(sx, sy) => (
            <>
              {bins.map((b, i) => <Bars key={i} bins={b} sx={sx} sy={sy} color={rows[i].c} opacity={0.45} key0={rows[i].k} />)}
              <line x1={sx(2)} x2={sx(2)} y1={sy(0)} y2={TOP} stroke="var(--text)" strokeWidth={2} strokeDasharray="4 3" />
            </>
          )}
        </Plot>
        <div className="space-y-3">
          <Slider label="Sample size" value={n} min={200} max={1500} step={100} onChange={setN} />
          <button className="btn" onClick={reseed}>Re-run</button>
          <div className="grid gap-2">
            {rows.map((r) => (
              <Stat key={r.k} label={`${r.label}${r.ok ? " — should be consistent" : " — misspecified"}`}
                value={`bias ${fmt(avg(r.v) - 2, 3)}`} sub={`sd ${fmt(sd(r.v), 3)}`} color={r.c} />
            ))}
          </div>
        </div>
      </div>
      <Legend items={rows.map((r) => ({ color: r.c, label: r.label, area: true }))} />
    </SimShell>
  );
}
