'use client';

// Sortable results table component

import { useState, useMemo } from 'react';
import type { ResultEntry } from '@/lib/results/schema';
import styles from './ResultsTable.module.css';

interface ResultsTableProps {
  entries: ResultEntry[];
}

type SortKey = 'name' | 'total' | 'swim' | 'bike' | 'run' | 't1' | 't2';
type SortDir = 'asc' | 'desc';

function formatTime(seconds: number | null): string {
  if (seconds === null || seconds < 0) return '-';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(secs)}`;
  }
  return `${minutes}:${pad(secs)}`;
}

export default function ResultsTable({ entries }: ResultsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [showPartials, setShowPartials] = useState(false);

  const sortedEntries = useMemo(() => {
    const finishers = entries.filter((e) => e.status === 'finished');
    const partials = entries.filter((e) => e.status === 'partial');

    const getValue = (entry: ResultEntry, key: SortKey): number | string => {
      switch (key) {
        case 'name':
          return entry.name_public;
        case 'total':
          return entry.total_seconds ?? Infinity;
        case 'swim':
          return entry.splits_seconds.swim ?? Infinity;
        case 'bike':
          return entry.splits_seconds.bike ?? Infinity;
        case 'run':
          return entry.splits_seconds.run ?? Infinity;
        case 't1':
          return entry.splits_seconds.t1 ?? Infinity;
        case 't2':
          return entry.splits_seconds.t2 ?? Infinity;
        default:
          return 0;
      }
    };

    const sorted = [...finishers].sort((a, b) => {
      const aVal = getValue(a, sortKey);
      const bVal = getValue(b, sortKey);

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      const numA = aVal as number;
      const numB = bVal as number;
      return sortDir === 'asc' ? numA - numB : numB - numA;
    });

    return showPartials ? [...sorted, ...partials] : sorted;
  }, [entries, sortKey, sortDir, showPartials]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortHeader = ({ label, column }: { label: string; column: SortKey }) => (
    <th
      className={styles.sortable}
      onClick={() => handleSort(column)}
      aria-sort={sortKey === column ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {label}
      {sortKey === column && <span className={styles.sortIndicator}>{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>}
    </th>
  );

  const partialCount = entries.filter((e) => e.status === 'partial').length;

  return (
    <div className={styles.container}>
      {partialCount > 0 && (
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={showPartials}
            onChange={(e) => setShowPartials(e.target.checked)}
          />
          Show partial results ({partialCount})
        </label>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.rank}>#</th>
              <SortHeader label="Name" column="name" />
              <SortHeader label="Total" column="total" />
              <SortHeader label="Swim" column="swim" />
              <SortHeader label="T1" column="t1" />
              <SortHeader label="Bike" column="bike" />
              <SortHeader label="T2" column="t2" />
              <SortHeader label="Run" column="run" />
            </tr>
          </thead>
          <tbody>
            {sortedEntries.map((entry, idx) => (
              <tr key={entry.id} className={entry.status === 'partial' ? styles.partial : ''}>
                <td className={styles.rank}>{entry.status === 'finished' ? idx + 1 : '-'}</td>
                <td className={styles.name}>{entry.name_public}</td>
                <td className={styles.time}>{formatTime(entry.total_seconds)}</td>
                <td className={styles.time}>{formatTime(entry.splits_seconds.swim)}</td>
                <td className={styles.time}>{formatTime(entry.splits_seconds.t1)}</td>
                <td className={styles.time}>{formatTime(entry.splits_seconds.bike)}</td>
                <td className={styles.time}>{formatTime(entry.splits_seconds.t2)}</td>
                <td className={styles.time}>{formatTime(entry.splits_seconds.run)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
