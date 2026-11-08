"use client";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { Legend, Plot, Seg, SimShell, Slider, Stat, curve, fmt, mean, niceTicks, rng, useSeed, variance } from "./kit";
import { Arrow, Plane } from "./sims4";

const C1 = "var(--s1)", C2 = "var(--s2)", C3 = "var(--s3)", C4 = "var(--s4)";

function eig2(a: number, b: number, d: number) {
  // symmetric [[a,b],[b,d]]
  const tr = a + d, det = a * d - b * b, disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
  const l1 = tr / 2 + disc, l2 = tr / 2 - disc;
  const v1: [number, number] = Math.abs(b) > 1e-12 ? [l1 - d, b] : a >= d ? [1, 0] : [0, 1];
  const n1 = Math.hypot(...v1);
  const q1: [number, number] = [v1[0] / n1, v1[1] / n1];
  return { l1, l2, q1, q2: [-q1[1], q1[0]] as [number, number] };
}

/** A rectangular parameter plane you can click or drag on. */
export function Field(props: {
  x: [number, number]; y: [number, number]; xLabel: string; yLabel: string; height?: number;
  onPick?: (x: number, y: number) => void; children: (sx: (v: number) => number, sy: (v: number) => number) => ReactNode;
}) {
  const W = 640, H = props.height ?? 460, m = { l: 52, r: 14, t: 10, b: 44 };
  const sx = (v: number) => m.l + ((v - props.x[0]) / (props.x[1] - props.x[0])) * (W - m.l - m.r);
  const sy = (v: number) => H - m.b - ((v - props.y[0]) / (props.y[1] - props.y[0])) * (H - m.t - m.b);
  const ref = useRef<SVGSVGElement>(null);
  const down = useRef(false);
  const pick = (e: React.PointerEvent) => {
    if (!props.onPick || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W, py = ((e.clientY - r.top) / r.height) * H;
    const x = props.x[0] + ((px - m.l) / (W - m.l - m.r)) * (props.x[1] - props.x[0]);
    const y = props.y[0] + ((H - m.b - py) / (H - m.t - m.b)) * (props.y[1] - props.y[0]);
    if (x >= props.x[0] && x <= props.x[1] && y >= props.y[0] && y <= props.y[1]) props.onPick(x, y);
  };
  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full touch-none select-none" style={{ cursor: props.onPick ? "crosshair" : undefined }}
      onPointerDown={(e) => { down.current = true; pick(e); }} onPointerMove={(e) => down.current && pick(e)}
      onPointerUp={() => (down.current = false)} onPointerLeave={() => (down.current = false)}>
      <defs><clipPath id="fieldclip"><rect x={m.l} y={m.t} width={W - m.l - m.r} height={H - m.t - m.b} /></clipPath></defs>
      <g clipPath="url(#fieldclip)">{props.children(sx, sy)}</g>
      <rect x={m.l} y={m.t} width={W - m.l - m.r} height={H - m.t - m.b} fill="none" stroke="var(--border)" />
      {niceTicks(props.x[0], props.x[1], 6).map((t) => <text key={`x${t}`} x={sx(t)} y={H - m.b + 16} textAnchor="middle">{+t.toFixed(3)}</text>)}
      {niceTicks(props.y[0], props.y[1], 5).map((t) => <text key={`y${t}`} x={m.l - 6} y={sy(t) + 4} textAnchor="end">{+t.toFixed(3)}</text>)}
      <text x={(m.l + W - m.r) / 2} y={H - 6} textAnchor="middle" style={{ fontWeight: 600 }}>{props.xLabel}</text>
      <text transform={`translate(12 ${(m.t + H - m.b) / 2}) rotate(-90)`} textAnchor="middle" style={{ fontWeight: 600 }}>{props.yLabel}</text>
    </svg>
  );
}

