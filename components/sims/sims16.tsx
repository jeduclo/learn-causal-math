"use client";
import { useMemo, useState } from "react";
import { Legend, Plot, Seg, SimShell, Slider, Stat, curve, fmt, rng, useSeed } from "./kit";
import { avg } from "./kit2";
import { localFit } from "./sims15";

const C1 = "var(--s1)", C2 = "var(--s2)", C3 = "var(--s3)", C4 = "var(--s4)";

function binned(x: number[], y: number[], lo: number, hi: number, w: number) {
  const out: { x: number; y: number }[] = [];
  for (let a = lo; a < hi - 1e-9; a += w) {
    const ys = y.filter((_, i) => x[i] >= a && x[i] < a + w);
    if (ys.length) out.push({ x: a + w / 2, y: avg(ys) });
  }
  return out;
}
const rdJump = (x: number[], y: number[], h: number, p = 1) => {
  const R = x.map((v, i) => [v, y[i]]).filter((d) => d[0] >= 0), L = x.map((v, i) => [v, y[i]]).filter((d) => d[0] < 0);
  const a = localFit(R.map((d) => d[0]), R.map((d) => d[1]), h, p), b = localFit(L.map((d) => -d[0]), L.map((d) => d[1]), h, p);
  return { jump: a.coef[0] - b.coef[0], a: a.coef, b: b.coef };
};

