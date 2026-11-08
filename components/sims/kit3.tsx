"use client";
/** Graph engine and DAG renderer for the Phase 4 simulators. */
import type { ReactNode } from "react";

export type EdgeType = "d" | "b";              // directed (a -> b) or bidirected (a <-> b)
export type Edge = [string, string, EdgeType?];
export type GNode = { id: string; label?: string; x: number; y: number; sub?: string };

const typ = (e: Edge): EdgeType => e[2] ?? "d";

/** Directed children / parents. */
export const childrenOf = (edges: Edge[], v: string) => edges.filter((e) => typ(e) === "d" && e[0] === v).map((e) => e[1]);
export const parentsOf = (edges: Edge[], v: string) => edges.filter((e) => typ(e) === "d" && e[1] === v).map((e) => e[0]);

export function descendants(edges: Edge[], v: string): Set<string> {
  const out = new Set<string>([v]);
  const stack = [v];
  while (stack.length) {
    const u = stack.pop()!;
    for (const c of childrenOf(edges, u)) if (!out.has(c)) { out.add(c); stack.push(c); }
  }
  return out;
}
export function ancestors(edges: Edge[], v: string): Set<string> {
  const out = new Set<string>([v]);
  const stack = [v];
  while (stack.length) {
    const u = stack.pop()!;
    for (const p of parentsOf(edges, u)) if (!out.has(p)) { out.add(p); stack.push(p); }
  }
  return out;
}

/** A path is a list of nodes plus the edges used between consecutive nodes. */
export type Path = { nodes: string[]; edges: Edge[] };

/** All simple paths between x and y in the skeleton (directions ignored). */
export function allPaths(edges: Edge[], x: string, y: string, maxLen = 12): Path[] {
  const out: Path[] = [];
  const rec = (v: string, nodes: string[], used: Edge[]) => {
    if (v === y) { out.push({ nodes: [...nodes], edges: [...used] }); return; }
    if (nodes.length > maxLen) return;
    for (const e of edges) {
      let w: string | null = null;
      if (e[0] === v) w = e[1]; else if (e[1] === v) w = e[0];
      if (w === null || nodes.includes(w)) continue;
      nodes.push(w); used.push(e);
      rec(w, nodes, used);
      nodes.pop(); used.pop();
    }
  };
  rec(x, [x], []);
  return out;
}

/** Does edge e have an arrowhead at node v? */
const headAt = (e: Edge, v: string) => (typ(e) === "b" ? e[0] === v || e[1] === v : e[1] === v);

export type NodeRole = "chain" | "fork" | "collider";
export function roles(p: Path): NodeRole[] {
  const r: NodeRole[] = [];
  for (let i = 1; i < p.nodes.length - 1; i++) {
    const v = p.nodes[i], a = headAt(p.edges[i - 1], v), b = headAt(p.edges[i], v);
    r.push(a && b ? "collider" : !a && !b ? "fork" : "chain");
  }
  return r;
}

/** Is the path open given Z? Returns the index (in p.nodes) of the first blocking node, or -1. */
export function blockingNode(edges: Edge[], p: Path, Z: Set<string>): number {
  const rs = roles(p);
  for (let i = 1; i < p.nodes.length - 1; i++) {
    const v = p.nodes[i];
    if (rs[i - 1] === "collider") {
      const d = descendants(edges, v);
      if (![...d].some((u) => Z.has(u))) return i;
    } else if (Z.has(v)) return i;
  }
  return -1;
}

export function dsep(edges: Edge[], x: string, y: string, Z: Set<string>) {
  return allPaths(edges, x, y).every((p) => blockingNode(edges, p, Z) >= 0);
}

/** Is the directed part acyclic? Returns a cycle (list of nodes) if not. */
export function findCycle(nodes: string[], edges: Edge[]): string[] | null {
  const state: Record<string, number> = {};
  const stack: string[] = [];
  let cyc: string[] | null = null;
  const dfs = (v: string) => {
    state[v] = 1; stack.push(v);
    for (const c of childrenOf(edges, v)) {
      if (cyc) return;
      if (state[c] === 1) { cyc = [...stack.slice(stack.indexOf(c)), c]; return; }
      if (!state[c]) dfs(c);
    }
    stack.pop(); state[v] = 2;
  };
  for (const v of nodes) if (!state[v] && !cyc) dfs(v);
  return cyc;
}

