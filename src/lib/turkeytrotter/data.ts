// Data reading and processing utilities for Turkey Trot

import fs from 'fs';
import path from 'path';
import type {
  TurkeyTrotData,
  TurkeyTrotRunner,
  TurkeyTrotYearStats,
  TurkeyTrotDivisionStats,
  TurkeyTrotCourseRecord,
  TurkeyTrotHeadToHead,
} from './types';

// Try results.json first (from build script), fallback to demo.json
const resultsPath = path.join(
  process.cwd(),
  'content',
  'turkeytrotter',
  'generated',
  'results.json'
);
const demoPath = path.join(
  process.cwd(),
  'content',
  'turkeytrotter',
  'generated',
  'demo.json'
);
const generatedPath = fs.existsSync(resultsPath) ? resultsPath : demoPath;

/**
 * Read all Turkey Trot data from generated JSON
 */
export function readTurkeyTrotData(): TurkeyTrotData | null {
  if (!fs.existsSync(generatedPath)) return null;

  const content = fs.readFileSync(generatedPath, 'utf8');
  return JSON.parse(content) as TurkeyTrotData;
}

/**
 * Get all runners
 */
export function getAllRunners(): TurkeyTrotRunner[] {
  const data = readTurkeyTrotData();
  return data?.runners ?? [];
}

/**
 * Get runners for a specific year
 */
export function getRunnersByYear(year: number): TurkeyTrotRunner[] {
  return getAllRunners().filter((r) => r.year === year);
}

/**
 * Get all unique years
 */
export function getUniqueYears(): number[] {
  const runners = getAllRunners();
  const years = new Set(runners.map((r) => r.year));
  return Array.from(years).sort((a, b) => b - a);
}

/**
 * Get unique age groups
 */
export function getUniqueAgeGroups(): string[] {
  const runners = getAllRunners();
  const groups = new Set(runners.map((r) => r.ageGroup));
  return Array.from(groups).sort();
}

/**
 * Format seconds to MM:SS or H:MM:SS
 */
export function formatTime(seconds: number): string {
  if (seconds <= 0) return '-';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(secs)}`;
  }
  return `${minutes}:${pad(secs)}`;
}

/**
 * Convert seconds to pace per mile (for 5K = 3.1 miles)
 */
export function secondsToPace(seconds: number): string {
  const paceSeconds = seconds / 3.1;
  const minutes = Math.floor(paceSeconds / 60);
  const secs = Math.round(paceSeconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}/mi`;
}

/**
 * Calculate stats for a single year
 */
export function calculateYearStats(year: number): TurkeyTrotYearStats | null {
  const runners = getRunnersByYear(year);
  if (runners.length === 0) return null;

  const times = runners.map((r) => r.finishTimeSeconds).sort((a, b) => a - b);
  const maleCount = runners.filter((r) => r.gender === 'M').length;
  const femaleCount = runners.filter((r) => r.gender === 'F').length;

  const median =
    times.length % 2 === 0
      ? (times[times.length / 2 - 1] + times[times.length / 2]) / 2
      : times[Math.floor(times.length / 2)];

  const average = times.reduce((a, b) => a + b, 0) / times.length;

  return {
    year,
    totalRunners: runners.length,
    maleCount,
    femaleCount,
    fastestTimeSeconds: times[0],
    slowestTimeSeconds: times[times.length - 1],
    medianTimeSeconds: median,
    averageTimeSeconds: average,
  };
}

/**
 * Calculate overall stats across all years
 */
export function calculateOverallStats() {
  const runners = getAllRunners();
  if (runners.length === 0) return null;

  const years = getUniqueYears();
  const times = runners.map((r) => r.finishTimeSeconds).sort((a, b) => a - b);

  const median =
    times.length % 2 === 0
      ? (times[times.length / 2 - 1] + times[times.length / 2]) / 2
      : times[Math.floor(times.length / 2)];

  const average = times.reduce((a, b) => a + b, 0) / times.length;

  // Find course records
  const fastestMale = runners
    .filter((r) => r.gender === 'M')
    .sort((a, b) => a.finishTimeSeconds - b.finishTimeSeconds)[0];

  const fastestFemale = runners
    .filter((r) => r.gender === 'F')
    .sort((a, b) => a.finishTimeSeconds - b.finishTimeSeconds)[0];

  const fastest = runners.sort(
    (a, b) => a.finishTimeSeconds - b.finishTimeSeconds
  )[0];

  return {
    totalRaces: years.length,
    totalFinishers: runners.length,
    uniqueRunners: new Set(runners.map((r) => r.name.toLowerCase())).size,
    fastestTimeSeconds: times[0],
    slowestTimeSeconds: times[times.length - 1],
    medianTimeSeconds: median,
    averageTimeSeconds: average,
    courseRecordOverall: fastest,
    courseRecordMale: fastestMale,
    courseRecordFemale: fastestFemale,
  };
}

