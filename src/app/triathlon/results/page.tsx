// Triathlon results index page - lists all available years

import Link from 'next/link';
import type { Metadata } from 'next';
import { getResultsYears, readResultsYear, readAllResults } from '@/lib/results/fs';
import Placeholder from '@/components/Placeholder';
import { formatSecondsToTime as formatTime } from '@/lib/results/format';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Triathlon Results',
};


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

  // Compute all-time stats
  const allResults = readAllResults();
  const uniqueParticipants = new Set<string>();
  for (const yearData of allResults) {
    for (const entry of yearData.entries) {
      if (entry.status === 'finished') {
        uniqueParticipants.add(entry.name_public.toLowerCase());
      }
    }
  }

  const athleteCount = uniqueParticipants.size;

  return (
    <div>
      <h1>Triathlon Results</h1>

      <div className={styles.yearsList}>
        {/* Athlete explorer card */}
        <Link
          href="/triathlon/results/athletes"
          className={`${styles.yearCard} ${styles.athletes}`}
        >
          <h2 className={styles.yearTitle}>Athletes</h2>
          <dl className={styles.stats}>
            <div className={styles.stat}>
              <dt>Explore</dt>
              <dd>{athleteCount} racers</dd>
            </div>
            <div className={styles.stat}>
              <dt>Compare</dt>
              <dd>year to year</dd>
            </div>
          </dl>
        </Link>

        {/* All Time card */}
        <Link href="/triathlon/results/all-time" className={`${styles.yearCard} ${styles.allTime}`}>
          <h2 className={styles.yearTitle}>All Time</h2>
          <dl className={styles.stats}>
            <div className={styles.stat}>
              <dt>Participants</dt>
              <dd>{uniqueParticipants.size}</dd>
            </div>
            <div className={styles.stat}>
              <dt>Years</dt>
              <dd>{years.length}</dd>
            </div>
          </dl>
        </Link>

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
