// Matches what was actually run (Strava) to the plan. Pure functions, no I/O.
//
// Rules, per Mon-Sun week:
//   - Only Run / TrailRun / VirtualRun count. All runs on one local date merge into one day total.
//   - Overrides (manual fixes) win over everything.
//   - Long run first: a day on its planned weekday with >= 60% of the miles, else the longest
//     other day with >= 60% of the miles (a long run moved Sat -> Sun).
//   - Then exact weekday matches ("Sat/Sun" matches either).
//   - Then whatever is left, by closest miles. "extra" runs are optional and are never "missed".
//   - Days left over are "Unplanned run".

import {
  addDays,
  lastPlannedDate,
  parseDays,
  round1,
  weekdayOf,
  weekPlannedMiles,
  type Plan,
  type PlannedRun,
  type PlanWeek,
} from './plan';

export const RUN_TYPES = ['Run', 'TrailRun', 'VirtualRun'];
export const EASY_PACE_LIMIT_S = 8 * 60; // easy runs faster than 8:00/mi get flagged
const LONG_RUN_SHARE = 0.6;
const WEEK_OVER_PLAN = 1.1;
const WEEK_JUMP_MI = 4;

export interface Activity {
  stravaId: number;
  startLocal: string; // "YYYY-MM-DDTHH:MM:SS", the runner's local time
  sportType: string;
  distanceMi: number;
  movingTimeS: number;
  avgHr: number | null;
  name: string;
}

export interface DayTotal {
  date: string;
  miles: number;
  movingTimeS: number;
  avgHr: number | null;
  activities: Activity[];
}

export interface Override {
  weekStart: string;
  runIndex: number;
  activityDate: string | null;
  skipped: boolean;
}

export type RunStatus = 'done' | 'upcoming' | 'missed' | 'skipped' | 'optional';
export type MatchedBy = 'override' | 'long' | 'weekday' | 'miles';

export interface RunRow {
  runIndex: number;
  run: PlannedRun;
  status: RunStatus;
  actual: DayTotal | null;
  matchedBy: MatchedBy | null;
  paceS: number | null; // seconds per mile
  flags: string[];
}

export interface WeekResult {
  week: PlanWeek;
  index: number;
  rows: RunRow[];
  unplanned: DayTotal[];
  plannedMiles: number;
  actualMiles: number;
  flags: string[];
}

/** Merges runs on the same local date into one total. Non-runs are dropped. */
export function dayTotals(activities: Activity[]): DayTotal[] {
  const byDate = new Map<string, Activity[]>();
  for (const a of activities) {
    if (!RUN_TYPES.includes(a.sportType)) continue;
    const date = a.startLocal.slice(0, 10);
    byDate.set(date, [...(byDate.get(date) ?? []), a]);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, acts]) => {
      const movingTimeS = acts.reduce((s, a) => s + a.movingTimeS, 0);
      const hrTime = acts.filter((a) => a.avgHr != null).reduce((s, a) => s + a.movingTimeS, 0);
      const avgHr = hrTime
        ? Math.round(acts.reduce((s, a) => s + (a.avgHr ?? 0) * (a.avgHr != null ? a.movingTimeS : 0), 0) / hrTime)
        : null;
      return {
        date,
        miles: round1(acts.reduce((s, a) => s + a.distanceMi, 0)),
        movingTimeS,
        avgHr,
        activities: acts.sort((a, b) => a.startLocal.localeCompare(b.startLocal)),
      };
    });
}

export function paceOf(day: DayTotal): number | null {
  return day.miles > 0 ? day.movingTimeS / day.miles : null;
}

