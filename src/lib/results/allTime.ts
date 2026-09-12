// Derives every stat shown on the all-time results page from the raw per-year
// results tables. Nothing here should be hand-typed per year — see the design
// handoff's "Data contract" section for the source of truth on each field.

import type { Gender, ResultsYear } from './schema';

export interface Row {
  name: string;
  gender: Gender;
  year: number;
  swim: number | null;
  t1: number | null;
  bike: number | null;
  t2: number | null;
  run: number | null;
  total: number | null;
  rankTotal: number | null;
  rankSwim: number | null;
}

export function fmt(sec: number | null): string {
  if (sec === null) return '—';
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}

export function fmtDiff(diff: number): string {
  const sign = diff < 0 ? '−' : '+';
  return `${sign}${fmt(Math.abs(diff))}`;
}

export function yy(year: number): string {
  return String(year).slice(-2);
}

function toRows(allResults: ResultsYear[]): Row[] {
  return allResults.flatMap((yearData) =>
    yearData.entries.map((e) => ({
      name: e.name_public.trim(),
      gender: e.gender,
      year: yearData.year,
      swim: e.splits_seconds.swim,
      t1: e.splits_seconds.t1,
      bike: e.splits_seconds.bike,
      t2: e.splits_seconds.t2,
      run: e.splits_seconds.run,
      total: e.status === 'finished' ? e.total_seconds : null,
      rankTotal: e.ranks?.total ?? null,
      rankSwim: e.ranks?.swim ?? null,
    }))
  );
}

export interface LeaderboardRow {
  rank: number;
  name: string;
  gender: Gender;
  year: number;
  value: number;
}

export interface ReturneeRow {
  name: string;
  years: number[];
  times: number[];
  delta: number;
  improved: boolean;
}

export interface MoverRow {
  name: string;
  gender: Gender;
  year: number;
  swimPos: number;
  finishPos: number;
  n: number;
  fieldSize: number;
}

export interface TransitionRow {
  name: string;
  gender: Gender;
  year: number;
  t1: number;
  t2: number;
  total: number;
}

export interface ParticipationYear {
  year: number;
  men: number;
  women: number;
  total: number;
  finishers: number;
}

export interface RecordEntry {
  name: string;
  year: number;
  value: number;
}

export interface AllTimeData {
  years: number[];
  uniqueRacers: number;
  entries: number;
  bestByRacer: Row[];
  finishers: Row[];
  courseRecords: {
    total: RecordEntry | null;
    swim: RecordEntry | null;
    bike: RecordEntry | null;
    run: RecordEntry | null;
  };
  overallRecordSplits: { swim: number | null; bike: number | null; run: number | null } | null;
  leaderboards: { swim: LeaderboardRow[]; bike: LeaderboardRow[]; run: LeaderboardRow[] };
  participation: ParticipationYear[];
  returnees: ReturneeRow[];
  racersWhoCouldReturn: number;
  movers: { gainers: MoverRow[]; faded: MoverRow[] };
  transitions: { fastest: TransitionRow[]; slowest: TransitionRow[] };
  headlines: {
    closestFinish: { gap: number; a: string; b: string; year: number } | null;
    biggestComeback: MoverRow | null;
    specialist: { name: string; bestLeg: string; worstLeg: string; spread: number } | null;
    fieldGrowth: number | null;
  };
  garland: {
    uniqueRacers: number;
    entries: number;
    seasons: number;
    returnedOf: string;
    pctImproved: number;
  };
  anatomy: {
    year: number;
    racers: { name: string; gender: Gender; swim: number; t1: number; bike: number; t2: number; run: number }[];
  } | null;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function deriveAllTime(allResults: ResultsYear[]): AllTimeData {
  const rows = toRows(allResults);
  const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b);
  const finishers = rows.filter((r) => r.total !== null);

  // bestByRacer: fastest total per racer, ties -> latest year
  const bestMap = new Map<string, Row>();
  for (const r of [...finishers].sort((a, b) => a.year - b.year)) {
    const key = r.name.toLowerCase();
    const existing = bestMap.get(key);
    if (!existing || r.total! <= existing.total!) bestMap.set(key, r);
  }
  const bestByRacer = [...bestMap.values()].sort((a, b) => a.total! - b.total!);

  const uniqueNames = new Set(rows.map((r) => r.name.toLowerCase()));

