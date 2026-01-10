// Statistics computation for triathlon results

import type { ResultEntry, ResultsSummary } from './schema';

/**
 * Calculate median of an array of numbers
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Compute summary statistics from entries
 */
export function computeSummary(entries: ResultEntry[]): ResultsSummary {
  const finishers = entries.filter(
    (e) => e.status === 'finished' && e.total_seconds !== null && e.total_seconds > 0
  );

  const totalTimes = finishers.map((e) => e.total_seconds!);

  if (totalTimes.length === 0) {
    return {
      finishers_count: 0,
      total_seconds: { min: 0, median: 0, max: 0 },
    };
  }

  return {
    finishers_count: finishers.length,
    total_seconds: {
      min: Math.min(...totalTimes),
      median: median(totalTimes),
      max: Math.max(...totalTimes),
    },
  };
}

/**
 * Find best (minimum) value for a split across all finishers
 */
export function findBestSplit(
  entries: ResultEntry[],
  splitKey: keyof ResultEntry['splits_seconds']
): { name: string; seconds: number } | null {
  const finishers = entries.filter((e) => e.status === 'finished');

  let best: { name: string; seconds: number } | null = null;

  for (const entry of finishers) {
    const value = entry.splits_seconds[splitKey];
    if (value !== null && (best === null || value < best.seconds)) {
      best = { name: entry.name_public, seconds: value };
    }
  }

  return best;
}

/**
 * Find best overall total time
 */
export function findBestTotal(entries: ResultEntry[]): { name: string; seconds: number } | null {
  const finishers = entries.filter(
    (e) => e.status === 'finished' && e.total_seconds !== null && e.total_seconds > 0
  );

  if (finishers.length === 0) return null;

  const best = finishers.reduce((min, e) =>
    e.total_seconds! < min.total_seconds! ? e : min
  );

  return { name: best.name_public, seconds: best.total_seconds! };
}

/**
 * Compute histogram buckets for total times
 */
export function computeHistogram(
  entries: ResultEntry[],
  bucketCount: number = 8
): { label: string; count: number; start: number; end: number }[] {
  const finishers = entries.filter(
    (e) => e.status === 'finished' && e.total_seconds !== null && e.total_seconds > 0
  );

  if (finishers.length === 0) return [];

  const times = finishers.map((e) => e.total_seconds!);
  const min = Math.min(...times);
  const max = Math.max(...times);
  const range = max - min;
  const bucketSize = range / bucketCount;

  const buckets: { label: string; count: number; start: number; end: number }[] = [];

  for (let i = 0; i < bucketCount; i++) {
    const start = min + i * bucketSize;
    const end = start + bucketSize;
    const count = times.filter((t) => t >= start && (i === bucketCount - 1 ? t <= end : t < end)).length;

    // Format labels as minutes
    const startMin = Math.floor(start / 60);
    const endMin = Math.floor(end / 60);

    buckets.push({
      label: `${startMin}-${endMin}m`,
      count,
      start,
      end,
    });
  }

  return buckets;
}

/**
 * Compute median split percentages
 */
export function computeSplitPercentages(
  entries: ResultEntry[]
): Record<string, number> | null {
  const finishers = entries.filter(
    (e) => e.status === 'finished' && e.total_seconds !== null && e.total_seconds > 0
  );

  if (finishers.length === 0) return null;

  const medianTotal = median(finishers.map((e) => e.total_seconds!));

  const splits = ['swim', 't1', 'bike', 't2', 'run'] as const;
  const percentages: Record<string, number> = {};

  for (const split of splits) {
    const values = finishers
      .map((e) => e.splits_seconds[split])
      .filter((v): v is number => v !== null);

    if (values.length > 0) {
      const medianSplit = median(values);
      percentages[split] = Math.round((medianSplit / medianTotal) * 100);
    }
  }

  return percentages;
}

/**
 * Find max overtakes
 */
export function findMaxOvertakes(
  entries: ResultEntry[]
): { bike: { name: string; count: number } | null; run: { name: string; count: number } | null } {
  const finishers = entries.filter((e) => e.status === 'finished');

  let maxBike: { name: string; count: number } | null = null;
  let maxRun: { name: string; count: number } | null = null;

  for (const entry of finishers) {
    if (entry.overtakes?.bike !== undefined) {
      if (maxBike === null || entry.overtakes.bike > maxBike.count) {
        maxBike = { name: entry.name_public, count: entry.overtakes.bike };
      }
    }
    if (entry.overtakes?.run !== undefined) {
      if (maxRun === null || entry.overtakes.run > maxRun.count) {
        maxRun = { name: entry.name_public, count: entry.overtakes.run };
      }
    }
  }

  return { bike: maxBike, run: maxRun };
}
