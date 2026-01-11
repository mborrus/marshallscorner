// Magazine-style stat cards for Turkey Trot overview

import type { TurkeyTrotRunner } from '@/lib/turkeytrotter/types';
import { formatTime, secondsToPace } from '@/lib/turkeytrotter/format';
import styles from './OverviewStats.module.css';

interface OverallStats {
  totalRaces: number;
  totalFinishers: number;
  uniqueRunners: number;
  fastestTimeSeconds: number;
  slowestTimeSeconds: number;
  medianTimeSeconds: number;
  averageTimeSeconds: number;
  courseRecordOverall: TurkeyTrotRunner;
  courseRecordMale: TurkeyTrotRunner;
  courseRecordFemale: TurkeyTrotRunner;
}

interface Props {
  stats: OverallStats;
}

export default function OverviewStats({ stats }: Props) {
  return (
    <div className={styles.container}>
      {/* Primary Stats Row */}
      <div className={styles.primaryStats}>
        <div className={`${styles.card} ${styles.cardNavy}`}>
          <div className={styles.cardStripe} />
          <div className={styles.cardContent}>
            <span className={styles.cardValue}>{stats.totalFinishers}</span>
            <span className={styles.cardLabel}>Total Finishers</span>
          </div>
        </div>

        <div className={`${styles.card} ${styles.cardRust}`}>
          <div className={styles.cardStripe} />
          <div className={styles.cardContent}>
            <span className={styles.cardValue}>{stats.uniqueRunners}</span>
            <span className={styles.cardLabel}>Unique Runners</span>
          </div>
        </div>

        <div className={`${styles.card} ${styles.cardGreen}`}>
          <div className={styles.cardStripe} />
          <div className={styles.cardContent}>
            <span className={styles.cardValue}>{formatTime(stats.medianTimeSeconds)}</span>
            <span className={styles.cardLabel}>Median Pace</span>
            <span className={styles.cardSubtext}>{secondsToPace(stats.medianTimeSeconds)}</span>
          </div>
        </div>

        <div className={`${styles.card} ${styles.cardRed}`}>
          <div className={styles.cardStripe} />
          <div className={styles.cardContent}>
            <span className={styles.cardValue}>{stats.totalRaces}</span>
            <span className={styles.cardLabel}>Years of Racing</span>
          </div>
        </div>
      </div>

      {/* Course Records */}
      <div className={styles.recordsSection}>
        <h3 className={styles.recordsTitle}>Course Records</h3>
        <div className={styles.recordsGrid}>
          {stats.courseRecordOverall && (
            <div className={styles.recordCard}>
              <div className={styles.recordHeader}>
                <span className={styles.recordCategory}>Overall</span>
                <span className={styles.recordYear}>{stats.courseRecordOverall.year}</span>
              </div>
              <div className={styles.recordTime}>
                {formatTime(stats.courseRecordOverall.finishTimeSeconds)}
              </div>
              <div className={styles.recordName}>{stats.courseRecordOverall.name}</div>
              <div className={styles.recordPace}>
                {secondsToPace(stats.courseRecordOverall.finishTimeSeconds)}
              </div>
            </div>
          )}

          {stats.courseRecordMale && (
            <div className={styles.recordCard}>
              <div className={styles.recordHeader}>
                <span className={styles.recordCategory}>Male</span>
                <span className={styles.recordYear}>{stats.courseRecordMale.year}</span>
              </div>
              <div className={styles.recordTime}>
                {formatTime(stats.courseRecordMale.finishTimeSeconds)}
              </div>
              <div className={styles.recordName}>{stats.courseRecordMale.name}</div>
              <div className={styles.recordPace}>
                {secondsToPace(stats.courseRecordMale.finishTimeSeconds)}
              </div>
            </div>
          )}

          {stats.courseRecordFemale && (
            <div className={styles.recordCard}>
              <div className={styles.recordHeader}>
                <span className={styles.recordCategory}>Female</span>
                <span className={styles.recordYear}>{stats.courseRecordFemale.year}</span>
              </div>
              <div className={styles.recordTime}>
                {formatTime(stats.courseRecordFemale.finishTimeSeconds)}
              </div>
              <div className={styles.recordName}>{stats.courseRecordFemale.name}</div>
              <div className={styles.recordPace}>
                {secondsToPace(stats.courseRecordFemale.finishTimeSeconds)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
