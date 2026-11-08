"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlaskConical, Moon, Sun, Sigma } from "lucide-react";
import { useEffect, useState } from "react";
import { COURSE, PHASES } from "@/lib/course";
import { PhaseTick } from "./progress";

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.dataset.theme === "dark"), []);
  return (
    <button
      aria-label="Toggle dark mode"
      className="grid h-9 w-9 place-items-center rounded-lg border"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      onClick={() => {
        const next = dark ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem("mci-theme", next);
        } catch {}
        setDark(!dark);
      }}
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

export default function Header({ published }: { published: number[] }) {
  const path = usePathname() ?? "/";
  const dayMatch = path.match(/^\/day\/(\d+)/);
  const activePhase = path.startsWith("/phase/")
    ? Number(path.split("/")[2])
    : dayMatch
      ? PHASES.find((p) => +dayMatch[1] >= p.days[0] && +dayMatch[1] <= p.days[1])?.n
      : undefined;

  const tab = (href: string, label: React.ReactNode, active: boolean, color?: string, key?: string) => (
    <Link
      key={key ?? href}
      href={href}
      className="flex shrink-0 items-center gap-1.5 rounded-t-lg px-3 py-2 text-sm font-semibold transition-colors"
      style={{
        color: active ? (color ? "white" : "var(--text)") : "var(--text-2)",
        background: active ? color ?? "var(--surface)" : "transparent",
        borderBottom: active ? "none" : `3px solid ${color ?? "transparent"}`,
      }}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b backdrop-blur" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--bg) 88%, transparent)" }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 pt-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg text-white" style={{ background: "var(--accent)" }}>
            <Sigma size={18} />
          </span>
          <span className="serif text-lg font-bold leading-tight">
            {COURSE.short}
            <span className="ml-2 hidden text-xs font-normal faint sm:inline">Beginner → Ninja</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/syllabus" className="hidden text-sm font-semibold muted hover:underline sm:inline">
            Syllabus
          </Link>
          <ThemeToggle />
        </div>
      </div>
      <nav className="mx-auto mt-2 flex max-w-7xl gap-1 overflow-x-auto px-4">
        {tab("/", "Home", path === "/")}
        {PHASES.map((p) => {
          const days = published.filter((d) => d >= p.days[0] && d <= p.days[1]);
          const all = Array.from({ length: p.days[1] - p.days[0] + 1 }, (_, i) => p.days[0] + i);
          return tab(
            `/phase/${p.n}`,
            <>
              Phase {p.n}
              {days.length === all.length && <PhaseTick days={all} />}
            </>,
            activePhase === p.n,
            p.color,
          );
        })}
        {tab("/lab", <><FlaskConical size={15} /> Simulation Lab</>, path.startsWith("/lab"), "var(--s4)")}
        {tab("/syllabus", "Syllabus", path === "/syllabus", undefined, "syl")}
      </nav>
    </header>
  );
}
