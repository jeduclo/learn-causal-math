"use client";
import { useMemo, useRef, useState, type ReactNode } from "react";

/* ---------------- random numbers & maths ---------------- */
export function rng(seed: number) {
  let a = seed >>> 0;
  const u = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let spare: number | null = null;
  const n = () => {
    if (spare !== null) {
      const s = spare;
      spare = null;
      return s;
    }
    let x = 0, y = 0, r = 0;
    do {
      x = 2 * u() - 1;
      y = 2 * u() - 1;
      r = x * x + y * y;
    } while (r === 0 || r >= 1);
    const f = Math.sqrt((-2 * Math.log(r)) / r);
    spare = y * f;
    return x * f;
  };
  const exp = (rate = 1) => -Math.log(1 - u()) / rate;
  const pois = (lam: number) => {
    const L = Math.exp(-lam);
    let k = 0, p = 1;
    do {
      k++;
      p *= u();
    } while (p > L);
    return k - 1;
  };
  const gamma = (shape: number): number => {
    if (shape < 1) return gamma(shape + 1) * Math.pow(u(), 1 / shape);
    const d = shape - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x = 0, v = 0;
      do {
        x = n();
        v = 1 + c * x;
      } while (v <= 0);
      v = v * v * v;
      const uu = u();
      if (uu < 1 - 0.0331 * x ** 4 || Math.log(uu) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  };
  const beta = (a: number, b: number) => {
    const x = gamma(a);
    return x / (x + gamma(b));
  };
  return { u, n, exp, pois, gamma, beta };
}

export const mean = (x: number[]) => x.reduce((s, v) => s + v, 0) / Math.max(1, x.length);
export const variance = (x: number[], ddof = 0) => {
  const m = mean(x);
  return x.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, x.length - ddof);
};
export const median = (x: number[]) => {
  const s = [...x].sort((a, b) => a - b);
  const k = s.length >> 1;
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2;
};
export function erf(x: number) {
  const s = Math.sign(x);
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
export const normPdf = (x: number, m = 0, s = 1) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
export const normCdf = (x: number, m = 0, s = 1) => 0.5 * (1 + erf((x - m) / (s * Math.SQRT2)));
export function normInv(p: number): number {
  // Acklam's rational approximation
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  if (p < pl) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - pl) return -normInv(1 - p);
  const q = p - 0.5, r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
export function lgamma(z: number): number {
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * z))) - lgamma(1 - z);
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
export const betaPdf = (x: number, a: number, b: number) =>
  x <= 0 || x >= 1 ? 0 : Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) + lgamma(a + b) - lgamma(a) - lgamma(b));
export const binomPmf = (k: number, n: number, p: number) =>
  Math.exp(lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1) + k * Math.log(p) + (n - k) * Math.log(1 - p));
export const poisPmf = (k: number, lam: number) => Math.exp(k * Math.log(lam) - lam - lgamma(k + 1));

export function histogram(x: number[], lo: number, hi: number, bins: number) {
  const w = (hi - lo) / bins;
  const counts = new Array(bins).fill(0);
  for (const v of x) {
    const i = Math.floor((v - lo) / w);
    if (i >= 0 && i < bins) counts[i]++;
  }
  return counts.map((c, i) => ({ x0: lo + i * w, x1: lo + (i + 1) * w, count: c, density: c / (x.length * w) }));
}

export function niceTicks(lo: number, hi: number, n = 5) {
  const span = hi - lo || 1;
  const step0 = span / n;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= n + 0.5) ?? mag * 10;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}
export const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d }) : "—");

/* ---------------- UI pieces ---------------- */
export function SimShell({ title, children, note }: { title?: string; children: ReactNode; note?: ReactNode }) {
  return (
    <div className="sim card p-4 sm:p-5">
      {title && <h3 className="serif mb-3 text-lg font-bold">{title}</h3>}
      {children}
      {note && <p className="mt-3 text-sm muted">{note}</p>}
    </div>
  );
}

export function Slider(props: {
  label: ReactNode; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format?: (v: number) => string;
}) {
  const { label, value, min, max, step, onChange, format } = props;
  return (
    <label className="block text-sm">
      <span className="flex justify-between gap-2">
        <span className="muted">{label}</span>
        <span className="font-mono font-semibold tabular-nums">{format ? format(value) : value}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </label>
  );
}

export function Seg<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="group">
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, sub, color }: { label: string; value: ReactNode; sub?: ReactNode; color?: string }) {
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: "var(--surface-2)", borderLeft: color ? `4px solid ${color}` : undefined }}>
      <div className="text-xs faint">{label}</div>
      <div className="font-mono text-lg font-bold tabular-nums">{value}</div>
      {sub && <div className="text-xs faint">{sub}</div>}
    </div>
  );
}

export function Legend({ items }: { items: { color: string; label: string; dash?: boolean; area?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs muted">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <svg width="18" height="10" aria-hidden>
            {i.area ? (
              <rect x="1" y="1" width="16" height="8" rx="2" fill={i.color} opacity={0.35} stroke={i.color} />
            ) : (
              <line x1="1" y1="5" x2="17" y2="5" stroke={i.color} strokeWidth="2.5" strokeDasharray={i.dash ? "4 3" : undefined} />
            )}
          </svg>
          {i.label}
        </span>
      ))}
    </div>
  );
}

export type Scale = (v: number) => number;