/* ---------------- Day 76: fuzzy RD ---------------- */
export function RdFuzzyLab() {
  const [pa, setPa] = useState(0.15), [pc, setPc] = useState(0.55), [tc, setTc] = useState(3), [ta, setTa] = useState(1);
  const [seed, reseed] = useSeed();
  const h = 0.3;
  const data = useMemo(() => {
    const r = rng(seed * 3 + 76);
    return Array.from({ length: 3000 }, () => {
      const x = 2 * r.u() - 1, u = r.u();
      const typ = u < pc ? "c" : u < pc + pa ? "a" : "n";
      const d = typ === "a" || (typ === "c" && x >= 0) ? 1 : 0;
      const y = 10 + 4 * x + (typ === "a" ? 2 : 0) + d * (typ === "a" ? ta : typ === "c" ? tc : 0) + 2 * r.n();
      return { x, d, y };
    });
  }, [pa, pc, tc, ta, seed]);
  const X = data.map((v) => v.x), D = data.map((v) => v.d), Y = data.map((v) => v.y);
  const fs = rdJump(X, D, h), rf = rdJump(X, Y, h);
  const bD = binned(X, D, -1, 1, 0.05), bY = binned(X, Y, -1, 1, 0.05);
  const near = data.filter((v) => Math.abs(v.x) < h);
  const naive = avg(near.filter((v) => v.d).map((v) => v.y)) - avg(near.filter((v) => !v.d).map((v) => v.y));
  const panel = (b: typeof bD, j: ReturnType<typeof rdJump>, yl: string, yr: [number, number]) => (
    <Plot x={[-1, 1]} y={yr} height={220} xLabel="running variable" yLabel={yl}>
      {(sx, sy) => (
        <>
          {b.map((p, i) => <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={4} fill={p.x >= 0 ? C1 : "var(--text-3)"} opacity={0.75} />)}
          <path d={curve((x) => j.b[0] - j.b[1] * x, -h, 0, sx, sy)} stroke={C2} strokeWidth={3} fill="none" />
          <path d={curve((x) => j.a[0] + j.a[1] * x, 0, h, sx, sy)} stroke={C2} strokeWidth={3} fill="none" />
          <line x1={sx(0)} x2={sx(0)} y1={sy(j.b[0])} y2={sy(j.a[0])} stroke={C3} strokeWidth={4} />
        </>
      )}
    </Plot>
  );
  return (
    <SimShell note="Crossing the cutoff makes treatment available to compliers; always-takers are treated on both sides, never-takers on neither. Left: take-up jumps by the complier share (first stage). Right: outcomes jump by compliers' share × their effect (reduced form). The ratio recovers the compliers' effect at the cutoff; comparing treated and untreated units near the cutoff does not.">
      <div className="grid gap-4 lg:grid-cols-2">
        <div><div className="mb-1 text-xs font-semibold faint">FIRST STAGE: P(treated | x)</div>{panel(bD, fs, "share treated", [0, 1])}</div>
        <div><div className="mb-1 text-xs font-semibold faint">REDUCED FORM: E[Y | x]</div>{panel(bY, rf, "outcome", [Math.min(...bY.map((p) => p.y)) - 1, Math.max(...bY.map((p) => p.y)) + 1])}</div>
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <div className="grid grid-cols-2 gap-3">
          <Slider label="Always-takers share" value={pa} min={0} max={0.5} step={0.05} onChange={setPa} format={(v) => v.toFixed(2)} />
          <Slider label="Compliers share" value={pc} min={0.05} max={1 - pa} step={0.05} onChange={setPc} format={(v) => v.toFixed(2)} />
          <Slider label="Effect for compliers" value={tc} min={-3} max={8} step={0.25} onChange={setTc} />
          <Slider label="Effect for always-takers" value={ta} min={-3} max={8} step={0.25} onChange={setTa} />
          <button className="btn" onClick={reseed}>New sample</button>
        </div>
        <div className="grid grid-cols-2 content-start gap-2">
          <Stat label="first-stage jump" value={fmt(fs.jump, 3)} color={C1} />
          <Stat label="reduced-form jump" value={fmt(rf.jump, 3)} />
          <Stat label="fuzzy RD = ratio" value={fmt(rf.jump / fs.jump, 2)} color={C3} sub={`truth ${fmt(tc, 2)}`} />
          <Stat label="treated vs untreated near cutoff" value={fmt(naive, 2)} color={C2} />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 77: RD validity ---------------- */
export function RdValidityLab() {
  const [m, setM] = useState(0.6), [donut, setDonut] = useState(0), [seed, reseed] = useSeed();
  const data = useMemo(() => {
    const r = rng(seed * 5 + 77);
    return Array.from({ length: 12000 }, () => {
      let x = 2 * r.u() - 1;
      const w = r.n();                                     // pre-determined covariate (parental education index)
      const y0 = 10 + 4 * x + 1.2 * w + 1.5 * r.n();
      if (x < 0 && x > -0.05 && w > 0 && r.u() < m) x = 0.05 * r.u();
      return { x, w, y: y0 + 3 * (x >= 0 ? 1 : 0) };
    });
  }, [m, seed]);
  const keep = data.filter((d) => Math.abs(d.x) >= donut);
  const est = rdJump(keep.map((d) => d.x), keep.map((d) => d.y), 0.3).jump;
  const cov = rdJump(keep.map((d) => d.x), keep.map((d) => d.w), 0.3).jump;
  const bw = 0.025;
  const counts = Array.from({ length: 80 }, (_, i) => data.filter((d) => d.x >= -1 + i * bw && d.x < -1 + (i + 1) * bw).length);
  const nl = data.filter((d) => d.x >= -0.05 && d.x < 0).length, nr = data.filter((d) => d.x >= 0 && d.x < 0.05).length;
  const z = Math.log(nr / nl) / Math.sqrt(1 / nl + 1 / nr);
  const cmax = Math.max(...counts) * 1.1;
  return (
    <SimShell note="Students just below a pass mark whose families are better resourced (positive covariate) get their scores pushed just above it. The histogram shows the bunching; the density z-statistic compares the two bins next to the cutoff; the covariate jumps; and the RD estimate (true effect 3) is biased upward. A donut that drops observations near the cutoff removes most of the bias.">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <svg viewBox="0 0 600 240" className="w-full">
          {counts.map((c, i) => {
            const x0 = -1 + i * bw;
            const inDonut = Math.abs(x0 + bw / 2) < donut;
            return <rect key={i} x={20 + i * 7.1} y={210 - (c / cmax) * 190} width={6.3} height={(c / cmax) * 190} fill={inDonut ? "var(--surface-2)" : x0 >= 0 ? C1 : "var(--text-3)"} opacity={0.85} />;
          })}
          <line x1={20 + 40 * 7.1} x2={20 + 40 * 7.1} y1={10} y2={215} stroke={C2} strokeWidth={2} strokeDasharray="4 3" />
          <text x={20 + 40 * 7.1 + 6} y={24} style={{ fill: C2, fontWeight: 700 }}>cutoff</text>
          <text x={300} y={234} textAnchor="middle">running variable (score − pass mark)</text>
        </svg>
        <div className="space-y-3">
          <Slider label="Share of eligible students manipulated" value={m} min={0} max={1} step={0.05} onChange={setM} format={(v) => v.toFixed(2)} />
          <Slider label="Donut half-width" value={donut} min={0} max={0.1} step={0.01} onChange={setDonut} format={(v) => v.toFixed(2)} />
          <button className="btn" onClick={reseed}>New sample</button>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="density test z" value={fmt(z, 1)} color={Math.abs(z) > 1.96 ? C2 : C3} sub={`${nl} vs ${nr} in adjacent bins`} />
            <Stat label="covariate jump" value={fmt(cov, 3)} color={Math.abs(cov) > 0.1 ? C2 : C3} />
            <Stat label="RD estimate" value={fmt(est, 2)} color={C1} sub="truth 3.00" />
            <Stat label="observations used" value={keep.filter((d) => Math.abs(d.x) <= 0.3).length.toLocaleString()} />
          </div>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 78: regression kink ---------------- */
export function RkdLab() {
  const [beta, setBeta] = useState(0.8), [curv, setCurv] = useState(1), [h, setH] = useState(0.5), [p, setP] = useState(2), [n, setN] = useState(20000);
  const [seed, reseed] = useSeed();
  const B = (x: number) => 0.5 * Math.min(x, 0) + 2;
  const res = useMemo(() => {
    const r = rng(seed * 7 + 78);
    const x: number[] = [], y: number[] = [];
    for (let i = 0; i < n; i++) { const v = 2 * r.u() - 1; x.push(v); y.push(beta * B(v) + curv * Math.sin(1.5 * v) + 0.3 * v * v + 0.3 * r.n()); }
    const j = rdJump(x, y, h, p);
    const kink = j.a[1] - (-j.b[1]);            // right slope minus left slope
    return { x, y, j, est: kink / (0 - 0.5), bins: binned(x, y, -1, 1, 0.05) };
  }, [beta, curv, h, p, n, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const ys = res.bins.map((b) => b.y);
  return (
    <SimShell note="Unemployment benefits replace 50% of past earnings up to a cap (the kink at 0, left panel). The outcome's slope changes at the kink by β × (−0.5); dividing the slope change by the schedule's slope change estimates β. Slopes are estimated with local polynomials on each side; curvature in the outcome biases local linear slopes, and local quadratic fits are much noisier.">
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.4fr]">
        <Plot x={[-1, 1]} y={[1.4, 2.2]} height={260} xLabel="earnings (centred at the cap)" yLabel="benefit">
          {(sx, sy) => <path d={curve(B, -1, 1, sx, sy)} stroke={C4} strokeWidth={3} fill="none" />}
        </Plot>
        <Plot x={[-1, 1]} y={[Math.min(...ys) - 0.2, Math.max(...ys) + 0.2]} height={260} xLabel="earnings (centred at the cap)" yLabel="outcome (binned means)">
          {(sx, sy) => (
            <>
              {res.bins.map((b, i) => <circle key={i} cx={sx(b.x)} cy={sy(b.y)} r={4} fill={b.x >= 0 ? C1 : "var(--text-3)"} />)}
              <path d={curve((x) => res.j.b.reduce((s, c, k) => s + c * (-x) ** k, 0), -h, 0, sx, sy)} stroke={C2} strokeWidth={3} fill="none" />
              <path d={curve((x) => res.j.a.reduce((s, c, k) => s + c * x ** k, 0), 0, h, sx, sy)} stroke={C2} strokeWidth={3} fill="none" />
            </>
          )}
        </Plot>
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-[1.3fr_1fr]">
        <div className="grid grid-cols-2 gap-3">
          <Slider label="True effect of benefits β" value={beta} min={-1} max={2} step={0.1} onChange={setBeta} />
          <Slider label="Curvature of the outcome" value={curv} min={0} max={2} step={0.1} onChange={setCurv} />
          <Slider label="Bandwidth" value={h} min={0.1} max={1} step={0.05} onChange={setH} />
          <Slider label="Sample size" value={n} min={2000} max={60000} step={2000} onChange={setN} />
          <Seg value={String(p) as "1" | "2"} onChange={(v) => setP(+v)} options={[{ value: "1", label: "Local linear" }, { value: "2", label: "Local quadratic" }]} />
          <button className="btn" onClick={reseed}>New sample</button>
        </div>
        <div className="grid grid-cols-2 content-start gap-2">
          <Stat label="outcome slope change" value={fmt(res.j.a[1] + res.j.b[1], 3)} />
          <Stat label="RKD estimate of β" value={fmt(res.est, 2)} color={C3} sub={`truth ${fmt(beta, 2)}`} />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 79: bounds ---------------- */
export function BoundsLab() {
  const [p, setP] = useState(0.4), [m1, setM1] = useState(0.7), [m0, setM0] = useState(0.5);
  const [mtr, setMtr] = useState(false), [mts, setMts] = useState(false);
  const [q1, setQ1] = useState(0.9), [q0, setQ0] = useState(0.8), [W, setW] = useState(900), [cm, setCm] = useState(380);
  let lo = m1 * p - (m0 * (1 - p) + p), hi = m1 * p + (1 - p) - m0 * (1 - p);
  if (mtr) lo = Math.max(lo, 0);
  if (mts) hi = Math.min(hi, m1 - m0);
  const naive = m1 - m0;
  const sx = (v: number) => 30 + ((v + 1) / 2) * 520;
  const trim = Math.max(0, (q1 - q0) / q1);
  const leeLo = (W * (1 - trim)) / 2 - cm, leeHi = (W * (1 + trim)) / 2 - cm;
  return (
    <SimShell note="Left: worst-case bounds on the average effect of a programme on a binary outcome use only the data and the outcome's range [0, 1]; their width is always 1. Monotone treatment response (no one is harmed) raises the lower bound to 0; monotone treatment selection (participants would do better anyway) caps the upper bound at the naive difference. Right: Lee bounds when wages are seen only for the employed and treatment raises employment.">
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <svg viewBox="0 0 580 150" className="w-full">
            <line x1={30} x2={550} y1={75} y2={75} stroke="var(--border)" strokeWidth={2} />
            {[-1, -0.5, 0, 0.5, 1].map((t) => <g key={t}><line x1={sx(t)} x2={sx(t)} y1={69} y2={81} stroke="var(--text-3)" /><text x={sx(t)} y={100} textAnchor="middle">{t}</text></g>)}
            {hi >= lo ? <rect x={sx(lo)} y={58} width={Math.max(3, sx(hi) - sx(lo))} height={34} rx={6} fill={C3} opacity={0.55} /> : <text x={290} y={50} textAnchor="middle" style={{ fill: C2 }}>assumptions contradict the data</text>}
            <circle cx={sx(naive)} cy={75} r={7} fill={C2} />
            <text x={sx(naive)} y={48} textAnchor="middle" style={{ fill: C2, fontWeight: 700 }}>naive {fmt(naive, 2)}</text>
            <text x={290} y={130} textAnchor="middle" style={{ fill: "var(--text)", fontWeight: 700 }}>ATE ∈ [{fmt(lo, 3)}, {fmt(hi, 3)}]</text>
          </svg>
          <div className="mb-2 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={mtr} onChange={(e) => setMtr(e.target.checked)} /> Monotone treatment response</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={mts} onChange={(e) => setMts(e.target.checked)} /> Monotone treatment selection</label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Slider label="Share treated" value={p} min={0.05} max={0.95} step={0.05} onChange={setP} format={(v) => v.toFixed(2)} />
            <Slider label="P(Y=1 | treated)" value={m1} min={0} max={1} step={0.05} onChange={setM1} format={(v) => v.toFixed(2)} />
            <Slider label="P(Y=1 | untreated)" value={m0} min={0} max={1} step={0.05} onChange={setM0} format={(v) => v.toFixed(2)} />
          </div>
        </div>
        <div>
          <svg viewBox="0 0 580 150" className="w-full">
            <rect x={40} y={40} width={500} height={50} fill={C1} opacity={0.35} />
            <rect x={40} y={40} width={500 * trim} height={50} fill={C2} opacity={0.55} />
            <rect x={540 - 500 * trim} y={40} width={500 * trim} height={50} fill={C4} opacity={0.55} />
            <text x={40} y={110}>$0</text><text x={540} y={110} textAnchor="end">${W}</text>
            <text x={290} y={30} textAnchor="middle">treated workers' wages (uniform); trim {(100 * trim).toFixed(1)}% from one end</text>
            <text x={290} y={135} textAnchor="middle" style={{ fill: "var(--text)", fontWeight: 700 }}>effect for always-employed ∈ [{fmt(leeLo, 0)}, {fmt(leeHi, 0)}]</text>
          </svg>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="Employment rate, treated" value={q1} min={0.3} max={1} step={0.01} onChange={setQ1} format={(v) => v.toFixed(2)} />
            <Slider label="Employment rate, control" value={q0} min={0.3} max={q1} step={0.01} onChange={setQ0} format={(v) => v.toFixed(2)} />
            <Slider label="Top of treated wage range ($)" value={W} min={300} max={1500} step={50} onChange={setW} />
            <Slider label="Control mean wage ($)" value={cm} min={100} max={1000} step={10} onChange={setCm} />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Stat label="naive difference" value={fmt(W / 2 - cm, 0)} color={C2} />
            <Stat label="Lee bounds width" value={fmt(leeHi - leeLo, 0)} sub="= trim share × wage range" />
          </div>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 80: choosing a design ---------------- */
type Q = { key: string; text: string };
const QS: Q[] = [
  { key: "rand", text: "Can you (or did someone) randomly assign the treatment?" },
  { key: "nudge", text: "Is there a lottery, rule or shock that changes take-up but affects outcomes only through treatment?" },
  { key: "thresh", text: "Is treatment (or its intensity) assigned by a known cutoff on a score, age, date or distance?" },
  { key: "slope", text: "Does the rule change the slope of a schedule (a cap or kink) rather than switching treatment on?" },
  { key: "full", text: "Does crossing the cutoff switch treatment on for (almost) everyone?" },
  { key: "panel", text: "Do you observe treated and untreated groups both before and after treatment starts?" },
  { key: "stagger", text: "Do different groups start treatment at different times?" },
  { key: "obs", text: "Do you observe all the variables that drive both treatment and the outcome?" },
];
type Rec = { design: string; estimand: string; assume: string; diag: string; days: string };
function recommend(a: Record<string, boolean>): { rec: Rec; path: string[] } {
  if (a.rand) return { path: ["rand"], rec: { design: "Randomised experiment", estimand: "ATE (or ITT, and LATE with non-compliance)", assume: "Randomisation; no differential attrition; SUTVA", diag: "Balance table, attrition by arm, compliance, Fisher or Neyman inference", days: "31–41" } };
  if (a.nudge) return { path: ["rand", "nudge"], rec: { design: "Instrumental variables", estimand: "LATE for compliers", assume: "Independence, exclusion, relevance, monotonicity", diag: "First-stage F, reduced form, Anderson–Rubin intervals, complier profile, over-identification if possible", days: "61–66" } };
  if (a.thresh) {
    if (a.slope) return { path: ["rand", "nudge", "thresh", "slope"], rec: { design: "Regression kink design", estimand: "Marginal effect of the policy variable at the kink", assume: "Smooth density and outcome slopes apart from the policy", diag: "Density derivative, covariate slope changes, placebo kinks, large samples", days: "78" } };
    if (a.full) return { path: ["rand", "nudge", "thresh", "slope", "full"], rec: { design: "Sharp regression discontinuity", estimand: "Average effect at the cutoff", assume: "Continuity of potential outcomes at the cutoff (no precise sorting, nothing else changes there)", diag: "Density test, covariate balance, placebo cutoffs, donut, bandwidth sensitivity with RBC intervals", days: "73–75, 77" } };
    return { path: ["rand", "nudge", "thresh", "slope", "full"], rec: { design: "Fuzzy regression discontinuity", estimand: "LATE for compliers at the cutoff", assume: "Continuity, monotonicity, exclusion of the cutoff", diag: "First-stage jump (strength), all sharp-RD checks, weak-IV robust intervals", days: "76–77" } };
  }
  if (a.panel) {
    if (a.stagger) return { path: ["rand", "nudge", "thresh", "panel", "stagger"], rec: { design: "Staggered DiD with heterogeneity-robust estimators", estimand: "Group-time ATTs aggregated to event-study and overall ATT", assume: "Parallel trends (never- or not-yet-treated), no anticipation", diag: "Event-study pre-trends, Bacon decomposition of TWFE, sensitivity to bounded violations", days: "68–71" } };
    return { path: ["rand", "nudge", "thresh", "panel", "stagger"], rec: { design: "Difference-in-differences / event study", estimand: "ATT for the treated group", assume: "Parallel trends, no anticipation, stable composition", diag: "Pre-trends, placebo outcomes and groups, DDD if a within-group control exists, clustered inference", days: "67–69, 72" } };
  }
  if (a.obs) return { path: ["rand", "nudge", "thresh", "panel", "obs"], rec: { design: "Selection on observables (regression, matching, IPW, AIPW)", estimand: "ATE or ATT", assume: "Unconfoundedness given covariates; overlap", diag: "DAG-based covariate choice, balance and overlap checks, sensitivity analysis", days: "42–45, 52–53, 81–95" } };
  return { path: ["rand", "nudge", "thresh", "panel", "obs"], rec: { design: "Partial identification", estimand: "Identified set (bounds) for the ATE", assume: "Only what you state: bounded outcomes, monotonicity", diag: "Worst-case bounds, then MTR/MTS or Lee bounds; sensitivity analysis", days: "79, 95" } };
}

export function DesignChooser() {
  const [a, setA] = useState<Record<string, boolean>>({ rand: false, nudge: false, thresh: true, slope: false, full: false, panel: false, stagger: false, obs: false });
  const { rec, path } = recommend(a);
  return (
    <SimShell note="Answer the questions about your setting. The tool follows the decision path (highlighted questions are the ones that mattered) and recommends a design, the effect it estimates, its key assumptions and the diagnostics that make it credible, with the days where each is covered.">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-2">
          {QS.map((q) => (
            <div key={q.key} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
              style={{ background: path.includes(q.key) ? "color-mix(in oklab, var(--s1) 14%, var(--surface))" : "var(--surface-2)", opacity: path.includes(q.key) ? 1 : 0.6 }}>
              <span className="text-sm">{q.text}</span>
              <div className="shrink-0"><Seg value={a[q.key] ? "y" : "n"} onChange={(v) => setA({ ...a, [q.key]: v === "y" })} options={[{ value: "y", label: "Yes" }, { value: "n", label: "No" }]} /></div>
            </div>
          ))}
        </div>
        <div className="space-y-3 rounded-xl p-4" style={{ background: "var(--surface-2)", borderLeft: `5px solid ${C1}` }}>
          <div className="text-xs font-semibold faint">RECOMMENDED DESIGN</div>
          <div className="serif text-2xl font-bold">{rec.design}</div>
          <div><div className="text-xs font-semibold faint">ESTIMAND</div><div className="text-sm">{rec.estimand}</div></div>
          <div><div className="text-xs font-semibold faint">KEY ASSUMPTIONS</div><div className="text-sm">{rec.assume}</div></div>
          <div><div className="text-xs font-semibold faint">DIAGNOSTICS</div><div className="text-sm">{rec.diag}</div></div>
          <div className="text-sm" style={{ color: C3 }}>Covered on days {rec.days}</div>
        </div>
      </div>
      <Legend items={[{ color: C1, label: "questions on the decision path", area: true }]} />
    </SimShell>
  );
}

