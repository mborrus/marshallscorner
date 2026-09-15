// Athlete explorer - one athlete's whole history across every year raced

import Link from 'next/link';
import type { Metadata } from 'next';
import { readAllResults, getResultsYears } from '@/lib/results/fs';
import { buildAthleteIndex } from '@/lib/results/athletes';
import AthleteExplorer from '@/components/results/athlete/AthleteExplorer';
import Placeholder from '@/components/Placeholder';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Athlete Explorer',
  description: 'Compare any Meredith TryAthlon athlete year over year, split by split.',
};

export default function AthletesPage() {
  const allResults = readAllResults();

  if (allResults.length === 0) {
    return (
      <div>
        <h1>Athlete Explorer</h1>
        <Placeholder message="run npm run build:results" />
      </div>
    );
  }

  const index = buildAthleteIndex(allResults);
  const years = getResultsYears();

  return (
    <div>
      <nav className={styles.breadcrumb}>
        <Link href="/triathlon/results">Results</Link>
        <span className={styles.separator}>/</span>
        <span>Athletes</span>
      </nav>

      <h1>Athlete Explorer</h1>
      <p className={styles.intro}>
        Pick an athlete to see every race they have run — splits, how each year compares to the
        last, and where they landed in the field.
      </p>

      <nav className={styles.yearNav}>
        <Link href="/triathlon/results/all-time">All Time</Link>
        {years.map((y) => (
          <Link key={y} href={`/triathlon/results/${y}`}>
            {y}
          </Link>
        ))}
      </nav>

      <AthleteExplorer index={index} />
    </div>
  );
}
