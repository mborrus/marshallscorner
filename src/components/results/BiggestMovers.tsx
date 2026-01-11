// Biggest movers - shows who gained/lost the most positions during the race
'use client';

import type { ResultEntry } from '@/lib/results/schema';
import styles from './BiggestMovers.module.css';

interface BiggestMoversProps {
  entries: ResultEntry[];
}

export default function BiggestMovers({ entries }: BiggestMoversProps) {
  // Only consider finishers with valid overtake data
  const finishers = entries.filter(
    (e) =>
      e.status === 'finished' &&
      e.overtakes &&
      (e.overtakes.bike !== null || e.overtakes.run !== null)
  );

  if (finishers.length < 3) return null;

  // Calculate total positions gained/lost
  const withMovement = finishers.map((e) => {
    const bikeMove = e.overtakes?.bike ?? 0;
    const runMove = e.overtakes?.run ?? 0;
    const totalMove = bikeMove + runMove;
    return {
      name: e.name_public,
      bikeMove,
      runMove,
      totalMove,
      gender: e.gender,
    };
  });

  // Sort by total movement
  const sortedByGain = [...withMovement].sort((a, b) => b.totalMove - a.totalMove);
  const sortedByLoss = [...withMovement].sort((a, b) => a.totalMove - b.totalMove);

  const topGainers = sortedByGain.filter((m) => m.totalMove > 0).slice(0, 3);
  const topFaders = sortedByLoss.filter((m) => m.totalMove < 0).slice(0, 3);

  if (topGainers.length === 0 && topFaders.length === 0) return null;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Race Movers</h3>

      <div className={styles.columns}>
        {topGainers.length > 0 && (
          <div className={styles.column}>
            <h4 className={styles.subtitle}>
              <span className={styles.iconUp}>↑</span> Top Gainers
            </h4>
            {topGainers.map((mover, idx) => (
              <div key={idx} className={styles.row}>
                <span className={styles.rank}>{idx + 1}</span>
                <span className={styles.name}>
                  {mover.name}
                  <span className={styles.gender}>{mover.gender}</span>
                </span>
                <span className={`${styles.change} ${styles.positive}`}>
                  +{mover.totalMove}
                </span>
              </div>
            ))}
          </div>
        )}

        {topFaders.length > 0 && (
          <div className={styles.column}>
            <h4 className={styles.subtitle}>
              <span className={styles.iconDown}>↓</span> Faded
            </h4>
            {topFaders.map((mover, idx) => (
              <div key={idx} className={styles.row}>
                <span className={styles.rank}>{idx + 1}</span>
                <span className={styles.name}>
                  {mover.name}
                  <span className={styles.gender}>{mover.gender}</span>
                </span>
                <span className={`${styles.change} ${styles.negative}`}>
                  {mover.totalMove}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className={styles.note}>
        Positions gained/lost from swim exit to finish
      </p>
    </div>
  );
}
