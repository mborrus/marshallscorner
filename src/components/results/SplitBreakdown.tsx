// Split breakdown chart - shows median time split across disciplines
'use client';

import { useState } from 'react';
import type { ResultEntry } from '@/lib/results/schema';
import styles from './SplitBreakdown.module.css';

interface SplitBreakdownProps {
  entries: ResultEntry[];
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(secs)}`;
  return `${minutes}:${pad(secs)}`;
}

interface Split {
  name: string;
  time: number;
  color: string;
  pct: number;
}

export default function SplitBreakdown({ entries }: SplitBreakdownProps) {
  const [hoveredSplit, setHoveredSplit] = useState<string | null>(null);

  const finishers = entries.filter(
    (e) => e.status === 'finished' && e.total_seconds !== null && e.total_seconds > 0
  );

  if (finishers.length < 3) return null;

  // Calculate medians for each split
  const swimTimes = finishers.map((e) => e.splits_seconds.swim).filter((v): v is number => v !== null);
  const t1Times = finishers.map((e) => e.splits_seconds.t1).filter((v): v is number => v !== null);
  const bikeTimes = finishers.map((e) => e.splits_seconds.bike).filter((v): v is number => v !== null);
  const t2Times = finishers.map((e) => e.splits_seconds.t2).filter((v): v is number => v !== null);
  const runTimes = finishers.map((e) => e.splits_seconds.run).filter((v): v is number => v !== null);

  const medianSwim = median(swimTimes);
  const medianT1 = median(t1Times);
  const medianBike = median(bikeTimes);
  const medianT2 = median(t2Times);
  const medianRun = median(runTimes);
  const medianTotal = medianSwim + medianT1 + medianBike + medianT2 + medianRun;

  if (medianTotal === 0) return null;

  const splits: Split[] = [
    { name: 'Swim', time: medianSwim, color: '#4a90a4', pct: (medianSwim / medianTotal) * 100 },
    { name: 'T1', time: medianT1, color: '#7fb3c4', pct: (medianT1 / medianTotal) * 100 },
    { name: 'Bike', time: medianBike, color: '#6b8e23', pct: (medianBike / medianTotal) * 100 },
    { name: 'T2', time: medianT2, color: '#9acd32', pct: (medianT2 / medianTotal) * 100 },
    { name: 'Run', time: medianRun, color: '#cd5c5c', pct: (medianRun / medianTotal) * 100 },
  ];

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Median Split Breakdown</h3>

      <div className={styles.barContainer}>
        {splits.map((split, idx) => {
          const isHovered = hoveredSplit === split.name;
          return (
            <div
              key={split.name}
              className={`${styles.segment} ${isHovered ? styles.segmentHovered : ''}`}
              style={{
                width: `${split.pct}%`,
                backgroundColor: split.color,
                animationDelay: `${idx * 0.1}s`,
              }}
              onMouseEnter={() => setHoveredSplit(split.name)}
              onMouseLeave={() => setHoveredSplit(null)}
            >
              {split.pct > 8 && <span className={styles.segmentLabel}>{split.name}</span>}
              {isHovered && (
                <div className={styles.tooltip}>
                  <strong>{split.name}</strong>
                  <span>{formatTime(split.time)}</span>
                  <span>{split.pct.toFixed(1)}%</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.legend}>
        {splits.map((split) => {
          const isHovered = hoveredSplit === split.name;
          return (
            <div
              key={split.name}
              className={`${styles.legendItem} ${isHovered ? styles.legendItemHovered : ''}`}
              onMouseEnter={() => setHoveredSplit(split.name)}
              onMouseLeave={() => setHoveredSplit(null)}
            >
              <span className={styles.legendColor} style={{ backgroundColor: split.color }} />
              <span className={styles.legendName}>{split.name}</span>
              <span className={styles.legendValue}>{formatTime(split.time)}</span>
              <span className={styles.legendPct}>{split.pct.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>

      <p className={styles.totalTime}>
        Median Total: <strong>{formatTime(medianTotal)}</strong>
      </p>
    </div>
  );
}
