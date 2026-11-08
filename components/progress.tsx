"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { CheckCircle2, Circle } from "lucide-react";

/* Progress lives in the visitor's browser (localStorage). */
const KEY = "mci-progress-v1";
const listeners = new Set<() => void>();

function read(): number[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
function write(days: number[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(days));
  } catch {}
  listeners.forEach((l) => l());
}
let cache = "[]";
function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = () => cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}
function snapshot() {
  try {
    cache = localStorage.getItem(KEY) ?? "[]";
  } catch {}
  return cache;
}

export function useCompleted(): number[] {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function CompleteButton({ day }: { day: number }) {
  const done = useCompleted().includes(day);
  return (
    <button
      className={done ? "btn" : "btn btn-primary"}
      onClick={() => {
        const cur = read();
        write(done ? cur.filter((d) => d !== day) : [...new Set([...cur, day])].sort((a, b) => a - b));
      }}
    >
      {done ? <CheckCircle2 size={16} style={{ color: "var(--good)" }} /> : <Circle size={16} />}
      {done ? "Day completed" : "Mark day complete"}
    </button>
  );
}

export function DoneTick({ day }: { day: number }) {
  const done = useCompleted().includes(day);
  return done ? <CheckCircle2 size={16} aria-label="completed" style={{ color: "var(--good)" }} /> : null;
}

export function PhaseProgress({ days, color }: { days: number[]; color: string }) {
  const completed = useCompleted();
  const n = days.filter((d) => completed.includes(d)).length;
  const pct = days.length ? (100 * n) / days.length : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 rounded-full" style={{ background: "var(--surface-2)" }}>
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-14 text-right text-xs tabular-nums faint">
        {n}/{days.length}
      </span>
    </div>
  );
}

export function PhaseTick({ days }: { days: number[] }) {
  const completed = useCompleted();
  const done = days.length > 0 && days.every((d) => completed.includes(d));
  return done ? <CheckCircle2 size={14} aria-label="phase completed" /> : null;
}

export function RevealAll() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.querySelectorAll<HTMLDetailsElement>(".prose details").forEach((d) => (d.open = open));
  }, [open]);
  return (
    <button className="btn" onClick={() => setOpen((o) => !o)}>
      {open ? "Hide all solutions" : "Show all solutions"}
    </button>
  );
}
