"use client";
import { useMemo, useState } from "react";
import { Legend, Plot, Seg, SimShell, Slider, Stat, fmt, rng, useSeed } from "./kit";
import { DagView, Edge, GNode, allPaths, ancestors, blockingNode, childrenOf, descendants, findCycle, parentsOf, pathText, roles, topoOrder } from "./kit3";

const C1 = "var(--s1)", C2 = "var(--s2)", C3 = "var(--s3)", C4 = "var(--s4)";
const soft = (c: string, p = 22) => `color-mix(in oklab, ${c} ${p}%, var(--surface))`;
const corr = (a: number[], b: number[]) => {
  const n = a.length, ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return sab / Math.sqrt(saa * sbb);
};

/* ---------------- Day 46: DAG builder ---------------- */
const SCHOOL_NODES: GNode[] = [
  { id: "F", label: "Family", x: 90, y: 60 }, { id: "A", label: "Ability", x: 300, y: 60 },
  { id: "S", label: "Schooling", x: 110, y: 200 }, { id: "O", label: "Occupation", x: 300, y: 250 },
  { id: "W", label: "Wage", x: 500, y: 200 }, { id: "R", label: "Region", x: 520, y: 60 },
];
const SCHOOL_EDGES: Edge[] = [["F", "A"], ["F", "S"], ["A", "S"], ["A", "W"], ["S", "O"], ["S", "W"], ["O", "W"]];

