import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { LABS } from "@/lib/labs";
import { PHASES } from "@/lib/course";

export const metadata = { title: "Simulation Lab" };

export default function LabIndex() {
  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--s4)" }}><FlaskConical size={16} /> SIMULATION LAB</div>
        <h1 className="serif mt-1 text-3xl font-bold">See the mathematics move</h1>
        <p className="mt-2 max-w-3xl muted">
          One interactive simulator for every day. Change a parameter, redraw the data and watch the theorem hold (or fail).
          Each simulator also appears at the end of its day&apos;s lesson. Everything runs in your browser.
        </p>
      </div>
      {PHASES.filter((p) => LABS.some((l) => l.day >= p.days[0] && l.day <= p.days[1])).map((p) => (
        <section key={p.n} className="mb-10">
          <h2 className="serif mb-3 flex items-center gap-2 text-xl font-bold">
            <span className="rounded-md px-2 py-0.5 text-xs font-bold text-white" style={{ background: p.color }}>PHASE {p.n}</span>
            {p.title}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LABS.filter((l) => l.day >= p.days[0] && l.day <= p.days[1]).map((l) => (
              <Link key={l.slug} href={`/lab/${l.slug}`} className="card block p-5 transition-transform hover:-translate-y-0.5" style={{ borderLeft: `5px solid ${p.color}` }}>
                <div className="text-xs font-semibold faint">DAY {l.day}</div>
                <div className="serif mt-1 text-lg font-bold">{l.title}</div>
                <p className="mt-1 text-sm muted">{l.blurb}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
