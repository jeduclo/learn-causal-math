import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, FlaskConical } from "lucide-react";
import { DAY_TITLES, PHASES } from "@/lib/course";
import { dayMeta } from "@/lib/content";
import { labForDay } from "@/lib/labs";
import { DoneTick, PhaseProgress } from "@/components/progress";

export function generateStaticParams() {
  return PHASES.map((p) => ({ n: String(p.n) }));
}

export async function generateMetadata({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const p = PHASES.find((x) => x.n === Number(n));
  return { title: p ? `Phase ${p.n}: ${p.title}` : "Phase" };
}

export default async function PhasePage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const phase = PHASES.find((p) => p.n === Number(n));
  if (!phase) notFound();
  const days = Array.from({ length: phase.days[1] - phase.days[0] + 1 }, (_, i) => phase.days[0] + i);
  return (
    <div>
      <div className="card mb-8 overflow-hidden">
        <div className="h-2" style={{ background: phase.color }} />
        <div className="p-6">
          <div className="text-xs font-semibold faint">PHASE {phase.n} · DAYS {phase.days[0]}–{phase.days[1]}</div>
          <h1 className="serif mt-1 text-3xl font-bold">{phase.title}</h1>
          <p className="mt-2 max-w-3xl muted">{phase.blurb}</p>
          <div className="mt-4 max-w-md"><PhaseProgress days={days} color={phase.color} /></div>
        </div>
      </div>
      <ol className="grid gap-3 md:grid-cols-2">
        {days.map((d) => {
          const meta = dayMeta(d);
          const lab = labForDay(d);
          if (!meta)
            return (
              <li key={d} className="card flex items-center gap-4 p-4 opacity-60">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg font-mono text-sm font-bold" style={{ background: "var(--surface-2)" }}>{d}</span>
                <div>
                  <div className="font-semibold">{DAY_TITLES[d]}</div>
                  <div className="flex items-center gap-1 text-xs faint"><Clock size={12} /> Coming soon</div>
                </div>
              </li>
            );
          return (
            <li key={d}>
              <Link href={`/day/${d}`} className="card flex gap-4 p-4 transition-transform hover:-translate-y-0.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg font-mono text-sm font-bold text-white" style={{ background: phase.color }}>{d}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-semibold">{meta.title} <DoneTick day={d} /></div>
                  <p className="mt-1 text-sm muted">{meta.summary}</p>
                  {lab && <div className="mt-2 flex items-center gap-1 text-xs faint"><FlaskConical size={12} /> {lab.title}</div>}
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
