'use client';

import { useState, useMemo } from 'react';
import type { TurkeyTrotRunner } from '@/lib/turkeytrotter/types';
import { formatTime, secondsToPace } from '@/lib/turkeytrotter/format';
import styles from './PlacePredictor.module.css';

interface Props {
  runners: TurkeyTrotRunner[];
  years: number[];
}

export default function PlacePredictor({ runners, years }: Props) {
  const [targetTime, setTargetTime] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Parse target time to seconds
  const targetSeconds = useMemo(() => {
    if (!targetTime.trim()) return 0;

    const parts = targetTime.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    } else if (parts.length === 3) {
      return (
        parseInt(parts[0], 10) * 3600 +
        parseInt(parts[1], 10) * 60 +
        parseInt(parts[2], 10)
      );
    }
    return 0;
  }, [targetTime]);

  // Get filtered runners based on year selection
  const filteredRunners = useMemo(() => {
    return selectedYear
      ? runners.filter((r) => r.year === selectedYear)
      : runners;
  }, [runners, selectedYear]);

  // Calculate prediction
  const prediction = useMemo(() => {
    if (targetSeconds <= 0 || filteredRunners.length === 0) return null;

    const fasterCount = filteredRunners.filter(
      (r) => r.finishTimeSeconds < targetSeconds
    ).length;
    const sameCount = filteredRunners.filter(
      (r) => r.finishTimeSeconds === targetSeconds
    ).length;

    const place = fasterCount + 1;
    const total = filteredRunners.length;
    const percentile = ((total - fasterCount) / total) * 100;

    // Get the 5 runners right around the predicted place
    const sortedRunners = [...filteredRunners].sort(
      (a, b) => a.finishTimeSeconds - b.finishTimeSeconds
    );
    const nearbyStart = Math.max(0, fasterCount - 2);
    const nearbyEnd = Math.min(total, fasterCount + 3);
    const nearbyRunners = sortedRunners.slice(nearbyStart, nearbyEnd);

    return {
      place,
      total,
      sameCount,
      percentile: Math.round(percentile),
      nearbyRunners,
      insertIndex: fasterCount - nearbyStart,
    };
  }, [targetSeconds, filteredRunners]);

  // Generate histogram data
  const histogramData = useMemo(() => {
    if (filteredRunners.length === 0) return [];

    const times = filteredRunners.map((r) => r.finishTimeSeconds);
    const min = Math.min(...times);
    const max = Math.max(...times);
    const bucketCount = 15;
    const bucketSize = (max - min) / bucketCount;

    const buckets: { start: number; end: number; count: number }[] = [];
    for (let i = 0; i < bucketCount; i++) {
      const start = min + i * bucketSize;
      const end = start + bucketSize;
      const count = times.filter(
        (t) => t >= start && (i === bucketCount - 1 ? t <= end : t < end)
      ).length;
      buckets.push({ start, end, count });
    }

    return buckets;
  }, [filteredRunners]);

  const maxBucketCount = Math.max(...histogramData.map((b) => b.count), 1);

  // SVG dimensions for histogram
  const width = 600;
  const height = 180;
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  return (
    <div className={styles.container}>
      <section className={styles.inputSection}>
        <h2 className={styles.title}>Predict Your Placement</h2>
        <p className={styles.description}>
          [TODO: Add description about how the predictor works]
        </p>

        <div className={styles.inputRow}>
          <div className={styles.inputGroup}>
            <label htmlFor="target-time" className={styles.label}>
              Target Finish Time
            </label>
            <input
              id="target-time"
              type="text"
              value={targetTime}
              onChange={(e) => setTargetTime(e.target.value)}
              placeholder="MM:SS or H:MM:SS"
              className={styles.input}
            />
            <span className={styles.hint}>e.g., 25:00 or 0:25:00</span>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="compare-year" className={styles.label}>
              Compare Against
            </label>
            <select
              id="compare-year"
              value={selectedYear ?? ''}
              onChange={(e) =>
                setSelectedYear(e.target.value ? parseInt(e.target.value, 10) : null)
              }
              className={styles.select}
            >
              <option value="">All Years ({runners.length} runners)</option>
              {years.map((year) => {
                const count = runners.filter((r) => r.year === year).length;
                return (
                  <option key={year} value={year}>
                    {year} ({count} runners)
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </section>

      {/* Prediction Results */}
      {prediction && (
        <section className={styles.resultsSection}>
          <div className={styles.predictionCards}>
            <div className={`${styles.predictionCard} ${styles.cardPlace}`}>
              <span className={styles.predictionLabel}>Predicted Place</span>
              <span className={styles.predictionValue}>
                #{prediction.place}
              </span>
              <span className={styles.predictionSub}>
                of {prediction.total} runners
              </span>
            </div>

            <div className={`${styles.predictionCard} ${styles.cardPercentile}`}>
              <span className={styles.predictionLabel}>Percentile</span>
              <span className={styles.predictionValue}>
                Top {100 - prediction.percentile}%
              </span>
              <span className={styles.predictionSub}>
                Faster than {prediction.percentile}% of runners
              </span>
            </div>

            <div className={`${styles.predictionCard} ${styles.cardPace}`}>
              <span className={styles.predictionLabel}>Your Pace</span>
              <span className={styles.predictionValue}>
                {secondsToPace(targetSeconds)}
              </span>
              <span className={styles.predictionSub}>
                {formatTime(targetSeconds)} total
              </span>
            </div>
          </div>

          {/* Histogram with marker */}
          <div className={styles.histogramSection}>
            <h3 className={styles.histogramTitle}>Where You Would Finish</h3>
            <svg viewBox={`0 0 ${width} ${height}`} className={styles.histogram}>
              {/* Bars */}
              {histogramData.map((bucket, i) => {
                const barWidth = chartWidth / histogramData.length - 2;
                const barHeight =
                  maxBucketCount > 0
                    ? (bucket.count / maxBucketCount) * chartHeight
                    : 0;
                const x = padding.left + i * (chartWidth / histogramData.length) + 1;
                const y = padding.top + chartHeight - barHeight;

                const isTargetBucket =
                  targetSeconds >= bucket.start && targetSeconds < bucket.end;

                return (
                  <g key={i}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      className={isTargetBucket ? styles.barHighlight : styles.bar}
                    />
                    {bucket.count > 0 && barHeight > 20 && (
                      <text
                        x={x + barWidth / 2}
                        y={y + 12}
                        textAnchor="middle"
                        className={styles.barCount}
                      >
                        {bucket.count}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Target line */}
              {targetSeconds > 0 && histogramData.length > 0 && (
                <>
                  {(() => {
                    const minTime = histogramData[0].start;
                    const maxTime = histogramData[histogramData.length - 1].end;
                    const timeRange = maxTime - minTime;
                    const targetX =
                      padding.left +
                      ((targetSeconds - minTime) / timeRange) * chartWidth;

                    if (targetX >= padding.left && targetX <= padding.left + chartWidth) {
                      return (
                        <g>
                          <line
                            x1={targetX}
                            y1={padding.top - 10}
                            x2={targetX}
                            y2={padding.top + chartHeight}
                            className={styles.targetLine}
                          />
                          <text
                            x={targetX}
                            y={padding.top - 15}
                            textAnchor="middle"
                            className={styles.targetLabel}
                          >
                            You: {formatTime(targetSeconds)}
                          </text>
                        </g>
                      );
                    }
                    return null;
                  })()}
                </>
              )}

              {/* X-axis labels */}
              {[0, Math.floor(histogramData.length / 2), histogramData.length - 1].map(
                (i) => {
                  if (!histogramData[i]) return null;
                  const x =
                    padding.left +
                    i * (chartWidth / histogramData.length) +
                    (chartWidth / histogramData.length - 2) / 2;
                  return (
                    <text
                      key={i}
                      x={x}
                      y={height - 10}
                      textAnchor="middle"
                      className={styles.axisLabel}
                    >
                      {formatTime(histogramData[i].start)}
                    </text>
                  );
                }
              )}
            </svg>
          </div>

          {/* Nearby runners */}
          <div className={styles.nearbySection}>
            <h3 className={styles.nearbyTitle}>Runners Near Your Predicted Place</h3>
            <table className={styles.nearbyTable}>
              <thead>
                <tr>
                  <th>Place</th>
                  <th>Name</th>
                  <th>Time</th>
                  <th>Pace</th>
                  <th>Year</th>
                </tr>
              </thead>
              <tbody>
                {prediction.nearbyRunners.map((runner, i) => {
                  const isYou = i === prediction.insertIndex;
                  const actualPlace =
                    filteredRunners.filter(
                      (r) => r.finishTimeSeconds < runner.finishTimeSeconds
                    ).length + 1;

                  return (
                    <tr key={runner.id} className={isYou ? styles.youRow : ''}>
                      <td>#{actualPlace}</td>
                      <td>{runner.name}</td>
                      <td>{formatTime(runner.finishTimeSeconds)}</td>
                      <td>{secondsToPace(runner.finishTimeSeconds)}</td>
                      <td>{runner.year}</td>
                    </tr>
                  );
                })}
                {prediction.insertIndex >= 0 && (
                  <tr className={styles.yourPrediction}>
                    <td>#{prediction.place}</td>
                    <td className={styles.youLabel}>Your Target</td>
                    <td>{formatTime(targetSeconds)}</td>
                    <td>{secondsToPace(targetSeconds)}</td>
                    <td>-</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Empty state */}
      {!prediction && (
        <div className={styles.emptyState}>
          <p>Enter a target time to see your predicted placement.</p>
        </div>
      )}
    </div>
  );
}
