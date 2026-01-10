// Triathlon results index page - lists all available years

import Link from 'next/link';
import type { Metadata } from 'next';
import { getResultsYears, readResultsYear } from '@/lib/results/fs';
import Placeholder from '@/components/Placeholder';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Triathlon Results',
};

function formatTime(seconds: number): string {
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

export default function ResultsIndexPage() {
  const years = getResultsYears();

  if (years.length === 0) {
    return (
      <div>
        <h1>Triathlon Results</h1>
        <Placeholder message="run npm run build:results" />
      </div>
    );
  }

  return (
    <div>
      <h1>Triathlon Results</h1>

      <div className={styles.yearsList}>
        {years.map((year) => {
          const data = readResultsYear(year);

          if (!data) {
            return (
              <div key={year} className={styles.yearCard}>
                <h2>{year}</h2>
                <Placeholder message={`results data missing for ${year}`} />
              </div>
            );
          }

          const { summary } = data;

          return (
            <Link href={`/triathlon/results/${year}`} key={year} className={styles.yearCard}>
              <h2 className={styles.yearTitle}>{year}</h2>
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
            </Link>
          );
        })}
      </div>
    </div>
  );
}
