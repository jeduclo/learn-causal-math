import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { LABS, labBySlug } from "@/lib/labs";
import { DAY_TITLES } from "@/lib/course";
import Sim from "@/components/sims";

export function generateStaticParams() {
  return LABS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: labBySlug(slug)?.title ?? "Simulation Lab" };
}

export default async function LabPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lab = labBySlug(slug);
  if (!lab) notFound();
  const i = LABS.indexOf(lab);
  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/lab" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold muted hover:underline"><ArrowLeft size={14} /> All simulators</Link>
      <h1 className="serif text-3xl font-bold">{lab.title}</h1>
      <p className="mt-1 muted">{lab.blurb}</p>
      <Link href={`/day/${lab.day}`} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold hover:underline" style={{ color: "var(--accent)" }}>
        <BookOpen size={14} /> Day {lab.day}: {DAY_TITLES[lab.day]}
      </Link>
      <div className="mt-6"><Sim slug={lab.slug} /></div>
      <div className="mt-8 flex justify-between">
        {i > 0 ? <Link className="btn" href={`/lab/${LABS[i - 1].slug}`}>← {LABS[i - 1].title}</Link> : <span />}
        {i < LABS.length - 1 ? <Link className="btn" href={`/lab/${LABS[i + 1].slug}`}>{LABS[i + 1].title} →</Link> : <span />}
      </div>
    </div>
  );
}
