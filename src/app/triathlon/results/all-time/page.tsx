// All-time triathlon results - best times across all years

import Link from 'next/link';
import type { Metadata } from 'next';
import { readAllResults } from '@/lib/results/fs';
import ResultsTableAllTime from '@/components/results/ResultsTableAllTime';
import AllTimeRecords from '@/components/results/AllTimeRecords';
import YearlyParticipation from '@/components/results/YearlyParticipation';
import ReturneeStats from '@/components/results/ReturneeStats';
import styles from '../[year]/page.module.css';

export const metadata: Metadata = {
  title: 'All-Time Triathlon Results',
};

interface AllTimeEntry {
  id: string;
  name_public: string;
  gender: 'M' | 'W';
  year: number;
  total_seconds: number;
  splits_seconds: {
    swim: number | null;
    t1: number | null;
    bike: number | null;
    t2: number | null;
    run: number | null;
  };
}

export default function AllTimeResultsPage() {
  const allResults = readAllResults();

  if (allResults.length === 0) {
    return (
      <div>
        <h1>All-Time Results</h1>
        <p>No results available.</p>
      </div>
    );
  }

  // Combine all entries, keeping only finished results
  // For each person, keep their best (fastest) time
  const bestByPerson = new Map<string, AllTimeEntry>();

  for (const yearData of allResults) {
    for (const entry of yearData.entries) {
      if (entry.status !== 'finished' || entry.total_seconds === null) continue;

      // Use name_public as the key to match across years
      const key = entry.name_public.toLowerCase();
      const existing = bestByPerson.get(key);

      if (!existing || entry.total_seconds < existing.total_seconds) {
        bestByPerson.set(key, {
          id: `${yearData.year}-${entry.id}`,
          name_public: entry.name_public,
          gender: entry.gender,
          year: yearData.year,
          total_seconds: entry.total_seconds,
          splits_seconds: entry.splits_seconds,
        });
      }
    }
  }

  const allTimeEntries = Array.from(bestByPerson.values());

  // Compute stats
  const totalTimes = allTimeEntries.map((e) => e.total_seconds);
  const maleCount = allTimeEntries.filter((e) => e.gender === 'M').length;
  const femaleCount = allTimeEntries.filter((e) => e.gender === 'W').length;
  const yearsCount = allResults.length;

  const summary = {
    participants: allTimeEntries.length,
    years: yearsCount,
    fastest: totalTimes.length > 0 ? Math.min(...totalTimes) : 0,
  };

  const years = allResults.map((r) => r.year.toString()).sort((a, b) => b.localeCompare(a));

  return (
    <div>
      <nav className={styles.breadcrumb}>
        <Link href="/triathlon/results">Results</Link>
        <span className={styles.separator}>/</span>
        <span>All Time</span>
      </nav>

      <h1>All-Time Results</h1>

      <nav className={styles.yearNav}>
        <Link href="/triathlon/results/all-time" className={styles.active}>
          All Time
        </Link>
        {years.map((y) => (
          <Link key={y} href={`/triathlon/results/${y}`}>
            {y}
          </Link>
        ))}
      </nav>

      <div style={{ background: '#f9f9f9', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <p style={{ margin: 0, color: '#666' }}>
          <strong>{summary.participants}</strong> unique participants across{' '}
          <strong>{summary.years}</strong> years ({maleCount} M, {femaleCount} W).
          Showing each person&apos;s best time.
        </p>
      </div>

      <AllTimeRecords allResults={allResults} />

      <YearlyParticipation allResults={allResults} />

      <ReturneeStats allResults={allResults} />

      <h2>Best Times</h2>
      <ResultsTableAllTime entries={allTimeEntries} />
    </div>
  );
}
