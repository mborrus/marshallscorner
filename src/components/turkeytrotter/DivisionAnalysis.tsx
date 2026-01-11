// Division/Age Group analysis table

import type { TurkeyTrotDivisionStats } from '@/lib/turkeytrotter/types';
import { formatTime, secondsToPace } from '@/lib/turkeytrotter/format';
import styles from './DivisionAnalysis.module.css';

interface Props {
  divisions: TurkeyTrotDivisionStats[];
}

export default function DivisionAnalysis({ divisions }: Props) {
  if (divisions.length === 0) {
    return <p className={styles.noData}>No division data available</p>;
  }

  // Sort by age group
  const sortedDivisions = [...divisions].sort((a, b) =>
    a.ageGroup.localeCompare(b.ageGroup)
  );

  const maxCount = Math.max(...divisions.map((d) => d.count));

  return (
    <div className={styles.container}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Age Group</th>
            <th>Runners</th>
            <th className={styles.barColumn}>Distribution</th>
            <th>Avg Time</th>
            <th>Fastest</th>
          </tr>
        </thead>
        <tbody>
          {sortedDivisions.map((division) => {
            const barWidth = (division.count / maxCount) * 100;
            return (
              <tr key={division.ageGroup}>
                <td className={styles.ageGroup}>{division.ageGroup}</td>
                <td className={styles.count}>{division.count}</td>
                <td className={styles.barCell}>
                  <div className={styles.barContainer}>
                    <div
                      className={styles.bar}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </td>
                <td className={styles.time}>
                  <span className={styles.timeValue}>
                    {formatTime(division.averageTimeSeconds)}
                  </span>
                  <span className={styles.pace}>
                    {secondsToPace(division.averageTimeSeconds)}
                  </span>
                </td>
                <td className={styles.time}>
                  <span className={styles.timeValue}>
                    {formatTime(division.fastestTimeSeconds)}
                  </span>
                  <span className={styles.pace}>
                    {secondsToPace(division.fastestTimeSeconds)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
