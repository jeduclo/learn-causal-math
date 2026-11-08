"use client";
import { useMemo, useState } from "react";
import { Seg, SimShell, Slider, Stat, fmt } from "./kit";
import { DagView, Edge, GNode, allPaths, blockingNode, cut, descendants, dsep, pathText, popRegression, semCov, totalEffects } from "./kit3";

const C1 = "var(--s1)", C2 = "var(--s2)", C3 = "var(--s3)", C4 = "var(--s4)";
const soft = (c: string, p = 22) => `color-mix(in oklab, ${c} ${p}%, var(--surface))`;
const clamp01 = (v: number) => Math.min(0.999, Math.max(0.001, v));

/** Horizontal bars for a few named values against a reference line. */
function HBars({ rows, truth, truthLabel, lo, hi, digits = 3 }: { rows: { label: string; v: number; c: string; ci?: number }[]; truth?: number; truthLabel?: string; lo?: number; hi?: number; digits?: number }) {
  const vals = rows.flatMap((r) => [r.v - (r.ci ?? 0), r.v + (r.ci ?? 0)]).concat(truth ?? 0, 0);
  const L = lo ?? Math.min(...vals), H = hi ?? Math.max(...vals);
  const pad = (H - L) * 0.12 || 0.1;
  const a = L - pad, b = H + pad;
  const W = 600, left = 200, right = 24, sx = (v: number) => left + ((v - a) / (b - a)) * (W - left - right);
  const height = rows.length * 42 + 34;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full">
      <line x1={sx(0)} x2={sx(0)} y1={6} y2={height - 22} stroke="var(--border)" />
      {rows.map((r, i) => {
        const y = 12 + i * 42;
        return (
          <g key={r.label}>
            <text x={left - 8} y={y + 18} textAnchor="end" style={{ fill: "var(--text)" }}>{r.label}</text>
            <rect x={Math.min(sx(0), sx(r.v))} y={y + 3} width={Math.abs(sx(r.v) - sx(0))} height={24} rx={4} fill={r.c} opacity={0.82} />
            {r.ci !== undefined && <line x1={sx(r.v - r.ci)} x2={sx(r.v + r.ci)} y1={y + 15} y2={y + 15} stroke="var(--text)" strokeWidth={2} />}
            <text x={sx(r.v) + (r.v >= 0 ? 6 : -6) + (r.ci ? (r.v >= 0 ? sx(r.v + r.ci) - sx(r.v) : -(sx(r.v) - sx(r.v - r.ci))) : 0)} y={y + 19}
              textAnchor={r.v >= 0 ? "start" : "end"} style={{ fill: "var(--text)", fontWeight: 700 }}>{fmt(r.v, digits)}</text>
          </g>
        );
      })}
      {truth !== undefined && (
        <>
          <line x1={sx(truth)} x2={sx(truth)} y1={6} y2={height - 22} stroke="var(--text)" strokeWidth={2} strokeDasharray="5 4" />
          <text x={sx(truth)} y={height - 6} textAnchor="middle" style={{ fill: "var(--text)", fontWeight: 600 }}>{truthLabel} {fmt(truth, digits)}</text>
        </>
      )}
    </svg>
  );
}