/* ---------------- Day 21: eigenvectors ---------------- */
export function EigenLab() {
  const [a, setA] = useState(2);
  const [b, setB] = useState(1);
  const [d, setD] = useState(2);
  const [phi, setPhi] = useState(20);
  const { l1, l2, q1, q2 } = eig2(a, b, d);
  const A = (p: [number, number]): [number, number] => [a * p[0] + b * p[1], b * p[0] + d * p[1]];
  const v: [number, number] = [Math.cos((phi * Math.PI) / 180), Math.sin((phi * Math.PI) / 180)];
  const Av = A(v);
  const qf = v[0] * Av[0] + v[1] * Av[1];
  const aligned = Math.abs(v[0] * Av[1] - v[1] * Av[0]) < 0.03 * Math.hypot(...Av);
  const kind = l2 > 1e-9 ? "positive definite" : l2 > -1e-9 ? "positive semi-definite" : l1 < -1e-9 ? "negative definite" : "indefinite";
  return (
    <SimShell note="The grey circle is every unit vector; the coloured ellipse is where A sends them. The eigenvectors are the ellipse's axes, and the eigenvalues are its semi-axis lengths. Rotate the probe v: Av lines up with v only along an eigenvector.">
      <div className="grid gap-4 md:grid-cols-[1fr_300px]">
        <Plane range={4}>
          {(s) => {
            let circ = "", ell = "";
            for (let k = 0; k <= 72; k++) {
              const t = (2 * Math.PI * k) / 72, p: [number, number] = [Math.cos(t), Math.sin(t)], q = A(p);
              circ += `${k ? "L" : "M"}${s(...p).join(",")}`;
              ell += `${k ? "L" : "M"}${s(...q).join(",")}`;
            }
            return (
              <>
                <path d={circ} fill="none" stroke="var(--text-3)" strokeDasharray="4 4" />
                <path d={ell} fill={C1} fillOpacity={0.12} stroke={C1} strokeWidth={2} />
                <Arrow from={s(0, 0)} to={s(l1 * q1[0], l1 * q1[1])} color={C3} width={3.5} />
                <Arrow from={s(0, 0)} to={s(l2 * q2[0], l2 * q2[1])} color={C4} width={3.5} />
                <Arrow from={s(0, 0)} to={s(...v)} color="var(--text)" width={2.5} />
                <Arrow from={s(0, 0)} to={s(...Av)} color={C2} width={3} />
                <text x={s(...Av)[0] + 8} y={s(...Av)[1] - 6} style={{ fill: "var(--text)", fontWeight: 700 }}>Av</text>
              </>
            );
          }}
        </Plane>
        <div className="space-y-3">
          <Slider label="a (top-left)" value={a} min={-3} max={3} step={0.05} onChange={setA} format={(x) => x.toFixed(2)} />
          <Slider label="b (off-diagonal)" value={b} min={-3} max={3} step={0.05} onChange={setB} format={(x) => x.toFixed(2)} />
          <Slider label="d (bottom-right)" value={d} min={-3} max={3} step={0.05} onChange={setD} format={(x) => x.toFixed(2)} />
          <Slider label="Probe angle of v" value={phi} min={0} max={360} step={1} onChange={setPhi} format={(x) => `${x}°`} />
          <div className="grid grid-cols-2 gap-2">
            <Stat label="λ₁ (green)" value={fmt(l1, 3)} color={C3} />
            <Stat label="λ₂ (violet)" value={fmt(l2, 3)} color={C4} />
            <Stat label="v′Av" value={fmt(qf, 3)} sub={aligned ? "v is an eigenvector!" : "between λ₂ and λ₁"} color={C2} />
            <Stat label="Type" value={<span className="text-sm">{kind}</span>} sub={`trace ${fmt(a + d)}, det ${fmt(a * d - b * b)}`} />
          </div>
        </div>
      </div>
      <Legend items={[{ color: C3, label: "λ₁ q₁" }, { color: C4, label: "λ₂ q₂" }, { color: "var(--text)", label: "probe v" }, { color: C2, label: "Av" }]} />
    </SimShell>
  );
}