export function DagBuilder() {
  const [edges, setEdges] = useState<Edge[]>(SCHOOL_EDGES);
  const [from, setFrom] = useState<string | null>(null);
  const [focus, setFocus] = useState("S");
  const ids = SCHOOL_NODES.map((n) => n.id);
  const lab = (v: string) => SCHOOL_NODES.find((n) => n.id === v)!.label!;
  const cycle = findCycle(ids, edges);
  const order = topoOrder(ids, edges);
  const click = (v: string) => {
    setFocus(v);
    if (from === null) { setFrom(v); return; }
    if (from === v) { setFrom(null); return; }
    setEdges((es) => (es.some((e) => e[0] === from && e[1] === v) ? es.filter((e) => !(e[0] === from && e[1] === v)) : [...es, [from, v]]));
    setFrom(null);
  };
  const A = ids.map((i) => ids.map((j) => (edges.some((e) => e[0] === i && e[1] === j) ? 1 : 0)));
  const pathsSW = cycle ? null : allPaths(edges, "S", "W").filter((p) => p.edges.every((e, k) => e[0] === p.nodes[k]));
  const cycEdges = new Set<string>();
  if (cycle) for (let k = 0; k < cycle.length - 1; k++) cycEdges.add(cycle[k] + ">" + cycle[k + 1]);
  const list = (s: Iterable<string>) => [...s].filter((v) => v !== focus).map(lab).join(", ") || "none";
  return (
    <SimShell note="Click one node, then another, to add or remove the arrow between them (click the same node twice to cancel). The panel reports parents, children, ancestors and descendants of the last node clicked, checks acyclicity and counts the causal paths from schooling to wages.">
      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <DagView nodes={SCHOOL_NODES} edges={edges} width={620} height={300} onNode={click}
            nodeStyle={(v) => (v === from ? { fill: soft(C2, 35), stroke: C2 } : v === focus ? { ring: C1 } : undefined)}
            edgeStyle={(e) => (cycEdges.has(e[0] + ">" + e[1]) ? { color: "#d03b3b", width: 3 } : undefined)} />
          <div className="mt-2 flex flex-wrap gap-2">
            <button className="btn" onClick={() => setEdges(SCHOOL_EDGES)}>Reset</button>
            <button className="btn" onClick={() => setEdges([...SCHOOL_EDGES, ["W", "F"]])}>Add a feedback arrow (Wage → Family)</button>
            <button className="btn" onClick={() => setEdges([])}>Clear all arrows</button>
          </div>
        </div>
        <div className="space-y-3 text-sm">
          <div className="rounded-lg px-3 py-2" style={{ background: cycle ? soft("#d03b3b", 18) : soft(C3, 18) }}>
            {cycle ? <>Not a DAG: cycle <b>{cycle.map(lab).join(" → ")}</b>. No topological order exists.</>
              : <>Acyclic. Topological order: <b>{order!.map(lab).join(" → ")}</b></>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label={`parents of ${lab(focus)}`} value={<span className="text-sm">{list(parentsOf(edges, focus))}</span>} color={C1} />
            <Stat label={`children of ${lab(focus)}`} value={<span className="text-sm">{list(childrenOf(edges, focus))}</span>} color={C1} />
            <Stat label="ancestors" value={<span className="text-sm">{cycle ? "—" : list(ancestors(edges, focus))}</span>} />
            <Stat label="descendants" value={<span className="text-sm">{cycle ? "—" : list(descendants(edges, focus))}</span>} />
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold faint">ADJACENCY MATRIX (row → column)</div>
            <table className="font-mono text-xs">
              <thead><tr><th />{ids.map((j) => <th key={j} className="px-1.5">{j}</th>)}</tr></thead>
              <tbody>{ids.map((i, r) => (
                <tr key={i}><th className="pr-2 text-left">{i}</th>{ids.map((j, c) => <td key={j} className="px-1.5 text-center" style={{ color: A[r][c] ? "var(--text)" : "var(--text-3)", fontWeight: A[r][c] ? 700 : 400 }}>{A[r][c]}</td>)}</tr>
              ))}</tbody>
            </table>
          </div>
          <div className="text-xs muted">
            {pathsSW ? <>Directed paths Schooling → Wage: <b className="strong">{pathsSW.length}</b>{pathsSW.length ? ` (${pathsSW.map((p) => pathText(p, lab)).join("; ")})` : ""}</> : "Path counting needs an acyclic graph."}
          </div>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 47: factorisation ---------------- */
type Struct = "chain" | "fork" | "collider";
export function FactorisationLab() {
  const [st, setSt] = useState<Struct>("chain");
  const [p0, setP0] = useState(0.4);
  const [a0, setA0] = useState(0.2), [a1, setA1] = useState(0.7);
  const [b0, setB0] = useState(0.1), [b1, setB1] = useState(0.6);
  const bern = (p: number, v: number) => (v ? p : 1 - p);
  const clamp = (v: number) => Math.min(0.99, Math.max(0.01, v));
  // variables Z, X, Y; X is always the middle node
  const joint = useMemo(() => {
    const J: Record<string, number> = {};
    for (const z of [0, 1]) for (const x of [0, 1]) for (const y of [0, 1]) {
      let p: number;
      if (st === "chain") p = bern(p0, z) * bern(z ? a1 : a0, x) * bern(x ? b1 : b0, y);
      else if (st === "fork") p = bern(p0, x) * bern(x ? a1 : a0, z) * bern(x ? b1 : b0, y);
      else p = bern(p0, z) * bern(0.5, y) * bern(clamp(b0 + (a1 - a0) * z + (b1 - b0) * y), x);
      J[`${z}${x}${y}`] = p;
    }
    return J;
  }, [st, p0, a0, a1, b0, b1]);
  const P = (f: (z: number, x: number, y: number) => boolean) => Object.entries(joint).reduce((s, [k, v]) => s + (f(+k[0], +k[1], +k[2]) ? v : 0), 0);
  const pY_Z = (z: number) => P((zz, _x, y) => zz === z && y === 1) / P((zz) => zz === z);
  const pY_ZX = (z: number, x: number) => P((zz, xx, y) => zz === z && xx === x && y === 1) / P((zz, xx) => zz === z && xx === x);
  const marg = pY_Z(1) - pY_Z(0), within0 = pY_ZX(1, 0) - pY_ZX(0, 0), within1 = pY_ZX(1, 1) - pY_ZX(0, 1);
  const edges: Edge[] = st === "chain" ? [["Z", "X"], ["X", "Y"]] : st === "fork" ? [["X", "Z"], ["X", "Y"]] : [["Z", "X"], ["Y", "X"]];
  const nodes: GNode[] = [{ id: "Z", x: 70, y: 70 }, { id: "X", x: 200, y: 70 }, { id: "Y", x: 330, y: 70 }];
  const factor = st === "chain" ? "P(z) P(x | z) P(y | x)" : st === "fork" ? "P(x) P(z | x) P(y | x)" : "P(z) P(y) P(x | z, y)";
  const params = st === "collider" ? "1 + 1 + 4 = 6" : "1 + 2 + 2 = 5";
  const maxP = Math.max(...Object.values(joint));
  return (
    <SimShell note="Three binary variables with X in the middle. The joint table is built from the factorisation. Compare how Z predicts Y overall and within each value of X: chains and forks make the within-X differences zero; a collider makes the overall difference zero instead. (In the collider, Y is a fair coin and the sliders set how Z and Y raise X.)">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Seg value={st} onChange={setSt} options={[{ value: "chain", label: "Chain Z → X → Y" }, { value: "fork", label: "Fork Z ← X → Y" }, { value: "collider", label: "Collider Z → X ← Y" }]} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div>
          <DagView nodes={nodes} edges={edges} width={400} height={130} />
          <div className="mb-2 text-center font-mono text-sm">P(z, x, y) = {factor}</div>
          <table className="w-full text-xs">
            <thead><tr className="faint"><th>z</th><th>x</th><th>y</th><th className="text-left">P(z, x, y)</th></tr></thead>
            <tbody>{Object.entries(joint).map(([k, v]) => (
              <tr key={k}><td className="text-center font-mono">{k[0]}</td><td className="text-center font-mono">{k[1]}</td><td className="text-center font-mono">{k[2]}</td>
                <td><div className="flex items-center gap-2"><div style={{ width: `${(v / maxP) * 70}%`, height: 10, background: C1, opacity: 0.7, borderRadius: 3 }} /><span className="font-mono">{v.toFixed(3)}</span></div></td></tr>
            ))}</tbody>
          </table>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Slider label={st === "fork" ? "P(X = 1)" : "P(Z = 1)"} value={p0} min={0.05} max={0.95} step={0.05} onChange={setP0} format={(v) => v.toFixed(2)} />
            <div />
            <Slider label={st === "collider" ? "effect of Z on X" : st === "fork" ? "P(Z=1 | X=0)" : "P(X=1 | Z=0)"} value={st === "collider" ? a1 - a0 : a0} min={st === "collider" ? -0.5 : 0.05} max={st === "collider" ? 0.5 : 0.95} step={0.05}
              onChange={(v) => (st === "collider" ? (setA0(0), setA1(v)) : setA0(v))} format={(v) => v.toFixed(2)} />
            {st !== "collider" ? <Slider label={st === "fork" ? "P(Z=1 | X=1)" : "P(X=1 | Z=1)"} value={a1} min={0.05} max={0.95} step={0.05} onChange={setA1} format={(v) => v.toFixed(2)} /> : <div />}
            <Slider label={st === "collider" ? "P(X = 1) baseline" : "P(Y=1 | X=0)"} value={b0} min={0.05} max={0.95} step={0.05} onChange={setB0} format={(v) => v.toFixed(2)} />
            <Slider label={st === "collider" ? "P(X=1) with Y=1, Z=0" : "P(Y=1 | X=1)"} value={b1} min={0.05} max={0.95} step={0.05} onChange={setB1} format={(v) => v.toFixed(2)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Z → Y overall" value={fmt(marg, 3)} sub="P(Y|Z=1) − P(Y|Z=0)" color={Math.abs(marg) < 1e-9 ? C3 : C2} />
            <Stat label="within X = 0" value={fmt(within0, 3)} color={Math.abs(within0) < 1e-9 ? C3 : C2} />
            <Stat label="within X = 1" value={fmt(within1, 3)} color={Math.abs(within1) < 1e-9 ? C3 : C2} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="parameters, factorised" value={params} />
            <Stat label="parameters, unrestricted" value="2³ − 1 = 7" />
          </div>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 48: chains, forks, colliders ---------------- */
export function JunctionsLab() {
  const [st, setSt] = useState<Struct>("collider");
  const [a, setA] = useState(0.7), [b, setB] = useState(0.7);
  const [keep, setKeep] = useState(0.25);
  const [seed, reseed] = useSeed();
  const data = useMemo(() => {
    const r = rng(seed * 11 + 48);
    return Array.from({ length: 1500 }, () => {
      let A: number, B: number, M: number;
      if (st === "chain") { A = r.n(); M = a * A + Math.sqrt(1 - a * a) * r.n(); B = b * M + Math.sqrt(1 - b * b) * r.n(); }
      else if (st === "fork") { M = r.n(); A = a * M + Math.sqrt(1 - a * a) * r.n(); B = b * M + Math.sqrt(1 - b * b) * r.n(); }
      else { A = r.n(); B = r.n(); M = a * A + b * B + Math.sqrt(Math.max(0.05, 1 - a * a - b * b)) * r.n(); }
      return { A, B, M };
    });
  }, [st, a, b, seed]);
  const cutoff = useMemo(() => [...data.map((d) => d.M)].sort((x, y) => x - y)[Math.floor((1 - keep) * (data.length - 1))], [data, keep]);
  const kept = data.filter((d) => d.M >= cutoff);
  const rAll = corr(data.map((d) => d.A), data.map((d) => d.B));
  const rKept = corr(kept.map((d) => d.A), kept.map((d) => d.B));
  // partial correlation given M
  const pc = (() => {
    const rab = rAll, ram = corr(data.map((d) => d.A), data.map((d) => d.M)), rbm = corr(data.map((d) => d.B), data.map((d) => d.M));
    return (rab - ram * rbm) / Math.sqrt((1 - ram * ram) * (1 - rbm * rbm));
  })();
  const labels = st === "collider" ? ["Ability", "Connections", "Hired"] : st === "fork" ? ["Gym use", "Health", "Income"] : ["Training", "Wage", "Skills"];
  const edges: Edge[] = st === "chain" ? [["A", "M"], ["M", "B"]] : st === "fork" ? [["M", "A"], ["M", "B"]] : [["A", "M"], ["B", "M"]];
  const nodes: GNode[] = [{ id: "A", label: labels[0], x: 70, y: 60 }, { id: "M", label: labels[2], x: 210, y: 60 }, { id: "B", label: labels[1], x: 350, y: 60 }];
  return (
    <SimShell note="1,500 simulated people. Keep only those with the highest values of the middle variable (selection), and compare the correlation of the two outer variables in the kept group with the full population and with the partial correlation from regression. Chains and forks lose their association; colliders gain one.">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Seg value={st} onChange={setSt} options={[{ value: "chain", label: "Chain: training → skills → wage" }, { value: "fork", label: "Fork: gym ← income → health" }, { value: "collider", label: "Collider: ability → hired ← connections" }]} />
        <button className="btn" onClick={reseed}>New sample</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <Plot x={[-3.5, 3.5]} y={[-3.5, 3.5]} height={320} xLabel={labels[0]} yLabel={labels[1]}>
          {(sx, sy) => (
            <>
              {data.map((d, i) => <circle key={i} cx={sx(Math.max(-3.5, Math.min(3.5, d.A)))} cy={sy(Math.max(-3.5, Math.min(3.5, d.B)))} r={2.2}
                fill={d.M >= cutoff ? C2 : "var(--text-3)"} opacity={d.M >= cutoff ? 0.7 : 0.25} />)}
            </>
          )}
        </Plot>
        <div className="space-y-3">
          <DagView nodes={nodes} edges={edges} width={420} height={120} nodeStyle={(v) => (v === "M" && keep < 1 ? { fill: soft(C2, 30), stroke: C2 } : undefined)} />
          <Slider label="coefficient into / out of the middle (left)" value={a} min={0} max={0.95} step={0.05} onChange={setA} format={(v) => v.toFixed(2)} />
          <Slider label="coefficient (right)" value={b} min={0} max={0.95} step={0.05} onChange={setB} format={(v) => v.toFixed(2)} />
          <Slider label={`Keep the top share of "${labels[2]}"`} value={keep} min={0.05} max={1} step={0.05} onChange={setKeep} format={(v) => `${(100 * v).toFixed(0)}%`} />
          <div className="grid grid-cols-3 gap-2">
            <Stat label="corr, everyone" value={fmt(rAll)} />
            <Stat label="corr, kept group" value={fmt(rKept)} color={C2} />
            <Stat label="partial corr | middle" value={fmt(pc)} color={C4} />
          </div>
        </div>
      </div>
      <Legend items={[{ color: C2, label: "kept (selected on the middle variable)" }, { color: "var(--text-3)", label: "dropped" }]} />
    </SimShell>
  );
}

/* ---------------- Day 49: d-separation ---------------- */
const MEAL_NODES: GNode[] = [
  { id: "I", label: "Income", x: 80, y: 60 }, { id: "M", label: "Meals", x: 80, y: 200 },
  { id: "A", label: "Attendance", x: 300, y: 60 }, { id: "N", label: "Nutrition", x: 260, y: 200 },
  { id: "T", label: "Test score", x: 480, y: 200 }, { id: "R", label: "Rainfall", x: 500, y: 60 },
  { id: "C", label: "Clinic visit", x: 260, y: 300 },
];
const MEAL_EDGES: Edge[] = [["I", "M"], ["I", "A"], ["M", "N"], ["N", "T"], ["A", "T"], ["R", "A"], ["N", "C"], ["T", "C"]];

export function DSepLab() {
  const [mode, setMode] = useState<"x" | "y" | "z">("z");
  const [x, setX] = useState("M"), [y, setY] = useState("R");
  const [Z, setZ] = useState<string[]>(["T"]);
  const lab = (v: string) => MEAL_NODES.find((n) => n.id === v)!.label!;
  const click = (v: string) => {
    if (mode === "x" && v !== y) { setX(v); setZ((z) => z.filter((u) => u !== v)); }
    else if (mode === "y" && v !== x) { setY(v); setZ((z) => z.filter((u) => u !== v)); }
    else if (mode === "z" && v !== x && v !== y) setZ((z) => (z.includes(v) ? z.filter((u) => u !== v) : [...z, v]));
  };
  const Zs = new Set(Z);
  const paths = allPaths(MEAL_EDGES, x, y);
  const info = paths.map((p) => ({ p, block: blockingNode(MEAL_EDGES, p, Zs), rs: roles(p) }));
  const sep = info.every((i) => i.block >= 0);
  const openEdges = new Set<number>();
  info.filter((i) => i.block < 0).forEach((i) => i.p.edges.forEach((e) => openEdges.add(MEAL_EDGES.indexOf(e))));
  return (
    <SimShell note="Pick the two variables and click nodes to add or remove them from the conditioning set. Every path between the two is listed with its junctions; a path is blocked by a conditioned chain or fork, or by a collider with nothing conditioned at or below it. Open paths are drawn in orange.">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <span className="faint">Clicking a node sets</span>
        <Seg value={mode} onChange={setMode} options={[{ value: "x", label: "first variable" }, { value: "y", label: "second variable" }, { value: "z", label: "conditioning set" }]} />
        <button className="btn" onClick={() => setZ([])}>Clear conditioning</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <DagView nodes={MEAL_NODES} edges={MEAL_EDGES} width={600} height={340} onNode={click}
          nodeStyle={(v) => (v === x ? { fill: soft(C1, 35), stroke: C1 } : v === y ? { fill: soft(C3, 35), stroke: C3 } : Zs.has(v) ? { fill: "var(--text-3)", stroke: "var(--text-2)", text: "var(--surface)" } : undefined)}
          edgeStyle={(_e, i) => (openEdges.has(i) ? { color: C2, width: 3.2 } : { opacity: 0.6 })} />
        <div className="space-y-3 text-sm">
          <div className="rounded-lg px-3 py-2" style={{ background: sep ? soft(C3, 20) : soft(C2, 20) }}>
            <b>{lab(x)}</b> and <b>{lab(y)}</b> are <b>{sep ? "d-separated" : "d-connected"}</b> given {Z.length ? `{${Z.map(lab).join(", ")}}` : "nothing"}.
          </div>
          <div className="space-y-1.5">
            {info.map(({ p, block, rs }, k) => (
              <div key={k} className="rounded-md px-2 py-1.5" style={{ background: "var(--surface-2)", borderLeft: `4px solid ${block < 0 ? C2 : "var(--text-3)"}` }}>
                <div className="font-mono text-xs">{pathText(p, lab)}</div>
                <div className="text-xs muted">
                  {rs.map((r, j) => `${lab(p.nodes[j + 1])}: ${r}`).join(" · ") || "direct edge"} —{" "}
                  {block < 0 ? <b style={{ color: C2 }}>open</b> : <>blocked at <b>{lab(p.nodes[block])}</b></>}
                </div>
              </div>
            ))}
          </div>
          <div className="text-xs muted">Try: Meals and Rainfall given nothing, then given Test score (a collider's descendant), then add Attendance.</div>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 50: a linear SCM ---------------- */
export function ScmLab() {
  const [a, setA] = useState(2);         // ability -> schooling
  const [c, setC] = useState(0.1);       // ability -> log wage
  const [beta, setBeta] = useState(0.08); // schooling -> log wage
  const [sU, setSU] = useState(2);       // sd of U_S
  const [seed, reseed] = useSeed();
  const varS = a * a + sU * sU, covSA = a;
  const shortSlope = beta + (c * covSA) / varS;
  const data = useMemo(() => {
    const r = rng(seed * 5 + 50);
    return Array.from({ length: 700 }, () => {
      const A = r.n(), S = 12 + a * A + sU * r.n(), W = 1.5 + beta * S + c * A + 0.25 * r.n();
      return { A, S, W };
    });
  }, [a, c, beta, sU, seed]);
  const mS = 12, mW = 1.5 + beta * 12;
  return (
    <SimShell note="Structural equations: Ability A ~ N(0, 1); Schooling S := 12 + a·A + U_S; log wage := 1.5 + β·S + c·A + U_W. The regression of log wages on schooling alone (orange) has slope β + c·a / Var(S); the structural effect is β (green). Colour shows ability.">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Plot x={[4, 20]} y={[mW - 1.2, mW + 1.2]} height={320} xLabel="years of schooling S" yLabel="log wage">
          {(sx, sy) => (
            <>
              {data.map((d, i) => <circle key={i} cx={sx(Math.max(4, Math.min(20, d.S)))} cy={sy(Math.max(mW - 1.2, Math.min(mW + 1.2, d.W)))} r={2.3}
                fill={d.A > 0.5 ? C4 : d.A < -0.5 ? C1 : "var(--text-3)"} opacity={0.5} />)}
              <line x1={sx(4)} x2={sx(20)} y1={sy(mW + shortSlope * (4 - mS))} y2={sy(mW + shortSlope * (20 - mS))} stroke={C2} strokeWidth={3} />
              <line x1={sx(4)} x2={sx(20)} y1={sy(mW + beta * (4 - mS))} y2={sy(mW + beta * (20 - mS))} stroke={C3} strokeWidth={3} strokeDasharray="7 4" />
            </>
          )}
        </Plot>
        <div className="space-y-3">
          <DagView nodes={[{ id: "A", label: "Ability", x: 210, y: 35 }, { id: "S", label: "Schooling", x: 80, y: 110 }, { id: "W", label: "Log wage", x: 340, y: 110 }]}
            edges={[["A", "S"], ["A", "W"], ["S", "W"]]} width={420} height={145} />
          <div className="grid grid-cols-2 gap-3">
            <Slider label="a: ability → schooling" value={a} min={0} max={3} step={0.1} onChange={setA} />
            <Slider label="c: ability → wage" value={c} min={-0.2} max={0.3} step={0.01} onChange={setC} />
            <Slider label="β: schooling → wage" value={beta} min={0} max={0.15} step={0.005} onChange={setBeta} format={(v) => v.toFixed(3)} />
            <Slider label="sd of U_S" value={sU} min={0.5} max={4} step={0.1} onChange={setSU} />
          </div>
          <button className="btn" onClick={reseed}>New sample</button>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="structural β" value={fmt(beta, 3)} color={C3} />
            <Stat label="short regression" value={fmt(shortSlope, 3)} color={C2} sub="β + c·a/Var(S)" />
            <Stat label="ability bias" value={fmt(shortSlope - beta, 3)} sub={`Var(S) = ${fmt(varS, 2)}`} />
          </div>
        </div>
      </div>
      <Legend items={[{ color: C2, label: "regression on schooling only" }, { color: C3, label: "structural effect β", dash: true }, { color: C4, label: "high ability" }, { color: C1, label: "low ability" }]} />
    </SimShell>
  );
}

