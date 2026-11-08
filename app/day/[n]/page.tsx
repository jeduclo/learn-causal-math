import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Download, ExternalLink, FlaskConical, PlayCircle, Target } from "lucide-react";
import { SESSION_PLAN, colabUrl, dayId, phaseOf } from "@/lib/course";
import { getDay, publishedDays } from "@/lib/content";
import { labForDay } from "@/lib/labs";
import { VIDEOS, embedUrl } from "@/content/videos";
import Markdown from "@/components/Markdown";
import Sim from "@/components/sims";
import { CompleteButton, RevealAll } from "@/components/progress";

export function generateStaticParams() {
  return publishedDays().map((d) => ({ n: String(d) }));
}

export async function generateMetadata({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const d = getDay(Number(n));
  return { title: d ? `Day ${d.day}: ${d.title}` : "Day" };
}

export default async function DayPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const day = getDay(Number(n));
  if (!day) notFound();
  const phase = phaseOf(day.day);
  const lab = labForDay(day.day);
  const pub = publishedDays();
  const prev = pub.includes(day.day - 1) ? day.day - 1 : null;
  const next = pub.includes(day.day + 1) ? day.day + 1 : null;
  const video = embedUrl(VIDEOS[day.day] ?? "");
  const colab = colabUrl(day.day);
  const total = SESSION_PLAN.reduce((s, p) => s + p.minutes, 0);
  const planColors = ["var(--s1)", "var(--s3)", "var(--s4)", "var(--s2)", "var(--text-3)"];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_240px]">
      <article className="min-w-0">
        <div className="mb-2 text-sm faint">
          <Link href={`/phase/${phase.n}`} className="font-semibold hover:underline" style={{ color: phase.color }}>Phase {phase.n} · {phase.title}</Link>
          {" "}/ Day {day.day}
        </div>
        <h1 className="serif text-3xl font-bold leading-tight sm:text-4xl">
          <span className="faint">Day {day.day}.</span> {day.title}
        </h1>
        <p className="mt-2 text-lg muted">{day.summary}</p>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1.25fr_1fr]">
          <div className="card overflow-hidden">
            {video ? (
              <iframe src={video} title={`Day ${day.day} video`} className="aspect-video w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            ) : (
              <div className="grid aspect-video place-items-center" style={{ background: "var(--surface-2)" }}>
                <div className="text-center faint">
                  <PlayCircle size={40} className="mx-auto" />
                  <div className="mt-2 text-sm font-semibold">Video coming soon</div>
                </div>
              </div>
            )}
          </div>
          <div className="card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Target size={16} /> Learning outcomes</div>
            <ul className="space-y-1.5 text-sm muted">
              {day.outcomes.map((o) => <li key={o} className="flex gap-2"><span style={{ color: phase.color }}>●</span><span>{o}</span></li>)}
            </ul>
            <div className="mt-4 text-xs font-semibold faint">2-HOUR SESSION PLAN</div>
            <div className="mt-1.5 flex h-6 w-full gap-[2px] overflow-hidden rounded-md">
              {SESSION_PLAN.map((s, i) => (
                <div key={s.label} title={`${s.label}: ${s.minutes} min`} style={{ width: `${(100 * s.minutes) / total}%`, background: planColors[i] }} />
              ))}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs muted">
              {SESSION_PLAN.map((s, i) => (
                <span key={s.label} className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: planColors[i] }} />{s.label} {s.minutes}′</span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <a className="btn" href={`/notebooks/${dayId(day.day)}.ipynb`} download><Download size={16} /> Colab notebook (.ipynb)</a>
          {colab && <a className="btn" href={colab} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Open in Colab</a>}
          {lab && <a className="btn" href="#simulation-lab"><FlaskConical size={16} /> Jump to the simulator</a>}
          <RevealAll />
          <CompleteButton day={day.day} />
        </div>

        <div className="mt-8">
          <Markdown source={day.body} />
        </div>

        {lab && (
          <section id="simulation-lab" className="mt-12 scroll-mt-20">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-t pt-6" style={{ borderColor: "var(--border)" }}>
              <h2 className="serif text-2xl font-bold">Simulation Lab: {lab.title}</h2>
              <Link href={`/lab/${lab.slug}`} className="text-sm font-semibold hover:underline" style={{ color: "var(--accent)" }}>Open full screen →</Link>
            </div>
            <p className="mb-4 muted">{lab.blurb}</p>
            <Sim slug={lab.slug} />
          </section>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t pt-6" style={{ borderColor: "var(--border)" }}>
          {prev ? <Link className="btn" href={`/day/${prev}`}><ArrowLeft size={16} /> Day {prev}</Link> : <span />}
          <CompleteButton day={day.day} />
          {next ? <Link className="btn" href={`/day/${next}`}>Day {next} <ArrowRight size={16} /></Link> : <Link className="btn" href={`/phase/${phase.n}`}>Back to Phase {phase.n}</Link>}
        </div>
      </article>

      <aside className="hidden lg:block">
        <div className="sticky top-28 space-y-4">
          <div className="card p-4">
            <div className="mb-2 text-xs font-semibold faint">ON THIS PAGE</div>
            <nav className="space-y-1.5 text-sm">
              {day.sections.map((s) => <a key={s.id} href={`#${s.id}`} className="block muted hover:underline">{s.title}</a>)}
              {lab && <a href="#simulation-lab" className="block muted hover:underline">Simulation Lab</a>}
            </nav>
          </div>
          <div className="card p-4 text-sm">
            <div className="text-xs font-semibold faint">TODAY</div>
            <div className="mt-1 muted">{day.exerciseCount} exercises · solutions included</div>
          </div>
        </div>
      </aside>
    </div>
  );
}