/**
 * Get division/age group stats for a specific year
 */
export function getDivisionStats(year?: number): TurkeyTrotDivisionStats[] {
  const runners = year ? getRunnersByYear(year) : getAllRunners();
  const groups = new Map<
    string,
    { count: number; totalTime: number; fastestTime: number }
  >();

  for (const runner of runners) {
    const existing = groups.get(runner.ageGroup);
    if (existing) {
      existing.count++;
      existing.totalTime += runner.finishTimeSeconds;
      existing.fastestTime = Math.min(
        existing.fastestTime,
        runner.finishTimeSeconds
      );
    } else {
      groups.set(runner.ageGroup, {
        count: 1,
        totalTime: runner.finishTimeSeconds,
        fastestTime: runner.finishTimeSeconds,
      });
    }
  }

  return Array.from(groups.entries())
    .map(([ageGroup, data]) => ({
      ageGroup,
      count: data.count,
      averageTimeSeconds: data.totalTime / data.count,
      fastestTimeSeconds: data.fastestTime,
    }))
    .sort((a, b) => a.ageGroup.localeCompare(b.ageGroup));
}

/**
 * Get year-over-year stats for trend charts
 */
export function getYearlyTrends(): TurkeyTrotYearStats[] {
  const years = getUniqueYears();
  return years
    .map((year) => calculateYearStats(year))
    .filter((s): s is TurkeyTrotYearStats => s !== null)
    .sort((a, b) => a.year - b.year);
}

/**
 * Search runners by name
 */
export function searchRunners(query: string): TurkeyTrotRunner[] {
  if (!query.trim()) return [];

  const lowerQuery = query.toLowerCase();
  return getAllRunners()
    .filter((r) => r.name.toLowerCase().includes(lowerQuery))
    .sort((a, b) => a.finishTimeSeconds - b.finishTimeSeconds);
}

/**
 * Get all results for a specific runner
 */
export function getRunnerHistory(name: string): TurkeyTrotRunner[] {
  const lowerName = name.toLowerCase();
  return getAllRunners()
    .filter((r) => r.name.toLowerCase() === lowerName)
    .sort((a, b) => b.year - a.year);
}

/**
 * Find head-to-head matchups between two runners
 */
export function getHeadToHead(
  runner1Name: string,
  runner2Name: string
): TurkeyTrotHeadToHead | null {
  const runner1History = getRunnerHistory(runner1Name);
  const runner2History = getRunnerHistory(runner2Name);

  if (runner1History.length === 0 || runner2History.length === 0) return null;

  const runner1Years = new Set(runner1History.map((r) => r.year));
  const sharedYears = runner2History
    .filter((r) => runner1Years.has(r.year))
    .map((r) => r.year);

  if (sharedYears.length === 0) return null;

  const races = sharedYears.map((year) => {
    const r1 = runner1History.find((r) => r.year === year)!;
    const r2 = runner2History.find((r) => r.year === year)!;
    return {
      year,
      runner1Time: r1.finishTimeSeconds,
      runner2Time: r2.finishTimeSeconds,
      winner:
        r1.finishTimeSeconds < r2.finishTimeSeconds
          ? runner1Name
          : runner2Name,
    };
  });

  return {
    runner1: runner1Name,
    runner2: runner2Name,
    races: races.sort((a, b) => b.year - a.year),
    runner1Wins: races.filter((r) => r.winner === runner1Name).length,
    runner2Wins: races.filter((r) => r.winner === runner2Name).length,
  };
}

/**
 * Get frequent participants (runners with most races)
 */
