import Link from "next/link";
import { COURSE, DAY_TITLES, PHASES } from "@/lib/course";
import { publishedDays } from "@/lib/content";
import { labForDay } from "@/lib/labs";
import { DoneTick } from "@/components/progress";

export const metadata = { title: "Syllabus" };

export default function Syllabus() {
  const pub = publishedDays();
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="serif text-3xl font-bold">Syllabus</h1>
      <p className="mt-2 muted">{COURSE.tagline}</p>

      <div className="card mt-6 p-5 text-sm leading-relaxed">
        <div className="mb-2 font-semibold">Course design</div>
        <ul className="list-disc space-y-1 pl-5 muted">
          <li><b className="strong">100 sessions of about 2 hours</b>, grouped into six phases that build on each other.</li>
          <li><b className="strong">Every session</b>: a theory block, then 15 exercises with full solutions: warm-up (1–5), proofs (6–10) and applied economics and public-health problems (11–15).</li>
          <li><b className="strong">Every session</b> also has a Python check (downloadable as a Colab notebook) and an interactive simulator in the Simulation Lab.</li>
          <li><b className="strong">Prerequisites</b>: high-school algebra. Calculus is used from Day 3 (integrals) and taught properly in Phase 2.</li>
          <li><b className="strong">Phase 1 stays on probability and inference.</b> Matrices start on Day 16, DAGs on Day 46, and information theory (KL divergence) and Markov chains appear where they are used (Days 83 and 96).</li>
        </ul>
      </div>

      {PHASES.map((p) => (
        <section key={p.n} className="mt-10">
          <div className="flex items-baseline gap-3 border-b pb-2" style={{ borderColor: p.color }}>
            <span className="rounded-md px-2 py-0.5 text-xs font-bold text-white" style={{ background: p.color }}>PHASE {p.n}</span>
            <h2 className="serif text-xl font-bold">{p.title}</h2>
            <span className="ml-auto text-xs faint">Days {p.days[0]}–{p.days[1]}</span>
          </div>
          <p className="mt-2 text-sm muted">{p.blurb}</p>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {Array.from({ length: p.days[1] - p.days[0] + 1 }, (_, i) => p.days[0] + i).map((d) => {
                const live = pub.includes(d);
                const lab = labForDay(d);
                return (
                  <tr key={d} className="border-b" style={{ borderColor: "var(--border)" }}>
                    <td className="w-14 py-1.5 font-mono text-xs faint">Day {d}</td>
                    <td className="py-1.5">
                      {live ? <Link href={`/day/${d}`} className="font-medium hover:underline">{DAY_TITLES[d]}</Link> : <span className="muted">{DAY_TITLES[d]}</span>}
                    </td>
                    <td className="hidden py-1.5 text-xs faint md:table-cell">{lab ? `Lab: ${lab.title}` : ""}</td>
                    <td className="w-28 py-1.5 text-right text-xs">
                      {live ? <span className="inline-flex items-center gap-1" style={{ color: "var(--good)" }}><DoneTick day={d} /> Published</span> : <span className="faint">Coming soon</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
