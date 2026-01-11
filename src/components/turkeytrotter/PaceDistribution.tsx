// SVG histogram for pace/time distribution with median marker

import { formatTime } from '@/lib/turkeytrotter/format';
import styles from './PaceDistribution.module.css';

interface Props {
  distribution: { start: number; end: number; count: number }[];
  median: number;
}

export default function PaceDistribution({ distribution, median }: Props) {
  if (distribution.length === 0) return null;

  const maxCount = Math.max(...distribution.map((b) => b.count));

  // SVG dimensions
  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 50, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barWidth = chartWidth / distribution.length - 4;

  // Calculate median position
  const minTime = distribution[0].start;
  const maxTime = distribution[distribution.length - 1].end;
  const timeRange = maxTime - minTime;
  const medianX =
    padding.left + ((median - minTime) / timeRange) * chartWidth;

  return (
    <div className={styles.container}>
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.chart}>
        {/* Y-axis label */}
        <text
          x={15}
          y={height / 2}
          textAnchor="middle"
          transform={`rotate(-90, 15, ${height / 2})`}
          className={styles.axisLabel}
        >
          Runners
        </text>

        {/* X-axis label */}
        <text
          x={width / 2}
          y={height - 5}
          textAnchor="middle"
          className={styles.axisLabel}
        >
          Finish Time
        </text>

        {/* Bars */}
        {distribution.map((bucket, i) => {
          const barHeight =
            maxCount > 0 ? (bucket.count / maxCount) * chartHeight : 0;
          const x = padding.left + i * (chartWidth / distribution.length) + 2;
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
                y={padding.top + chartHeight + 15}
                textAnchor="middle"
                className={styles.label}
              >
                {formatTime(bucket.start)}
              </text>
            </g>
          );
        })}

        {/* Median line */}
        {median > 0 && (
          <g>
            <line
              x1={medianX}
              y1={padding.top}
              x2={medianX}
              y2={padding.top + chartHeight}
              className={styles.medianLine}
            />
            <text
              x={medianX}
              y={padding.top - 5}
              textAnchor="middle"
              className={styles.medianLabel}
            >
              Median: {formatTime(median)}
            </text>
          </g>
        )}
      </svg>

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.legendBar} />
          <span>Runners</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendMedian} />
          <span>Median Time</span>
        </div>
      </div>
    </div>
  );
}
