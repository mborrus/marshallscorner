// Gender breakdown - shows participation by gender

import type { ResultEntry } from '@/lib/results/schema';
import styles from './GenderBreakdown.module.css';

interface GenderBreakdownProps {
  entries: ResultEntry[];
}

export default function GenderBreakdown({ entries }: GenderBreakdownProps) {
  if (entries.length === 0) return null;

  const men = entries.filter((e) => e.gender === 'M').length;
  const women = entries.filter((e) => e.gender === 'W').length;
  const total = men + women;

  if (total === 0) return null;

  const menPct = (men / total) * 100;
  const womenPct = (women / total) * 100;

  const menFinished = entries.filter((e) => e.gender === 'M' && e.status === 'finished').length;
  const womenFinished = entries.filter((e) => e.gender === 'W' && e.status === 'finished').length;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Participation</h3>

      <div className={styles.barContainer}>
        <div
          className={styles.segment}
          style={{ width: `${menPct}%`, backgroundColor: '#4a7c9b' }}
          title={`Men: ${men} (${menPct.toFixed(0)}%)`}
        >
          {menPct > 15 && <span className={styles.segmentLabel}>M</span>}
        </div>
        <div
          className={styles.segment}
          style={{ width: `${womenPct}%`, backgroundColor: '#9b4a7c' }}
          title={`Women: ${women} (${womenPct.toFixed(0)}%)`}
        >
          {womenPct > 15 && <span className={styles.segmentLabel}>W</span>}
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.statItem}>
          <span className={styles.statColor} style={{ backgroundColor: '#4a7c9b' }} />
          <span className={styles.statLabel}>Men</span>
          <span className={styles.statValue}>{men}</span>
          <span className={styles.statDetail}>({menFinished} finished)</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statColor} style={{ backgroundColor: '#9b4a7c' }} />
          <span className={styles.statLabel}>Women</span>
          <span className={styles.statValue}>{women}</span>
          <span className={styles.statDetail}>({womenFinished} finished)</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statColor} style={{ backgroundColor: '#666' }} />
          <span className={styles.statLabel}>Total</span>
          <span className={styles.statValue}>{total}</span>
          <span className={styles.statDetail}>participants</span>
        </div>
      </div>
    </div>
  );
}