/* ---------------- Day 51: seeing vs doing (ICU) ---------------- */
export function DoOperatorLab() {
  const [pS, setPS] = useState(0.2);
  const [iS, setIS] = useState(0.9), [iM, setIM] = useState(0.1);
  const [dM0, setDM0] = useState(0.02), [dM1, setDM1] = useState(0.01), [dS0, setDS0] = useState(0.4), [dS1, setDS1] = useState(0.25);
  const [view, setView] = useState<"see" | "do">("see");
  const w = [1 - pS, pS], pICU = [iM, iS], d = [[dM0, dM1], [dS0, dS1]];
  const see = (t: number) => {
    const num = [0, 1].reduce((s, k) => s + w[k] * (t ? pICU[k] : 1 - pICU[k]) * d[k][t], 0);
    const den = [0, 1].reduce((s, k) => s + w[k] * (t ? pICU[k] : 1 - pICU[k]), 0);
    return num / den;
  };
  const doo = (t: number) => w[0] * d[0][t] + w[1] * d[1][t];
  const edges: Edge[] = view === "see" ? [["S", "I"], ["S", "D"], ["I", "D"]] : [["S", "D"], ["I", "D"]];
  return (
    <SimShell note="Severity drives both ICU admission and death. Seeing compares patients who happened to be admitted with those who were not; doing sets admission for everyone, cutting the arrow from severity into ICU (the mutilated graph) and averaging over the population's severity mix.">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-2">
          <Seg value={view} onChange={setView} options={[{ value: "see", label: "Observational graph" }, { value: "do", label: "After do(ICU)" }]} />
          <DagView nodes={[{ id: "S", label: "Severity", x: 210, y: 40 }, { id: "I", label: "ICU", x: 80, y: 140 }, { id: "D", label: "Death", x: 340, y: 140 }]}
            edges={edges} width={420} height={180} nodeStyle={(v) => (v === "I" && view === "do" ? { fill: soft(C2, 35), stroke: C2 } : undefined)} />
          <HBars digits={3} rows={[
            { label: "seeing: P(death | ICU)", v: see(1), c: C2 },
            { label: "seeing: P(death | no ICU)", v: see(0), c: "var(--text-3)" },
            { label: "doing: P(death | do(ICU))", v: doo(1), c: C3 },
            { label: "doing: P(death | do(no ICU))", v: doo(0), c: C1 },
          ]} />
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Slider label="Share severe" value={pS} min={0.05} max={0.6} step={0.01} onChange={setPS} format={(v) => v.toFixed(2)} />
            <div />
            <Slider label="P(ICU | severe)" value={iS} min={0.05} max={0.95} step={0.01} onChange={setIS} format={(v) => v.toFixed(2)} />
            <Slider label="P(ICU | mild)" value={iM} min={0.05} max={0.95} step={0.01} onChange={setIM} format={(v) => v.toFixed(2)} />
            <Slider label="death: mild, no ICU" value={dM0} min={0} max={0.2} step={0.005} onChange={setDM0} format={(v) => v.toFixed(3)} />
            <Slider label="death: mild, ICU" value={dM1} min={0} max={0.2} step={0.005} onChange={setDM1} format={(v) => v.toFixed(3)} />
            <Slider label="death: severe, no ICU" value={dS0} min={0} max={0.8} step={0.01} onChange={setDS0} format={(v) => v.toFixed(2)} />
            <Slider label="death: severe, ICU" value={dS1} min={0} max={0.8} step={0.01} onChange={setDS1} format={(v) => v.toFixed(2)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="observed difference" value={fmt(see(1) - see(0), 3)} color={C2} sub="P(D|ICU) − P(D|no ICU)" />
            <Stat label="causal effect" value={fmt(doo(1) - doo(0), 3)} color={C3} sub="do(ICU) − do(no ICU)" />
          </div>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 52: back-door adjustment (linear, exact) ---------------- */
const BD_NODES: GNode[] = [
  { id: "Z1", x: 90, y: 50 }, { id: "Z2", x: 450, y: 50 }, { id: "Z3", x: 270, y: 120 },
  { id: "X", x: 90, y: 230 }, { id: "W", x: 270, y: 260 }, { id: "Y", x: 450, y: 230 },
];
const BD_EDGES: Edge[] = [["Z1", "Z3"], ["Z2", "Z3"], ["Z1", "X"], ["Z2", "Y"], ["Z3", "X"], ["Z3", "Y"], ["X", "W"], ["W", "Y"]];
const BD_ORDER = ["Z1", "Z2", "Z3", "X", "W", "Y"];

export function BackdoorLab() {
  const [Z, setZ] = useState<string[]>(["Z3"]);
  const [k, setK] = useState(1);
  const [eff, setEff] = useState(0.5);
  const idx = (v: string) => BD_ORDER.indexOf(v);
  const S = useMemo(() => {
    const B = BD_ORDER.map(() => BD_ORDER.map(() => 0));
    const set = (a: string, b: string, v: number) => (B[idx(b)][idx(a)] = v);
    set("Z1", "Z3", 0.8 * k); set("Z2", "Z3", 0.8 * k); set("Z1", "X", 0.8 * k); set("Z2", "Y", 0.8 * k);
    set("Z3", "X", 0.6); set("Z3", "Y", 0.6); set("X", "W", 1); set("W", "Y", eff);
    return semCov(B, BD_ORDER.map(() => 1));
  }, [k, eff]);
  const est = popRegression(S, idx("Y"), [idx("X"), ...Z.map(idx)]).coef[0];
  const Zs = new Set(Z);
  const noDesc = !Z.some((v) => descendants(BD_EDGES, "X").has(v) && v !== "X");
  const bdEdges = cut(BD_EDGES, [], ["X"]);
  const ok = noDesc && dsep(bdEdges, "X", "Y", Zs);
  const backPaths = allPaths(BD_EDGES, "X", "Y").filter((p) => p.edges[0][1] === "X");
  const toggle = (v: string) => { if (v === "X" || v === "Y") return; setZ((z) => (z.includes(v) ? z.filter((u) => u !== v) : [...z, v])); };
  const openE = new Set<number>();
  backPaths.forEach((p) => { if (blockingNode(BD_EDGES, p, Zs) < 0) p.edges.forEach((e) => openE.add(BD_EDGES.indexOf(e))); });
  return (
    <SimShell note="A linear model with unit-variance disturbances. Click nodes to choose the adjustment set; the regression coefficient on X is computed exactly from the implied covariance matrix (no sampling noise). Z3 is both a confounder and a collider; W is a mediator. Open back-door paths are drawn in orange.">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <DagView nodes={BD_NODES} edges={BD_EDGES} width={540} height={300} onNode={toggle}
          nodeStyle={(v) => (v === "X" ? { fill: soft(C1, 35), stroke: C1 } : v === "Y" ? { fill: soft(C3, 35), stroke: C3 } : Zs.has(v) ? { fill: "var(--text-3)", text: "var(--surface)" } : undefined)}
          edgeStyle={(_e, i) => (openE.has(i) ? { color: C2, width: 3.2 } : undefined)} />
        <div className="space-y-3 text-sm">
          <div className="rounded-lg px-3 py-2" style={{ background: ok ? soft(C3, 20) : soft(C2, 20) }}>
            Adjustment set {Z.length ? `{${Z.join(", ")}}` : "∅"}: <b>{ok ? "satisfies" : "fails"}</b> the back-door criterion
            {!noDesc ? " (contains a descendant of X)" : ""}.
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="coefficient on X" value={fmt(est, 3)} color={ok ? C3 : C2} />
            <Stat label="true causal effect" value={fmt(eff, 3)} sub="X → W → Y" />
          </div>
          <div className="space-y-1">
            {backPaths.map((p, i) => {
              const b = blockingNode(BD_EDGES, p, Zs);
              return <div key={i} className="font-mono text-xs" style={{ color: b < 0 ? C2 : "var(--text-3)" }}>{pathText(p)} — {b < 0 ? "open" : `blocked at ${p.nodes[b]}`}</div>;
            })}
          </div>
          <Slider label="Strength of Z1 and Z2 paths" value={k} min={0} max={1.5} step={0.05} onChange={setK} format={(v) => v.toFixed(2)} />
          <Slider label="Effect of W on Y (sets the true effect)" value={eff} min={-1} max={1.5} step={0.05} onChange={setEff} format={(v) => v.toFixed(2)} />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 53: good and bad controls ---------------- */
type Scen = { key: string; label: string; order: string[]; edges: [string, string, number][]; nodes: GNode[]; latent?: string[]; omega?: Record<string, number>; verdict: string };
const P = (id: string, x: number, y: number, label?: string): GNode => ({ id, x, y, label });
const SCENARIOS: Scen[] = [
  { key: "conf", label: "Confounder", order: ["Z", "X", "Y"], edges: [["Z", "X", 0.8], ["Z", "Y", 0.8], ["X", "Y", 1]], nodes: [P("Z", 210, 40), P("X", 80, 140), P("Y", 340, 140)], verdict: "Good control: blocks X ← Z → Y." },
  { key: "pred", label: "Outcome predictor", order: ["Z", "X", "Y"], edges: [["Z", "Y", 1.5], ["X", "Y", 1]], nodes: [P("Z", 340, 40), P("X", 80, 140), P("Y", 340, 140)], verdict: "Neutral for bias, improves precision." },
  { key: "inst", label: "Instrument", order: ["Z", "X", "Y"], edges: [["Z", "X", 1.2], ["X", "Y", 1]], nodes: [P("Z", 80, 40), P("X", 80, 140), P("Y", 340, 140)], verdict: "Neutral for bias, hurts precision." },
  { key: "amp", label: "Instrument + hidden confounder", order: ["Z", "U", "X", "Y"], latent: ["U"], edges: [["Z", "X", 1.2], ["U", "X", 0.8], ["U", "Y", 0.8], ["X", "Y", 1]], nodes: [P("Z", 80, 40), P("U", 270, 40), P("X", 80, 140), P("Y", 340, 140)], verdict: "Bad: amplifies the bias from U." },
  { key: "med", label: "Mediator", order: ["X", "Z", "Y"], edges: [["X", "Z", 1], ["Z", "Y", 0.6], ["X", "Y", 0.4]], nodes: [P("X", 80, 140), P("Z", 210, 40), P("Y", 340, 140)], verdict: "Bad for the total effect: blocks X → Z → Y." },
  { key: "coll", label: "Collider", order: ["X", "Y", "Z"], edges: [["X", "Z", 0.8], ["Y", "Z", 0.8], ["X", "Y", 1]], nodes: [P("X", 80, 140), P("Z", 210, 40), P("Y", 340, 140)], verdict: "Bad: opens X → Z ← Y." },
  { key: "m", label: "M-bias (pre-treatment collider)", order: ["U1", "U2", "Z", "X", "Y"], latent: ["U1", "U2"], edges: [["U1", "X", 0.8], ["U1", "Z", 0.8], ["U2", "Z", 0.8], ["U2", "Y", 0.8], ["X", "Y", 1]], nodes: [P("U1", 80, 30), P("U2", 340, 30), P("Z", 210, 80), P("X", 80, 150), P("Y", 340, 150)], verdict: "Bad: opens X ← U1 → Z ← U2 → Y." },
  { key: "desc", label: "Descendant of the outcome", order: ["X", "Y", "Z"], omega: { Z: 0.5 }, edges: [["X", "Y", 1], ["Y", "Z", 1]], nodes: [P("X", 80, 140), P("Y", 270, 140), P("Z", 380, 60)], verdict: "Bad: partly conditions on Y itself." },
];

export function BadControlsLab() {
  const [key, setKey] = useState("amp");
  const [n, setN] = useState(500);
  const sc = SCENARIOS.find((s) => s.key === key)!;
  const res = useMemo(() => {
    const ix = (v: string) => sc.order.indexOf(v);
    const B = sc.order.map(() => sc.order.map(() => 0));
    sc.edges.forEach(([a, b, v]) => (B[ix(b)][ix(a)] = v));
    const S = semCov(B, sc.order.map((v) => sc.omega?.[v] ?? 1));
    const T = totalEffects(B);
    const run = (ctrl: string[]) => {
      const r = popRegression(S, ix("Y"), [ix("X"), ...ctrl.map(ix)]);
      const rx = ctrl.length ? popRegression(S, ix("X"), ctrl.map(ix)).resid : S[ix("X")][ix("X")];
      return { b: r.coef[0], se: Math.sqrt(r.resid / (n * rx)) };
    };
    return { truth: T[ix("Y")][ix("X")], without: run([]), with: run(["Z"]) };
  }, [sc, n]);
  const edges: Edge[] = sc.edges.map(([a, b]) => [a, b]);
  return (
    <SimShell note="Exact population regressions from linear models (unit-variance disturbances), with 95% intervals for a sample of n. U nodes (dashed) are unobserved. Compare the coefficient on X without and with Z against the true total effect.">
      <div className="mb-3 flex flex-wrap gap-2">
        {SCENARIOS.map((s) => (
          <button key={s.key} className="btn" onClick={() => setKey(s.key)} style={s.key === key ? { background: "var(--accent)", color: "white", borderColor: "var(--accent)" } : undefined}>{s.label}</button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.2fr]">
        <div>
          <DagView nodes={sc.nodes} edges={edges} width={420} height={190}
            nodeStyle={(v) => (v === "Z" ? { fill: soft(C4, 30), stroke: C4 } : sc.latent?.includes(v) ? { dashed: true, text: "var(--text-2)" } : v === "X" ? { fill: soft(C1, 30), stroke: C1 } : v === "Y" ? { fill: soft(C3, 30), stroke: C3 } : undefined)} />
          <p className="mt-2 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--surface-2)" }}>{sc.verdict}</p>
        </div>
        <div className="space-y-3">
          <HBars truth={res.truth} truthLabel="true effect" rows={[
            { label: "without Z", v: res.without.b, ci: 1.96 * res.without.se, c: "var(--text-3)" },
            { label: "controlling for Z", v: res.with.b, ci: 1.96 * res.with.se, c: C4 },
          ]} />
          <div className="grid grid-cols-2 gap-2">
            <Stat label="bias without / with Z" value={`${fmt(res.without.b - res.truth, 3)} / ${fmt(res.with.b - res.truth, 3)}`} />
            <Stat label="SE without / with Z" value={`${fmt(res.without.se, 3)} / ${fmt(res.with.se, 3)}`} />
          </div>
          <Slider label="Sample size n (for the intervals)" value={n} min={100} max={5000} step={100} onChange={setN} />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 54: the front door ---------------- */
export function FrontdoorLab() {
  const [ux, setUx] = useState(0.6), [uy, setUy] = useState(0.3);
  const [xm, setXm] = useState(0.8), [my, setMy] = useState(0.1);
  const [direct, setDirect] = useState(0), [um, setUm] = useState(0);
  const r = useMemo(() => {
    const pU = 0.5;
    const pX = (u: number) => clamp01(0.5 + (u - 0.5) * ux);
    const pM = (x: number, u: number) => clamp01(0.5 + (x - 0.5) * xm + (u - 0.5) * um);
    const pY = (x: number, m: number, u: number) => clamp01(0.15 + my * m + uy * u + direct * x);
    const b = (p: number, v: number) => (v ? p : 1 - p);
    const J: Record<string, number> = {};          // observed joint over x, m, y
    let truth1 = 0, truth0 = 0;
    for (const u of [0, 1]) {
      const wu = b(pU, u);
      for (const x of [0, 1]) for (const m of [0, 1]) {
        const pm = b(pM(x, u), m);
        for (const y of [0, 1]) J[`${x}${m}${y}`] = (J[`${x}${m}${y}`] ?? 0) + wu * b(pX(u), x) * pm * b(pY(x, m, u), y);
        if (x === 1) truth1 += wu * pm * pY(1, m, u); else truth0 += wu * pm * pY(0, m, u);
      }
    }
    const Px = (x: number) => J[`${x}00`] + J[`${x}01`] + J[`${x}10`] + J[`${x}11`];
    const Pm_x = (m: number, x: number) => (J[`${x}${m}0`] + J[`${x}${m}1`]) / Px(x);
    const Py_mx = (m: number, x: number) => J[`${x}${m}1`] / (J[`${x}${m}0`] + J[`${x}${m}1`]);
    const naive = (x: number) => (J[`${x}01`] + J[`${x}11`]) / Px(x);
    const fd = (x: number) => [0, 1].reduce((s, m) => s + Pm_x(m, x) * [0, 1].reduce((t, xp) => t + Py_mx(m, xp) * Px(xp), 0), 0);
    return { truth: truth1 - truth0, naive: naive(1) - naive(0), fd: fd(1) - fd(0) };
  }, [ux, uy, xm, my, direct, um]);
  const edges: Edge[] = [["U", "X"], ["U", "Y"], ["X", "M"], ["M", "Y"]];
  if (direct) edges.push(["X", "Y"]);
  if (um) edges.push(["U", "M"]);
  return (
    <SimShell note="Smoking (X), tar (M), cancer (Y) and an unobserved genotype (U). All probabilities are exact. The front-door formula uses only X, M and Y; it matches the truth as long as there is no direct X → Y arrow and U does not affect M. Turn those on to watch it fail.">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <DagView nodes={[{ id: "U", label: "Genotype", x: 250, y: 40 }, { id: "X", label: "Smoking", x: 80, y: 170 }, { id: "M", label: "Tar", x: 250, y: 170 }, { id: "Y", label: "Cancer", x: 420, y: 170 }]}
            edges={edges} width={500} height={210}
            nodeStyle={(v) => (v === "U" ? { dashed: true, text: "var(--text-2)" } : v === "M" ? { fill: soft(C4, 30), stroke: C4 } : undefined)}
            edgeStyle={(e) => ((e[0] === "X" && e[1] === "Y") || (e[0] === "U" && e[1] === "M") ? { color: "#d03b3b", width: 2.6 } : undefined)} />
          <HBars truth={r.truth} truthLabel="true effect" rows={[
            { label: "naive P(Y|X=1) − P(Y|X=0)", v: r.naive, c: C2 },
            { label: "front-door formula", v: r.fd, c: C4 },
          ]} />
        </div>
        <div className="grid grid-cols-2 content-start gap-3">
          <Slider label="Genotype → smoking" value={ux} min={0} max={0.95} step={0.05} onChange={setUx} format={(v) => v.toFixed(2)} />
          <Slider label="Genotype → cancer" value={uy} min={0} max={0.6} step={0.05} onChange={setUy} format={(v) => v.toFixed(2)} />
          <Slider label="Smoking → tar" value={xm} min={0} max={0.95} step={0.05} onChange={setXm} format={(v) => v.toFixed(2)} />
          <Slider label="Tar → cancer" value={my} min={-0.1} max={0.3} step={0.01} onChange={setMy} format={(v) => v.toFixed(2)} />
          <Slider label="Violation: direct smoking → cancer" value={direct} min={0} max={0.2} step={0.01} onChange={setDirect} format={(v) => v.toFixed(2)} />
          <Slider label="Violation: genotype → tar" value={um} min={0} max={0.6} step={0.05} onChange={setUm} format={(v) => v.toFixed(2)} />
          <Stat label="naive bias" value={fmt(r.naive - r.truth, 3)} color={C2} />
          <Stat label="front-door bias" value={fmt(r.fd - r.truth, 3)} color={Math.abs(r.fd - r.truth) < 1e-6 ? C3 : C2} />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 55: do-calculus step by step ---------------- */
type Check = { rule: string; into: string[]; outOf: string[]; a: string[]; b: string[]; cond: string[] };
type Step = { formula: string; why: string; checks: Check[] };
type Preset = { label: string; nodes: GNode[]; edges: Edge[]; latent: string[]; steps: Step[] };
const PRESETS: Record<string, Preset> = {
  back: {
    label: "Back-door (tax credit)", latent: [],
    nodes: [{ id: "C", label: "Children", x: 210, y: 40 }, { id: "X", label: "Credit", x: 80, y: 150 }, { id: "Y", label: "Hours", x: 340, y: 150 }],
    edges: [["C", "X"], ["C", "Y"], ["X", "Y"]],
    steps: [
      { formula: "P(y | do(x)) = Σc P(y | do(x), c) · P(c | do(x))", why: "Condition on C and sum (probability).", checks: [] },
      { formula: "P(c | do(x)) = P(c)", why: "Rule 3: setting X cannot change C.", checks: [{ rule: "Rule 3", into: ["X"], outOf: [], a: ["C"], b: ["X"], cond: [] }] },
      { formula: "P(y | do(x), c) = P(y | x, c)", why: "Rule 2: given C, X has no open back-door path to Y.", checks: [{ rule: "Rule 2", into: [], outOf: ["X"], a: ["Y"], b: ["X"], cond: ["C"] }] },
      { formula: "P(y | do(x)) = Σc P(y | x, c) · P(c)", why: "The back-door adjustment formula.", checks: [] },
    ],
  },
  front: {
    label: "Front door (smoking, tar)", latent: ["U"],
    nodes: [{ id: "U", label: "U", x: 230, y: 40 }, { id: "X", label: "X", x: 80, y: 150 }, { id: "M", label: "M", x: 230, y: 150 }, { id: "Y", label: "Y", x: 380, y: 150 }],
    edges: [["U", "X"], ["U", "Y"], ["X", "M"], ["M", "Y"]],
    steps: [
      { formula: "P(y | do(x)) = Σm P(y | do(x), m) · P(m | do(x))", why: "Condition on M and sum.", checks: [] },
      { formula: "P(m | do(x)) = P(m | x)", why: "Rule 2: X has no open back-door path to M (it is blocked at the collider Y).", checks: [{ rule: "Rule 2", into: [], outOf: ["X"], a: ["M"], b: ["X"], cond: [] }] },
      { formula: "P(y | do(x), m) = P(y | do(x), do(m))", why: "Rule 2 for M, once X is set.", checks: [{ rule: "Rule 2", into: ["X"], outOf: ["M"], a: ["Y"], b: ["M"], cond: ["X"] }] },
      { formula: "P(y | do(x), do(m)) = P(y | do(m))", why: "Rule 3: with M set, X has no other route to Y.", checks: [{ rule: "Rule 3", into: ["X", "M"], outOf: [], a: ["Y"], b: ["X"], cond: ["M"] }] },
      { formula: "P(y | do(m)) = Σx' P(y | m, x') P(x')", why: "Rule 2 (X blocks M's back door) and Rule 3 (setting M leaves X unchanged).", checks: [
        { rule: "Rule 2", into: [], outOf: ["M"], a: ["Y"], b: ["M"], cond: ["X"] }, { rule: "Rule 3", into: ["M"], outOf: [], a: ["X"], b: ["M"], cond: [] }] },
      { formula: "P(y | do(x)) = Σm P(m | x) Σx' P(y | m, x') P(x')", why: "The front-door formula.", checks: [] },
    ],
  },
  seq: {
    label: "Two treatment rounds (HIV)", latent: ["U"],
    nodes: [{ id: "A1", label: "A1", x: 70, y: 150 }, { id: "L", label: "CD4", x: 200, y: 60 }, { id: "A2", label: "A2", x: 330, y: 150 }, { id: "Y", label: "Y", x: 460, y: 60 }, { id: "U", label: "U", x: 330, y: 30 }],
    edges: [["A1", "L"], ["A1", "Y"], ["L", "A2"], ["A2", "Y"], ["U", "L"], ["U", "Y"]],
    steps: [
      { formula: "P(y | do(a1, a2)) = Σl P(y | do(a1, a2), l) · P(l | do(a1, a2))", why: "Condition on L and sum.", checks: [] },
      { formula: "P(l | do(a1, a2)) = P(l | do(a1)) = P(l | a1)", why: "Rule 3 (A2 is not an ancestor of L), then Rule 2 (A1 has no back door).", checks: [
        { rule: "Rule 3", into: ["A1", "A2"], outOf: [], a: ["L"], b: ["A2"], cond: ["A1"] }, { rule: "Rule 2", into: [], outOf: ["A1"], a: ["L"], b: ["A1"], cond: [] }] },
      { formula: "P(y | do(a1, a2), l) = P(y | do(a1), a2, l)", why: "Rule 2 for A2: L blocks its back-door paths.", checks: [{ rule: "Rule 2", into: ["A1"], outOf: ["A2"], a: ["Y"], b: ["A2"], cond: ["A1", "L"] }] },
      { formula: "P(y | do(a1), a2, l) = P(y | a1, a2, l)", why: "Rule 2 for A1: it has no back-door paths.", checks: [{ rule: "Rule 2", into: [], outOf: ["A1"], a: ["Y"], b: ["A1"], cond: ["A2", "L"] }] },
      { formula: "P(y | do(a1, a2)) = Σl P(y | a1, l, a2) · P(l | a1)", why: "The g-formula.", checks: [] },
    ],
  },
};

const dsepSets = (edges: Edge[], A: string[], B: string[], Z: string[]) => A.every((a) => B.every((b) => dsep(edges, a, b, new Set(Z))));

export function DoCalculusLab() {
  const [pk, setPk] = useState<keyof typeof PRESETS>("front");
  const [k, setK] = useState(1);
  const pr = PRESETS[pk];
  const step = pr.steps[Math.min(k, pr.steps.length - 1)];
  const [ci, setCi] = useState(0);
  const check = step.checks[Math.min(ci, Math.max(0, step.checks.length - 1))];
  const g = check ? cut(pr.edges, check.into, check.outOf) : pr.edges;
  const ok = check ? dsepSets(g, check.a, check.b, check.cond) : true;
  const graphName = check ? `G${check.into.length ? " with arrows into " + check.into.join(", ") + " removed" : ""}${check.outOf.length ? (check.into.length ? "," : "") + " with arrows out of " + check.outOf.join(", ") + " removed" : ""}` : "G (original)";
  return (
    <SimShell note="Step through a derivation. For each step that uses a rule, the panel builds the modified graph the rule requires and checks the d-separation live. Conditioned nodes are grey; the two sets that must be separated are blue and green; U is unobserved.">
      <div className="mb-3 flex flex-wrap gap-3">
        <Seg value={pk} onChange={(v) => { setPk(v); setK(1); setCi(0); }} options={Object.entries(PRESETS).map(([v, p]) => ({ value: v as keyof typeof PRESETS, label: p.label }))} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <div className="mb-1 text-xs font-semibold faint">{graphName}</div>
          <DagView nodes={pr.nodes} edges={g} width={520} height={200}
            nodeStyle={(v) => (pr.latent.includes(v) ? { dashed: true, text: "var(--text-2)" } : check?.a.includes(v) ? { fill: soft(C1, 35), stroke: C1 } : check?.b.includes(v) ? { fill: soft(C3, 35), stroke: C3 } : check?.cond.includes(v) ? { fill: "var(--text-3)", text: "var(--surface)" } : undefined)} />
          {check && (
            <div className="mt-2 rounded-lg px-3 py-2 text-sm" style={{ background: ok ? soft(C3, 20) : soft(C2, 20) }}>
              {check.rule}: is ({check.a.join(", ")} ⫫ {check.b.join(", ")}{check.cond.length ? " | " + check.cond.join(", ") : ""}) in this graph? <b>{ok ? "Yes ✓" : "No ✗"}</b>
              {step.checks.length > 1 && <div className="mt-1 flex gap-2">{step.checks.map((c, i) => <button key={i} className="btn" onClick={() => setCi(i)}>{c.rule} check {i + 1}</button>)}</div>}
            </div>
          )}
        </div>
        <div className="space-y-2">
          {pr.steps.map((s, i) => (
            <button key={i} onClick={() => { setK(i); setCi(0); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm"
              style={{ background: i === k ? soft(C1, 18) : "var(--surface-2)", border: i === k ? `1.5px solid ${C1}` : "1.5px solid transparent" }}>
              <div className="font-mono text-xs" style={{ color: "var(--text)" }}>{i + 1}. {s.formula}</div>
              <div className="mt-0.5 text-xs muted">{s.why}</div>
            </button>
          ))}
          <div className="flex gap-2">
            <button className="btn" onClick={() => { setK(Math.max(0, k - 1)); setCi(0); }}>Previous</button>
            <button className="btn" onClick={() => { setK(Math.min(pr.steps.length - 1, k + 1)); setCi(0); }}>Next</button>
          </div>
        </div>
      </div>
    </SimShell>
  );
}