export function getFrequentFlyers(limit = 10) {
  const runners = getAllRunners();
  const countMap = new Map<
    string,
    { name: string; count: number; bestTime: number; years: number[] }
  >();

  for (const runner of runners) {
    const key = runner.name.toLowerCase();
    const existing = countMap.get(key);
    if (existing) {
      existing.count++;
      existing.bestTime = Math.min(existing.bestTime, runner.finishTimeSeconds);
      existing.years.push(runner.year);
    } else {
      countMap.set(key, {
        name: runner.name,
        count: 1,
        bestTime: runner.finishTimeSeconds,
        years: [runner.year],
      });
    }
  }

  return Array.from(countMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get course records by category
 */
export function getCourseRecords(): TurkeyTrotCourseRecord[] {
  const runners = getAllRunners();
  const records: TurkeyTrotCourseRecord[] = [];

  // Overall record
  const fastestOverall = runners.sort(
    (a, b) => a.finishTimeSeconds - b.finishTimeSeconds
  )[0];
  if (fastestOverall) {
    records.push({
      category: 'Overall',
      name: fastestOverall.name,
      year: fastestOverall.year,
      timeSeconds: fastestOverall.finishTimeSeconds,
    });
  }

  // Gender records
  for (const gender of ['M', 'F'] as const) {
    const fastest = runners
      .filter((r) => r.gender === gender)
      .sort((a, b) => a.finishTimeSeconds - b.finishTimeSeconds)[0];
    if (fastest) {
      records.push({
        category: gender === 'M' ? 'Male' : 'Female',
        name: fastest.name,
        year: fastest.year,
        timeSeconds: fastest.finishTimeSeconds,
        gender,
      });
    }
  }

  // Age group records
  const ageGroups = getUniqueAgeGroups();
  for (const ageGroup of ageGroups) {
    const fastest = runners
      .filter((r) => r.ageGroup === ageGroup)
      .sort((a, b) => a.finishTimeSeconds - b.finishTimeSeconds)[0];
    if (fastest) {
      records.push({
        category: `Age Group ${ageGroup}`,
        name: fastest.name,
        year: fastest.year,
        timeSeconds: fastest.finishTimeSeconds,
        ageGroup,
      });
    }
  }

  return records;
}

/**
 * Get pace distribution buckets for histogram
 */
export function getPaceDistribution(year?: number, bucketCount = 10) {
  const runners = year ? getRunnersByYear(year) : getAllRunners();
  if (runners.length === 0) return [];

  const times = runners.map((r) => r.finishTimeSeconds).sort((a, b) => a - b);
  const min = times[0];
  const max = times[times.length - 1];
  const range = max - min;
  const bucketSize = range / bucketCount;

  const buckets: { start: number; end: number; count: number }[] = [];

  for (let i = 0; i < bucketCount; i++) {
    const start = min + i * bucketSize;
    const end = start + bucketSize;
    const count = times.filter(
      (t) => t >= start && (i === bucketCount - 1 ? t <= end : t < end)
    ).length;

    buckets.push({ start, end, count });
  }

  return buckets;
}

/**
 * Find runners with similar pace for pace partner discovery
 */
export function findPacePartners(
  targetTimeSeconds: number,
  toleranceSeconds = 60,
  year?: number
): TurkeyTrotRunner[] {
  const runners = year ? getRunnersByYear(year) : getAllRunners();

  return runners
    .filter(
      (r) =>
        Math.abs(r.finishTimeSeconds - targetTimeSeconds) <= toleranceSeconds
    )
    .sort(
      (a, b) =>
        Math.abs(a.finishTimeSeconds - targetTimeSeconds) -
        Math.abs(b.finishTimeSeconds - targetTimeSeconds)
    )
    .slice(0, 20);
}

/**
 * Predict placement given a target time
 */
export function predictPlacement(
  targetTimeSeconds: number,
  year?: number
): { place: number; total: number; percentile: number } {
  const runners = year ? getRunnersByYear(year) : getAllRunners();
  if (runners.length === 0) return { place: 0, total: 0, percentile: 0 };

  const fasterCount = runners.filter(
    (r) => r.finishTimeSeconds < targetTimeSeconds
  ).length;
  const place = fasterCount + 1;
  const percentile = ((runners.length - fasterCount) / runners.length) * 100;

  return {
    place,
    total: runners.length,
    percentile: Math.round(percentile),
  };
}
