"use client";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { Legend, Plot, SimShell, Slider, Stat, curve, fmt, mean, rng, useSeed, variance } from "./kit";

const C1 = "var(--s1)", C2 = "var(--s2)", C3 = "var(--s3)", C4 = "var(--s4)";

/** A square coordinate plane with draggable handles. */
export function Plane(props: {
  range: number; size?: number; children: (s: (x: number, y: number) => [number, number]) => ReactNode;
  handles?: { x: number; y: number; color: string; onMove: (x: number, y: number) => void }[]; grid?: boolean;
}) {
  const S = props.size ?? 420, R = props.range;
  const s = (x: number, y: number): [number, number] => [S / 2 + (x / R) * (S / 2 - 10), S / 2 - (y / R) * (S / 2 - 10)];
  const inv = (px: number, py: number): [number, number] => [((px - S / 2) / (S / 2 - 10)) * R, (-(py - S / 2) / (S / 2 - 10)) * R];
  const ref = useRef<SVGSVGElement>(null);
  const drag = useRef<number | null>(null);
  const toLocal = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return inv(((e.clientX - r.left) / r.width) * S, ((e.clientY - r.top) / r.height) * S);
  };
  const ticks = Array.from({ length: 2 * Math.floor(R) + 1 }, (_, i) => i - Math.floor(R));
  return (
    <svg ref={ref} viewBox={`0 0 ${S} ${S}`} className="w-full touch-none select-none rounded-xl" style={{ background: "var(--surface-2)" }}
      onPointerMove={(e) => {
        if (drag.current === null || !props.handles) return;
        const [x, y] = toLocal(e);
        const c = (v: number) => Math.max(-R, Math.min(R, Math.round(v * 10) / 10));
        props.handles[drag.current].onMove(c(x), c(y));
      }}
      onPointerUp={() => (drag.current = null)} onPointerLeave={() => (drag.current = null)}>
      {props.grid !== false && ticks.map((t) => (
        <g key={t}>
          <line x1={s(t, -R)[0]} x2={s(t, R)[0]} y1={s(t, -R)[1]} y2={s(t, R)[1]} stroke="var(--grid)" />
          <line x1={s(-R, t)[0]} x2={s(R, t)[0]} y1={s(-R, t)[1]} y2={s(R, t)[1]} stroke="var(--grid)" />
        </g>
      ))}
      <line x1={s(-R, 0)[0]} x2={s(R, 0)[0]} y1={s(0, 0)[1]} y2={s(0, 0)[1]} stroke="var(--text-3)" />
      <line x1={s(0, -R)[0]} x2={s(0, R)[0]} y1={s(0, -R)[1]} y2={s(0, R)[1]} stroke="var(--text-3)" />
      {props.children(s)}
      {props.handles?.map((h, i) => {
        const [px, py] = s(h.x, h.y);
        return (
          <circle key={i} cx={px} cy={py} r={9} fill={h.color} stroke="var(--surface)" strokeWidth={3} style={{ cursor: "grab" }}
            onPointerDown={(e) => { drag.current = i; (e.target as Element).setPointerCapture?.(e.pointerId); }} />
        );
      })}
    </svg>
  );
}

export function Arrow({ from, to, color, width = 3, dash }: { from: [number, number]; to: [number, number]; color: string; width?: number; dash?: string }) {
  const [x1, y1] = from, [x2, y2] = to;
  const a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1), h = Math.min(12, L * 0.4);
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2 - Math.cos(a) * h * 0.6} y2={y2 - Math.sin(a) * h * 0.6} stroke={color} strokeWidth={width} strokeDasharray={dash} strokeLinecap="round" />
      {L > 2 && <path d={`M${x2},${y2} L${x2 - h * Math.cos(a - 0.4)},${y2 - h * Math.sin(a - 0.4)} L${x2 - h * Math.cos(a + 0.4)},${y2 - h * Math.sin(a + 0.4)}Z`} fill={color} />}
    </g>
  );
}