  // Course records
  const recordFrom = (leg: 'swim' | 'bike' | 'run' | 'total'): RecordEntry | null => {
    const candidates = rows.filter((r) => r[leg] !== null);
    if (candidates.length === 0) return null;
    const best = candidates.reduce((min, r) => (r[leg]! < min[leg]! ? r : min));
    return { name: best.name, year: best.year, value: best[leg]! };
  };
  const totalRecord = recordFrom('total');
  const swimRecord = recordFrom('swim');
  const bikeRecord = recordFrom('bike');
  const runRecord = recordFrom('run');

  const overallRow = totalRecord ? rows.find((r) => r.name === totalRecord.name && r.year === totalRecord.year) : null;
  const overallRecordSplits = overallRow
    ? { swim: overallRow.swim, bike: overallRow.bike, run: overallRow.run }
    : null;

  // Leaderboards: top 5 per leg, across all rows
  const leaderboard = (leg: 'swim' | 'bike' | 'run'): LeaderboardRow[] =>
    rows
      .filter((r) => r[leg] !== null)
      .sort((a, b) => a[leg]! - b[leg]! || a.year - b.year || a.name.localeCompare(b.name))
      .slice(0, 5)
      .map((r, i) => ({ rank: i + 1, name: r.name, gender: r.gender, year: r.year, value: r[leg]! }));

  const leaderboards = { swim: leaderboard('swim'), bike: leaderboard('bike'), run: leaderboard('run') };

  // Participation per year
  const participation: ParticipationYear[] = years.map((year) => {
    const yearRows = rows.filter((r) => r.year === year);
    return {
      year,
      men: yearRows.filter((r) => r.gender === 'M').length,
      women: yearRows.filter((r) => r.gender === 'W').length,
      total: yearRows.length,
      finishers: yearRows.filter((r) => r.total !== null).length,
    };
  });

