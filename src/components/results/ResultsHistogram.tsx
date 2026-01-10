// Simple SVG histogram for results distribution

import type { ResultEntry } from '@/lib/results/schema';
import styles from './ResultsHistogram.module.css';

interface ResultsHistogramProps {
  entries: ResultEntry[];
  bucketCount?: number;
}

function formatMinutes(seconds: number): string {
  return `${Math.floor(seconds / 60)}m`;
}

export default function ResultsHistogram({ entries, bucketCount = 8 }: ResultsHistogramProps) {
  const finishers = entries.filter(
    (e) => e.status === 'finished' && e.total_seconds !== null && e.total_seconds > 0
  );

  if (finishers.length < 3) return null;

  const times = finishers.map((e) => e.total_seconds!);
  const min = Math.min(...times);
  const max = Math.max(...times);
  const range = max - min;
  const bucketSize = range / bucketCount;

  const buckets: { label: string; count: number }[] = [];

  for (let i = 0; i < bucketCount; i++) {
    const start = min + i * bucketSize;
    const end = start + bucketSize;
    const count = times.filter((t) => t >= start && (i === bucketCount - 1 ? t <= end : t < end)).length;

    buckets.push({
      label: `${formatMinutes(start)}-${formatMinutes(end)}`,
      count,
    });
  }

  const maxCount = Math.max(...buckets.map((b) => b.count));

  // SVG dimensions
  const width = 400;
  const height = 150;
  const padding = { top: 10, right: 10, bottom: 30, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barWidth = chartWidth / buckets.length - 4;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Finish Time Distribution</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.chart}>
        {buckets.map((bucket, i) => {
          const barHeight = maxCount > 0 ? (bucket.count / maxCount) * chartHeight : 0;
          const x = padding.left + i * (chartWidth / buckets.length) + 2;
          const y = padding.top + chartHeight - barHeight;

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                className={styles.bar}
              />
              {bucket.count > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 4}
                  textAnchor="middle"
                  className={styles.count}
                >
                  {bucket.count}
                </text>
              )}
              <text
                x={x + barWidth / 2}
                y={height - 8}
                textAnchor="middle"
                className={styles.label}
              >
                {bucket.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
