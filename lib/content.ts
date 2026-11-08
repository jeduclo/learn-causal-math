import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { DAY_TITLES, dayId } from "./course";

const DIR = path.join(process.cwd(), "content", "days");

export type DayMeta = {
  day: number;
  title: string;
  lab: string;
  summary: string;
  outcomes: string[];
};

export type Day = DayMeta & {
  body: string;
  sections: { id: string; title: string }[];
  exerciseCount: number;
};

export const slugify = (s: string) =>
  s.toLowerCase().replace(/\$\$[^$]*\$\$/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function publishedDays(): number[] {
  if (!fs.existsSync(DIR)) return [];
  return fs
    .readdirSync(DIR)
    .filter((f) => /^d\d+\.md$/.test(f))
    .map((f) => Number(f.slice(1, -3)))
    .sort((a, b) => a - b);
}

export function getDay(day: number): Day | null {
  const file = path.join(DIR, `${dayId(day)}.md`);
  if (!fs.existsSync(file)) return null;
  const { data, content } = matter(fs.readFileSync(file, "utf8"));
  const sections = [...content.matchAll(/^## (.+)$/gm)].map((m) => ({ id: slugify(m[1]), title: m[1] }));
  const exerciseCount = [...content.matchAll(/^### Exercise /gm)].length;
  return {
    day,
    title: (data.title as string) ?? DAY_TITLES[day],
    lab: data.lab as string,
    summary: data.summary as string,
    outcomes: (data.outcomes as string[]) ?? [],
    body: content,
    sections,
    exerciseCount,
  };
}

export function dayMeta(day: number): DayMeta | null {
  const d = getDay(day);
  if (!d) return null;
  const { body: _b, sections: _s, exerciseCount: _e, ...meta } = d;
  return meta;
}