  // Returnees: names appearing in >= 2 years (of finishers, by year -> total)
  const byName = new Map<string, Row[]>();
  for (const r of finishers) {
    const key = r.name.toLowerCase();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key)!.push(r);
  }
  const returnees: ReturneeRow[] = [];
  for (const [, entries] of byName) {
    const distinctYears = [...new Set(entries.map((e) => e.year))];
    if (distinctYears.length < 2) continue;
    const sorted = [...entries].sort((a, b) => a.year - b.year);
    const latest = sorted[sorted.length - 1];
    const previous = sorted[sorted.length - 2];
    returnees.push({
      name: sorted[0].name,
      years: sorted.map((e) => e.year),
      times: sorted.map((e) => e.total!),
      delta: latest.total! - previous.total!,
      improved: latest.total! < previous.total!,
    });
  }
  returnees.sort((a, b) => a.delta - b.delta);

  const latestYear = years[years.length - 1];
  const racersWhoCouldReturn = uniqueNames.size
    ? [...uniqueNames].filter((n) => rows.some((r) => r.name.toLowerCase() === n && r.year < latestYear)).length
    : 0;

  // Movers: per-year rank by swim vs rank by total
  const allMovers: MoverRow[] = [];
  for (const year of years) {
    const yearFinishers = finishers.filter((r) => r.year === year && r.swim !== null);
    const fieldSize = rows.filter((r) => r.year === year).length;
    const bySwim = [...yearFinishers].sort((a, b) => a.swim! - b.swim!);
    const byTotal = [...yearFinishers].sort((a, b) => a.total! - b.total!);
    const swimPos = new Map(bySwim.map((r, i) => [r.name, i + 1]));
    const finishPos = new Map(byTotal.map((r, i) => [r.name, i + 1]));
    for (const r of yearFinishers) {
      const sp = swimPos.get(r.name)!;
      const fp = finishPos.get(r.name)!;
      allMovers.push({ name: r.name, gender: r.gender, year, swimPos: sp, finishPos: fp, n: sp - fp, fieldSize });
    }
  }
  const gainers = [...allMovers].filter((m) => m.n > 0).sort((a, b) => b.n - a.n).slice(0, 3);
  const faded = [...allMovers].filter((m) => m.n < 0).sort((a, b) => a.n - b.n).slice(0, 3);

  // Transitions: from bestByRacer with both t1 & t2
  const transitionRows: TransitionRow[] = bestByRacer
    .filter((r) => r.t1 !== null && r.t2 !== null)
    .map((r) => ({ name: r.name, gender: r.gender, year: r.year, t1: r.t1!, t2: r.t2!, total: r.t1! + r.t2! }));
  const sortedTransitions = [...transitionRows].sort((a, b) => a.total - b.total);
  const fastest = sortedTransitions.slice(0, 4);
  const slowest = sortedTransitions.slice(-4).reverse();

  // Headlines
  let closestFinish: AllTimeData['headlines']['closestFinish'] = null;
  for (const year of years) {
    const yearFinishers = finishers.filter((r) => r.year === year).sort((a, b) => a.total! - b.total!);
    for (let i = 1; i < yearFinishers.length; i++) {
      const gap = yearFinishers[i].total! - yearFinishers[i - 1].total!;
      if (!closestFinish || gap < closestFinish.gap) {
        closestFinish = { gap, a: yearFinishers[i - 1].name, b: yearFinishers[i].name, year };
      }
    }
  }

  const biggestComeback = allMovers.length
    ? [...allMovers].sort((a, b) => b.n - a.n)[0]
    : null;

  let specialist: AllTimeData['headlines']['specialist'] = null;
  {
    const legs: ('swim' | 'bike' | 'run')[] = ['swim', 'bike', 'run'];
    const rankOf: Record<string, Map<string, number>> = {};
    for (const leg of legs) {
      const ranked = [...bestByRacer]
        .filter((r) => r[leg] !== null)
        .sort((a, b) => a[leg]! - b[leg]!);
      rankOf[leg] = new Map(ranked.map((r, i) => [r.name, i + 1]));
    }
    let best: { name: string; bestLeg: string; worstLeg: string; spread: number } | null = null;
    for (const r of bestByRacer) {
      const ranks: { leg: string; rank: number }[] = [];
      for (const leg of legs) {
        const rank = rankOf[leg].get(r.name);
        if (rank !== undefined) ranks.push({ leg, rank });
      }
      if (ranks.length < 2) continue;
      const bestLegEntry = ranks.reduce((a, b) => (a.rank < b.rank ? a : b));
      const worstLegEntry = ranks.reduce((a, b) => (a.rank > b.rank ? a : b));
      const spread = worstLegEntry.rank - bestLegEntry.rank;
      if (!best || spread > best.spread) {
        best = { name: r.name, bestLeg: bestLegEntry.leg, worstLeg: worstLegEntry.leg, spread };
      }
    }
    specialist = best;
  }

  let fieldGrowth: number | null = null;
  if (participation.length >= 2) {
    const latest = participation[participation.length - 1];
    const prev = participation[participation.length - 2];
    fieldGrowth = (latest.total - prev.total) / prev.total;
  }

  const improvedCount = returnees.filter((r) => r.improved).length;
  const garland = {
    uniqueRacers: uniqueNames.size,
    entries: rows.length,
    seasons: years.length,
    returnedOf: `${returnees.length}/${racersWhoCouldReturn}`,
    pctImproved: returnees.length ? Math.round((improvedCount / returnees.length) * 100) : 0,
  };

  // Anatomy of a race: top 5 finishers of the latest year, by default.
  let anatomy: AllTimeData['anatomy'] = null;
  if (years.length > 0) {
    const yearFinishers = finishers
      .filter((r) => r.year === latestYear && r.swim !== null && r.t1 !== null && r.bike !== null && r.t2 !== null && r.run !== null)
      .sort((a, b) => a.total! - b.total!)
      .slice(0, 5);
    if (yearFinishers.length >= 2) {
      anatomy = {
        year: latestYear,
        racers: yearFinishers.map((r) => ({
          name: r.name,
          gender: r.gender,
          swim: r.swim!,
          t1: r.t1!,
          bike: r.bike!,
          t2: r.t2!,
          run: r.run!,
        })),
      };
    }
  }

  return {
    years,
    uniqueRacers: uniqueNames.size,
    entries: rows.length,
    bestByRacer,
    finishers,
    courseRecords: { total: totalRecord, swim: swimRecord, bike: bikeRecord, run: runRecord },
    overallRecordSplits,
    leaderboards,
    participation,
    returnees,
    racersWhoCouldReturn,
    movers: { gainers, faded },
    transitions: { fastest, slowest },
    headlines: { closestFinish, biggestComeback, specialist, fieldGrowth },
    garland,
    anatomy,
  };
}

export { median };
