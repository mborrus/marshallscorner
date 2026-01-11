// Head-to-head comparison - compare two participants side by side
'use client';

import { useState, useMemo } from 'react';
import type { ResultEntry } from '@/lib/results/schema';
import styles from './HeadToHead.module.css';

interface HeadToHeadProps {
  entries: ResultEntry[];
}

function formatTime(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(secs)}`;
  return `${minutes}:${pad(secs)}`;
}

function formatDiff(a: number | null, b: number | null): { text: string; winner: 'a' | 'b' | null } {
  if (a === null || b === null) return { text: '-', winner: null };
  const diff = a - b;
  if (diff === 0) return { text: 'Tie', winner: null };

  const abs = Math.abs(diff);
  const minutes = Math.floor(abs / 60);
  const secs = Math.round(abs % 60);

  const text = minutes > 0 ? `${minutes}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  return { text, winner: diff > 0 ? 'b' : 'a' };
}

export default function HeadToHead({ entries }: HeadToHeadProps) {
  const [participant1, setParticipant1] = useState<string>('');
  const [participant2, setParticipant2] = useState<string>('');

  const finishers = useMemo(
    () => entries.filter((e) => e.status === 'finished' && e.total_seconds !== null),
    [entries]
  );

  const entry1 = finishers.find((e) => e.id === participant1);
  const entry2 = finishers.find((e) => e.id === participant2);

  if (finishers.length < 2) return null;

  const comparisons = entry1 && entry2 ? [
    { label: 'Swim', a: entry1.splits_seconds.swim, b: entry2.splits_seconds.swim },
    { label: 'T1', a: entry1.splits_seconds.t1, b: entry2.splits_seconds.t1 },
    { label: 'Bike', a: entry1.splits_seconds.bike, b: entry2.splits_seconds.bike },
    { label: 'T2', a: entry1.splits_seconds.t2, b: entry2.splits_seconds.t2 },
    { label: 'Run', a: entry1.splits_seconds.run, b: entry2.splits_seconds.run },
    { label: 'Total', a: entry1.total_seconds, b: entry2.total_seconds },
  ] : [];

  const winsA = comparisons.filter((c) => formatDiff(c.a, c.b).winner === 'a').length;
  const winsB = comparisons.filter((c) => formatDiff(c.a, c.b).winner === 'b').length;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Head-to-Head</h3>

      <div className={styles.selectors}>
        <select
          value={participant1}
          onChange={(e) => setParticipant1(e.target.value)}
          className={styles.select}
        >
          <option value="">Select participant...</option>
          {finishers.map((e) => (
            <option key={e.id} value={e.id} disabled={e.id === participant2}>
              {e.name_public}
            </option>
          ))}
        </select>

        <span className={styles.vs}>vs</span>

        <select
          value={participant2}
          onChange={(e) => setParticipant2(e.target.value)}
          className={styles.select}
        >
          <option value="">Select participant...</option>
          {finishers.map((e) => (
            <option key={e.id} value={e.id} disabled={e.id === participant1}>
              {e.name_public}
            </option>
          ))}
        </select>
      </div>

      {entry1 && entry2 && (
        <>
          <div className={styles.scoreHeader}>
            <span className={`${styles.score} ${winsA > winsB ? styles.winning : ''}`}>
              {winsA}
            </span>
            <span className={styles.scoreDivider}>-</span>
            <span className={`${styles.score} ${winsB > winsA ? styles.winning : ''}`}>
              {winsB}
            </span>
          </div>

          <div className={styles.comparison}>
            {comparisons.map((comp) => {
              const diff = formatDiff(comp.a, comp.b);
              return (
                <div key={comp.label} className={styles.row}>
                  <span className={`${styles.value} ${diff.winner === 'a' ? styles.winner : ''}`}>
                    {formatTime(comp.a)}
                  </span>
                  <span className={styles.label}>
                    {comp.label}
                    {diff.winner && (
                      <span className={styles.diff}>
                        {diff.winner === 'a' ? '←' : '→'} {diff.text}
                      </span>
                    )}
                  </span>
                  <span className={`${styles.value} ${diff.winner === 'b' ? styles.winner : ''}`}>
                    {formatTime(comp.b)}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {(!entry1 || !entry2) && (
        <p className={styles.placeholder}>Select two participants to compare</p>
      )}
    </div>
  );
}