/** Matches one week. `days` may include days outside the week; they're ignored. */
export function matchWeek(
  week: PlanWeek,
  days: DayTotal[],
  overrides: Override[],
  today: string
): { rows: RunRow[]; unplanned: DayTotal[] } {
  const end = addDays(week.start, 6);
  const pool = days.filter((d) => d.date >= week.start && d.date <= end);
  const used = new Set<string>();
  const assigned = new Map<number, { day: DayTotal | null; by: MatchedBy; skipped?: boolean }>();
  const free = () => pool.filter((d) => !used.has(d.date));
  const take = (i: number, day: DayTotal, by: MatchedBy) => {
    assigned.set(i, { day, by });
    used.add(day.date);
  };

  // 1. Overrides
  for (const o of overrides) {
    if (o.weekStart !== week.start || !week.runs[o.runIndex]) continue;
    if (o.skipped) {
      assigned.set(o.runIndex, { day: null, by: 'override', skipped: true });
    } else if (o.activityDate) {
      const day = pool.find((d) => d.date === o.activityDate);
      if (day) take(o.runIndex, day, 'override');
    }
  }
  const open = () => week.runs.map((run, i) => ({ run, i })).filter(({ i }) => !assigned.has(i));

  // 2. Long run(s)
  for (const { run, i } of open().filter(({ run }) => run.kind === 'long')) {
    const min = run.miles * LONG_RUN_SHARE;
    const wanted = parseDays(run.day);
    const onDay = free()
      .filter((d) => wanted.includes(weekdayOf(d.date)) && d.miles >= min)
      .sort((a, b) => b.miles - a.miles)[0];
    if (onDay) {
      take(i, onDay, 'weekday');
      continue;
    }
    // Moved long run: the longest other day, unless that day clearly belongs to the run planned on it
    const moved = free()
      .filter((d) => d.miles >= min)
      .filter((d) =>
        week.runs.every(
          (other, j) =>
            j === i ||
            other.kind === 'extra' ||
            assigned.has(j) ||
            !parseDays(other.day).includes(weekdayOf(d.date)) ||
            Math.abs(d.miles - run.miles) < Math.abs(d.miles - other.miles)
        )
      )
      .sort((a, b) => b.miles - a.miles)[0];
    if (moved) take(i, moved, 'long');
  }

  // 3. Exact weekday: required runs first, longest first
  const byPriority = (a: { run: PlannedRun }, b: { run: PlannedRun }) =>
    Number(a.run.kind === 'extra') - Number(b.run.kind === 'extra') || b.run.miles - a.run.miles;
  for (const { run, i } of open().sort(byPriority)) {
    const wanted = parseDays(run.day);
    const day = free()
      .filter((d) => wanted.includes(weekdayOf(d.date)))
      .sort((a, b) => Math.abs(a.miles - run.miles) - Math.abs(b.miles - run.miles))[0];
    if (day) take(i, day, 'weekday');
  }

  // 4. Closest miles: required runs get first pick, then extras
  for (const extras of [false, true]) {
    const runs = open().filter(({ run }) => (run.kind === 'extra') === extras);
    const pairs = runs
      .flatMap(({ run, i }) => free().map((d) => ({ i, d, diff: Math.abs(d.miles - run.miles) })))
      .sort((a, b) => a.diff - b.diff || a.d.date.localeCompare(b.d.date));
    for (const { i, d } of pairs) {
      if (!assigned.has(i) && !used.has(d.date)) take(i, d, 'miles');
    }
  }

  const rows: RunRow[] = week.runs.map((run, i) => {
    const a = assigned.get(i);
    const day = a?.day ?? null;
    let status: RunStatus;
    if (day) status = 'done';
    else if (a?.skipped) status = 'skipped';
    else if (lastPlannedDate(week.start, run) >= today) status = 'upcoming';
    else status = run.kind === 'extra' ? 'optional' : 'missed';
    const paceS = day ? paceOf(day) : null;
    const flags: string[] = [];
    if (run.kind === 'easy' && paceS != null && paceS < EASY_PACE_LIMIT_S) flags.push('Too fast for easy');
    return { runIndex: i, run, status, actual: day, matchedBy: day ? a!.by : null, paceS, flags };
  });

  return { rows, unplanned: free() };
}

/** Matches every week of the plan and adds the week-level flags. */
export function matchPlan(plan: Plan, activities: Activity[], overrides: Override[], today: string): WeekResult[] {
  const days = dayTotals(activities);
  const results: WeekResult[] = [];
  plan.weeks.forEach((week, index) => {
    const { rows, unplanned } = matchWeek(week, days, overrides, today);
    const plannedMiles = weekPlannedMiles(week);
    const actualMiles = round1(
      rows.reduce((s, r) => s + (r.actual?.miles ?? 0), 0) + unplanned.reduce((s, d) => s + d.miles, 0)
    );
    const flags: string[] = [];
    if (plannedMiles > 0 && actualMiles > plannedMiles * WEEK_OVER_PLAN) {
      flags.push(`Ease off: ${Math.round((actualMiles / plannedMiles) * 100)}% of planned miles`);
    }
    const prev = results[index - 1];
    if (prev && actualMiles - prev.actualMiles > WEEK_JUMP_MI) {
      flags.push(`Ease off: +${round1(actualMiles - prev.actualMiles)} mi over last week`);
    }
    results.push({ week, index, rows, unplanned, plannedMiles, actualMiles, flags });
  });
  return results;
}

/** Index of the week containing `today`; before the plan -> 0, after -> last. */
export function currentWeekIndex(plan: Plan, today: string): number {
  const i = plan.weeks.findIndex((w) => today >= w.start && today <= addDays(w.start, 6));
  if (i >= 0) return i;
  return today < plan.weeks[0].start ? 0 : plan.weeks.length - 1;
}

export function formatPace(seconds: number | null): string {
  if (seconds == null || !isFinite(seconds)) return '–';
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
