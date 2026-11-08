"use client";
import { useMemo, useState } from "react";
import { Bars, Legend, Plot, Seg, SimShell, Slider, Stat, curve, fmt, histogram, mean, normCdf, normPdf, rng, useSeed } from "./kit";
import { avg, logistic, sd } from "./kit2";

const C1 = "var(--s1)", C2 = "var(--s2)", C3 = "var(--s3)", C4 = "var(--s4)";

/* ---------------- Day 31: the science table ---------------- */
export function ScienceTable() {
  const [seed, reseed] = useSeed();
  const [mode, setMode] = useState<"random" | "self">("random");
  const [reveal, setReveal] = useState(false);
  const [draw, setDraw] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const units = useMemo(() => {
    const r = rng(seed * 7 + 31);
    return Array.from({ length: 12 }, (_, i) => {
      const y0 = Math.round(10 + 3 * r.n());
      const gain = Math.max(-2, Math.round(2 + 2.5 * r.n() - 0.4 * (y0 - 10)));
      return { id: String.fromCharCode(65 + i), y0, y1: y0 + gain };
    });
  }, [seed]);
  const T = useMemo(() => {
    if (mode === "self") return units.map((u) => u.y1 - u.y0 > 2);
    const r = rng(seed * 101 + draw);
    const idx = Array.from({ length: 12 }, (_, i) => [r.u(), i]).sort((a, b) => a[0] - b[0]).slice(0, 6).map((v) => v[1]);
    return units.map((_, i) => idx.includes(i));
  }, [mode, units, seed, draw]);
  const tau = units.map((u) => u.y1 - u.y0);
  const ate = avg(tau);
  const att = avg(tau.filter((_, i) => T[i]));
  const obs = units.map((u, i) => (T[i] ? u.y1 : u.y0));
  const est = avg(obs.filter((_, i) => T[i])) - avg(obs.filter((_, i) => !T[i]));
  const runMany = (k: number) => {
    const r = rng(seed * 13 + history.length + 7);
    const add: number[] = [];
    for (let j = 0; j < k; j++) {
      const idx = Array.from({ length: 12 }, (_, i) => [r.u(), i]).sort((a, b) => a[0] - b[0]).slice(0, 6).map((v) => v[1]);
      const t = units.map((_, i) => idx.includes(i));
      add.push(avg(units.filter((_, i) => t[i]).map((u) => u.y1)) - avg(units.filter((_, i) => !t[i]).map((u) => u.y0)));
    }
    setHistory((h) => [...h, ...add]);
  };
  const lo = Math.min(ate - 6, ...history), hi = Math.max(ate + 6, ...history);
  const bins = history.length ? histogram(history, lo, hi, 30) : [];
  return (
    <SimShell note="Twelve workers' earnings without (Y0) and with (Y1) training, in $1,000. In real data only one column per worker is visible; the other is '?'. Random assignment gives estimates that scatter around the ATE; self-selection (enrol if the gain exceeds 2) does not.">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Seg value={mode} onChange={(v) => { setMode(v); setHistory([]); }} options={[{ value: "random", label: "Random assignment (6 of 12)" }, { value: "self", label: "Self-selection on gains" }]} />
        <button className="btn" onClick={() => setDraw((d) => d + 1)} disabled={mode === "self"}>New assignment</button>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={reveal} onChange={(e) => setReveal(e.target.checked)} /> Reveal the missing outcomes</label>
        <button className="btn" onClick={() => { reseed(); setHistory([]); }}>New workers</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <table className="w-full text-sm">
          <thead><tr className="text-xs faint"><th className="text-left">worker</th><th>T</th><th>Y(0)</th><th>Y(1)</th><th>effect</th><th>observed Y</th></tr></thead>
          <tbody>
            {units.map((u, i) => {
              const cell = (v: number, seen: boolean) => (
                <td className="text-center font-mono" style={{ color: seen ? "var(--text)" : "var(--text-3)", background: seen ? "color-mix(in oklab, var(--s1) 14%, transparent)" : undefined }}>
                  {seen || reveal ? v : "?"}
                </td>
              );
              return (
                <tr key={u.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="py-0.5 font-semibold">{u.id}</td>
                  <td className="text-center font-mono" style={{ color: T[i] ? C2 : "var(--text-3)" }}>{T[i] ? 1 : 0}</td>
                  {cell(u.y0, !T[i])}
                  {cell(u.y1, T[i])}
                  <td className="text-center font-mono" style={{ color: reveal ? "var(--text)" : "var(--text-3)" }}>{reveal ? tau[i] : "?"}</td>
                  <td className="text-center font-mono font-semibold">{obs[i]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="true ATE" value={fmt(ate, 2)} color={C3} sub="hidden in practice" />
            <Stat label="true ATT" value={fmt(att, 2)} sub="treated workers only" />
            <Stat label="difference in means" value={fmt(est, 2)} color={C2} sub="what the data show" />
          </div>
          {mode === "random" ? (
            <>
              <div className="flex flex-wrap gap-2">
                <button className="btn" onClick={() => runMany(1)}>Run 1 experiment</button>
                <button className="btn" onClick={() => runMany(100)}>Run 100</button>
                <button className="btn" onClick={() => runMany(1000)}>Run 1,000</button>
                <button className="btn" onClick={() => setHistory([])}>Clear</button>
              </div>
              <Plot x={[lo, hi]} y={[0, Math.max(0.05, ...bins.map((b) => b.density)) * 1.15]} height={200} xLabel="difference in means across experiments" yTicks={[]}>
                {(sx, sy) => (
                  <>
                    <Bars bins={bins} sx={sx} sy={sy} color={C1} opacity={0.6} />
                    {!history.length && <text x={sx((lo + hi) / 2)} y={sy(0) - 70} textAnchor="middle" style={{ fill: "var(--text-2)", fontSize: 14 }}>Run experiments to build the distribution of estimates</text>}
                    <line x1={sx(ate)} x2={sx(ate)} y1={sy(0)} y2={12} stroke={C3} strokeWidth={2} strokeDasharray="5 4" />
                  </>
                )}
              </Plot>
              <div className="text-xs muted">{history.length} experiments; average estimate <b className="strong">{history.length ? fmt(avg(history), 3) : "—"}</b> versus ATE {fmt(ate, 3)}.</div>
            </>
          ) : (
            <p className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--surface-2)" }}>
              Workers who enrol are those with large gains (and, here, lower earnings without training). The comparison mixes the effect with selection bias: {fmt(est, 2)} versus ATT {fmt(att, 2)}.
            </p>
          )}
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 32: spillovers ---------------- */
export function SpilloverLab() {
  const [direct, setDirect] = useState(20);
  const [spill, setSpill] = useState(8);
  const [sat, setSat] = useState(0.5);
  const base = 92;
  const groups = [
    { label: "Treated, in treated villages", v: base + direct + spill * sat * 2, color: C1 },
    { label: "Untreated, in treated villages", v: base + spill * sat * 2, color: C4 },
    { label: "Pure control villages", v: base, color: "var(--text-3)" },
  ];
  const within = groups[0].v - groups[1].v;
  const total = groups[0].v - groups[2].v;
  const spillMeasured = groups[1].v - groups[2].v;
  const overall = sat * groups[0].v + (1 - sat) * groups[1].v - base;
  const ymax = Math.max(...groups.map((g) => g.v)) * 1.12;
  return (
    <SimShell note="Spillovers scale with the share of the village treated (here: spillover = slider value × saturation / 0.5). A within-village comparison captures only the direct effect; pure control villages are needed to see spillovers and the policy's total effect.">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <svg viewBox="0 0 560 300" className="w-full">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}><line x1={60} x2={550} y1={260 - t * 230} y2={260 - t * 230} stroke="var(--grid)" /><text x={54} y={264 - t * 230} textAnchor="end">{fmt(t * ymax, 0)}</text></g>
          ))}
          {groups.map((g, i) => {
            const h = (g.v / ymax) * 230, x = 90 + i * 160;
            return (
              <g key={g.label}>
                <rect x={x} y={260 - h} width={110} height={h} rx={4} fill={g.color} opacity={0.85} />
                <text x={x + 55} y={252 - h} textAnchor="middle" style={{ fill: "var(--text)", fontWeight: 700 }}>{fmt(g.v, 1)}</text>
                <text x={x + 55} y={280} textAnchor="middle" style={{ fill: "var(--text)" }}>{g.label.split(",")[0]}</text>
                <text x={x + 55} y={294} textAnchor="middle">{g.label.split(",")[1] ?? ""}</text>
              </g>
            );
          })}
        </svg>
        <div className="space-y-3">
          <Slider label="Direct effect of own treatment" value={direct} min={-10} max={40} step={1} onChange={setDirect} />
          <Slider label="Spillover on others at 50% saturation" value={spill} min={-20} max={20} step={1} onChange={setSpill} />
          <Slider label="Saturation in treated villages" value={sat} min={0.1} max={0.9} step={0.05} onChange={setSat} format={(v) => `${(100 * v).toFixed(0)}%`} />
          <div className="grid grid-cols-2 gap-2">
            <Stat label="within-village comparison" value={fmt(within, 1)} sub="= direct effect" color={C1} />
            <Stat label="spillover on the untreated" value={fmt(spillMeasured, 1)} color={C4} />
            <Stat label="total effect on the treated" value={fmt(total, 1)} sub="direct + spillover" />
            <Stat label="average effect per household" value={fmt(overall, 1)} sub="treated villages vs pure control" color={C2} />
          </div>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 33: estimands ---------------- */
export function EstimandsLab() {
  const [hetero, setHetero] = useState(3);
  const [select, setSelect] = useState(3);
  const tau = (x: number) => 1 + hetero * (1 - x);                      // x = prior earnings rank in [0,1]
  const p = (x: number) => logistic(select * (0.5 - x) * 2);
  const N = 400;
  const xs = Array.from({ length: N }, (_, i) => (i + 0.5) / N);
  const pt = mean(xs.map(p));
  const ate = mean(xs.map(tau));
  const att = xs.reduce((s, x) => s + p(x) * tau(x), 0) / xs.reduce((s, x) => s + p(x), 0);
  const atc = xs.reduce((s, x) => s + (1 - p(x)) * tau(x), 0) / xs.reduce((s, x) => s + (1 - p(x)), 0);
  const dT = (x: number) => p(x) / pt, dC = (x: number) => (1 - p(x)) / (1 - pt);
  const ymax = Math.max(1 + hetero, 2.2, dT(0), dC(1)) * 1.1;
  return (
    <SimShell note="The effect τ(x) (orange) depends on prior earnings rank x. Who enrols depends on x too. ATT averages τ(x) over the treated's distribution (blue), ATC over the controls' (violet), ATE over everyone's (flat). They coincide only if τ is flat or enrolment ignores x.">
      <Plot x={[0, 1]} y={[0, ymax]} height={300} xLabel="prior earnings rank x" yLabel="effect / density"
        hover={(x) => [`x = ${fmt(x)}`, `τ(x) = ${fmt(tau(x))}`, `P(enrol | x) = ${fmt(p(x))}`]}>
        {(sx, sy) => (
          <>
            <path d={curve(dT, 0, 1, sx, sy)} fill="none" stroke={C1} strokeWidth={2} />
            <path d={curve(dC, 0, 1, sx, sy)} fill="none" stroke={C4} strokeWidth={2} />
            <path d={curve(() => 1, 0, 1, sx, sy)} fill="none" stroke="var(--text-3)" strokeDasharray="4 4" />
            <path d={curve(tau, 0, 1, sx, sy)} fill="none" stroke={C2} strokeWidth={3} />
            {[[ate, "ATE", "var(--text)"], [att, "ATT", C1], [atc, "ATC", C4]].map(([v, l, c]) => (
              <g key={l as string}>
                <line x1={sx(0)} x2={sx(1)} y1={sy(v as number)} y2={sy(v as number)} stroke={c as string} strokeDasharray="2 3" />
                <text x={sx(1) - 4} y={sy(v as number) - 4} textAnchor="end" style={{ fill: c as string, fontWeight: 700 }}>{l as string} {fmt(v as number)}</text>
              </g>
            ))}
          </>
        )}
      </Plot>
      <Legend items={[{ color: C2, label: "effect τ(x)" }, { color: C1, label: "density of x among enrollees" }, { color: C4, label: "density among non-enrollees" }, { color: "var(--text-3)", label: "density in population", dash: true }]} />
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Slider label="Effect heterogeneity (low earners gain more)" value={hetero} min={-3} max={6} step={0.25} onChange={setHetero} />
          <Slider label="Selection: low earners enrol more" value={select} min={-4} max={6} step={0.25} onChange={setSelect} />
        </div>
        <div className="grid grid-cols-2 gap-2 self-start">
          <Stat label="share enrolled p" value={fmt(pt)} />
          <Stat label="check p·ATT + (1−p)·ATC" value={fmt(pt * att + (1 - pt) * atc, 3)} sub={`ATE = ${fmt(ate, 3)}`} />
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 34: the Roy model ---------------- */
export function RoyLab() {
  const [mu, setMu] = useState(2);
  const [sg, setSg] = useState(3);
  const [cost, setCost] = useState(0);
  const [levels, setLevels] = useState(-0.5);
  const [seed, reseed] = useSeed();
  const data = useMemo(() => {
    const r = rng(seed * 17 + 3);
    return Array.from({ length: 1500 }, () => {
      const z = r.n();
      const y0 = 20 + 4 * z;
      const gain = mu + sg * (levels * z + Math.sqrt(1 - levels * levels) * r.n());
      return { y0, gain, t: gain > cost };
    });
  }, [mu, sg, cost, levels, seed]);
  const T = data.filter((d) => d.t), C = data.filter((d) => !d.t);
  const ate = avg(data.map((d) => d.gain));
  const att = T.length ? avg(T.map((d) => d.gain)) : NaN, atc = C.length ? avg(C.map((d) => d.gain)) : NaN;
  const naive = T.length && C.length ? avg(T.map((d) => d.y0 + d.gain)) - avg(C.map((d) => d.y0)) : NaN;
  const sb = T.length && C.length ? avg(T.map((d) => d.y0)) - avg(C.map((d) => d.y0)) : NaN;
  const p = T.length / data.length;
  const hb = (1 - p) * (att - atc);
  const theory = mu + sg * normPdf((mu - cost) / sg) / Math.max(1e-9, normCdf((mu - cost) / sg));
  return (
    <SimShell note="Each dot is a worker: earnings without training (Y0) against the gain from training. Workers enrol when the gain exceeds the cost (dashed line). The naive comparison = ATE + selection bias (enrollees' Y0 differs) + heterogeneity bias (enrollees gain more).">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Plot x={[4, 36]} y={[mu - 4 * sg, mu + 4 * sg]} height={330} xLabel="Y(0): earnings without training" yLabel="gain Y(1) − Y(0)">
          {(sx, sy) => (
            <>
              {data.map((d, i) => <circle key={i} cx={sx(Math.max(4, Math.min(36, d.y0)))} cy={sy(d.gain)} r={2.2} fill={d.t ? C1 : "var(--text-3)"} opacity={d.t ? 0.55 : 0.35} />)}
              <line x1={sx(4)} x2={sx(36)} y1={sy(cost)} y2={sy(cost)} stroke={C2} strokeWidth={2} strokeDasharray="6 4" />
              <text x={sx(35)} y={sy(cost) - 6} textAnchor="end" style={{ fill: "var(--text)", fontWeight: 600 }}>enrol above this line</text>
            </>
          )}
        </Plot>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Slider label="mean gain μ" value={mu} min={-2} max={6} step={0.25} onChange={setMu} />
            <Slider label="sd of gains σ" value={sg} min={0.25} max={6} step={0.25} onChange={setSg} />
            <Slider label="cost of enrolling c" value={cost} min={-4} max={8} step={0.25} onChange={setCost} />
            <Slider label="corr(Y0, gain)" value={levels} min={-0.9} max={0.9} step={0.05} onChange={setLevels} format={(v) => v.toFixed(2)} />
          </div>
          <button className="btn" onClick={reseed}>New workers</button>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="ATE" value={fmt(ate)} />
            <Stat label="ATT" value={fmt(att)} sub={`theory ${fmt(theory)}`} color={C1} />
            <Stat label="ATC" value={fmt(atc)} />
            <Stat label="naive" value={fmt(naive)} color={C2} />
            <Stat label="selection bias" value={fmt(sb)} />
            <Stat label="heterogeneity bias" value={fmt(hb)} />
          </div>
          <div className="text-xs muted">Check: ATE + SB + HB = {fmt(ate + sb + hb)} ≈ naive {fmt(naive)}. Share enrolled {fmt(p)}.</div>
        </div>
      </div>
    </SimShell>
  );
}

/* ---------------- Day 35: randomisation balances ---------------- */
export function RandomisationLab() {
  const [mode, setMode] = useState<"complete" | "bernoulli" | "select">("complete");
  const [n, setN] = useState(60);
  const [seed, reseed] = useSeed();
  const pop = useMemo(() => {
    const r = rng(seed * 5 + 11);
    return Array.from({ length: n }, () => {
      const x = 25 + 8 * r.n();                     // baseline earnings ($1,000)
      return { x, y0: 0.8 * x + 3 * r.n() };
    });
  }, [n, seed]);
  const res = useMemo(() => {
    const r = rng(seed * 19 + n + mode.length);
    const imb: number[] = [], est: number[] = [];
    for (let k = 0; k < 2000; k++) {
      let t: boolean[];
      if (mode === "complete") {
        const order = pop.map((_, i) => [r.u(), i]).sort((a, b) => a[0] - b[0]).map((v) => v[1]);
        t = pop.map(() => false); order.slice(0, n / 2).forEach((i) => (t[i] = true));
      } else if (mode === "bernoulli") t = pop.map(() => r.u() < 0.5);
      else t = pop.map((u) => r.u() < logistic(-(u.x - 25) / 5));
      const T1 = pop.filter((_, i) => t[i]), T0 = pop.filter((_, i) => !t[i]);
      if (!T1.length || !T0.length) continue;
      imb.push(avg(T1.map((u) => u.x)) - avg(T0.map((u) => u.x)));
      est.push(avg(T1.map((u) => u.y0 + 2)) - avg(T0.map((u) => u.y0)));
    }
    return { imb, est };
  }, [pop, mode, seed, n]);
  const lo = Math.min(-8, ...res.est), hi = Math.max(10, ...res.est);
  const bins = histogram(res.est, lo, hi, 40);
  const ilo = Math.min(-12, ...res.imb), ihi = Math.max(12, ...res.imb);
  const ibins = histogram(res.imb, ilo, ihi, 40);
  return (
    <SimShell note="2,000 re-assignments of the same workers. True effect 2. Under randomisation the baseline imbalance and the estimates centre on 0 and 2; under self-selection (low earners enrol more) both shift. Each single experiment still has some chance imbalance.">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Seg value={mode} onChange={setMode} options={[{ value: "complete", label: "Complete randomisation" }, { value: "bernoulli", label: "Bernoulli (coin flips)" }, { value: "select", label: "Selection on earnings" }]} />
        <button className="btn" onClick={reseed}>New workers</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-1 text-xs font-semibold faint">BASELINE IMBALANCE IN EARNINGS (treated − control)</div>
          <Plot x={[ilo, ihi]} y={[0, Math.max(...ibins.map((b) => b.density)) * 1.15]} height={230} yTicks={[]}>
            {(sx, sy) => (<><Bars bins={ibins} sx={sx} sy={sy} color={C4} opacity={0.6} /><line x1={sx(0)} x2={sx(0)} y1={sy(0)} y2={12} stroke="var(--text)" strokeDasharray="4 3" /></>)}
          </Plot>
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold faint">ESTIMATED EFFECT (truth = 2)</div>
          <Plot x={[lo, hi]} y={[0, Math.max(...bins.map((b) => b.density)) * 1.15]} height={230} yTicks={[]}>
            {(sx, sy) => (<><Bars bins={bins} sx={sx} sy={sy} color={C1} opacity={0.6} /><line x1={sx(2)} x2={sx(2)} y1={sy(0)} y2={12} stroke={C3} strokeWidth={2} strokeDasharray="4 3" /></>)}
          </Plot>
        </div>
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <Slider label="Number of workers" value={n} min={10} max={300} step={10} onChange={setN} />
        <div className="grid grid-cols-3 gap-2">
          <Stat label="mean imbalance" value={fmt(avg(res.imb))} color={C4} />
          <Stat label="mean estimate" value={fmt(avg(res.est))} color={C1} sub="truth 2" />
          <Stat label="sd of estimates" value={fmt(sd(res.est))} />
        </div>
      </div>
    </SimShell>
  );
}