/* ---------------- Day 22: covariance ellipses ---------------- */
export function CovarianceLab() {
  const [s1, setS1] = useState(1.5);
  const [s2, setS2] = useState(1);
  const [rho, setRho] = useState(0.6);
  const [th, setTh] = useState(45);
  const [seed, reseed] = useSeed();
  const c = rho * s1 * s2;
  const L = [s1, 0, rho * s2, s2 * Math.sqrt(1 - rho * rho)];
  const pts = useMemo(() => {
    const r = rng(seed * 5 + 1);
    return Array.from({ length: 500 }, () => { const z1 = r.n(), z2 = r.n(); return [L[0] * z1, L[2] * z1 + L[3] * z2] as [number, number]; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s1, s2, rho, seed]);
  const { l1, l2, q1, q2 } = eig2(s1 * s1, c, s2 * s2);
  const w: [number, number] = [Math.cos((th * Math.PI) / 180), Math.sin((th * Math.PI) / 180)];
  const varTheory = w[0] * w[0] * s1 * s1 + 2 * w[0] * w[1] * c + w[1] * w[1] * s2 * s2;
  const varSample = variance(pts.map((p) => w[0] * p[0] + w[1] * p[1]), 1);
  return (
    <SimShell note="500 draws made from independent normals with the Cholesky factor L. The ellipses are the 1- and 2-sd contours; their axes are the eigenvectors of Σ. The orange direction a gives a combination a′X whose variance is a′Σa.">
      <div className="grid gap-4 md:grid-cols-[1fr_300px]">
        <Plane range={4.5}>
          {(s) => {
            const ell = (k: number) => {
              let dd = "";
              for (let i = 0; i <= 72; i++) {
                const t = (2 * Math.PI * i) / 72, u = k * Math.sqrt(l1) * Math.cos(t), v = k * Math.sqrt(Math.max(0, l2)) * Math.sin(t);
                dd += `${i ? "L" : "M"}${s(u * q1[0] + v * q2[0], u * q1[1] + v * q2[1]).join(",")}`;
              }
              return dd;
            };
            return (
              <>
                {pts.map((p, i) => <circle key={i} cx={s(...p)[0]} cy={s(...p)[1]} r={2.3} fill={C1} opacity={0.4} />)}
                <path d={ell(1)} fill="none" stroke="var(--text)" strokeWidth={1.8} />
                <path d={ell(2)} fill="none" stroke="var(--text)" strokeWidth={1.2} strokeDasharray="5 4" />
                <line x1={s(-5 * w[0], -5 * w[1])[0]} y1={s(-5 * w[0], -5 * w[1])[1]} x2={s(5 * w[0], 5 * w[1])[0]} y2={s(5 * w[0], 5 * w[1])[1]} stroke={C2} strokeWidth={2} opacity={0.7} />
                <Arrow from={s(0, 0)} to={s(...w)} color={C2} />
              </>
            );
          }}
        </Plane>
        <div className="space-y-3">
          <Slider label="σ₁" value={s1} min={0.3} max={2} step={0.05} onChange={setS1} format={(v) => v.toFixed(2)} />
          <Slider label="σ₂" value={s2} min={0.3} max={2} step={0.05} onChange={setS2} format={(v) => v.toFixed(2)} />
          <Slider label="ρ" value={rho} min={-0.95} max={0.95} step={0.05} onChange={setRho} format={(v) => v.toFixed(2)} />
          <Slider label="Direction a (angle)" value={th} min={0} max={180} step={1} onChange={setTh} format={(v) => `${v}°`} />
          <button className="btn" onClick={reseed}>New draws</button>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="a′Σa (theory)" value={fmt(varTheory, 3)} color={C2} />
            <Stat label="var(a′X) sample" value={fmt(varSample, 3)} color={C1} />
            <Stat label="eigenvalues of Σ" value={`${fmt(l1, 2)}, ${fmt(l2, 2)}`} sub="max / min of a′Σa" />
            <Stat label="Cholesky L" value={<span className="text-sm">[{fmt(L[0], 2)} 0; {fmt(L[2], 2)} {fmt(L[3], 2)}]</span>} />
          </div>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 23: Taylor approximation ---------------- */
type F = "exp" | "log1p" | "sin" | "logistic";
const FUNCS: Record<F, { label: string; f: (x: number) => number; d: (a: number, k: number) => number; lo: number; hi: number }> = {
  exp: { label: "eˣ", f: Math.exp, d: (a) => Math.exp(a), lo: -3, hi: 3 },
  log1p: { label: "ln(1+x)", f: (x) => (x > -1 ? Math.log1p(x) : NaN), d: (a, k) => (k === 0 ? Math.log1p(a) : ((k % 2 ? 1 : -1) * [1, 1, 1, 2, 6][k]) / (1 + a) ** k), lo: -0.9, hi: 3 },
  sin: { label: "sin x", f: Math.sin, d: (a, k) => [Math.sin, Math.cos, (x: number) => -Math.sin(x), (x: number) => -Math.cos(x)][k % 4](a), lo: -6, hi: 6 },
  logistic: {
    label: "logistic Λ(x)", f: (x) => 1 / (1 + Math.exp(-x)), lo: -6, hi: 6,
    d: (a, k) => {
      const p = 1 / (1 + Math.exp(-a)), q = p * (1 - p);
      return [p, q, q * (1 - 2 * p), q * (1 - 6 * p + 6 * p * p), q * (1 - 2 * p) * (1 - 12 * p + 12 * p * p)][k];
    },
  },
};
export function TaylorLab() {
  const [fn, setFn] = useState<F>("log1p");
  const [a, setA] = useState(0);
  const [order, setOrder] = useState(1);
  const F0 = FUNCS[fn];
  const aa = Math.max(F0.lo + 0.05, Math.min(F0.hi - 0.05, a));
  const coef = Array.from({ length: order + 1 }, (_, k) => F0.d(aa, k) / [1, 1, 2, 6, 24][k]);
  const T = (x: number) => coef.reduce((s, c, k) => s + c * (x - aa) ** k, 0);
  const ys = Array.from({ length: 200 }, (_, i) => F0.f(F0.lo + ((F0.hi - F0.lo) * i) / 199)).filter(Number.isFinite);
  const ylo = Math.min(...ys), yhi = Math.max(...ys), pad = (yhi - ylo) * 0.35 + 0.1;
  const clip = (v: number) => (v < ylo - pad || v > yhi + pad ? NaN : v);
  const probe = aa + (F0.hi - F0.lo) * 0.1;
  return (
    <SimShell note="The Taylor polynomial matches the function's value and first few derivatives at the point a. Near a the error shrinks like |x − a|^(order+1); far away the approximation can be poor. Hover to read the error.">
      <div className="mb-3 flex flex-wrap gap-3">
        <Seg value={fn} onChange={setFn} options={(Object.keys(FUNCS) as F[]).map((k) => ({ value: k, label: FUNCS[k].label }))} />
        <Seg value={String(order) as "1"} onChange={(v) => setOrder(+v)} options={[1, 2, 3, 4].map((k) => ({ value: String(k) as "1", label: `order ${k}` }))} />
      </div>
      <Plot x={[F0.lo, F0.hi]} y={[ylo - pad, yhi + pad]} height={300} xLabel="x" yLabel="f(x)"
        hover={(x) => [`x = ${fmt(x)}`, `f(x) = ${fmt(F0.f(x), 4)}`, `Taylor = ${fmt(T(x), 4)}`, `error = ${fmt(F0.f(x) - T(x), 4)}`]}>
        {(sx, sy) => (
          <>
            <path d={curve((x) => clip(F0.f(x)), F0.lo, F0.hi, sx, sy, 400)} fill="none" stroke={C1} strokeWidth={2.5} />
            <path d={curve((x) => clip(T(x)), F0.lo, F0.hi, sx, sy, 400)} fill="none" stroke={C2} strokeWidth={2} strokeDasharray="6 4" />
            <circle cx={sx(aa)} cy={sy(F0.f(aa))} r={6} fill={C2} stroke="var(--surface)" strokeWidth={2} />
          </>
        )}
      </Plot>
      <Legend items={[{ color: C1, label: `f(x) = ${F0.label}` }, { color: C2, label: `Taylor polynomial of order ${order} at a`, dash: true }]} />
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <Slider label="Expansion point a" value={aa} min={F0.lo + 0.05} max={F0.hi - 0.05} step={0.05} onChange={setA} format={(v) => v.toFixed(2)} />
        <div className="grid grid-cols-2 gap-2">
          <Stat label={`error at x = a + ${fmt(probe - aa, 2)}`} value={fmt(Math.abs(F0.f(probe) - T(probe)), 5)} color={C2} />
          <Stat label="f′(a) (slope)" value={fmt(F0.d(aa, 1), 4)} sub="the delta-method multiplier" />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 24: gradient of the SSR ---------------- */
const GX = [1, 2, 3, 4, 5, 6], GY = [2.1, 2.9, 4.2, 4.8, 6.1, 6.9];
function ssrSetup() {
  const n = GX.length, sx = GX.reduce((s, v) => s + v, 0), sxx = GX.reduce((s, v) => s + v * v, 0);
  const sy = GY.reduce((s, v) => s + v, 0), sxy = GX.reduce((s, v, i) => s + v * GY[i], 0);
  const det = n * sxx - sx * sx;
  const b0 = (sxx * sy - sx * sxy) / det, b1 = (n * sxy - sx * sy) / det;
  const S = (a: number, b: number) => GX.reduce((s, x, i) => s + (GY[i] - a - b * x) ** 2, 0);
  const grad = (a: number, b: number): [number, number] => [-2 * (sy - n * a - sx * b), -2 * (sxy - sx * a - sxx * b)];
  return { n, sx, sxx, b0, b1, S, grad, XtX: [n, sx, sxx] as [number, number, number] };
}
export function GradientLab() {
  const G = useMemo(ssrSetup, []);
  const [pt, setPt] = useState<[number, number]>([2.5, 0.4]);
  const g = G.grad(...pt);
  const { l1, l2, q1, q2 } = eig2(G.XtX[0], G.XtX[1], G.XtX[2]);
  const Smin = G.S(G.b0, G.b1);
  const xr: [number, number] = [G.b0 - 2.5, G.b0 + 2.5], yr: [number, number] = [G.b1 - 0.7, G.b1 + 0.7];
  const gn = Math.hypot(...g);
  return (
    <SimShell note="Contours of the sum of squared residuals S(β₀, β₁) for six data points. Click or drag anywhere: the orange arrow is −∇S = 2X′(y − Xβ), the direction of steepest descent (drawn at a fixed length). It points across the contours toward lower S and vanishes only at the OLS estimate.">
      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        <Field x={xr} y={yr} xLabel="β₀ (intercept)" yLabel="β₁ (slope)" onPick={(a, b) => setPt([a, b])}>
          {(sx, sy) => (
            <>
              {[0.5, 1, 2, 4, 8, 16, 32].map((lev, k) => {
                let d = "";
                for (let i = 0; i <= 90; i++) {
                  const t = (2 * Math.PI * i) / 90, u = Math.sqrt(lev / l1) * Math.cos(t), v = Math.sqrt(lev / l2) * Math.sin(t);
                  d += `${i ? "L" : "M"}${sx(G.b0 + u * q1[0] + v * q2[0]).toFixed(1)},${sy(G.b1 + u * q1[1] + v * q2[1]).toFixed(1)}`;
                }
                return <path key={lev} d={d} fill="none" stroke={C1} strokeOpacity={0.25 + 0.1 * k} strokeWidth={1.4} />;
              })}
              <circle cx={sx(G.b0)} cy={sy(G.b1)} r={5} fill="var(--text)" />
              {gn > 1e-6 && (() => {
                const dx = sx(pt[0] - g[0]) - sx(pt[0]), dy = sy(pt[1] - g[1]) - sy(pt[1]);
                const t = 70 / Math.hypot(dx, dy); // fixed on-screen length; direction = −∇S
                return <Arrow from={[sx(pt[0]), sy(pt[1])]} to={[sx(pt[0]) + dx * t, sy(pt[1]) + dy * t]} color={C2} />;
              })()}
              <circle cx={sx(pt[0])} cy={sy(pt[1])} r={6} fill={C2} stroke="var(--surface)" strokeWidth={2} />
            </>
          )}
        </Field>
        <div className="space-y-2">
          <Stat label="β (your point)" value={`(${fmt(pt[0], 2)}, ${fmt(pt[1], 3)})`} color={C2} />
          <Stat label="S(β)" value={fmt(G.S(...pt), 3)} sub={`minimum ${fmt(Smin, 3)}`} />
          <Stat label="∇S = −2X′(y − Xβ)" value={`(${fmt(g[0], 2)}, ${fmt(g[1], 2)})`} color={C2} />
          <Stat label="OLS β̂" value={`(${fmt(G.b0, 3)}, ${fmt(G.b1, 3)})`} sub="∇S = 0 here" />
          <Stat label="Hessian 2X′X" value={<span className="text-sm">[{2 * G.XtX[0]} {2 * G.XtX[1]}; {2 * G.XtX[1]} {2 * G.XtX[2]}]</span>} sub={`eigenvalues ${fmt(2 * l1, 1)}, ${fmt(2 * l2, 2)}`} />
          <button className="btn" onClick={() => setPt([G.b0, G.b1])}>Jump to OLS</button>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 25: gradient descent vs Newton ---------------- */
type Fn = "quad" | "rosen";
export function GdNewtonLab() {
  const [fn, setFn] = useState<Fn>("quad");
  const [method, setMethod] = useState<"gd" | "newton">("gd");
  const [kappa, setKappa] = useState(10);
  const [eta, setEta] = useState(0.15);
  const [start, setStart] = useState<[number, number]>([-1.6, 1.2]);
  const f = (x: number, y: number) => (fn === "quad" ? 0.5 * (x * x + kappa * y * y) : (1 - x) ** 2 + 10 * (y - x * x) ** 2);
  const grad = (x: number, y: number): [number, number] => (fn === "quad" ? [x, kappa * y] : [-2 * (1 - x) - 40 * x * (y - x * x), 20 * (y - x * x)]);
  const hess = (x: number, y: number) => (fn === "quad" ? [1, 0, kappa] : [2 - 40 * (y - x * x) + 80 * x * x, -40 * x, 20]);
  const target: [number, number] = fn === "quad" ? [0, 0] : [1, 1];
  const path = useMemo(() => {
    const p: [number, number][] = [start];
    let [x, y] = start;
    for (let t = 0; t < 80; t++) {
      const [gx, gy] = grad(x, y);
      if (method === "gd") { x -= eta * gx; y -= eta * gy; }
      else {
        const [a, b, d] = hess(x, y), det = a * d - b * b;
        if (Math.abs(det) < 1e-12) break;
        x -= (d * gx - b * gy) / det; y -= (-b * gx + a * gy) / det;
      }
      if (!Number.isFinite(x) || Math.abs(x) > 1e6) break;
      p.push([x, y]);
      if (Math.hypot(x - target[0], y - target[1]) < 1e-6) break;
    }
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fn, method, kappa, eta, start]);
  const last = path[path.length - 1];
  const reach = path.findIndex((p) => Math.hypot(p[0] - target[0], p[1] - target[1]) < 1e-3);
  const xr: [number, number] = [-2, 2], yr: [number, number] = fn === "quad" ? [-1.5, 1.5] : [-1, 3];
  const NX = 64, NY = 44;
  const cells = useMemo(() => {
    const out: { x: number; y: number; v: number }[] = [];
    for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) {
      const x = xr[0] + ((i + 0.5) / NX) * (xr[1] - xr[0]), y = yr[0] + ((j + 0.5) / NY) * (yr[1] - yr[0]);
      out.push({ x, y, v: Math.log1p(f(x, y)) });
    }
    const mx = Math.max(...out.map((c) => c.v));
    return out.map((c) => ({ ...c, v: c.v / mx }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fn, kappa]);
  const lmax = fn === "quad" ? Math.max(1, kappa) : NaN;
  return (
    <SimShell note="Click to choose a starting point. Gradient descent follows the downhill direction with a fixed step; Newton jumps to the minimum of the local quadratic approximation. On the ill-conditioned quadratic, gradient descent zig-zags or diverges once η > 2/λmax.">
      <div className="mb-3 flex flex-wrap gap-3">
        <Seg value={fn} onChange={setFn} options={[{ value: "quad", label: "Quadratic ½(x² + κy²)" }, { value: "rosen", label: "Rosenbrock (non-convex valley)" }]} />
        <Seg value={method} onChange={setMethod} options={[{ value: "gd", label: "Gradient descent" }, { value: "newton", label: "Newton" }]} />
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        <Field x={xr} y={yr} xLabel="x" yLabel="y" height={420} onPick={(x, y) => setStart([x, y])}>
          {(sx, sy) => (
            <>
              {cells.map((c, i) => (
                <rect key={i} x={sx(c.x - (xr[1] - xr[0]) / NX / 2)} y={sy(c.y + (yr[1] - yr[0]) / NY / 2)} width={(sx(xr[1]) - sx(xr[0])) / NX + 0.6} height={(sy(yr[0]) - sy(yr[1])) / NY + 0.6}
                  fill={`color-mix(in oklab, var(--s1) ${Math.round(8 + 70 * c.v)}%, var(--surface))`} />
              ))}
              <polyline points={path.map((p) => `${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join(" ")} fill="none" stroke={C2} strokeWidth={2} />
              {path.map((p, i) => <circle key={i} cx={sx(p[0])} cy={sy(p[1])} r={i === 0 ? 6 : 3} fill={i === 0 ? "var(--text)" : C2} />)}
              <text x={sx(target[0]) + 6} y={sy(target[1]) - 6} style={{ fill: "var(--text)", fontWeight: 700 }}>★ minimum</text>
            </>
          )}
        </Field>
        <div className="space-y-3">
          {fn === "quad" && <Slider label="Condition number κ" value={kappa} min={1} max={50} step={1} onChange={setKappa} />}
          {method === "gd" && <Slider label="Step size η" value={eta} min={0.005} max={fn === "quad" ? 0.25 : 0.06} step={0.001} onChange={setEta} format={(v) => v.toFixed(3)} />}
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Steps to reach the minimum" value={reach >= 0 ? reach : "> 80"} sub={reach >= 0 ? "within 0.001" : "not there after 80 steps"} color={reach >= 0 ? C3 : C2} />
            <Stat label="f at last point" value={Number.isFinite(f(...last)) ? fmt(f(...last), 6) : "∞"} />
            {fn === "quad" && method === "gd" && <Stat label="2/λmax" value={fmt(2 / lmax, 3)} sub={eta < 2 / lmax ? "η below: converges" : "η above: diverges"} color={eta < 2 / lmax ? C3 : C2} />}
          </div>
        </div>
      </div>
    </SimShell>
  );
}
