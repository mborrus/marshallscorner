// Triathlon results page for a specific year

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getResultsYears, readResultsYear } from '@/lib/results/fs';
import ResultsTable from '@/components/results/ResultsTable';
import ResultsSummary from '@/components/results/ResultsSummary';
import ResultsHistogram from '@/components/results/ResultsHistogram';
import SplitBreakdown from '@/components/results/SplitBreakdown';
import CourseRecords from '@/components/results/CourseRecords';
import GenderBreakdown from '@/components/results/GenderBreakdown';
import DisciplineLeaderboard from '@/components/results/DisciplineLeaderboard';
import BiggestMovers from '@/components/results/BiggestMovers';
import HeadToHead from '@/components/results/HeadToHead';
import styles from './page.module.css';

interface PageProps {
  params: Promise<{ year: string }>;
}

export async function generateStaticParams() {
  const years = getResultsYears();
  return years.map((year) => ({ year }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `${year} Triathlon Results`,
  };
}

export default async function ResultsYearPage({ params }: PageProps) {
  const { year } = await params;
  const data = readResultsYear(year);

  if (!data) {
    notFound();
  }

  const years = getResultsYears();

  return (
    <div>
      <nav className={styles.breadcrumb}>
        <Link href="/triathlon/results">Results</Link>
        <span className={styles.separator}>/</span>
        <span>{year}</span>
      </nav>

      <h1>{year} Triathlon Results</h1>

      <nav className={styles.yearNav}>
        <Link href="/triathlon/results/all-time">
          All Time
        </Link>
        {years.map((y) => (
          <Link
            key={y}
            href={`/triathlon/results/${y}`}
            className={y === year ? styles.active : ''}
          >
            {y}
          </Link>
        ))}
      </nav>

      <ResultsSummary entries={data.entries} summary={data.summary} />

      <CourseRecords entries={data.entries} />

      <GenderBreakdown entries={data.entries} />

      <ResultsHistogram entries={data.entries} />

      <SplitBreakdown entries={data.entries} />

      <DisciplineLeaderboard entries={data.entries} />

      <BiggestMovers entries={data.entries} />

      <HeadToHead entries={data.entries} />

      <h2>All Results</h2>
      <ResultsTable entries={data.entries} />
    </div>
  );
}