export function topoOrder(nodes: string[], edges: Edge[]): string[] | null {
  const indeg: Record<string, number> = Object.fromEntries(nodes.map((v) => [v, 0]));
  edges.filter((e) => typ(e) === "d").forEach((e) => (indeg[e[1]] += 1));
  const q = nodes.filter((v) => indeg[v] === 0), out: string[] = [];
  while (q.length) {
    const v = q.shift()!; out.push(v);
    for (const c of childrenOf(edges, v)) if (--indeg[c] === 0) q.push(c);
  }
  return out.length === nodes.length ? out : null;
}

/** c-components (districts): connected components of the bidirected edges. */
export function districts(nodes: string[], edges: Edge[]): string[][] {
  const seen = new Set<string>(), out: string[][] = [];
  for (const v of nodes) {
    if (seen.has(v)) continue;
    const comp: string[] = [], st = [v]; seen.add(v);
    while (st.length) {
      const u = st.pop()!; comp.push(u);
      for (const e of edges) if (typ(e) === "b") {
        const w = e[0] === u ? e[1] : e[1] === u ? e[0] : null;
        if (w && !seen.has(w)) { seen.add(w); st.push(w); }
      }
    }
    out.push(comp);
  }
  return out;
}

/** Remove arrows into `into` and out of `outOf`. */
export function cut(edges: Edge[], into: string[] = [], outOf: string[] = []): Edge[] {
  return edges.filter((e) => {
    if (typ(e) === "b") return !(into.includes(e[0]) || into.includes(e[1]));
    return !(into.includes(e[1]) || outOf.includes(e[0]));
  });
}

/* ---------------- rendering ---------------- */

export type NodeStyle = { fill?: string; stroke?: string; text?: string; dashed?: boolean; ring?: string };

