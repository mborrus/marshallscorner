// SVG line chart for year-over-year trends

import type { TurkeyTrotYearStats } from '@/lib/turkeytrotter/types';
import { formatTime } from '@/lib/turkeytrotter/format';
import styles from './TrendChart.module.css';

interface Props {
  trends: TurkeyTrotYearStats[];
}

export default function TrendChart({ trends }: Props) {
  if (trends.length < 2) {
    return (
      <div className={styles.container}>
        <p className={styles.noData}>Not enough data to show trends (need at least 2 years)</p>
      </div>
    );
  }

  // SVG dimensions
  const width = 600;
  const height = 250;
  const padding = { top: 30, right: 30, bottom: 50, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate scales
  const years = trends.map((t) => t.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const yearRange = maxYear - minYear || 1;

  const allTimes = trends.flatMap((t) => [
    t.fastestTimeSeconds,
    t.medianTimeSeconds,
  ]);
  const minTime = Math.min(...allTimes) * 0.95;
  const maxTime = Math.max(...allTimes) * 1.05;
  const timeRange = maxTime - minTime;

  const getX = (year: number) =>
    padding.left + ((year - minYear) / yearRange) * chartWidth;

  const getY = (time: number) =>
    padding.top + chartHeight - ((time - minTime) / timeRange) * chartHeight;

  // Generate path for lines
  const fastestPath = trends
    .map((t, i) => {
      const x = getX(t.year);
      const y = getY(t.fastestTimeSeconds);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  const medianPath = trends
    .map((t, i) => {
      const x = getX(t.year);
      const y = getY(t.medianTimeSeconds);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // Y-axis ticks
  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) =>
    Math.round(minTime + (timeRange * i) / (yTicks - 1))
  );

  return (
    <div className={styles.container}>
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.chart}>
        {/* Grid lines */}
        {yTickValues.map((time, i) => (
          <line
            key={i}
            x1={padding.left}
            y1={getY(time)}
            x2={width - padding.right}
            y2={getY(time)}
            className={styles.gridLine}
          />
        ))}

        {/* Y-axis labels */}
        {yTickValues.map((time, i) => (
          <text
            key={i}
            x={padding.left - 8}
            y={getY(time)}
            textAnchor="end"
            dominantBaseline="middle"
            className={styles.axisLabel}
          >
            {formatTime(time)}
          </text>
        ))}

        {/* X-axis labels */}
        {trends.map((t) => (
          <text
            key={t.year}
            x={getX(t.year)}
            y={height - padding.bottom + 20}
            textAnchor="middle"
            className={styles.axisLabel}
          >
            {t.year}
          </text>
        ))}

        {/* Lines */}
        <path d={fastestPath} className={styles.fastestLine} />
        <path d={medianPath} className={styles.medianLine} />

        {/* Data points - Fastest */}
        {trends.map((t) => (
          <g key={`fastest-${t.year}`}>
            <circle
              cx={getX(t.year)}
              cy={getY(t.fastestTimeSeconds)}
              r={5}
              className={styles.fastestPoint}
            />
            <title>
              {t.year}: {formatTime(t.fastestTimeSeconds)} (Fastest)
            </title>
          </g>
        ))}

        {/* Data points - Median */}
        {trends.map((t) => (
          <g key={`median-${t.year}`}>
            <circle
              cx={getX(t.year)}
              cy={getY(t.medianTimeSeconds)}
              r={5}
              className={styles.medianPoint}
            />
            <title>
              {t.year}: {formatTime(t.medianTimeSeconds)} (Median)
            </title>
          </g>
        ))}

        {/* Axis titles */}
        <text
          x={15}
          y={height / 2}
          textAnchor="middle"
          transform={`rotate(-90, 15, ${height / 2})`}
          className={styles.axisTitle}
        >
          Time
        </text>
        <text
          x={width / 2}
          y={height - 5}
          textAnchor="middle"
          className={styles.axisTitle}
        >
          Year
        </text>
      </svg>

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.fastestDot}`} />
          <span>Fastest Time</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.medianDot}`} />
          <span>Median Time</span>
        </div>
      </div>

      {/* Stats summary */}
      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Participation Trend</span>
          <span className={styles.summaryValue}>
            {trends[trends.length - 1].totalRunners > trends[0].totalRunners
              ? `+${trends[trends.length - 1].totalRunners - trends[0].totalRunners} runners`
              : `${trends[trends.length - 1].totalRunners - trends[0].totalRunners} runners`}
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Latest Year</span>
          <span className={styles.summaryValue}>
            {trends[trends.length - 1].totalRunners} finishers
          </span>
        </div>
      </div>
    </div>
  );
}
