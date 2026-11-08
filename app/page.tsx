import Link from "next/link";
import { ArrowRight, BookOpen, Brain, Code2, FlaskConical, PenLine, Sigma } from "lucide-react";
import { COURSE, PHASES } from "@/lib/course";
import { publishedDays } from "@/lib/content";
import { LABS } from "@/lib/labs";
import { PhaseProgress } from "@/components/progress";

export default function Home() {
  const pub = publishedDays();
  const allDays = Array.from({ length: 100 }, (_, i) => i + 1);
  return (
    <div className="space-y-12">
      <section className="grid items-center gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "var(--surface-2)" }}>
            <Sigma size={14} /> 100 days · 6 phases · 1,500 exercises with solutions
          </div>
          <h1 className="serif text-4xl font-bold leading-tight sm:text-5xl">{COURSE.title}</h1>
          <p className="mt-4 max-w-2xl text-lg muted">{COURSE.tagline}</p>
          <p className="mt-3 max-w-2xl muted">
            Every day is one 2-hour session: a short, rigorous theory block, fifteen exercises that climb from mechanics to proofs to
            applied economics and public-health problems, a Python notebook that checks the answers by simulation, and an interactive
            simulator in the <Link href="/lab" className="underline">Simulation Lab</Link>.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/day/1" className="btn btn-primary">Start Day 1 <ArrowRight size={16} /></Link>
            <Link href="/syllabus" className="btn">See all 100 days</Link>
            <Link href="/lab" className="btn"><FlaskConical size={16} /> Simulation Lab</Link>
          </div>
        </div>
        <div className="card p-5">
          <div className="mb-3 text-sm font-semibold">Your progress</div>
          <div className="space-y-3">
            {PHASES.map((p) => {
              const days = allDays.filter((d) => d >= p.days[0] && d <= p.days[1]);
              return (
                <div key={p.n}>
                  <div className="mb-1 flex justify-between text-xs">
                    <Link href={`/phase/${p.n}`} className="font-semibold hover:underline">Phase {p.n} · {p.title}</Link>
                    <span className="faint">Days {p.days[0]}–{p.days[1]}</span>
                  </div>
                  <PhaseProgress days={days} color={p.color} />
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs faint">Progress is saved in this browser. {pub.length} of 100 days are published.</p>
        </div>
      </section>

      <section>
        <h2 className="serif mb-4 text-2xl font-bold">How each day works</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [BookOpen, "Theory block", "The definitions, theorems and the one idea that links today's maths to causal inference."],
            [PenLine, "Warm-up · Exercises 1–5", "Mechanical computation: apply the formulas until they feel automatic."],
            [Brain, "Proofs · Exercises 6–10", "Derive the results yourself, step by step, from what you already know."],
            [Code2, "Applied · Exercises 11–15", "Economics and public-health problems, then a Python notebook and a simulator."],
          ].map(([Icon, t, d]) => {
            const I = Icon as typeof BookOpen;
            return (
              <div key={t as string} className="card p-4">
                <I size={20} style={{ color: "var(--accent)" }} />
                <div className="mt-2 font-semibold">{t as string}</div>
                <p className="mt-1 text-sm muted">{d as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="serif mb-4 text-2xl font-bold">The six phases</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PHASES.map((p) => {
            const n = pub.filter((d) => d >= p.days[0] && d <= p.days[1]).length;
            return (
              <Link key={p.n} href={`/phase/${p.n}`} className="card block p-5 transition-transform hover:-translate-y-0.5" style={{ borderTop: `5px solid ${p.color}` }}>
                <div className="text-xs font-semibold faint">PHASE {p.n} · DAYS {p.days[0]}–{p.days[1]}</div>
                <div className="serif mt-1 text-lg font-bold">{p.title}</div>
                <p className="mt-2 text-sm muted">{p.blurb}</p>
                <div className="mt-3 text-xs font-semibold" style={{ color: n ? "var(--good)" : "var(--text-3)" }}>
                  {n ? `${n} days published` : "Coming soon"}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="serif text-2xl font-bold">From the Simulation Lab</h2>
          <Link href="/lab" className="text-sm font-semibold hover:underline" style={{ color: "var(--accent)" }}>All {LABS.length} simulators →</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LABS.filter((l) => ["bayes", "bivariate-normal", "clt", "power"].includes(l.slug)).map((l) => (
            <Link key={l.slug} href={`/lab/${l.slug}`} className="card block p-4 hover:-translate-y-0.5 transition-transform">
              <div className="text-xs faint">Day {l.day}</div>
              <div className="font-semibold">{l.title}</div>
              <p className="mt-1 text-sm muted">{l.blurb}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
