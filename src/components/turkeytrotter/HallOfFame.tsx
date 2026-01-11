'use client';

import { useState, useMemo } from 'react';
import type { TurkeyTrotRunner, TurkeyTrotCourseRecord } from '@/lib/turkeytrotter/types';
import { formatTime, secondsToPace } from '@/lib/turkeytrotter/format';
import styles from './HallOfFame.module.css';

interface FrequentFlyer {
  name: string;
  count: number;
  bestTime: number;
  years: number[];
}

interface Props {
  courseRecords: TurkeyTrotCourseRecord[];
  frequentFlyers: FrequentFlyer[];
  runners: TurkeyTrotRunner[];
  years: number[];
}

type ViewMode = 'records' | 'yearly' | 'frequentFlyers';

export default function HallOfFame({
  courseRecords,
  frequentFlyers,
  runners,
  years,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('records');
  const [selectedYear, setSelectedYear] = useState<number>(years[0] ?? 2024);

  // Get winners by year
  const yearlyWinners = useMemo(() => {
    return years.map((year) => {
      const yearRunners = runners.filter((r) => r.year === year);
      const overallWinner = yearRunners.sort(
        (a, b) => a.finishTimeSeconds - b.finishTimeSeconds
      )[0];
      const maleWinner = yearRunners
        .filter((r) => r.gender === 'M')
        .sort((a, b) => a.finishTimeSeconds - b.finishTimeSeconds)[0];
      const femaleWinner = yearRunners
        .filter((r) => r.gender === 'F')
        .sort((a, b) => a.finishTimeSeconds - b.finishTimeSeconds)[0];

      return {
        year,
        overall: overallWinner,
        male: maleWinner,
        female: femaleWinner,
        totalRunners: yearRunners.length,
      };
    });
  }, [runners, years]);

  // Get top finishers for selected year
  const topFinishers = useMemo(() => {
    return runners
      .filter((r) => r.year === selectedYear)
      .sort((a, b) => a.finishTimeSeconds - b.finishTimeSeconds)
      .slice(0, 10);
  }, [runners, selectedYear]);

  // Separate course records by category
  const overallRecords = courseRecords.filter(
    (r) => r.category === 'Overall' || r.category === 'Male' || r.category === 'Female'
  );
  const ageGroupRecords = courseRecords.filter((r) =>
    r.category.startsWith('Age Group')
  );

  return (
    <div className={styles.container}>
      {/* View Mode Selector */}
      <div className={styles.viewSelector}>
        <button
          className={`${styles.viewButton} ${viewMode === 'records' ? styles.active : ''}`}
          onClick={() => setViewMode('records')}
        >
          Course Records
        </button>
        <button
          className={`${styles.viewButton} ${viewMode === 'yearly' ? styles.active : ''}`}
          onClick={() => setViewMode('yearly')}
        >
          Yearly Champions
        </button>
        <button
          className={`${styles.viewButton} ${viewMode === 'frequentFlyers' ? styles.active : ''}`}
          onClick={() => setViewMode('frequentFlyers')}
        >
          Frequent Flyers
        </button>
      </div>

      {/* Course Records */}
      {viewMode === 'records' && (
        <div className={styles.recordsView}>
          {/* Overall Records */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>All-Time Records</h3>
            <div className={styles.recordCards}>
              {overallRecords.map((record) => (
                <div key={record.category} className={styles.recordCard}>
                  <div className={styles.recordStripe} />
                  <span className={styles.recordCategory}>{record.category}</span>
                  <span className={styles.recordTime}>
                    {formatTime(record.timeSeconds)}
                  </span>
                  <span className={styles.recordName}>{record.name}</span>
                  <span className={styles.recordYear}>{record.year}</span>
                  <span className={styles.recordPace}>
                    {secondsToPace(record.timeSeconds)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Age Group Records */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Age Group Records</h3>
            <table className={styles.recordsTable}>
              <thead>
                <tr>
                  <th>Age Group</th>
                  <th>Name</th>
                  <th>Time</th>
                  <th>Year</th>
                </tr>
              </thead>
              <tbody>
                {ageGroupRecords.map((record) => (
                  <tr key={record.category}>
                    <td className={styles.ageGroupCell}>
                      {record.category.replace('Age Group ', '')}
                    </td>
                    <td>{record.name}</td>
                    <td className={styles.timeCell}>
                      {formatTime(record.timeSeconds)}
                    </td>
                    <td>{record.year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {/* Yearly Champions */}
      {viewMode === 'yearly' && (
        <div className={styles.yearlyView}>
          {/* Year Selector */}
          <div className={styles.yearSelector}>
            <label htmlFor="year-select" className={styles.label}>
              View Top Finishers for:
            </label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className={styles.select}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Top 10 for Selected Year */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Top 10 - {selectedYear}</h3>
            <table className={styles.topTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Time</th>
                  <th>Pace</th>
                  <th>Gender</th>
                  <th>Age Group</th>
                </tr>
              </thead>
              <tbody>
                {topFinishers.map((runner, index) => (
                  <tr key={runner.id} className={index < 3 ? styles.topThree : ''}>
                    <td className={styles.placeCell}>{index + 1}</td>
                    <td className={styles.nameCell}>{runner.name}</td>
                    <td className={styles.timeCell}>
                      {formatTime(runner.finishTimeSeconds)}
                    </td>
                    <td>{secondsToPace(runner.finishTimeSeconds)}</td>
                    <td>{runner.gender}</td>
                    <td>{runner.ageGroup}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* All-Year Winners Table */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Champions by Year</h3>
            <table className={styles.championsTable}>
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Overall Winner</th>
                  <th>Time</th>
                  <th>Runners</th>
                </tr>
              </thead>
              <tbody>
                {yearlyWinners.map((yearData) => (
                  <tr key={yearData.year}>
                    <td className={styles.yearCell}>{yearData.year}</td>
                    <td className={styles.nameCell}>
                      {yearData.overall?.name ?? '-'}
                    </td>
                    <td className={styles.timeCell}>
                      {yearData.overall
                        ? formatTime(yearData.overall.finishTimeSeconds)
                        : '-'}
                    </td>
                    <td>{yearData.totalRunners}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {/* Frequent Flyers */}
      {viewMode === 'frequentFlyers' && (
        <div className={styles.frequentFlyersView}>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Most Participations</h3>
            <p className={styles.sectionDesc}>
              [TODO: Add description about frequent participants]
            </p>
            <div className={styles.flyerCards}>
              {frequentFlyers.map((flyer, index) => (
                <div key={flyer.name} className={styles.flyerCard}>
                  <div className={styles.flyerRank}>#{index + 1}</div>
                  <div className={styles.flyerInfo}>
                    <span className={styles.flyerName}>{flyer.name}</span>
                    <span className={styles.flyerCount}>
                      {flyer.count} race{flyer.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className={styles.flyerStats}>
                    <div className={styles.flyerStat}>
                      <span className={styles.flyerStatLabel}>Best Time</span>
                      <span className={styles.flyerStatValue}>
                        {formatTime(flyer.bestTime)}
                      </span>
                    </div>
                    <div className={styles.flyerStat}>
                      <span className={styles.flyerStatLabel}>Years</span>
                      <span className={styles.flyerStatValue}>
                        {flyer.years.sort((a, b) => b - a).join(', ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
