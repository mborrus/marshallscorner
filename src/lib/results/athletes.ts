// Builds per-athlete career profiles from the per-year results tables.
// Athletes are matched across years by their public name (case-insensitive),
// which is the same string the CSV -> JSON build writes for every year.

import type { Gender, ResultsYear } from './schema';

export type Leg = 'swim' | 't1' | 'bike' | 't2' | 'run';
export type RacedLeg = 'swim' | 'bike' | 'run';

export const LEGS: Leg[] = ['swim', 't1', 'bike', 't2', 'run'];
export const RACED_LEGS: RacedLeg[] = ['swim', 'bike', 'run'];

export const LEG_LABELS: Record<Leg, string> = {
  swim: 'Swim',
  t1: 'T1',
  bike: 'Bike',
  t2: 'T2',
  run: 'Run',
};

export type Splits = Record<Leg, number | null>;

export interface LegStanding {
  /** Place on this leg among everyone with a time for it, 1 = fastest. */
  place: number;
  /** How many people had a time on this leg that year. */
  of: number;
  /** Seconds behind the fastest time on the leg. */
  behindBest: number;
  /** Seconds relative to the field median (negative = faster than median). */
  vsMedian: number;
}

export interface AthleteRace {
  year: number;
  status: 'finished' | 'partial';
  splits: Splits;
  total: number | null;
  /** Finish place among finishers that year. */
  place: number | null;
  /** How many people finished that year. */
  fieldSize: number;
  gapToWinner: number | null;
  /** Total time relative to the field median (negative = faster). */
  vsMedian: number | null;
  legs: Partial<Record<RacedLeg, LegStanding>>;
  overtakes?: { bike?: number; run?: number };
  /** Change in total vs this athlete's previous finish (negative = faster). */
  deltaTotal: number | null;
  /** Per-leg change vs this athlete's previous finish. */
  deltaSplits: Partial<Record<Leg, number>>;
  /** Year the comparison above is against. */
  comparedToYear: number | null;
}

export interface AthleteProfile {
  slug: string;
  name: string;
  gender: Gender;
  years: number[];
  races: AthleteRace[];
  finishes: number;
  bestTotal: { seconds: number; year: number } | null;
  bestPlace: { place: number; of: number; year: number } | null;
  personalBests: Partial<Record<Leg, { seconds: number; year: number }>>;
  /** Fastest-to-slowest spread across this athlete's finishes. */
  totalSpread: number | null;
}

/** One finisher's total, for plotting a year's whole field. */
export interface FieldEntry {
  slug: string;
  name: string;
  total: number;
}

export interface YearContext {
  year: number;
  finishers: number;
  medianTotal: number | null;
  winningTotal: number | null;
  slowestTotal: number | null;
  /** Every finisher that year, fastest first. */
  field: FieldEntry[];
}

export interface AthleteIndex {
  athletes: AthleteProfile[];
  years: number[];
  yearContext: YearContext[];
}

