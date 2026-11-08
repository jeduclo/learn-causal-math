"use client";
import { useMemo, useState } from "react";
import { Legend, Plot, Seg, SimShell, Slider, Stat, fmt, normCdf, rng, useSeed } from "./kit";
import { avg, logitFit, logistic, ols, solve } from "./kit2";
import { ess, wmean } from "./sims17";

const C1 = "var(--s1)", C2 = "var(--s2)", C3 = "var(--s3)", C4 = "var(--s4)";

/* ---------------- Day 96: dynamic treatments ---------------- */
export function DynamicLab() {
  const [u, setU] = useState(1), [kap, setKap] = useState(1), [resp, setResp] = useState(2), [seed, reseed] = useSeed();
  const res = useMemo(() => {
    const r = rng(seed * 61 + 96), n = 20000;
    const A0: number[] = [], L1: number[] = [], A1: number[] = [], Y: number[] = [];
    for (let i = 0; i < n; i++) {
      const U = r.n(), a0 = r.u() < 0.5 ? 1 : 0, l1 = r.u() < logistic(-0.5 - kap * a0 + u * U) ? 1 : 0;
      const a1 = r.u() < logistic(-1 + resp * l1) ? 1 : 0;
      A0.push(a0); L1.push(l1); A1.push(a1); Y.push(10 - a0 - a1 + 2 * u * U + r.n());
    }
    const withL = ols(Y.map((_, i) => [1, A0[i], A1[i], L1[i]]), Y), noL = ols(Y.map((_, i) => [1, A0[i], A1[i]]), Y);
    const m = (a: number, l: number, b: number) => avg(Y.filter((_, i) => A0[i] === a && L1[i] === l && A1[i] === b));
    const pL = [0, 1].map((a) => avg(L1.filter((_, i) => A0[i] === a)));
    const g = (a: number, b: number) => pL[a] * m(a, 1, b) + (1 - pL[a]) * m(a, 0, b);
    const gA0 = (g(1, 0) - g(0, 0) + g(1, 1) - g(0, 1)) / 2, gA1 = (g(0, 1) - g(0, 0) + g(1, 1) - g(1, 0)) / 2;
    const pA1 = new Map<string, number>();
    for (const a of [0, 1]) for (const l of [0, 1]) pA1.set(`${a}${l}`, avg(A1.filter((_, i) => A0[i] === a && L1[i] === l)));
    const w = Y.map((_, i) => { const p = pA1.get(`${A0[i]}${L1[i]}`)!; return 1 / (0.5 * (A1[i] ? p : 1 - p)); });
    const sw = w.map(Math.sqrt);
    const msm = ols(Y.map((_, i) => [sw[i], sw[i] * A0[i], sw[i] * A1[i]]), Y.map((y, i) => y * sw[i]));
    return {
      rows: [
        { name: "regression with L₁", a0: withL[1], a1: withL[2] },
        { name: "regression without L₁", a0: noL[1], a1: noL[2] },
        { name: "g-formula", a0: gA0, a1: gA1 },
        { name: "IPTW marginal structural model", a0: msm[1], a1: msm[2] },
      ],
      maxw: Math.max(...w),
    };
  }, [u, kap, resp, seed]);
  const lo = Math.min(-2, ...res.rows.flatMap((r) => [r.a0, r.a1])) - 0.2, hi = Math.max(0.3, ...res.rows.flatMap((r) => [r.a0, r.a1])) + 0.2;
  return (
    <SimShell note="Two visits: baseline treatment A₀ (randomised), blood pressure L₁ at the next visit, intensified treatment A₁ (more likely if L₁ is high), then a cardiovascular risk score. Both treatments truly lower the score by 1. Hidden frailty raises both L₁ and the score. A regression that adjusts for L₁ biases A₀'s effect; one that ignores L₁ biases A₁'s. The g-formula and inverse-probability weighting get both right.">
      <Plot x={[lo, hi]} y={[-0.6, 3.6]} height={250} xLabel="estimated effect on risk score" yTicks={[0, 1, 2, 3]} yFormat={(v) => ["IPTW", "g-form", "no L₁", "adj L₁"][Math.round(v)] ?? ""}>
        {(sx, sy) => (
          <>
            <line x1={sx(-1)} x2={sx(-1)} y1={sy(-0.6)} y2={sy(3.6)} stroke={C3} strokeWidth={2} strokeDasharray="5 4" />
            {res.rows.map((rw, k) => {
              const y = 3 - k;
              return (
                <g key={k}>
                  <circle cx={sx(rw.a0)} cy={sy(y + 0.12)} r={7} fill={C1} />
                  <circle cx={sx(rw.a1)} cy={sy(y - 0.12)} r={7} fill={C2} />
                </g>
              );
            })}
          </>
        )}
      </Plot>
      <Legend items={[{ color: C1, label: "effect of A₀ (baseline)" }, { color: C2, label: "effect of A₁ (intensified)" }, { color: C3, label: "truth −1", dash: true }]} />
      <div className="mt-3 grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <div className="grid grid-cols-2 gap-3">
          <Slider label="Strength of hidden frailty" value={u} min={0} max={2} step={0.1} onChange={setU} />
          <Slider label="Effect of A₀ on blood pressure L₁" value={kap} min={0} max={2} step={0.1} onChange={setKap} />
          <Slider label="Doctors' response to high L₁" value={resp} min={0} max={4} step={0.1} onChange={setResp} />
          <button className="btn w-fit" onClick={reseed}>New sample</button>
        </div>
        <div className="grid grid-cols-2 content-start gap-2">
          {res.rows.slice(0, 2).map((rw) => <Stat key={rw.name} label={rw.name} value={`${fmt(rw.a0, 2)} · ${fmt(rw.a1, 2)}`} sub="A₀ · A₁" />)}
          <Stat label="g-formula" value={`${fmt(res.rows[2].a0, 2)} · ${fmt(res.rows[2].a1, 2)}`} color={C1} sub="A₀ · A₁" />
          <Stat label="largest IPT weight" value={fmt(res.maxw, 1)} />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 97: interference ---------------- */
export function InterferenceLab() {
  const [tau, setTau] = useState(1), [gam, setGam] = useState(2), [m, setM] = useState(8), [seed, reseed] = useSeed();
  const res = useMemo(() => {
    const r = rng(seed * 67 + 97), G = 600;
    const rows: { s: number; d: number; y: number; v: number }[] = [];
    const ex: number[][] = [];
    for (let g = 0; g < G; g++) {
      const a = [0, 0.25, 0.75][Math.floor(r.u() * 3)], k = Math.round(a * m);
      const d: number[] = Array.from({ length: m }, (_, i) => (i < k ? 1 : 0));
      for (let i = m - 1; i > 0; i--) { const j = Math.floor(r.u() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
      const shock = 0.5 * r.n();
      d.forEach((di) => rows.push({ s: a, d: di, y: 5 + tau * di + (gam * (k - di)) / (m - 1) + shock + r.n(), v: g }));
      if (ex.length < 3 && [0, 0.25, 0.75][ex.length] === a) ex.push(d);
    }
    const mean = (f: (q: (typeof rows)[number]) => boolean) => avg(rows.filter(f).map((q) => q.y));
    const y0 = mean((q) => q.s === 0);
    const out = [0.25, 0.75].map((a) => {
      const k = Math.round(a * m), aa = k / m;
      const y1 = mean((q) => q.s === a && q.d === 1), yu = mean((q) => q.s === a && q.d === 0), ya = mean((q) => q.s === a);
      return {
        a, est: [y1 - yu, yu - y0, y1 - y0, ya - y0],
        tru: [tau - gam / (m - 1), (gam * k) / (m - 1), tau + (gam * (k - 1)) / (m - 1), aa * (tau + (gam * (k - 1)) / (m - 1)) + (1 - aa) * (gam * k) / (m - 1)],
      };
    });
    return { out, naive: mean((q) => q.d === 1) - mean((q) => q.d === 0), ex };
  }, [tau, gam, m, seed]);
  const names = ["direct", "indirect", "total", "overall"];
  const top = Math.max(...res.out.flatMap((o) => [...o.est, ...o.tru])) * 1.15 + 0.1, bot = Math.min(0, ...res.out.flatMap((o) => [...o.est, ...o.tru])) - 0.1;
  return (
    <SimShell note="A deworming programme randomises villages to 0%, 25% or 75% coverage, then households within villages. Treated households benefit directly; everyone benefits from treated neighbours. Bars: estimates; ticks: truth. The pooled treated-versus-untreated comparison matches none of the policy-relevant effects; with spillovers, the overall effect of high coverage far exceeds the direct effect.">
      <div className="mb-2 flex flex-wrap gap-4 text-xs muted">
        {res.ex.map((d, k) => (
          <span key={k} className="flex items-center gap-1">
            {["0%", "25%", "75%"][k]} village:
            {d.map((v, i) => <svg key={i} width="12" height="12"><rect x="1" y="1" width="10" height="10" rx="2" fill={v ? C1 : "none"} stroke={v ? C1 : "var(--text-3)"} /></svg>)}
          </span>
        ))}
      </div>
      <Plot x={[0, 8]} y={[bot, top]} height={260} xTicks={[]} yLabel="effect on health index">
        {(sx, sy) => (
          <>
            <line x1={sx(0)} x2={sx(8)} y1={sy(0)} y2={sy(0)} stroke="var(--text-3)" />
            {res.out.flatMap((o, oi) => o.est.map((v, q) => {
              const x = oi * 4 + q + 0.15;
              return (
                <g key={`${oi}${q}`}>
                  <rect x={sx(x)} width={sx(0.7) - sx(0)} y={sy(Math.max(0, v))} height={Math.abs(sy(v) - sy(0))} fill={[C2, C4, C1, C3][q]} rx={3} opacity={0.85} />
                  <line x1={sx(x - 0.05)} x2={sx(x + 0.75)} y1={sy(o.tru[q])} y2={sy(o.tru[q])} stroke="var(--text)" strokeWidth={2.5} />
                  <text x={sx(x + 0.35)} y={sy(bot) + 16} textAnchor="middle">{names[q]}</text>
                </g>
              );
            }))}
            {res.out.map((o, oi) => <text key={oi} x={sx(oi * 4 + 2)} y={sy(top) + 14} textAnchor="middle" style={{ fontWeight: 600 }}>{`saturation ${o.a * 100}%`}</text>)}
          </>
        )}
      </Plot>
      <div className="mt-3 grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <div className="grid grid-cols-2 gap-3">
          <Slider label="Direct effect τ" value={tau} min={0} max={3} step={0.1} onChange={setTau} />
          <Slider label="Spillover γ (× share of others treated)" value={gam} min={-1} max={4} step={0.1} onChange={setGam} />
          <Slider label="Households per village" value={m} min={4} max={20} step={4} onChange={setM} />
          <button className="btn w-fit" onClick={reseed}>New sample</button>
        </div>
        <div className="grid grid-cols-2 content-start gap-2">
          <Stat label="pooled treated vs untreated" value={fmt(res.naive, 2)} color="var(--text-3)" />
          <Stat label="overall effect, 75%" value={fmt(res.out[1].est[3], 2)} color={C3} sub={`truth ${fmt(res.out[1].tru[3], 2)}`} />
          <Stat label="direct effect, 75%" value={fmt(res.out[1].est[0], 2)} color={C2} sub={`truth ${fmt(res.out[1].tru[0], 2)}`} />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 98: causal discovery (PC) ---------------- */
const DN = ["Income", "Diet", "Exercise", "BMI", "BP"];
const DPOS = [[80, 150], [250, 60], [250, 240], [420, 150], [580, 150]];
const TRUE_E: [number, number][] = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]];
function inv(A: number[][]) {
  return A.map((_, j) => solve(A, A.map((__, i) => (i === j ? 1 : 0)))).reduce((M, col, j) => { col.forEach((v, i) => (M[i][j] = v)); return M; }, A.map((r) => r.map(() => 0)));
}
export function DiscoveryLab() {
  const [n, setN] = useState(3000), [alpha, setAlpha] = useState(0.01), [cancel, setCancel] = useState<"no" | "yes">("no"), [seed, reseed] = useSeed();
  const res = useMemo(() => {
    const r = rng(seed * 71 + 98), p = 5;
    const X = Array.from({ length: n }, () => {
      const I = r.n(), Di = 0.7 * I + r.n(), Ex = 0.6 * I + r.n();
      const B = 0.8 * Di - 0.7 * Ex + (cancel === "yes" ? -(0.7 * 0.8 - 0.6 * 0.7) : 0) * I + r.n();
      return [I, Di, Ex, B, 0.9 * B + r.n()];
    });
    const mu = [0, 1, 2, 3, 4].map((j) => avg(X.map((x) => x[j])));
    const S = mu.map((_, a) => mu.map((__, b) => avg(X.map((x) => (x[a] - mu[a]) * (x[b] - mu[b])))));
    const C = S.map((row, a) => row.map((v, b) => v / Math.sqrt(S[a][a] * S[b][b])));
    const indep = (i: number, j: number, Sx: number[]) => {
      const idx = [i, j, ...Sx], Q = inv(idx.map((a) => idx.map((b) => C[a][b])));
      const rho = -Q[0][1] / Math.sqrt(Q[0][0] * Q[1][1]), z = Math.atanh(Math.max(-0.9999, Math.min(0.9999, rho))) * Math.sqrt(n - Sx.length - 3);
      return 2 * (1 - normCdf(Math.abs(z))) > alpha;
    };
    const adj = [0, 1, 2, 3, 4].map((i) => new Set([0, 1, 2, 3, 4].filter((j) => j !== i)));
    const sep = new Map<string, number[]>(), log: string[] = [];
    const subsets = (arr: number[], k: number): number[][] => (k === 0 ? [[]] : arr.flatMap((v, i) => subsets(arr.slice(i + 1), k - 1).map((s) => [v, ...s])));
    for (let l = 0; l < p - 1; l++) for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) {
      if (i === j || !adj[i].has(j)) continue;
      for (const Sx of subsets([...adj[i]].filter((v) => v !== j).sort(), l)) {
        if (indep(i, j, Sx)) {
          adj[i].delete(j); adj[j].delete(i); sep.set([i, j].sort().join(), Sx);
          log.push(`${DN[i]} ⫫ ${DN[j]}${Sx.length ? " | " + Sx.map((v) => DN[v]).join(", ") : ""}`);
          break;
        }
      }
    }
    const dir = new Set<string>();
    for (let k = 0; k < p; k++) {
      const nb = [...adj[k]].sort();
      for (let a = 0; a < nb.length; a++) for (let b = a + 1; b < nb.length; b++) {
        const i = nb[a], j = nb[b];
        if (!adj[i].has(j) && !(sep.get([i, j].sort().join()) ?? []).includes(k)) { dir.add(`${i}>${k}`); dir.add(`${j}>${k}`); }
      }
    }
    let changed = true;
    while (changed) {
      changed = false;
      for (const e of [...dir]) {
        const [a, b] = e.split(">").map(Number);
        for (const c of adj[b]) if (c !== a && !adj[a].has(c) && !dir.has(`${b}>${c}`) && !dir.has(`${c}>${b}`)) { dir.add(`${b}>${c}`); changed = true; }
      }
    }
    const edges: { i: number; j: number; kind: "dir" | "und"; ok: boolean }[] = [];
    for (let i = 0; i < p; i++) for (const j of adj[i]) {
      if (j < i) continue;
      const truth = TRUE_E.some(([a, b]) => (a === i && b === j) || (a === j && b === i)) || (cancel === "yes" && i === 0 && j === 3);
      if (dir.has(`${i}>${j}`) && !dir.has(`${j}>${i}`)) edges.push({ i, j, kind: "dir", ok: truth });
      else if (dir.has(`${j}>${i}`) && !dir.has(`${i}>${j}`)) edges.push({ i: j, j: i, kind: "dir", ok: truth });
      else edges.push({ i, j, kind: "und", ok: truth });
    }
    const trueE = cancel === "yes" ? [...TRUE_E, [0, 3] as [number, number]] : TRUE_E;
    const missing = trueE.filter(([a, b]) => !adj[a].has(b));
    return { edges, missing, log };
  }, [n, alpha, cancel, seed]);
  return (
    <SimShell note="The PC algorithm on simulated health-behaviour data. It deletes edges whose endpoints test independent given some neighbours (list on the right), orients colliders (Diet → BMI ← Exercise), then propagates (BMI → BP). Income–Diet and Income–Exercise stay undirected: independencies cannot orient them. Turn on cancelling paths and Income's direct effect on BMI exactly offsets its indirect effects, so faithfulness fails and the edge is missed.">
      <svg viewBox="0 0 660 300" className="h-auto w-full">
        <defs>
          <marker id="pcarr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--text)" /></marker>
        </defs>
        {res.missing.map(([a, b], k) => (
          <line key={"m" + k} x1={DPOS[a][0]} y1={DPOS[a][1]} x2={DPOS[b][0]} y2={DPOS[b][1]} stroke={C3} strokeWidth={2} strokeDasharray="6 5" opacity={0.8} />
        ))}
        {res.edges.map((e, k) => {
          const [x1, y1] = DPOS[e.i], [x2, y2] = DPOS[e.j], L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L;
          return <line key={k} x1={x1 + ux * 42} y1={y1 + uy * 24} x2={x2 - ux * 46} y2={y2 - uy * 26} stroke={e.ok ? "var(--text)" : C3} strokeWidth={2.5} markerEnd={e.kind === "dir" ? "url(#pcarr)" : undefined} />;
        })}
        {DN.map((name, i) => (
          <g key={name}>
            <rect x={DPOS[i][0] - 44} y={DPOS[i][1] - 20} width={88} height={40} rx={20} fill="var(--surface-2)" stroke={C1} strokeWidth={2} />
            <text x={DPOS[i][0]} y={DPOS[i][1] + 5} textAnchor="middle" style={{ fill: "var(--text)", fontWeight: 600, fontSize: 14 }}>{name}</text>
          </g>
        ))}
      </svg>
      <Legend items={[{ color: "var(--text)", label: "found edge (arrow = oriented)" }, { color: C3, label: "missed true edge", dash: true }, { color: C3, label: "spurious edge" }]} />
      <div className="mt-3 grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <div className="grid grid-cols-2 gap-3">
          <Slider label="Sample size" value={n} min={100} max={6000} step={100} onChange={setN} />
          <Slider label="Test level α" value={alpha} min={0.001} max={0.2} step={0.001} onChange={setAlpha} format={(v) => v.toFixed(3)} />
          <div className="flex items-end gap-2"><span className="text-sm muted">Cancelling paths</span><Seg options={[{ value: "no", label: "off" }, { value: "yes", label: "on" }]} value={cancel} onChange={setCancel} /></div>
          <button className="btn w-fit" onClick={reseed}>New sample</button>
        </div>
        <div className="rounded-xl p-3 text-xs" style={{ background: "var(--surface-2)" }}>
          <div className="mb-1 font-semibold faint">Edges removed by independence tests</div>
          {res.log.length ? res.log.map((l) => <div key={l} className="font-mono">{l}</div>) : <div className="muted">none</div>}
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 99: multiple testing and shrinkage ---------------- */
export function MultipleTestingLab() {
  const [mode, setMode] = useState<"test" | "shrink">("test"), [pi1, setPi1] = useState(0.1), [mu, setMu] = useState(3), [tauH, setTauH] = useState(2);
  const [seed, reseed] = useSeed();
  const T = useMemo(() => {
    const r = rng(seed * 73 + 99), m = 200;
    const pts = Array.from({ length: m }, (_, i) => { const alt = i < Math.round(pi1 * m), z = (alt ? mu : 0) + r.n(); return { alt, p: 2 * (1 - normCdf(Math.abs(z))) }; }).sort((a, b) => a.p - b.p);
    let kBH = 0; pts.forEach((q, i) => { if (q.p <= (0.05 * (i + 1)) / m) kBH = i + 1; });
    let kH = 0; while (kH < m && pts[kH].p <= 0.05 / (m - kH)) kH++;
    const count = (k: number) => ({ tr: pts.slice(0, k).filter((q) => q.alt).length, fa: pts.slice(0, k).filter((q) => !q.alt).length });
    const kU = pts.filter((q) => q.p < 0.05).length, kB = pts.filter((q) => q.p < 0.05 / m).length;
    return { pts, m, U: count(kU), B: count(kB), H: count(kH), BH: count(kBH) };
  }, [pi1, mu, seed]);
  const S = useMemo(() => {
    const r = rng(seed * 79 + 199), H = 40;
    const th = Array.from({ length: H }, () => 10 + tauH * r.n()), se = th.map(() => 1 + 3 * r.u()), y = th.map((t, i) => t + se[i] * r.n());
    let t2 = 1, m0 = 10;
    for (let it = 0; it < 200; it++) {
      const w = se.map((s) => 1 / (s * s + t2)); m0 = w.reduce((a, v, i) => a + v * y[i], 0) / w.reduce((a, v) => a + v, 0);
      t2 = Math.max(0, w.reduce((a, v, i) => a + v * v * ((y[i] - m0) ** 2 - se[i] ** 2), 0) / w.reduce((a, v) => a + v * v, 0));
    }
    const post = y.map((v, i) => m0 + (t2 / (t2 + se[i] ** 2)) * (v - m0));
    const order = y.map((_, i) => i).sort((a, b) => y[a] - y[b]);
    return { th, y, post, order, t2, m0, mseR: avg(y.map((v, i) => (v - th[i]) ** 2)), mseE: avg(post.map((v, i) => (v - th[i]) ** 2)) };
  }, [tauH, seed]);
  const lp = (p: number) => -Math.log10(Math.max(p, 1e-12));
  const ymax = Math.max(6, ...T.pts.slice(0, 60).map((q) => lp(q.p))) + 0.3;
  return (
    <SimShell note={mode === "test"
      ? "200 tests of food additives, sorted by p-value (shown as −log₁₀ p for the 60 smallest). Coloured points are real effects. Bonferroni rejects above the flat line; Benjamini–Hochberg rejects every test up to the last point above its rising line, controlling the share of false discoveries rather than the chance of any."
      : "40 hospitals' risk-adjusted mortality (per 100 admissions), sorted by raw estimate. Each arrow runs from the raw estimate to its empirical-Bayes posterior mean; × marks the true rate. Noisy hospitals are pulled furthest toward the average, which corrects the winner's curse at both extremes."}>
      <div className="mb-2"><Seg options={[{ value: "test", label: "multiple testing" }, { value: "shrink", label: "shrinkage" }]} value={mode} onChange={setMode} /></div>
      {mode === "test" ? (
        <Plot x={[0, 61]} y={[0, ymax]} height={280} xLabel="rank of p-value" yLabel="−log₁₀ p">
          {(sx, sy) => (
            <>
              <path d={Array.from({ length: 61 }, (_, k) => `${k ? "L" : "M"}${sx(k + 1)},${sy(Math.min(ymax, lp((0.05 * (k + 1)) / T.m)))}`).join("")} stroke={C1} strokeWidth={2} fill="none" />
              <line x1={sx(0)} x2={sx(61)} y1={sy(lp(0.05 / T.m))} y2={sy(lp(0.05 / T.m))} stroke={C2} strokeWidth={2} strokeDasharray="6 4" />
              <line x1={sx(0)} x2={sx(61)} y1={sy(lp(0.05))} y2={sy(lp(0.05))} stroke="var(--text-3)" strokeDasharray="2 4" />
              {T.pts.slice(0, 60).map((q, i) => <circle key={i} cx={sx(i + 1)} cy={sy(Math.min(ymax, lp(q.p)))} r={4} fill={q.alt ? C3 : "var(--text-3)"} opacity={0.85} />)}
            </>
          )}
        </Plot>
      ) : (
        <Plot x={[Math.min(...S.y, ...S.post) - 1, Math.max(...S.y, ...S.post) + 1]} y={[-1, 40]} height={300} xLabel="mortality per 100 admissions" yTicks={[]}>
          {(sx, sy) => (
            <>
              <line x1={sx(S.m0)} x2={sx(S.m0)} y1={sy(-1)} y2={sy(40)} stroke="var(--text-3)" strokeDasharray="4 4" />
              {S.order.map((i, k) => (
                <g key={i}>
                  <line x1={sx(S.y[i])} x2={sx(S.post[i])} y1={sy(k)} y2={sy(k)} stroke={C1} strokeWidth={1.5} />
                  <circle cx={sx(S.y[i])} cy={sy(k)} r={3} fill="var(--text-3)" />
                  <circle cx={sx(S.post[i])} cy={sy(k)} r={3.5} fill={C1} />
                  <text x={sx(S.th[i])} y={sy(k) + 4} textAnchor="middle" style={{ fill: C3, fontSize: 12, fontWeight: 700 }}>×</text>
                </g>
              ))}
            </>
          )}
        </Plot>
      )}
      {mode === "test"
        ? <Legend items={[{ color: C3, label: "real effect" }, { color: "var(--text-3)", label: "null" }, { color: C1, label: "BH line 0.05·k/m" }, { color: C2, label: "Bonferroni 0.05/m", dash: true }]} />
        : <Legend items={[{ color: "var(--text-3)", label: "raw estimate" }, { color: C1, label: "empirical-Bayes estimate" }, { color: C3, label: "true rate (×)" }]} />}
      <div className="mt-3 grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <div className="grid grid-cols-2 gap-3">
          {mode === "test" ? (
            <>
              <Slider label="Share of real effects" value={pi1} min={0} max={0.5} step={0.02} onChange={setPi1} format={(v) => v.toFixed(2)} />
              <Slider label="Effect size (mean z)" value={mu} min={1} max={5} step={0.1} onChange={setMu} />
            </>
          ) : (
            <Slider label="True SD of hospital rates" value={tauH} min={0.2} max={4} step={0.1} onChange={setTauH} />
          )}
          <button className="btn w-fit" onClick={reseed}>New sample</button>
        </div>
        <div className="grid grid-cols-2 content-start gap-2">
          {mode === "test" ? (
            <>
              <Stat label="unadjusted 5%: true · false" value={`${T.U.tr} · ${T.U.fa}`} color="var(--text-3)" />
              <Stat label="Bonferroni: true · false" value={`${T.B.tr} · ${T.B.fa}`} color={C2} />
              <Stat label="Holm: true · false" value={`${T.H.tr} · ${T.H.fa}`} />
              <Stat label="BH: true · false" value={`${T.BH.tr} · ${T.BH.fa}`} color={C1} />
            </>
          ) : (
            <>
              <Stat label="MSE raw" value={fmt(S.mseR, 2)} color="var(--text-3)" />
              <Stat label="MSE empirical Bayes" value={fmt(S.mseE, 2)} color={C1} />
              <Stat label="estimated τ²" value={fmt(S.t2, 2)} sub={`true ${fmt(tauH * tauH, 2)}`} />
            </>
          )}
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 100: capstone ---------------- */
export function CapstoneLab() {
  const [g, setG] = useState(1), [hid, setHid] = useState(0), [het, setHet] = useState(1), [n, setN] = useState(4000), [seed, reseed] = useSeed();
  const res = useMemo(() => {
    const r = rng(seed * 83 + 100);
    const X: number[][] = [], D: boolean[] = [], Y: number[] = [], tau: number[] = [];
    for (let i = 0; i < n; i++) {
      const x = [r.n(), r.n(), r.u() < 0.4 ? 1 : 0, 0.5 * r.n()], U = r.n();
      const e = logistic(-0.3 + g * (0.3 * x[0] + 0.5 * x[1] + 0.8 * x[2] - 0.6 * x[3]) + hid * U);
      const d = r.u() < e, t = -5 - 3 * het * x[1] + het * x[0];
      X.push(x); D.push(d); tau.push(t);
      Y.push(140 + 8 * x[1] + 3 * Math.sin(2 * x[0]) + 4 * x[2] - 2 * x[3] + 2 * x[1] * x[1] + 4 * hid * U + (d ? t : 0) + 8 * r.n());
    }
    const ate = avg(tau);
    const yt = Y.filter((_, i) => D[i]), yc = Y.filter((_, i) => !D[i]);
    const naive = { est: avg(yt) - avg(yc), se: Math.sqrt(varOf(yt) / yt.length + varOf(yc) / yc.length) };
    const Z = X.map((x, i) => [1, D[i] ? 1 : 0, ...x]), b = ols(Z, Y);
    const res0 = Y.map((y, i) => y - Z[i].reduce((s, v, j) => s + v * b[j], 0));
    const ZtZ = Z[0].map((_, a) => Z[0].map((__, c) => Z.reduce((s, z) => s + z[a] * z[c], 0)));
    const df = n - Z[0].length, s2 = res0.reduce((s, v) => s + v * v, 0) / df;
    const se1 = Math.sqrt(s2 * solve(ZtZ, Z[0].map((_, j) => (j === 1 ? 1 : 0)))[1]);
    const olsR = { est: b[1], se: se1 };
    const eh = logitFit(X.map((x) => [1, ...x]), D).map((p) => Math.min(0.99, Math.max(0.01, p)));
    const w = eh.map((p, i) => (D[i] ? 1 / p : 1 / (1 - p)));
    const ti = X.map((_, i) => i).filter((i) => D[i]), ci = X.map((_, i) => i).filter((i) => !D[i]);
    const ipwE = wmean(ti.map((i) => Y[i]), ti.map((i) => w[i])) - wmean(ci.map((i) => Y[i]), ci.map((i) => w[i]));
    const feat = (x: number[]) => [1, ...x, x[1] * x[1], Math.sin(2 * x[0])];
    const b1 = ols(ti.map((i) => feat(X[i])), ti.map((i) => Y[i])), b0 = ols(ci.map((i) => feat(X[i])), ci.map((i) => Y[i]));
    const f = (bb: number[], x: number[]) => feat(x).reduce((s, v, j) => s + v * bb[j], 0);
    const phi = X.map((x, i) => { const m1 = f(b1, x), m0 = f(b0, x); return m1 - m0 + (D[i] ? (Y[i] - m1) / eh[i] : -(Y[i] - m0) / (1 - eh[i])); });
    const aipw = { est: avg(phi), se: Math.sqrt(varOf(phi) / n) };
    const ipwSe = Math.sqrt(varOf(X.map((_, i) => (D[i] ? (w[i] * (Y[i] - avg(yt))) : -(w[i] * (Y[i] - avg(yc)))))) / n);
    const tt = olsR.est / olsR.se, fq = Math.abs(tt) / Math.sqrt(df), RV = 0.5 * (Math.sqrt(fq ** 4 + 4 * fq ** 2) - fq ** 2);
    const smdMax = Math.max(...[0, 1, 2, 3].map((j) => {
      const mt = wmean(ti.map((i) => X[i][j]), ti.map((i) => w[i])), mc = wmean(ci.map((i) => X[i][j]), ci.map((i) => w[i]));
      return Math.abs(mt - mc) / Math.sqrt((varOf(ti.map((i) => X[i][j])) + varOf(ci.map((i) => X[i][j]))) / 2);
    }));
    return {
      ate,
      rows: [{ name: "naive", ...naive }, { name: "OLS (linear)", ...olsR }, { name: "IPW (logit)", est: ipwE, se: ipwSe }, { name: "AIPW", ...aipw }],
      RV, essC: ess(ci.map((i) => w[i])), nC: ci.length, smdMax, eRange: [Math.min(...eh), Math.max(...eh)],
    };
  }, [g, hid, het, n, seed]);
  const vals = res.rows.flatMap((r) => [r.est - 1.96 * r.se, r.est + 1.96 * r.se]).concat(res.ate);
  const lo = Math.min(...vals) - 0.5, hi = Math.max(...vals) + 0.5;
  const cols = ["var(--text-3)", C2, C4, C1];
  return (
    <SimShell note="The capstone pipeline for a community health-worker programme and systolic blood pressure. Dots and whiskers: estimates with 95% CIs; dashed line: true ATE. Turn up observed confounding and the naive comparison fails while adjusted estimators agree. Add an unobserved confounder and every method is biased together: agreement between estimators cannot detect it, which is why the robustness value is reported.">
      <Plot x={[lo, hi]} y={[-0.6, 3.6]} height={240} xLabel="effect on systolic BP (mmHg)" yTicks={[0, 1, 2, 3]} yFormat={(v) => ["AIPW", "IPW", "OLS", "naive"][Math.round(v)] ?? ""}>
        {(sx, sy) => (
          <>
            <line x1={sx(res.ate)} x2={sx(res.ate)} y1={sy(-0.6)} y2={sy(3.6)} stroke={C3} strokeWidth={2.5} strokeDasharray="6 4" />
            {res.rows.map((rw, k) => {
              const y = 3 - k;
              return (
                <g key={k}>
                  <line x1={sx(rw.est - 1.96 * rw.se)} x2={sx(rw.est + 1.96 * rw.se)} y1={sy(y)} y2={sy(y)} stroke={cols[k]} strokeWidth={3} />
                  <circle cx={sx(rw.est)} cy={sy(y)} r={7} fill={cols[k]} />
                </g>
              );
            })}
          </>
        )}
      </Plot>
      <div className="mt-3 grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <div className="grid grid-cols-2 gap-3">
          <Slider label="Observed confounding" value={g} min={0} max={2} step={0.1} onChange={setG} />
          <Slider label="Unobserved confounder" value={hid} min={0} max={1} step={0.05} onChange={setHid} />
          <Slider label="Effect heterogeneity" value={het} min={0} max={2} step={0.1} onChange={setHet} />
          <Slider label="Sample size" value={n} min={500} max={8000} step={500} onChange={setN} />
          <button className="btn w-fit" onClick={reseed}>New sample</button>
        </div>
        <div className="grid grid-cols-2 content-start gap-2">
          <Stat label="AIPW" value={fmt(res.rows[3].est, 2)} color={C1} sub={`true ATE ${fmt(res.ate, 2)}`} />
          <Stat label="robustness value (OLS)" value={fmt(res.RV, 3)} />
          <Stat label="max |SMD| after weighting" value={fmt(res.smdMax, 3)} />
          <Stat label="propensity range" value={`${fmt(res.eRange[0], 2)}–${fmt(res.eRange[1], 2)}`} sub={`ESS controls ${fmt(res.essC, 0)} / ${res.nC}`} />
        </div>
      </div>
    </SimShell>
  );
}
function varOf(x: number[]) {
  const m = avg(x);
  return x.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, x.length - 1);
}
