'use client';

// Sortable results table component with gender filter and search

import { useState, useMemo } from 'react';
import type { ResultEntry, Gender } from '@/lib/results/schema';
import { formatSecondsToTime as formatTime } from '@/lib/results/format';
import styles from './ResultsTable.module.css';

interface ResultsTableProps {
  entries: ResultEntry[];
}

type SortKey = 'name' | 'total' | 'swim' | 'bike' | 'run' | 't1' | 't2';
type SortDir = 'asc' | 'desc';
type GenderFilter = 'All' | Gender;


function getPodiumClass(rank: number): string {
  if (rank === 1) return styles.gold;
  if (rank === 2) return styles.silver;
  if (rank === 3) return styles.bronze;
  return '';
}

export default function ResultsTable({ entries }: ResultsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [showPartials, setShowPartials] = useState(false);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAndSortedEntries = useMemo(() => {
    // First filter by gender
    let filtered = genderFilter === 'All'
      ? entries
      : entries.filter((e) => e.gender === genderFilter);

    // Then filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((e) => e.name_public.toLowerCase().includes(query));
    }

    const finishers = filtered.filter((e) => e.status === 'finished');
    const partials = filtered.filter((e) => e.status === 'partial');

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
  }, [entries, sortKey, sortDir, showPartials, genderFilter, searchQuery]);

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
  const maleCount = entries.filter((e) => e.gender === 'M' && e.status === 'finished').length;
  const femaleCount = entries.filter((e) => e.gender === 'W' && e.status === 'finished').length;
  const partialCount = entries.filter((e) => e.status === 'partial').length;

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

        <input
          type="text"
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />

        {partialCount > 0 && (
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={showPartials}
              onChange={(e) => setShowPartials(e.target.checked)}
            />
            Show partial ({partialCount})
          </label>
        )}
      </div>

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
            {filteredAndSortedEntries.map((entry, idx) => {
              const rank = entry.status === 'finished' ? idx + 1 : null;
              const podiumClass = rank ? getPodiumClass(rank) : '';
              return (
                <tr
                  key={entry.id}
                  className={`${entry.status === 'partial' ? styles.partial : ''} ${podiumClass}`}
                >
                  <td className={styles.rank}>
                    {rank ? <span className={styles.rankBadge}>{rank}</span> : '-'}
                  </td>
                  <td className={styles.name}>{entry.name_public}</td>
                  <td className={styles.time}>{formatTime(entry.total_seconds)}</td>
                  <td className={styles.time}>{formatTime(entry.splits_seconds.swim)}</td>
                  <td className={styles.time}>{formatTime(entry.splits_seconds.t1)}</td>
                  <td className={styles.time}>{formatTime(entry.splits_seconds.bike)}</td>
                  <td className={styles.time}>{formatTime(entry.splits_seconds.t2)}</td>
                  <td className={styles.time}>{formatTime(entry.splits_seconds.run)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