export function DagView(props: {
  nodes: GNode[]; edges: Edge[]; width?: number; height?: number;
  nodeStyle?: (id: string) => NodeStyle | undefined;
  edgeStyle?: (e: Edge, i: number) => { color?: string; width?: number; dash?: string; opacity?: number } | undefined;
  onNode?: (id: string) => void; children?: ReactNode;
}) {
  const { nodes, edges, width = 600, height = 300 } = props;
  const pos = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const size = (n: GNode) => {
    const L = (n.label ?? n.id).length;
    return { hw: Math.max(22, 4.6 * L + 12), hh: n.sub ? 22 : 17 };
  };
  const clipTo = (from: GNode, to: GNode, pad = 3) => {
    const { hw, hh } = size(to);
    const dx = from.x - to.x, dy = from.y - to.y;
    const t = Math.min(dx ? (hw + pad) / Math.abs(dx) : Infinity, dy ? (hh + pad) / Math.abs(dy) : Infinity);
    return { x: to.x + dx * Math.min(1, t), y: to.y + dy * Math.min(1, t) };
  };
  const id = "ah" + Math.round(width * 7 + height);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full select-none" style={{ maxHeight: height * 1.4 }}>
      <defs>
        {["var(--text-2)", "var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--text-3)", "#d03b3b"].map((c, i) => (
          <marker key={i} id={`${id}-${i}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={c} />
          </marker>
        ))}
      </defs>
      {edges.map((e, i) => {
        const a = pos[e[0]], b = pos[e[1]];
        if (!a || !b) return null;
        const st = props.edgeStyle?.(e, i) ?? {};
        const color = st.color ?? "var(--text-2)";
        const mk = ["var(--text-2)", "var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--text-3)", "#d03b3b"].indexOf(color);
        const marker = `url(#${id}-${mk < 0 ? 0 : mk})`;
        if (typ(e) === "b") {
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
          const bend = Math.min(60, L * 0.3);
          const cx = mx - (dy / L) * bend, cy = my + (dx / L) * bend;
          const p0 = clipTo({ ...a, x: cx, y: cy } as GNode, a), p1 = clipTo({ ...b, x: cx, y: cy } as GNode, b);
          return <path key={i} d={`M${p0.x},${p0.y} Q${cx},${cy} ${p1.x},${p1.y}`} fill="none" stroke={color} strokeWidth={st.width ?? 1.8}
            strokeDasharray={st.dash ?? "6 4"} opacity={st.opacity ?? 1} markerStart={marker} markerEnd={marker} />;
        }
        const p0 = clipTo(b, a), p1 = clipTo(a, b);
        return <line key={i} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={color} strokeWidth={st.width ?? 1.8}
          strokeDasharray={st.dash} opacity={st.opacity ?? 1} markerEnd={marker} />;
      })}
      {nodes.map((n) => {
        const st = props.nodeStyle?.(n.id) ?? {};
        const { hw, hh } = size(n);
        return (
          <g key={n.id} onClick={() => props.onNode?.(n.id)} style={{ cursor: props.onNode ? "pointer" : undefined }}>
            {st.ring && <rect x={n.x - hw - 4} y={n.y - hh - 4} width={2 * hw + 8} height={2 * hh + 8} rx={hh + 4} fill="none" stroke={st.ring} strokeWidth={2.5} />}
            <rect x={n.x - hw} y={n.y - hh} width={2 * hw} height={2 * hh} rx={hh}
              fill={st.fill ?? "var(--surface)"} stroke={st.stroke ?? "var(--text-2)"} strokeWidth={1.6} strokeDasharray={st.dashed ? "4 3" : undefined} />
            <text x={n.x} y={n.sub ? n.y - 2 : n.y + 4.5} textAnchor="middle" style={{ fill: st.text ?? "var(--text)", fontWeight: 700, fontSize: 13 }}>{n.label ?? n.id}</text>
            {n.sub && <text x={n.x} y={n.y + 12} textAnchor="middle" style={{ fill: st.text ?? "var(--text-2)", fontSize: 10 }}>{n.sub}</text>}
          </g>
        );
      })}
      {props.children}
    </svg>
  );
}

/** Render a path as text, e.g. "X ← Z → Y". */
export function pathText(p: Path, label: (v: string) => string = (v) => v) {
  let s = label(p.nodes[0]);
  for (let i = 0; i < p.edges.length; i++) {
    const e = p.edges[i], a = p.nodes[i], b = p.nodes[i + 1];
    const arrow = typ(e) === "b" ? "↔" : e[0] === a ? "→" : "←";
    s += ` ${arrow} ${label(b)}`;
  }
  return s;
}

/* ---------------- linear SEM helpers ---------------- */

/** Covariance of a linear SEM V = B V + e with Var(e) = diag(omega), nodes in topological order. B[i][j] = effect of j on i. */
export function semCov(B: number[][], omega: number[]): number[][] {
  const n = omega.length;
  // T = (I - B)^-1 by forward substitution (B strictly lower triangular in topological order)
  const T: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) {
    let s = 0;
    for (let k = j; k < i; k++) s += B[i][k] * T[k][j];
    T[i][j] = s;
  }
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => {
    let s = 0;
    for (let k = 0; k < n; k++) s += T[i][k] * omega[k] * T[j][k];
    return s;
  }));
}

/** Total effects matrix (I - B)^-1 for a lower-triangular B. */
export function totalEffects(B: number[][]): number[][] {
  const n = B.length;
  const T: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) {
    let s = 0;
    for (let k = j; k < i; k++) s += B[i][k] * T[k][j];
    T[i][j] = s;
  }
  return T;
}

/** Population regression of index y on indices xs from a covariance matrix: returns coefficients and residual variance. */
export function popRegression(S: number[][], y: number, xs: number[]) {
  const k = xs.length;
  const A = xs.map((i) => xs.map((j) => S[i][j]));
  const b = xs.map((i) => S[i][y]);
  // solve A c = b (small Gaussian elimination)
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < k; c++) {
    let p = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < k; r++) if (r !== c) {
      const f = M[r][c] / (M[c][c] || 1e-12);
      for (let q = c; q <= k; q++) M[r][q] -= f * M[c][q];
    }
  }
  const coef = M.map((r, i) => r[k] / (r[i] || 1e-12));
  const resid = S[y][y] - coef.reduce((s, c, i) => s + c * b[i], 0);
  return { coef, resid };
}
