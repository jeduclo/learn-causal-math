"use client";
import { useMemo, useState } from "react";
import { Legend, Plot, Seg, SimShell, Slider, Stat, curve, fmt, rng, useSeed } from "./kit";
import { DagView, Edge, GNode, allPaths, blockingNode, childrenOf, descendants, districts, pathText } from "./kit3";

const C1 = "var(--s1)", C2 = "var(--s2)", C3 = "var(--s3)", C4 = "var(--s4)";
const soft = (c: string, p = 22) => `color-mix(in oklab, ${c} ${p}%, var(--surface))`;

/* ---------------- Day 56: Tian's criterion ---------------- */
const ID_NODES: GNode[] = [
  { id: "W", x: 80, y: 50 }, { id: "Z", x: 80, y: 200 }, { id: "X", x: 250, y: 200 }, { id: "M", x: 380, y: 100 }, { id: "Y", x: 510, y: 200 },
];
const CAND: Edge[] = [
  ["W", "Z"], ["Z", "X"], ["X", "M"], ["M", "Y"], ["X", "Y"], ["W", "Y"],
  ["X", "Y", "b"], ["X", "M", "b"], ["M", "Y", "b"], ["Z", "Y", "b"], ["W", "X", "b"], ["W", "Y", "b"], ["Z", "X", "b"],
];
const key = (e: Edge) => `${e[0]}${e[2] === "b" ? "<->" : "->"}${e[1]}`;
const ID_PRESETS: Record<string, string[]> = {
  "Bow": ["Z->X", "X->Y", "X<->Y"],
  "Front door": ["X->M", "M->Y", "X<->Y"],
  "Adjust for Z": ["Z->X", "X->Y", "Z<->Y"],
  "Instrument": ["Z->X", "X->Y", "X<->Y"],
  "Napkin": ["W->Z", "Z->X", "X->Y", "W<->X", "W<->Y"],
  "Confounded mediator": ["X->M", "M->Y", "X<->M"],
};

