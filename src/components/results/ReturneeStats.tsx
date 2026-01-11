// Returnee stats - shows stats about returning participants
'use client';

import { useMemo } from 'react';
import styles from './ReturneeStats.module.css';

interface YearResult {
  year: number;
  entries: Array<{
    name_public: string;
    total_seconds: number | null;
    status: string;
  }>;
}

interface ReturneeStatsProps {
  allResults: YearResult[];
}

function formatTimeDiff(seconds: number): string {
  const abs = Math.abs(seconds);
  const hours = Math.floor(abs / 3600);
  const minutes = Math.floor((abs % 3600) / 60);
  const secs = Math.round(abs % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');

  const sign = seconds < 0 ? '-' : '+';
  if (hours > 0) return `${sign}${hours}:${pad(minutes)}:${pad(secs)}`;
  return `${sign}${minutes}:${pad(secs)}`;
}

export default function ReturneeStats({ allResults }: ReturneeStatsProps) {
  const stats = useMemo(() => {
    if (allResults.length < 2) return null;

    const sorted = [...allResults].sort((a, b) => a.year - b.year);
    const years = sorted.map((r) => r.year);

    // Build map of name -> { year: time }
    const participantTimes = new Map<string, Map<number, number>>();

    for (const yearData of sorted) {
      for (const entry of yearData.entries) {
        if (entry.status !== 'finished' || entry.total_seconds === null) continue;

        const key = entry.name_public.toLowerCase();
        if (!participantTimes.has(key)) {
          participantTimes.set(key, new Map());
        }
        participantTimes.get(key)!.set(yearData.year, entry.total_seconds);
      }
    }

    // Find returnees (people who raced in multiple years)
    const returnees: Array<{
      name: string;
      years: number[];
      times: number[];
      improvement: number;
      improved: boolean;
    }> = [];

    Array.from(participantTimes.entries()).forEach(([name, yearTimes]) => {
      if (yearTimes.size < 2) return;

      const yearsRaced = Array.from(yearTimes.keys()).sort();
      const times = yearsRaced.map((y) => yearTimes.get(y)!);
      const firstTime = times[0];
      const lastTime = times[times.length - 1];
      const improvement = firstTime - lastTime; // positive = improved

      returnees.push({
        name,
        years: yearsRaced,
        times,
        improvement,
        improved: improvement > 0,
      });
    });

    if (returnees.length === 0) return null;

    const improvedCount = returnees.filter((r) => r.improved).length;
    const improvedPct = Math.round((improvedCount / returnees.length) * 100);

    // Find biggest improvement
    const sortedByImprovement = [...returnees].sort((a, b) => b.improvement - a.improvement);
    const mostImproved = sortedByImprovement[0];

    // Find most consistent (smallest time variance)
    const withMultipleYears = returnees.filter((r) => r.years.length >= 2);

    return {
      totalReturnees: returnees.length,
      improvedCount,
      improvedPct,
      mostImproved: mostImproved.improvement > 0 ? mostImproved : null,
      returnees: sortedByImprovement.slice(0, 5),
      years,
    };
  }, [allResults]);

  if (!stats) return null;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Returning Participants</h3>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.totalReturnees}</span>
          <span className={styles.statLabel}>Returnees</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.improvedPct}%</span>
          <span className={styles.statLabel}>Improved</span>
        </div>
        {stats.mostImproved && (
          <div className={styles.statCard}>
            <span className={styles.statValue}>{formatTimeDiff(stats.mostImproved.improvement)}</span>
            <span className={styles.statLabel}>Most Improved</span>
            <span className={styles.statName}>{stats.mostImproved.name}</span>
          </div>
        )}
      </div>

      {stats.returnees.length > 0 && (
        <div className={styles.returneeList}>
          <h4 className={styles.subtitle}>Year-over-Year Changes</h4>
          {stats.returnees.map((returnee, idx) => (
            <div key={idx} className={styles.returneeRow}>
              <span className={styles.returneeName}>{returnee.name}</span>
              <span className={styles.returneeYears}>
                {returnee.years.join(', ')}
              </span>
              <span
                className={`${styles.returneeChange} ${returnee.improved ? styles.improved : styles.slower}`}
              >
                {returnee.improved ? '↓' : '↑'} {formatTimeDiff(returnee.improvement)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
