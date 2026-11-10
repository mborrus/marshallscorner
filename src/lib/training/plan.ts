// Half-marathon training plan: types, loading and date helpers.
// content/training/plan.json is the source of truth and is edited by hand.

import fs from 'fs';
import path from 'path';

export type RunKind = 'easy' | 'mtc' | 'long' | 'race' | 'extra';

export interface PlannedRun {
  day: string; // "Tue", "Sat/Sun", ...
  kind: RunKind;
  miles: number;
  note?: string;
}

export interface PlanWeek {
  start: string; // Monday, YYYY-MM-DD
  note?: string;
  runs: PlannedRun[];
}

export interface Plan {
  goal?: unknown;
  paces?: Record<string, unknown>;
  weeks: PlanWeek[];
}

const PLAN_DIR = path.join(process.cwd(), 'content', 'training');

/** Loads plan.json, or the bundled example when plan.json isn't there yet. */
export function loadPlan(): { plan: Plan; isExample: boolean } {
  const real = path.join(PLAN_DIR, 'plan.json');
  const file = fs.existsSync(real) ? real : path.join(PLAN_DIR, 'plan.example.json');
  const plan = JSON.parse(fs.readFileSync(file, 'utf8')) as Plan;
  validatePlan(plan);
  return { plan, isExample: file !== real };
}

export function validatePlan(plan: Plan): void {
  if (!Array.isArray(plan.weeks) || plan.weeks.length === 0) throw new Error('plan.json: weeks[] is empty');
  for (const w of plan.weeks) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(w.start)) throw new Error(`plan.json: bad week start "${w.start}"`);
    if (weekdayOf(w.start) !== 0) throw new Error(`plan.json: week ${w.start} doesn't start on a Monday`);
    for (const r of w.runs) {
      if (typeof r.miles !== 'number') throw new Error(`plan.json: week ${w.start} has a run without miles`);
    }
  }
}

// ---------- dates (all plain YYYY-MM-DD strings, no time zones) ----------

const DAY_NAMES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/** 0 = Monday ... 6 = Sunday */
export function weekdayOf(date: string): number {
  const d = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return (d + 6) % 7;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

/** "Sat/Sun" -> [5, 6]; unknown or empty -> [] */
export function parseDays(day: string | undefined): number[] {
  if (!day) return [];
  return day
    .split(/[\/,&]| or /i)
    .map((s) => DAY_NAMES.indexOf(s.trim().slice(0, 3).toLowerCase()))
    .filter((i) => i >= 0);
}

/** Last date a planned run could happen on; used to decide when it counts as missed. */
export function lastPlannedDate(weekStart: string, run: PlannedRun): string {
  const days = parseDays(run.day);
  return addDays(weekStart, days.length ? Math.max(...days) : 6);
}

export function firstPlannedDate(weekStart: string, run: PlannedRun): string {
  const days = parseDays(run.day);
  return addDays(weekStart, days.length ? Math.min(...days) : 0);
}

/** Today's date where the runner lives. */
export function todayLocal(tz = process.env.TRAINING_TZ || 'America/New_York'): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date()
  );
}

// ---------- plan facts ----------

export function weekPlannedMiles(week: PlanWeek): number {
  return round1(week.runs.reduce((s, r) => s + r.miles, 0));
}

export function totalPlannedMiles(plan: Plan): number {
  return round1(plan.weeks.reduce((s, w) => s + weekPlannedMiles(w), 0));
}

export function planStart(plan: Plan): string {
  return plan.weeks[0].start;
}

/** Race date: goal.date if given, else the day of the last "race" run, else the plan's last Sunday. */
export function raceDate(plan: Plan): string {
  const goal = plan.goal as { date?: unknown } | undefined;
  if (goal && typeof goal.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(goal.date)) return goal.date;
  for (let i = plan.weeks.length - 1; i >= 0; i--) {
    const race = plan.weeks[i].runs.find((r) => r.kind === 'race');
    if (race) return lastPlannedDate(plan.weeks[i].start, race);
  }
  return addDays(plan.weeks[plan.weeks.length - 1].start, 6);
}

/** Target pace text for a run kind, from plan.paces. */
export function targetPace(plan: Plan, kind: string): string | null {
  const p = plan.paces?.[kind];
  if (p == null) return null;
  if (typeof p === 'string' || typeof p === 'number') return String(p);
  return JSON.stringify(p);
}

export function goalText(plan: Plan): string | null {
  const g = plan.goal;
  if (g == null) return null;
  if (typeof g === 'string') return g;
  if (typeof g === 'object') {
    const o = g as Record<string, unknown>;
    return [o.race ?? o.name, o.time ?? o.target].filter(Boolean).join(' · ') || null;
  }
  return String(g);
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
