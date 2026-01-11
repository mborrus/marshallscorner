// Course records - fastest times for each discipline
'use client';

import { useState, useMemo } from 'react';
import type { ResultEntry, Gender } from '@/lib/results/schema';
import styles from './CourseRecords.module.css';

interface CourseRecordsProps {
  entries: ResultEntry[];
}

type GenderFilter = 'All' | Gender;

function formatTime(seconds: number): string {
  if (seconds <= 0) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(secs)}`;
  return `${minutes}:${pad(secs)}`;
}

type Discipline = 'swim' | 'bike' | 'run' | 'total';

interface RecordInfo {
  name: string;
  time: number;
}

export default function CourseRecords({ entries }: CourseRecordsProps) {
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('All');

  const filteredEntries = useMemo(() => {
    if (genderFilter === 'All') return entries;
    return entries.filter((e) => e.gender === genderFilter);
  }, [entries, genderFilter]);

  const finishers = filteredEntries.filter(
    (e) => e.status === 'finished' && e.total_seconds !== null && e.total_seconds > 0
  );

  if (finishers.length < 1) return null;

  function findFastest(discipline: Discipline): RecordInfo | null {
    let fastest: RecordInfo | null = null;

    for (const entry of filteredEntries) {
      let time: number | null = null;

      if (discipline === 'total') {
        if (entry.status !== 'finished') continue;
        time = entry.total_seconds;
      } else {
        time = entry.splits_seconds[discipline];
      }

      if (time !== null && time > 0 && (fastest === null || time < fastest.time)) {
        fastest = { name: entry.name_public, time };
      }
    }

    return fastest;
  }

  const records = [
    { label: 'Swim', icon: '🏊', record: findFastest('swim') },
    { label: 'Bike', icon: '🚴', record: findFastest('bike') },
    { label: 'Run', icon: '🏃', record: findFastest('run') },
    { label: 'Overall', icon: '🏆', record: findFastest('total') },
  ];

  const validRecords = records.filter((r) => r.record !== null);
  if (validRecords.length === 0) return null;

  const hasMen = entries.some((e) => e.gender === 'M');
  const hasWomen = entries.some((e) => e.gender === 'W');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Fastest Times</h3>
        {hasMen && hasWomen && (
          <div className={styles.filterGroup}>
            {(['All', 'M', 'W'] as GenderFilter[]).map((g) => (
              <button
                key={g}
                className={`${styles.filterBtn} ${genderFilter === g ? styles.filterActive : ''}`}
                onClick={() => setGenderFilter(g)}
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className={styles.grid}>
        {records.map((r, idx) => {
          if (!r.record) return null;
          return (
            <div
              key={r.label}
              className={styles.card}
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <span className={styles.icon}>{r.icon}</span>
              <span className={styles.discipline}>{r.label}</span>
              <span className={styles.time}>{formatTime(r.record.time)}</span>
              <span className={styles.name}>{r.record.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
