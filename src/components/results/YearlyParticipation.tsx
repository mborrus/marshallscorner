// Yearly participation chart - shows participation trends over time
'use client';

import { useState } from 'react';
import styles from './YearlyParticipation.module.css';

interface YearlyParticipationProps {
  allResults: Array<{
    year: number;
    entries: Array<{
      gender: 'M' | 'W';
      status: string;
    }>;
  }>;
}

interface YearData {
  year: number;
  men: number;
  women: number;
  total: number;
  finishers: number;
}

export default function YearlyParticipation({ allResults }: YearlyParticipationProps) {
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);

  if (allResults.length < 2) return null;

  // Sort by year
  const sorted = [...allResults].sort((a, b) => a.year - b.year);

  const data: YearData[] = sorted.map((yearData) => ({
    year: yearData.year,
    men: yearData.entries.filter((e) => e.gender === 'M').length,
    women: yearData.entries.filter((e) => e.gender === 'W').length,
    total: yearData.entries.length,
    finishers: yearData.entries.filter((e) => e.status === 'finished').length,
  }));

  const maxTotal = Math.max(...data.map((d) => d.total));

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Participation Over Time</h3>
      <div className={styles.chart}>
        {data.map((d, idx) => {
          const menHeight = (d.men / maxTotal) * 100;
          const womenHeight = (d.women / maxTotal) * 100;
          const isHovered = hoveredYear === d.year;
          return (
            <div
              key={d.year}
              className={`${styles.bar} ${isHovered ? styles.barHovered : ''}`}
              onMouseEnter={() => setHoveredYear(d.year)}
              onMouseLeave={() => setHoveredYear(null)}
            >
              <div className={styles.barStack} style={{ animationDelay: `${idx * 0.15}s` }}>
                <div
                  className={styles.barSegmentWomen}
                  style={{ height: `${womenHeight}%` }}
                />
                <div
                  className={styles.barSegmentMen}
                  style={{ height: `${menHeight}%` }}
                />
              </div>
              <span className={styles.year}>{d.year}</span>
              <span className={styles.count}>{d.total}</span>
              {isHovered && (
                <div className={styles.tooltip}>
                  <strong>{d.year}</strong>
                  <span>{d.men} men</span>
                  <span>{d.women} women</span>
                  <span>{d.finishers} finishers</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendColor} style={{ backgroundColor: '#4a7c9b' }} />
          Men
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendColor} style={{ backgroundColor: '#9b4a7c' }} />
          Women
        </span>
      </div>
    </div>
  );
}