/* ---------------- Day 16: vector playground ---------------- */
export function VectorLab() {
  const [u, setU] = useState<[number, number]>([3, 1]);
  const [v, setV] = useState<[number, number]>([1, 3]);
  const dot = u[0] * v[0] + u[1] * v[1];
  const nu = Math.hypot(...u), nv = Math.hypot(...v);
  const cos = nu && nv ? dot / (nu * nv) : NaN;
  const c = nv ? dot / (nv * nv) : 0;
  const proj: [number, number] = [c * v[0], c * v[1]];
  const ang = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
  return (
    <SimShell note="Drag the two tips. The dashed orange vector is the projection of u onto v; the dotted segment (the residual) is always perpendicular to v. The dot product is zero exactly when the angle is 90°.">
      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        <Plane range={5} handles={[{ x: u[0], y: u[1], color: C1, onMove: (x, y) => setU([x, y]) }, { x: v[0], y: v[1], color: C2, onMove: (x, y) => setV([x, y]) }]}>
          {(s) => (
            <>
              <line x1={s(-5 * v[0], -5 * v[1])[0]} y1={s(-5 * v[0], -5 * v[1])[1]} x2={s(5 * v[0], 5 * v[1])[0]} y2={s(5 * v[0], 5 * v[1])[1]} stroke={C2} opacity={0.25} />
              <Arrow from={s(0, 0)} to={s(...proj)} color={C2} width={4} dash="7 5" />
              <line x1={s(...u)[0]} y1={s(...u)[1]} x2={s(...proj)[0]} y2={s(...proj)[1]} stroke="var(--text-3)" strokeDasharray="3 4" strokeWidth={2} />
              <Arrow from={s(0, 0)} to={s(...v)} color={C2} />
              <Arrow from={s(0, 0)} to={s(...u)} color={C1} />
              <text x={s(...u)[0] + 12} y={s(...u)[1] - 10} style={{ fill: "var(--text)", fontWeight: 700 }}>u</text>
              <text x={s(...v)[0] + 12} y={s(...v)[1] - 10} style={{ fill: "var(--text)", fontWeight: 700 }}>v</text>
            </>
          )}
        </Plane>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="u" value={`(${u[0]}, ${u[1]})`} color={C1} />
            <Stat label="v" value={`(${v[0]}, ${v[1]})`} color={C2} />
            <Stat label="u · v" value={fmt(dot)} sub={Math.abs(dot) < 0.05 ? "orthogonal" : dot > 0 ? "acute angle" : "obtuse angle"} />
            <Stat label="angle θ" value={`${fmt(ang, 1)}°`} sub={`cos θ = ${fmt(cos, 3)}`} />
            <Stat label="‖u‖, ‖v‖" value={`${fmt(nu)}, ${fmt(nv)}`} />
            <Stat label="projection coefficient" value={fmt(c, 3)} sub="u·v / v·v (a slope)" color={C2} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={() => { setU([3, 1]); setV([-1, 3]); }}>Orthogonal pair</button>
            <button className="btn" onClick={() => { setU([2, 1]); setV([4, 2]); }}>Parallel (cos = 1)</button>
          </div>
          <p className="text-sm muted">With centred data vectors, cos θ is the correlation and the projection coefficient is the regression slope.</p>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 17: matrix as a transformation ---------------- */
export function MatrixTransform() {
  const [m, setM] = useState([1, 2, 3, 1]);
  const [x, setX] = useState<[number, number]>([1, 1]);
  const [a, b, c, d] = m;
  const det = a * d - b * c;
  const T = (p: [number, number]): [number, number] => [a * p[0] + b * p[1], c * p[0] + d * p[1]];
  const ax = T(x);
  const presets: [string, number[]][] = [
    ["Initial", [1, 2, 3, 1]], ["Identity", [1, 0, 0, 1]], ["Rotate 45°", [0.71, -0.71, 0.71, 0.71]],
    ["Shear", [1, 1, 0, 1]], ["Reflect", [1, 0, 0, -1]], ["Stretch", [2, 0, 0, 0.5]], ["Singular", [1, 2, 0.5, 1]],
  ];
  const set = (i: number, v: number) => setM((s) => s.map((w, j) => (j === i ? v : w)));
  const gridLines = [-3, -2, -1, 0, 1, 2, 3];
  return (
    <SimShell note="The faint grid is the original plane; the coloured grid is its image under A. The unit square (grey) becomes the parallelogram spanned by the columns Aî and Aĵ, with area |det A|. Drag x (blue) to see Ax (orange).">
      <div className="grid gap-4 md:grid-cols-[1fr_300px]">
        <Plane range={6} handles={[{ x: x[0], y: x[1], color: C1, onMove: (p, q) => setX([p, q]) }]}>
          {(s) => (
            <>
              {gridLines.map((t) => {
                const p1 = T([t, -3]), p2 = T([t, 3]), q1 = T([-3, t]), q2 = T([3, t]);
                return (
                  <g key={t} opacity={0.5}>
                    <line x1={s(...p1)[0]} y1={s(...p1)[1]} x2={s(...p2)[0]} y2={s(...p2)[1]} stroke={C4} />
                    <line x1={s(...q1)[0]} y1={s(...q1)[1]} x2={s(...q2)[0]} y2={s(...q2)[1]} stroke={C4} />
                  </g>
                );
              })}
              <polygon points={[[0, 0], [1, 0], [1, 1], [0, 1]].map((p) => s(p[0], p[1]).join(",")).join(" ")} fill="var(--text-3)" opacity={0.25} />
              <polygon points={[[0, 0], [1, 0], [1, 1], [0, 1]].map((p) => s(...T(p as [number, number])).join(",")).join(" ")} fill={det >= 0 ? C3 : C2} opacity={0.3} />
              <Arrow from={s(0, 0)} to={s(a, c)} color={C3} />
              <Arrow from={s(0, 0)} to={s(b, d)} color={C4} />
              <Arrow from={s(0, 0)} to={s(...ax)} color={C2} />
              <Arrow from={s(0, 0)} to={s(...x)} color={C1} />
              <text x={s(a, c)[0] + 8} y={s(a, c)[1] - 6} style={{ fill: "var(--text)" }}>Aî</text>
              <text x={s(b, d)[0] + 8} y={s(b, d)[1] - 6} style={{ fill: "var(--text)" }}>Aĵ</text>
              <text x={s(...ax)[0] + 8} y={s(...ax)[1] - 6} style={{ fill: "var(--text)", fontWeight: 700 }}>Ax</text>
            </>
          )}
        </Plane>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {["a₁₁", "a₁₂", "a₂₁", "a₂₂"].map((l, i) => (
              <Slider key={l} label={l} value={m[i]} min={-3} max={3} step={0.05} onChange={(v) => set(i, v)} format={(v) => v.toFixed(2)} />
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">{presets.map(([l, p]) => <button key={l} className="btn" onClick={() => setM(p)}>{l}</button>)}</div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="det A" value={fmt(det)} sub={Math.abs(det) < 0.01 ? "singular: plane collapses to a line" : det < 0 ? "flips orientation" : "keeps orientation"} color={det >= 0 ? C3 : C2} />
            <Stat label="Ax" value={`(${fmt(ax[0], 1)}, ${fmt(ax[1], 1)})`} sub={`= ${x[0]}·col₁ + ${x[1]}·col₂`} color={C2} />
          </div>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 18: collinearity ---------------- */
export function CollinearityLab() {
  const [rho, setRho] = useState(0.9);
  const [n, setN] = useState(100);
  const [seed, reseed] = useSeed();
  const res = useMemo(() => {
    const r = rng(seed * 7 + Math.round(rho * 100));
    const est: [number, number][] = [];
    for (let k = 0; k < 400; k++) {
      let sxx = 0, sxz = 0, szz = 0, sxy = 0, szy = 0;
      const xs: number[] = [], zs: number[] = [], ys: number[] = [];
      for (let i = 0; i < n; i++) {
        const x = r.n(), z = rho * x + Math.sqrt(1 - rho * rho) * r.n();
        xs.push(x); zs.push(z); ys.push(1 * x + 1 * z + 2 * r.n());
      }
      const mx = mean(xs), mz = mean(zs), my = mean(ys);
      for (let i = 0; i < n; i++) {
        const a = xs[i] - mx, b = zs[i] - mz, c = ys[i] - my;
        sxx += a * a; sxz += a * b; szz += b * b; sxy += a * c; szy += b * c;
      }
      const det = sxx * szz - sxz * sxz;
      est.push([(szz * sxy - sxz * szy) / det, (sxx * szy - sxz * sxy) / det]);
    }
    return est;
  }, [rho, n, seed]);
  const vif = 1 / (1 - rho * rho);
  const sdB1 = Math.sqrt(variance(res.map((e) => e[0])));
  const corrEst = (() => {
    const a = res.map((e) => e[0]), b = res.map((e) => e[1]);
    const ma = mean(a), mb = mean(b);
    return mean(a.map((v, i) => (v - ma) * (b[i] - mb))) / Math.sqrt(variance(a) * variance(b));
  })();
  const R = 4;
  return (
    <SimShell note="Each dot is (β̂₁, β̂₂) from one simulated sample of y = x₁ + x₂ + noise. As corr(x₁, x₂) → 1 the cloud stretches along a line of slope −1: the data pin down β₁ + β₂ well, but hardly β₁ − β₂.">
      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        <Plot x={[1 - R / 2, 1 + R / 2]} y={[1 - R / 2, 1 + R / 2]} height={560} xLabel="β̂₁" yLabel="β̂₂">
          {(sx, sy) => (
            <>
              {res.map((e, i) => <circle key={i} cx={sx(Math.max(-1, Math.min(3, e[0])))} cy={sy(Math.max(-1, Math.min(3, e[1])))} r={2.6} fill={C1} opacity={0.5} />)}
              <circle cx={sx(1)} cy={sy(1)} r={6} fill="none" stroke={C2} strokeWidth={2.5} />
              <text x={sx(1) + 9} y={sy(1) - 8} style={{ fill: "var(--text)", fontWeight: 600 }}>truth (1, 1)</text>
            </>
          )}
        </Plot>
        <div className="space-y-3">
          <Slider label="corr(x₁, x₂)" value={rho} min={0} max={0.995} step={0.005} onChange={setRho} format={(v) => v.toFixed(3)} />
          <Slider label="Sample size n" value={n} min={30} max={1000} step={10} onChange={setN} />
          <button className="btn" onClick={reseed}>New samples</button>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="VIF = 1/(1−ρ²)" value={fmt(vif, 1)} color={C2} />
            <Stat label="sd of β̂₁ (simulated)" value={fmt(sdB1, 3)} sub={`theory ≈ ${fmt(2 * Math.sqrt(vif / n), 3)}`} color={C1} />
            <Stat label="corr(β̂₁, β̂₂)" value={fmt(corrEst)} sub="≈ −ρ" />
            <Stat label="condition no. of X′X" value={fmt((1 + rho) / (1 - rho), 1)} sub="(1+ρ)/(1−ρ)" />
          </div>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 19: solving Ax = b ---------------- */
export function LinearSystems() {
  const [cc, setC] = useState(1.5);
  const [b1, setB1] = useState(2);
  const [b2, setB2] = useState(2.5);
  // line 1: x + y = b1 ; line 2: x + c y = b2
  const det = cc - 1;
  const sol: [number, number] | null = Math.abs(det) > 1e-9 ? [(cc * b1 - b2) / det, (b2 - b1) / det] : null;
  const cond = (() => {
    const a = 1 + 1, bb = 1 + cc, dd = 1 + cc * cc; // A'A = [[2, 1+c],[1+c, 1+c²]]
    const tr = a + dd, dt = a * dd - bb * bb;
    const l1 = tr / 2 + Math.sqrt(Math.max(0, tr * tr / 4 - dt)), l2 = tr / 2 - Math.sqrt(Math.max(0, tr * tr / 4 - dt));
    return l2 > 1e-12 ? Math.sqrt(l1 / l2) : Infinity;
  })();
  const R = 6;
  return (
    <SimShell note="Each equation is a line; the solution is where they cross. As c → 1 the lines become parallel, det A → 0 and the crossing point races off: a tiny change in b moves the solution a lot. That is ill-conditioning.">
      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        <Plane range={R}>
          {(s) => {
            const l1 = (x: number) => b1 - x, l2 = (x: number) => (b2 - x) / cc;
            return (
              <>
                <line x1={s(-R, l1(-R))[0]} y1={s(-R, l1(-R))[1]} x2={s(R, l1(R))[0]} y2={s(R, l1(R))[1]} stroke={C1} strokeWidth={2.5} />
                <line x1={s(-R, l2(-R))[0]} y1={s(-R, l2(-R))[1]} x2={s(R, l2(R))[0]} y2={s(R, l2(R))[1]} stroke={C2} strokeWidth={2.5} />
                {sol && Math.abs(sol[0]) < R && Math.abs(sol[1]) < R && (
                  <circle cx={s(...sol)[0]} cy={s(...sol)[1]} r={7} fill="var(--text)" stroke="var(--surface)" strokeWidth={2} />
                )}
              </>
            );
          }}
        </Plane>
        <div className="space-y-3">
          <div className="rounded-lg px-3 py-2 font-mono text-sm" style={{ background: "var(--surface-2)" }}>
            <div style={{ color: "var(--s1)" }}>x + y = {b1.toFixed(2)}</div>
            <div style={{ color: "var(--s2)" }}>x + {cc.toFixed(2)}·y = {b2.toFixed(2)}</div>
          </div>
          <Slider label="Coefficient c" value={cc} min={0} max={3} step={0.01} onChange={setC} format={(v) => v.toFixed(2)} />
          <Slider label="b₁" value={b1} min={-3} max={3} step={0.01} onChange={setB1} format={(v) => v.toFixed(2)} />
          <Slider label="b₂" value={b2} min={-3} max={3} step={0.01} onChange={setB2} format={(v) => v.toFixed(2)} />
          <div className="grid grid-cols-2 gap-2">
            <Stat label="det A = c − 1" value={fmt(det, 3)} color={Math.abs(det) < 0.1 ? C2 : C1} />
            <Stat label="solution (x, y)" value={sol ? `(${fmt(sol[0], 2)}, ${fmt(sol[1], 2)})` : "none / ∞"} />
            <Stat label="condition number" value={Number.isFinite(cond) ? fmt(cond, 1) : "∞"} sub="large = fragile" color={C2} />
          </div>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 20: least squares geometry ---------------- */
export function LeastSquaresLab() {
  const [seed, reseed] = useSeed();
  const data = useMemo(() => {
    const r = rng(seed * 11 + 2);
    return Array.from({ length: 14 }, (_, i) => {
      const x = 0.5 + i * 0.7 + 0.2 * r.n();
      return [x, 1 + 0.8 * x + 1.1 * r.n()] as [number, number];
    });
  }, [seed]);
  const xs = data.map((d) => d[0]), ys = data.map((d) => d[1]);
  const mx = mean(xs), my = mean(ys);
  const bOls = mean(data.map((d) => (d[0] - mx) * (d[1] - my))) / variance(xs);
  const aOls = my - bOls * mx;
  const [a, setA] = useState(0);
  const [b, setB] = useState(1.2);
  const ssr = (aa: number, bb: number) => data.reduce((s, d) => s + (d[1] - aa - bb * d[0]) ** 2, 0);
  const e = data.map((d) => d[1] - a - b * d[0]);
  const sumE = e.reduce((s, v) => s + v, 0), sumXE = e.reduce((s, v, i) => s + v * xs[i], 0);
  const tss = ys.reduce((s, v) => s + (v - my) ** 2, 0);
  return (
    <SimShell note="Move the candidate line. Vertical segments are residuals. Only at the OLS line are the residuals orthogonal to the regressors: Σe = 0 and Σx·e = 0, and the SSR is minimal (right panel: SSR as a function of the slope, with the intercept re-optimised).">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Plot x={[0, 10.5]} y={[-2, 12]} height={330} xLabel="x" yLabel="y">
          {(sx, sy) => (
            <>
              {data.map((d, i) => (
                <line key={i} x1={sx(d[0])} x2={sx(d[0])} y1={sy(d[1])} y2={sy(a + b * d[0])} stroke={e[i] > 0 ? C3 : C2} strokeWidth={2} opacity={0.8} />
              ))}
              <line x1={sx(0)} y1={sy(aOls)} x2={sx(10.5)} y2={sy(aOls + bOls * 10.5)} stroke="var(--text-3)" strokeDasharray="5 4" />
              <line x1={sx(0)} y1={sy(a)} x2={sx(10.5)} y2={sy(a + b * 10.5)} stroke={C1} strokeWidth={2.5} />
              {data.map((d, i) => <circle key={`p${i}`} cx={sx(d[0])} cy={sy(d[1])} r={4.5} fill="var(--text)" stroke="var(--surface)" strokeWidth={1.5} />)}
            </>
          )}
        </Plot>
        <Plot x={[0, 1.6]} y={[0, Math.max(ssr(my - 0 * mx, 0), ssr(my - 1.6 * mx, 1.6)) * 1.05]} height={330} xLabel="slope b" yLabel="min SSR over a">
          {(sx, sy) => (
            <>
              <path d={curve((bb) => ssr(my - bb * mx, bb), 0, 1.6, sx, sy)} fill="none" stroke={C1} strokeWidth={2} />
              <circle cx={sx(Math.max(0, Math.min(1.6, b)))} cy={sy(ssr(my - b * mx, b))} r={6} fill={C2} stroke="var(--surface)" strokeWidth={2} />
              <line x1={sx(bOls)} x2={sx(bOls)} y1={sy(0)} y2={sy(ssr(aOls, bOls))} stroke="var(--text-3)" strokeDasharray="4 3" />
            </>
          )}
        </Plot>
      </div>
      <Legend items={[{ color: C1, label: "candidate line" }, { color: "var(--text-3)", label: "OLS line", dash: true }, { color: C3, label: "positive residual" }, { color: C2, label: "negative residual" }]} />
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Slider label="Intercept a" value={a} min={-3} max={5} step={0.01} onChange={setA} format={(v) => v.toFixed(2)} />
          <Slider label="Slope b" value={b} min={0} max={1.6} step={0.005} onChange={setB} format={(v) => v.toFixed(3)} />
          <div className="flex gap-2"><button className="btn" onClick={() => { setA(aOls); setB(bOls); }}>Snap to OLS</button><button className="btn" onClick={reseed}>New data</button></div>
        </div>
        <div className="grid grid-cols-2 gap-2 self-start">
          <Stat label="SSR (candidate)" value={fmt(ssr(a, b), 2)} sub={`OLS minimum ${fmt(ssr(aOls, bOls), 2)}`} color={C1} />
          <Stat label="R² (candidate)" value={fmt(1 - ssr(a, b) / tss, 3)} />
          <Stat label="Σ e" value={fmt(sumE, 2)} sub="0 at OLS" color={C2} />
          <Stat label="Σ x·e" value={fmt(sumXE, 2)} sub="0 at OLS" color={C2} />
        </div>
      </div>
    </SimShell>
  );
}