/** A responsive SVG plot with axes, a recessive grid and an optional hover crosshair. */
export function Plot(props: {
  x: [number, number]; y: [number, number]; height?: number; xLabel?: string; yLabel?: string;
  xTicks?: number[]; yTicks?: number[]; xFormat?: (v: number) => string; yFormat?: (v: number) => string;
  hover?: (x: number) => string[] | null; children: (sx: Scale, sy: Scale) => ReactNode;
}) {
  const W = 640, H = props.height ?? 300, m = { l: 52, r: 16, t: 12, b: props.xLabel ? 44 : 28 };
  const sx: Scale = (v) => m.l + ((v - props.x[0]) / (props.x[1] - props.x[0])) * (W - m.l - m.r);
  const sy: Scale = (v) => H - m.b - ((v - props.y[0]) / (props.y[1] - props.y[0])) * (H - m.t - m.b);
  const xt = props.xTicks ?? niceTicks(props.x[0], props.x[1], 6);
  const yt = props.yTicks ?? niceTicks(props.y[0], props.y[1], 4);
  const xf = props.xFormat ?? ((v: number) => String(+v.toFixed(3)));
  const yf = props.yFormat ?? ((v: number) => String(+v.toFixed(3)));
  const ref = useRef<SVGSVGElement>(null);
  const [hx, setHx] = useState<number | null>(null);
  const lines = hx !== null && props.hover ? props.hover(hx) : null;
  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full select-none"
      role="img"
      onMouseMove={(e) => {
        if (!props.hover || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const px = ((e.clientX - r.left) / r.width) * W;
        if (px < m.l || px > W - m.r) return setHx(null);
        setHx(props.x[0] + ((px - m.l) / (W - m.l - m.r)) * (props.x[1] - props.x[0]));
      }}
      onMouseLeave={() => setHx(null)}
    >
      {yt.map((t) => (
        <g key={`y${t}`}>
          <line x1={m.l} x2={W - m.r} y1={sy(t)} y2={sy(t)} stroke="var(--grid)" />
          <text x={m.l - 6} y={sy(t) + 4} textAnchor="end">{yf(t)}</text>
        </g>
      ))}
      {xt.map((t) => (
        <text key={`x${t}`} x={sx(t)} y={H - m.b + 16} textAnchor="middle">{xf(t)}</text>
      ))}
      <line x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} stroke="var(--text-3)" />
      {props.xLabel && <text x={(m.l + W - m.r) / 2} y={H - 6} textAnchor="middle" style={{ fontWeight: 600 }}>{props.xLabel}</text>}
      {props.yLabel && (
        <text transform={`translate(12 ${(m.t + H - m.b) / 2}) rotate(-90)`} textAnchor="middle" style={{ fontWeight: 600 }}>{props.yLabel}</text>
      )}
      <g>{props.children(sx, sy)}</g>
      {lines && hx !== null && (
        <g pointerEvents="none">
          <line x1={sx(hx)} x2={sx(hx)} y1={m.t} y2={H - m.b} stroke="var(--text-3)" strokeDasharray="3 3" />
          {(() => {
            const bw = Math.max(...lines.map((l) => l.length)) * 6.6 + 16, bh = lines.length * 16 + 10;
            const bx = sx(hx) + 10 + bw > W ? sx(hx) - 10 - bw : sx(hx) + 10;
            return (
              <g>
                <rect x={bx} y={m.t + 4} width={bw} height={bh} rx={8} fill="var(--surface)" stroke="var(--border)" />
                {lines.map((l, i) => (
                  <text key={i} x={bx + 8} y={m.t + 22 + i * 16} style={{ fill: "var(--text)", fontSize: 11.5 }}>{l}</text>
                ))}
              </g>
            );
          })()}
        </g>
      )}
    </svg>
  );
}

/** Path for a function curve. */
export function curve(f: (x: number) => number, lo: number, hi: number, sx: Scale, sy: Scale, n = 200) {
  let d = "", pen = false;
  for (let i = 0; i <= n; i++) {
    const x = lo + ((hi - lo) * i) / n;
    const y = f(x);
    if (!Number.isFinite(y)) {
      pen = false; // break the line where the function is undefined or off-scale
      continue;
    }
    d += `${pen ? "L" : "M"}${sx(x).toFixed(1)},${sy(y).toFixed(1)}`;
    pen = true;
  }
  return d;
}
export function areaPath(f: (x: number) => number, lo: number, hi: number, sx: Scale, sy: Scale, n = 120) {
  if (hi <= lo) return "";
  let d = `M${sx(lo)},${sy(0)}`;
  for (let i = 0; i <= n; i++) {
    const x = lo + ((hi - lo) * i) / n;
    d += `L${sx(x).toFixed(1)},${sy(f(x)).toFixed(1)}`;
  }
  return d + `L${sx(hi)},${sy(0)}Z`;
}

/** Histogram bars with a 2px surface gap and rounded tops. */
export function Bars({ bins, sx, sy, color, key0 = "b", opacity = 0.85 }: {
  bins: { x0: number; x1: number; density: number }[]; sx: Scale; sy: Scale; color: string; key0?: string; opacity?: number;
}) {
  return (
    <>
      {bins.map((b, i) => {
        const x = sx(b.x0) + 1, w = Math.max(0.5, sx(b.x1) - sx(b.x0) - 2), y = sy(b.density), h = sy(0) - y;
        return h > 0 ? <rect key={key0 + i} x={x} y={y} width={w} height={h} rx={Math.min(3, w / 2)} fill={color} opacity={opacity} /> : null;
      })}
    </>
  );
}

export function useSeed() {
  const [seed, setSeed] = useState(1);
  return [seed, () => setSeed((s) => s + 1)] as const;
}
export { useMemo };
