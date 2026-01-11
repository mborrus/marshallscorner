'use client';

// Sortable all-time results table with gender filter and year column

import { useState, useMemo } from 'react';
import styles from './ResultsTable.module.css';

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

interface ResultsTableAllTimeProps {
  entries: AllTimeEntry[];
}

type SortKey = 'name' | 'year' | 'total' | 'swim' | 'bike' | 'run' | 't1' | 't2';
type SortDir = 'asc' | 'desc';
type GenderFilter = 'All' | 'M' | 'W';

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

export default function ResultsTableAllTime({ entries }: ResultsTableAllTimeProps) {
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('All');

  const filteredAndSortedEntries = useMemo(() => {
    // First filter by gender
    const genderFiltered = genderFilter === 'All'
      ? entries
      : entries.filter((e) => e.gender === genderFilter);

    const getValue = (entry: AllTimeEntry, key: SortKey): number | string => {
      switch (key) {
        case 'name':
          return entry.name_public;
        case 'year':
          return entry.year;
        case 'total':
          return entry.total_seconds;
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

    return [...genderFiltered].sort((a, b) => {
      const aVal = getValue(a, sortKey);
      const bVal = getValue(b, sortKey);

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      const numA = aVal as number;
      const numB = bVal as number;
      return sortDir === 'asc' ? numA - numB : numB - numA;
    });
  }, [entries, sortKey, sortDir, genderFilter]);

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

  // Count by gender for filter buttons
  const maleCount = entries.filter((e) => e.gender === 'M').length;
  const femaleCount = entries.filter((e) => e.gender === 'W').length;

  return (
    <div className={styles.container}>
      <div className={styles.filters}>
        <div className={styles.genderFilter}>
          <button
            className={`${styles.filterBtn} ${genderFilter === 'All' ? styles.active : ''}`}
            onClick={() => setGenderFilter('All')}
          >
            All
          </button>
          <button
            className={`${styles.filterBtn} ${genderFilter === 'M' ? styles.active : ''}`}
            onClick={() => setGenderFilter('M')}
          >
            M ({maleCount})
          </button>
          <button
            className={`${styles.filterBtn} ${genderFilter === 'W' ? styles.active : ''}`}
            onClick={() => setGenderFilter('W')}
          >
            W ({femaleCount})
          </button>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.rank}>#</th>
              <SortHeader label="Name" column="name" />
              <SortHeader label="Year" column="year" />
              <SortHeader label="Total" column="total" />
              <SortHeader label="Swim" column="swim" />
              <SortHeader label="T1" column="t1" />
              <SortHeader label="Bike" column="bike" />
              <SortHeader label="T2" column="t2" />
              <SortHeader label="Run" column="run" />
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedEntries.map((entry, idx) => (
              <tr key={entry.id}>
                <td className={styles.rank}>{idx + 1}</td>
                <td className={styles.name}>{entry.name_public}</td>
                <td>{entry.year}</td>
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
