// Discipline leaderboard - shows top performers in each discipline
'use client';

import { useState } from 'react';
import type { ResultEntry } from '@/lib/results/schema';
import styles from './DisciplineLeaderboard.module.css';

interface DisciplineLeaderboardProps {
  entries: ResultEntry[];
}

type Discipline = 'swim' | 'bike' | 'run';

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(secs)}`;
  return `${minutes}:${pad(secs)}`;
}

const DISCIPLINES: { key: Discipline; label: string; icon: string; color: string }[] = [
  { key: 'swim', label: 'Swim', icon: '🏊', color: '#4a90a4' },
  { key: 'bike', label: 'Bike', icon: '🚴', color: '#6b8e23' },
  { key: 'run', label: 'Run', icon: '🏃', color: '#cd5c5c' },
];

export default function DisciplineLeaderboard({ entries }: DisciplineLeaderboardProps) {
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline>('swim');

  // Get top 5 for each discipline
  const getTopPerformers = (discipline: Discipline, limit = 5) => {
    return entries
      .filter((e) => e.splits_seconds[discipline] !== null && e.splits_seconds[discipline]! > 0)
      .sort((a, b) => a.splits_seconds[discipline]! - b.splits_seconds[discipline]!)
      .slice(0, limit)
      .map((e, idx) => ({
        rank: idx + 1,
        name: e.name_public,
        time: e.splits_seconds[discipline]!,
        gender: e.gender,
      }));
  };

  const currentDiscipline = DISCIPLINES.find((d) => d.key === selectedDiscipline)!;
  const topPerformers = getTopPerformers(selectedDiscipline);

  if (entries.length < 3) return null;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Discipline Leaders</h3>

      <div className={styles.tabs}>
        {DISCIPLINES.map((d) => (
          <button
            key={d.key}
            className={`${styles.tab} ${selectedDiscipline === d.key ? styles.tabActive : ''}`}
            onClick={() => setSelectedDiscipline(d.key)}
            style={{
              '--tab-color': d.color,
              '--tab-bg': selectedDiscipline === d.key ? d.color : 'transparent',
            } as React.CSSProperties}
          >
            <span className={styles.tabIcon}>{d.icon}</span>
            {d.label}
          </button>
        ))}
      </div>

      <div className={styles.leaderboard}>
        {topPerformers.map((performer) => (
          <div
            key={performer.name}
            className={`${styles.row} ${performer.rank <= 3 ? styles[`rank${performer.rank}`] : ''}`}
          >
            <span className={styles.rank}>{performer.rank}</span>
            <span className={styles.name}>
              {performer.name}
              <span className={styles.gender}>{performer.gender}</span>
            </span>
            <span className={styles.time} style={{ color: currentDiscipline.color }}>
              {formatTime(performer.time)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
