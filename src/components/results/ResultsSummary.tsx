// Results summary statistics component

import type { ResultEntry } from '@/lib/results/schema';
import styles from './ResultsSummary.module.css';

interface ResultsSummaryProps {
  entries: ResultEntry[];
  summary: {
    finishers_count: number;
    total_seconds: { min: number; median: number; max: number };
  };
}

function formatTime(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return '-';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(secs)}`;
  }
  return `${minutes}:${pad(secs)}`;
}

function findBest(
  entries: ResultEntry[],
  getValue: (e: ResultEntry) => number | null
): { name: string; value: number } | null {
  const finishers = entries.filter((e) => e.status === 'finished');
  let best: { name: string; value: number } | null = null;

  for (const entry of finishers) {
    const value = getValue(entry);
    if (value !== null && (best === null || value < best.value)) {
      best = { name: entry.name_public, value };
    }
  }

  return best;
}

export default function ResultsSummary({ entries, summary }: ResultsSummaryProps) {
  const bestTotal = findBest(entries, (e) => e.total_seconds);
  const bestSwim = findBest(entries, (e) => e.splits_seconds.swim);
  const bestBike = findBest(entries, (e) => e.splits_seconds.bike);
  const bestRun = findBest(entries, (e) => e.splits_seconds.run);
  const bestT1 = findBest(entries, (e) => e.splits_seconds.t1);
  const bestT2 = findBest(entries, (e) => e.splits_seconds.t2);

  return (
    <div className={styles.summary}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Overview</h3>
        <dl className={styles.stats}>
          <div className={styles.stat}>
            <dt>Finishers</dt>
            <dd>{summary.finishers_count}</dd>
          </div>
          <div className={styles.stat}>
            <dt>Fastest</dt>
            <dd>{formatTime(summary.total_seconds.min)}</dd>
          </div>
          <div className={styles.stat}>
            <dt>Median</dt>
            <dd>{formatTime(summary.total_seconds.median)}</dd>
          </div>
          <div className={styles.stat}>
            <dt>Slowest</dt>
            <dd>{formatTime(summary.total_seconds.max)}</dd>
          </div>
        </dl>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Best Performances</h3>
        <dl className={styles.stats}>
          {bestTotal && (
            <div className={styles.stat}>
              <dt>Overall</dt>
              <dd>
                {bestTotal.name} ({formatTime(bestTotal.value)})
              </dd>
            </div>
          )}
          {bestSwim && (
            <div className={styles.stat}>
              <dt>Swim</dt>
              <dd>
                {bestSwim.name} ({formatTime(bestSwim.value)})
              </dd>
            </div>
          )}
          {bestBike && (
            <div className={styles.stat}>
              <dt>Bike</dt>
              <dd>
                {bestBike.name} ({formatTime(bestBike.value)})
              </dd>
            </div>
          )}
          {bestRun && (
            <div className={styles.stat}>
              <dt>Run</dt>
              <dd>
                {bestRun.name} ({formatTime(bestRun.value)})
              </dd>
            </div>
          )}
          {bestT1 && (
            <div className={styles.stat}>
              <dt>T1</dt>
              <dd>
                {bestT1.name} ({formatTime(bestT1.value)})
              </dd>
            </div>
          )}
          {bestT2 && (
            <div className={styles.stat}>
              <dt>T2</dt>
              <dd>
                {bestT2.name} ({formatTime(bestT2.value)})
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