export function IdentificationLab() {
  const [on, setOn] = useState<string[]>(ID_PRESETS["Front door"]);
  const edges = CAND.filter((e) => on.includes(key(e)));
  const nodes = ID_NODES.map((n) => n.id);
  const ds = districts(nodes, edges);
  const SX = ds.find((d) => d.includes("X"))!;
  const kids = childrenOf(edges, "X");
  const bad = kids.filter((c) => SX.includes(c));
  const ok = bad.length === 0;
  const palette = [C1, C3, C4, C2, "var(--text-3)"];
  const colorOf = (v: string) => {
    const i = ds.findIndex((d) => d.includes(v));
    return ds[i].length > 1 ? palette[i % palette.length] : undefined;
  };
  const toggle = (k: string) => setOn((o) => (o.includes(k) ? o.filter((x) => x !== k) : [...o, k]));
  return (
    <SimShell note="Switch arrows and bidirected (unmeasured-confounding) edges on and off. Nodes in the same c-component share a colour. Tian's criterion: the effect of X on all other variables is identified exactly when no child of X lies in X's c-component. The napkin shows that P(y | do(x)) for one outcome can still be identified when the criterion fails.">
      <div className="mb-3 flex flex-wrap gap-2">
        {Object.entries(ID_PRESETS).map(([name, ks]) => <button key={name} className="btn" onClick={() => setOn(ks)}>{name}</button>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <DagView nodes={ID_NODES} edges={edges} width={590} height={260}
          nodeStyle={(v) => {
            const c = colorOf(v);
            return { fill: c ? soft(c, 30) : undefined, stroke: c, ring: v === "X" ? C2 : bad.includes(v) ? "#d03b3b" : undefined };
          }}
          edgeStyle={(e) => (e[2] === "b" ? { color: "var(--text-3)" } : undefined)} />
        <div className="space-y-3 text-sm">
          <div className="rounded-lg px-3 py-2" style={{ background: ok ? soft(C3, 20) : soft(C2, 20) }}>
            c-component of X: <b>{`{${SX.join(", ")}}`}</b>; children of X: <b>{kids.length ? `{${kids.join(", ")}}` : "none"}</b>.<br />
            {ok ? <>No child of X shares its c-component: <b>identified</b>. P(v | do(x)) = P(v) · Σₓ Q[S_X] / Q[S_X].</>
              : <>Child {bad.join(", ")} is in X&apos;s c-component: the full interventional distribution is <b>not identified</b>.</>}
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold faint">DIRECTED EDGES</div>
            <div className="flex flex-wrap gap-1.5">{CAND.filter((e) => e[2] !== "b").map((e) => <Chip key={key(e)} k={key(e)} on={on.includes(key(e))} onClick={toggle} />)}</div>
            <div className="mb-1 mt-2 text-xs font-semibold faint">BIDIRECTED EDGES (UNMEASURED CONFOUNDING)</div>
            <div className="flex flex-wrap gap-1.5">{CAND.filter((e) => e[2] === "b").map((e) => <Chip key={key(e)} k={key(e)} on={on.includes(key(e))} onClick={toggle} />)}</div>
          </div>
          <div className="text-xs muted">c-components: {ds.map((d) => `{${d.join(", ")}}`).join("  ")}</div>
        </div>
      </div>
    </SimShell>
  );
}
function Chip({ k, on, onClick }: { k: string; on: boolean; onClick: (k: string) => void }) {
  return (
    <button onClick={() => onClick(k)} className="rounded-md px-2 py-1 font-mono text-xs"
      style={{ background: on ? "var(--accent)" : "var(--surface-2)", color: on ? "white" : "var(--text-2)", border: "1px solid var(--border)" }}>
      {k.replace("<->", " ↔ ").replace("->", " → ")}
    </button>
  );
}

/* ---------------- Day 57: selection bias ---------------- */
export function SelectionLab() {
  const [pX, setPX] = useState(0.2), [p0, setP0] = useState(0.05), [rr, setRR] = useState(1);
  const [base, setBase] = useState(0.02), [tx, setTx] = useState(0.1), [ty, setTy] = useState(0.6);
  const pY = (x: number) => Math.min(0.99, p0 * (x ? rr : 1));
  const pS = (x: number, y: number) => Math.min(1, base + tx * x + ty * y);
  const tested = (x: number) => {
    const a = pY(x) * pS(x, 1), b = (1 - pY(x)) * pS(x, 0);
    return { pos: a / (a + b), a, b };
  };
  const t1 = tested(1), t0 = tested(0);
  const odds = (p: number) => p / (1 - p);
  const popOR = odds(pY(1)) / odds(pY(0)), testOR = odds(t1.pos) / odds(t0.pos);
  const share = pX * (t1.a + t1.b) + (1 - pX) * (t0.a + t0.b);
  const rows = [
    { label: "Smokers: infected, population", v: pY(1), c: C1 },
    { label: "Non-smokers: infected, population", v: pY(0), c: "var(--text-3)" },
    { label: "Smokers: positive among tested", v: t1.pos, c: C2 },
    { label: "Non-smokers: positive among tested", v: t0.pos, c: C4 },
  ];
  return (
    <SimShell note="Only tested people enter the data. Testing depends on smoking (cough) and on infection (symptoms), so it is a collider. Set the true relative risk to 1 and watch smokers look protected among the tested. With no smoking effect on testing (selection on the outcome only), the odds ratio survives selection even though risks do not.">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <DagView nodes={[{ id: "X", label: "Smoking", x: 80, y: 50 }, { id: "Y", label: "Infection", x: 340, y: 50 }, { id: "S", label: "Tested", x: 210, y: 140 }]}
            edges={[...(rr !== 1 ? [["X", "Y"] as Edge] : []), ...(tx > 0 ? [["X", "S"] as Edge] : []), ["Y", "S"]]} width={420} height={180}
            nodeStyle={(v) => (v === "S" ? { fill: "var(--text-3)", text: "var(--surface)" } : undefined)} />
          <svg viewBox="0 0 600 190" className="w-full">
            {rows.map((r, i) => (
              <g key={r.label}>
                <text x={250} y={26 + i * 44} textAnchor="end" style={{ fill: "var(--text)" }}>{r.label}</text>
                <rect x={260} y={10 + i * 44} width={Math.max(1, r.v * 300)} height={24} rx={4} fill={r.c} opacity={0.85} />
                <text x={266 + r.v * 300} y={27 + i * 44} style={{ fill: "var(--text)", fontWeight: 700 }}>{(100 * r.v).toFixed(1)}%</text>
              </g>
            ))}
          </svg>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Slider label="Share who smoke" value={pX} min={0.05} max={0.6} step={0.01} onChange={setPX} format={(v) => v.toFixed(2)} />
            <Slider label="Infection rate, non-smokers" value={p0} min={0.01} max={0.3} step={0.01} onChange={setP0} format={(v) => v.toFixed(2)} />
            <Slider label="True relative risk (smokers)" value={rr} min={0.5} max={3} step={0.05} onChange={setRR} format={(v) => v.toFixed(2)} />
            <Slider label="Baseline testing rate" value={base} min={0} max={0.3} step={0.01} onChange={setBase} format={(v) => v.toFixed(2)} />
            <Slider label="Extra testing if smoker" value={tx} min={0} max={0.5} step={0.01} onChange={setTx} format={(v) => v.toFixed(2)} />
            <Slider label="Extra testing if infected" value={ty} min={0} max={0.95} step={0.01} onChange={setTy} format={(v) => v.toFixed(2)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="risk ratio: population / tested" value={`${fmt(pY(1) / pY(0))} / ${fmt(t1.pos / t0.pos)}`} color={C2} />
            <Stat label="odds ratio: population / tested" value={`${fmt(popOR)} / ${fmt(testOR)}`} color={Math.abs(popOR - testOR) < 1e-6 ? C3 : C2} />
            <Stat label="share of population tested" value={`${(100 * share).toFixed(1)}%`} />
          </div>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 58: mediation ---------------- */
export function MediationLab() {
  const [b0, setB0] = useState(1), [b1, setB1] = useState(0.5);
  const [t1, setT1] = useState(1), [t2, setT2] = useState(2), [t3, setT3] = useState(0.5);
  const [g, setG] = useState(0), [c, setC] = useState(0);
  const nde = t1 + t3 * b0, nie = (t2 + t3) * b1, te = nde + nie;
  const k = g / (g * g + 1);                    // E[U | X, M] = k (M − β0 − β1 X), Var(U) = Var(e_M) = 1
  const t1h = t1 - c * k * b1, t2h = t2 + c * k;
  const ndeH = t1h + t3 * b0, nieH = (t2h + t3) * b1;
  const lo = b0 - 3, hi = b0 + b1 + 3;
  const cde = (m: number) => t1 + t3 * m;
  const all = [nde, nie, te, ndeH, nieH, cde(lo), cde(hi), 0];
  const ymin = Math.min(...all) - 0.3, ymax = Math.max(...all) + 0.3;
  return (
    <SimShell note="M = β0 + β1·X + g·U + e_M and Y = θ1·X + θ2·M + θ3·X·M + c·U + e_Y. The controlled direct effect CDE(m) = θ1 + θ3·m varies with the mediator level (line); NDE and NIE come from the mediation formula. With an unmeasured mediator–outcome confounder U (g, c ≠ 0), estimates from the regression of Y on X, M and X·M (dashed) are biased.">
      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <Plot x={[lo, hi]} y={[ymin, ymax]} height={290} xLabel="mediator level m" yLabel="effect"
            hover={(m) => [`m = ${fmt(m)}`, `CDE(m) = ${fmt(cde(m))}`]}>
            {(sx, sy) => (
              <>
                <path d={curve(cde, lo, hi, sx, sy)} fill="none" stroke={C4} strokeWidth={3} />
                {[[nde, "NDE", C1], [te, "TE", "var(--text)"]].map(([v, l, col]) => (
                  <g key={l as string}><line x1={sx(lo)} x2={sx(hi)} y1={sy(v as number)} y2={sy(v as number)} stroke={col as string} strokeDasharray="5 4" />
                    <text x={sx(hi) - 4} y={sy(v as number) - 5} textAnchor="end" style={{ fill: col as string, fontWeight: 700 }}>{l as string} {fmt(v as number)}</text></g>
                ))}
                <line x1={sx(b0)} x2={sx(b0)} y1={sy(ymin)} y2={sy(ymax)} stroke="var(--text-3)" strokeDasharray="2 3" />
                <text x={sx(b0) + 4} y={sy(ymin) - 6} style={{ fill: "var(--text-2)" }}>E[M | X = 0]</text>
              </>
            )}
          </Plot>
          <Legend items={[{ color: C4, label: "CDE(m)" }, { color: C1, label: "NDE = CDE at E[M|X=0]", dash: true }, { color: "var(--text)", label: "total effect", dash: true }]} />
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Slider label="β0: mediator level, untreated" value={b0} min={0} max={3} step={0.1} onChange={setB0} />
            <Slider label="β1: X → M" value={b1} min={-1} max={2} step={0.05} onChange={setB1} />
            <Slider label="θ1: X → Y direct" value={t1} min={-1} max={2} step={0.05} onChange={setT1} />
            <Slider label="θ2: M → Y" value={t2} min={-1} max={3} step={0.05} onChange={setT2} />
            <Slider label="θ3: X × M interaction" value={t3} min={-1} max={1} step={0.05} onChange={setT3} />
            <div />
            <Slider label="g: U → M" value={g} min={0} max={2} step={0.1} onChange={setG} />
            <Slider label="c: U → Y" value={c} min={-2} max={2} step={0.1} onChange={setC} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="NDE" value={fmt(nde)} sub={`estimated ${fmt(ndeH)}`} color={C1} />
            <Stat label="NIE" value={fmt(nie)} sub={`estimated ${fmt(nieH)}`} color={C3} />
            <Stat label="TE" value={fmt(te)} sub={`mediated ${te ? (100 * nie / te).toFixed(0) : "—"}%`} />
          </div>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 59: counterfactuals ---------------- */
export function CounterfactualLab() {
  const [xObs, setXObs] = useState(12), [uObs, setUObs] = useState(0.15);
  const [xNew, setXNew] = useState(16);
  const [beta, setBeta] = useState(0.08);
  const [p1, setP1] = useState(0.98), [p0, setP0] = useState(0.9);
  const [seed] = useSeed();
  const a = 1.5;
  const yObs = a + beta * xObs + uObs;
  const yCf = a + beta * xNew + uObs;
  const pop = useMemo(() => {
    const r = rng(seed + 59);
    return Array.from({ length: 400 }, () => { const x = 8 + 10 * r.u(); return { x, y: a + beta * x + 0.25 * r.n() }; });
  }, [seed, beta]);
  const lo = Math.max(0, p1 - p0), hi = Math.min(p1, 1 - p0);
  return (
    <SimShell note="Left: abduction, action, prediction in Y := 1.5 + β·S + U. The worker's U is read off her observed point (abduction); then schooling is set to a new value (action) and her own line, parallel to the population line, gives the counterfactual (prediction). Right: from an experiment alone, the share of people who respond (PNS) is only bounded; monotonicity pins it down.">
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <Plot x={[7, 19]} y={[a + beta * 7 - 0.9, a + beta * 19 + 0.9]} height={290} xLabel="years of schooling S" yLabel="log wage">
            {(sx, sy) => (
              <>
                {pop.map((p, i) => <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={2} fill="var(--text-3)" opacity={0.35} />)}
                <path d={curve((x) => a + beta * x, 7, 19, sx, sy)} stroke="var(--text-2)" strokeWidth={2} fill="none" />
                <path d={curve((x) => a + beta * x + uObs, 7, 19, sx, sy)} stroke={C4} strokeWidth={2.5} fill="none" strokeDasharray="6 4" />
                <line x1={sx(xObs)} x2={sx(xObs)} y1={sy(a + beta * xObs)} y2={sy(yObs)} stroke={C4} strokeWidth={2} />
                <text x={sx(xObs) + 5} y={(sy(a + beta * xObs) + sy(yObs)) / 2} style={{ fill: C4, fontWeight: 700 }}>U = {fmt(uObs)}</text>
                <circle cx={sx(xObs)} cy={sy(yObs)} r={7} fill={C1} />
                <circle cx={sx(xNew)} cy={sy(yCf)} r={7} fill="none" stroke={C2} strokeWidth={3} />
                <text x={sx(xNew) + 9} y={sy(yCf) - 8} style={{ fill: C2, fontWeight: 700 }}>Y_{xNew}</text>
              </>
            )}
          </Plot>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="observed schooling" value={xObs} min={8} max={18} step={1} onChange={setXObs} />
            <Slider label="her residual U (observed wage)" value={uObs} min={-0.6} max={0.6} step={0.01} onChange={setUObs} />
            <Slider label="counterfactual schooling" value={xNew} min={8} max={18} step={1} onChange={setXNew} />
            <Slider label="β: return per year" value={beta} min={0} max={0.15} step={0.005} onChange={setBeta} format={(v) => v.toFixed(3)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="observed log wage" value={fmt(yObs, 3)} color={C1} />
            <Stat label={`counterfactual with ${xNew} years`} value={fmt(yCf, 3)} color={C2} sub={`gain ${(100 * (Math.exp(yCf - yObs) - 1)).toFixed(1)}%`} />
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold faint">PROBABILITY OF NECESSITY AND SUFFICIENCY (vaccine trial; y = not infected)</div>
          <svg viewBox="0 0 560 150" className="w-full">
            <line x1={30} x2={530} y1={70} y2={70} stroke="var(--border)" strokeWidth={2} />
            {[0, 0.25, 0.5, 0.75, 1].map((t) => <g key={t}><line x1={30 + t * 500} x2={30 + t * 500} y1={64} y2={76} stroke="var(--text-3)" /><text x={30 + t * 500} y={96} textAnchor="middle">{t}</text></g>)}
            {hi >= lo && <rect x={30 + lo * 500} y={56} width={Math.max(3, (hi - lo) * 500)} height={28} rx={5} fill={C3} opacity={0.6} />}
            <circle cx={30 + lo * 500} cy={70} r={7} fill={C2} />
            <text x={30 + lo * 500} y={44} textAnchor="middle" style={{ fill: C2, fontWeight: 700 }}>monotone {fmt(lo, 3)}</text>
            <text x={30 + ((lo + hi) / 2) * 500} y={124} textAnchor="middle" style={{ fill: "var(--text)" }}>PNS ∈ [{fmt(lo, 3)}, {fmt(hi, 3)}]</text>
          </svg>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="P(not infected | do(vaccine))" value={p1} min={0.5} max={1} step={0.005} onChange={setP1} format={(v) => v.toFixed(3)} />
            <Slider label="P(not infected | do(placebo))" value={p0} min={0.5} max={1} step={0.005} onChange={setP0} format={(v) => v.toFixed(3)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="lower bound" value={fmt(lo, 3)} sub="max(0, P(y₁) − P(y₀))" />
            <Stat label="upper bound" value={fmt(hi, 3)} sub="min(P(y₁), 1 − P(y₀))" />
            <Stat label="PN if monotone" value={p1 > 0 ? fmt(Math.max(0, (p1 - p0) / p1), 3) : "—"} sub="share of the uninfected vaccinated protected by it" />
            <Stat label="max share harmed" value={fmt(Math.max(0, hi - (p1 - p0)), 3)} />
          </div>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 60: SWIGs ---------------- */
type SwPreset = { label: string; nodes: GNode[]; edges: Edge[]; latent: string[]; cond: string[] };
const SW: Record<string, SwPreset> = {
  conf: { label: "Confounder + mediator", latent: [], cond: ["L"],
    nodes: [{ id: "L", x: 200, y: 40 }, { id: "A", x: 90, y: 150 }, { id: "M", x: 230, y: 230 }, { id: "Y", x: 370, y: 150 }],
    edges: [["L", "A"], ["L", "Y"], ["A", "Y"], ["A", "M"], ["M", "Y"]] },
  mbias: { label: "M-bias", latent: ["U1", "U2"], cond: [],
    nodes: [{ id: "U1", x: 80, y: 40 }, { id: "U2", x: 380, y: 40 }, { id: "M", x: 230, y: 100 }, { id: "A", x: 80, y: 210 }, { id: "Y", x: 380, y: 210 }],
    edges: [["U1", "A"], ["U1", "M"], ["U2", "M"], ["U2", "Y"], ["A", "Y"]] },
  front: { label: "Front door", latent: ["U"], cond: [],
    nodes: [{ id: "U", x: 230, y: 40 }, { id: "A", x: 80, y: 180 }, { id: "M", x: 230, y: 180 }, { id: "Y", x: 380, y: 180 }],
    edges: [["U", "A"], ["U", "Y"], ["A", "M"], ["M", "Y"]] },
  vacc: { label: "Vaccine + testing", latent: ["H"], cond: ["G"],
    nodes: [{ id: "G", label: "Age", x: 230, y: 40 }, { id: "H", x: 60, y: 60 }, { id: "A", label: "A", x: 90, y: 170 }, { id: "Y", label: "Y", x: 380, y: 170 }, { id: "T", label: "Test", x: 230, y: 250 }],
    edges: [["G", "A"], ["H", "A"], ["G", "Y"], ["A", "Y"], ["H", "T"], ["Y", "T"]] },
};

function buildSwig(p: SwPreset) {
  const desc = descendants(p.edges, "A"); desc.delete("A");
  const name = (v: string) => (desc.has(v) ? `${v}(a)` : v);
  const nodes: GNode[] = [];
  for (const n of p.nodes) {
    if (n.id === "A") {
      nodes.push({ ...n, id: "A", label: "A", x: n.x - 28 });
      nodes.push({ id: "a", label: "a", x: n.x + 30, y: n.y });
    } else nodes.push({ ...n, id: name(n.id), label: desc.has(n.id) ? `${n.label ?? n.id}(a)` : n.label });
  }
  const edges: Edge[] = p.edges.map(([u, v, t]) => [u === "A" ? "a" : name(u), name(v), t] as Edge);
  return { nodes, edges, name, desc };
}

export function SwigLab() {
  const [pk, setPk] = useState("conf");
  const p = SW[pk];
  const [cond, setCond] = useState<string[]>(p.cond);
  const sw = useMemo(() => buildSwig(p), [p]);
  const Zs = new Set([...cond.map(sw.name), "a"]);
  const paths = allPaths(sw.edges, "A", sw.name("Y"));
  const info = paths.map((q) => ({ q, b: blockingNode(sw.edges, q, Zs) }));
  const indep = info.every((i) => i.b >= 0);
  const toggle = (v: string) => {
    const base = v.replace("(a)", "");
    if (["A", "a", "Y", "Y(a)"].includes(v) || p.latent.includes(base)) return;
    setCond((c) => (c.includes(base) ? c.filter((x) => x !== base) : [...c, base]));
  };
  const openE = new Set<number>();
  info.filter((i) => i.b < 0).forEach((i) => i.q.edges.forEach((e) => openE.add(sw.edges.indexOf(e))));
  const lab = (v: string) => sw.nodes.find((n) => n.id === v)?.label ?? v;
  return (
    <SimShell note="The SWIG splits the treatment into its natural value A (keeps incoming arrows) and the value we set, a (keeps outgoing arrows); everything downstream becomes a potential outcome. Click nodes to condition on them. Ignorability Y(a) ⫫ A | L holds exactly when every path between A and Y(a) is blocked. Dashed nodes are unobserved.">
      <div className="mb-3 flex flex-wrap gap-3">
        <Seg value={pk} onChange={(v) => { setPk(v); setCond(SW[v].cond); }} options={Object.entries(SW).map(([v, q]) => ({ value: v, label: q.label }))} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-1 text-xs font-semibold faint">ORIGINAL DAG</div>
          <DagView nodes={p.nodes} edges={p.edges} width={460} height={280} onNode={toggle}
            nodeStyle={(v) => (p.latent.includes(v) ? { dashed: true, text: "var(--text-2)" } : cond.includes(v) ? { fill: "var(--text-3)", text: "var(--surface)" } : v === "A" ? { fill: soft(C1, 30), stroke: C1 } : undefined)} />
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold faint">SWIG FOR do(A = a)</div>
          <DagView nodes={sw.nodes} edges={sw.edges} width={460} height={280} onNode={toggle}
            nodeStyle={(v) => (p.latent.includes(v) ? { dashed: true, text: "var(--text-2)" } : v === "a" ? { fill: soft(C2, 40), stroke: C2 } : v === "A" ? { fill: soft(C1, 30), stroke: C1 } : Zs.has(v) ? { fill: "var(--text-3)", text: "var(--surface)" } : v.endsWith("(a)") ? { fill: soft(C3, 22), stroke: C3 } : undefined)}
            edgeStyle={(_e, i) => (openE.has(i) ? { color: C2, width: 3.2 } : undefined)} />
        </div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1.3fr]">
        <div className="rounded-lg px-3 py-2 text-sm" style={{ background: indep ? soft(C3, 20) : soft(C2, 20) }}>
          Y(a) ⫫ A {cond.length ? `| ${cond.map((v) => (sw.desc.has(v) ? `${v}(a)` : v)).join(", ")}` : ""}: <b>{indep ? "holds" : "fails"}</b> (d-separation in the SWIG).
        </div>
        <div className="space-y-1">
          {info.length === 0 && <div className="text-sm muted">No path between A and Y(a).</div>}
          {info.map(({ q, b }, i) => (
            <div key={i} className="font-mono text-xs" style={{ color: b < 0 ? C2 : "var(--text-3)" }}>
              {pathText(q, lab)} — {b < 0 ? "open" : `blocked at ${lab(q.nodes[b])}`}
            </div>
          ))}
        </div>
      </div>
    </SimShell>
  );
}