export function slugifyAthlete(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Rank a list of times, 1 = fastest. Equal times share a place. */
function placeOf(value: number, times: number[]): number {
  return times.filter((t) => t < value).length + 1;
}

export function buildAthleteIndex(allResults: ResultsYear[]): AthleteIndex {
  const byYear = [...allResults].sort((a, b) => a.year - b.year);
  const years = byYear.map((y) => y.year);

  const yearContext: YearContext[] = [];
  // slug -> profile under construction
  const drafts = new Map<string, { profile: AthleteProfile; races: AthleteRace[] }>();

  for (const yearData of byYear) {
    const { year, entries } = yearData;

    const finished = entries.filter(
      (e) => e.status === 'finished' && e.total_seconds !== null
    );
    const finisherTotals = finished.map((e) => e.total_seconds!);
    const medianTotal = median(finisherTotals);
    const winningTotal = finisherTotals.length ? Math.min(...finisherTotals) : null;

    yearContext.push({
      year,
      finishers: finisherTotals.length,
      medianTotal,
      winningTotal,
      slowestTotal: finisherTotals.length ? Math.max(...finisherTotals) : null,
      field: finished
        .map((e) => ({
          slug: slugifyAthlete(e.name_public.trim()),
          name: e.name_public.trim(),
          total: e.total_seconds!,
        }))
        .sort((a, b) => a.total - b.total),
    });

    // Per-leg field times for this year, used for leg standings.
    const legTimes: Record<RacedLeg, number[]> = { swim: [], bike: [], run: [] };
    for (const leg of RACED_LEGS) {
      legTimes[leg] = entries
        .map((e) => e.splits_seconds[leg])
        .filter((v): v is number => v !== null && v > 0);
    }
    const legMedians: Partial<Record<RacedLeg, number>> = {};
    const legBests: Partial<Record<RacedLeg, number>> = {};
    for (const leg of RACED_LEGS) {
      const m = median(legTimes[leg]);
      if (m !== null) legMedians[leg] = m;
      if (legTimes[leg].length) legBests[leg] = Math.min(...legTimes[leg]);
    }

    for (const entry of entries) {
      const name = entry.name_public.trim();
      const slug = slugifyAthlete(name);
      if (!slug) continue;

      const splits: Splits = {
        swim: entry.splits_seconds.swim,
        t1: entry.splits_seconds.t1,
        bike: entry.splits_seconds.bike,
        t2: entry.splits_seconds.t2,
        run: entry.splits_seconds.run,
      };

      const finished = entry.status === 'finished' && entry.total_seconds !== null;
      const total = finished ? entry.total_seconds! : null;

      const legs: Partial<Record<RacedLeg, LegStanding>> = {};
      for (const leg of RACED_LEGS) {
        const value = splits[leg];
        if (value === null || value <= 0 || legTimes[leg].length === 0) continue;
        legs[leg] = {
          place: placeOf(value, legTimes[leg]),
          of: legTimes[leg].length,
          behindBest: value - (legBests[leg] ?? value),
          vsMedian: value - (legMedians[leg] ?? value),
        };
      }

      const race: AthleteRace = {
        year,
        status: entry.status,
        splits,
        total,
        place: total !== null ? placeOf(total, finisherTotals) : null,
        fieldSize: finisherTotals.length,
        gapToWinner: total !== null && winningTotal !== null ? total - winningTotal : null,
        vsMedian: total !== null && medianTotal !== null ? total - medianTotal : null,
        legs,
        overtakes: entry.overtakes,
        deltaTotal: null,
        deltaSplits: {},
        comparedToYear: null,
      };

      const draft = drafts.get(slug);
      if (draft) {
        draft.races.push(race);
        // Keep the most recent gender on file; the name stays as first seen.
        draft.profile.gender = entry.gender;
      } else {
        drafts.set(slug, {
          profile: {
            slug,
            name,
            gender: entry.gender,
            years: [],
            races: [],
            finishes: 0,
            bestTotal: null,
            bestPlace: null,
            personalBests: {},
            totalSpread: null,
          },
          races: [race],
        });
      }
    }
  }

  const athletes: AthleteProfile[] = [];

  for (const { profile, races } of drafts.values()) {
    races.sort((a, b) => a.year - b.year);

    // Year-over-year deltas, measured against the athlete's previous finish.
    let previousFinish: AthleteRace | null = null;
    for (const race of races) {
      if (previousFinish && race.total !== null && previousFinish.total !== null) {
        race.deltaTotal = race.total - previousFinish.total;
        race.comparedToYear = previousFinish.year;
        for (const leg of LEGS) {
          const now = race.splits[leg];
          const before = previousFinish.splits[leg];
          if (now !== null && before !== null) race.deltaSplits[leg] = now - before;
        }
      }
      if (race.total !== null) previousFinish = race;
    }

    const finishedRaces = races.filter((r) => r.total !== null);

    let bestTotal: AthleteProfile['bestTotal'] = null;
    for (const race of finishedRaces) {
      if (!bestTotal || race.total! < bestTotal.seconds) {
        bestTotal = { seconds: race.total!, year: race.year };
      }
    }

    let bestPlace: AthleteProfile['bestPlace'] = null;
    for (const race of finishedRaces) {
      if (race.place === null) continue;
      if (!bestPlace || race.place < bestPlace.place) {
        bestPlace = { place: race.place, of: race.fieldSize, year: race.year };
      }
    }

    const personalBests: AthleteProfile['personalBests'] = {};
    for (const leg of LEGS) {
      for (const race of races) {
        const value = race.splits[leg];
        if (value === null || value <= 0) continue;
        const current = personalBests[leg];
        if (!current || value < current.seconds) {
          personalBests[leg] = { seconds: value, year: race.year };
        }
      }
    }

    const totals = finishedRaces.map((r) => r.total!);
    const totalSpread = totals.length >= 2 ? Math.max(...totals) - Math.min(...totals) : null;

    athletes.push({
      ...profile,
      years: races.map((r) => r.year),
      races,
      finishes: finishedRaces.length,
      bestTotal,
      bestPlace,
      personalBests,
      totalSpread,
    });
  }

  // Most-recent racers first, then most years raced, then alphabetical.
  athletes.sort((a, b) => {
    const aLatest = a.years[a.years.length - 1] ?? 0;
    const bLatest = b.years[b.years.length - 1] ?? 0;
    if (aLatest !== bLatest) return bLatest - aLatest;
    if (a.years.length !== b.years.length) return b.years.length - a.years.length;
    return a.name.localeCompare(b.name);
  });

  return { athletes, years, yearContext };
}
