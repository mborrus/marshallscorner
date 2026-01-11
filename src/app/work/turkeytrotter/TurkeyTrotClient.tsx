'use client';

import { useState, Suspense } from 'react';
import type {
  TurkeyTrotRunner,
  TurkeyTrotYearStats,
  TurkeyTrotDivisionStats,
  TurkeyTrotCourseRecord,
} from '@/lib/turkeytrotter/types';
import OverviewStats from '@/components/turkeytrotter/OverviewStats';
import PaceDistribution from '@/components/turkeytrotter/PaceDistribution';
import TrendChart from '@/components/turkeytrotter/TrendChart';
import DivisionAnalysis from '@/components/turkeytrotter/DivisionAnalysis';
import RunnerLookup from '@/components/turkeytrotter/RunnerLookup';
import HallOfFame from '@/components/turkeytrotter/HallOfFame';
import PlacePredictor from '@/components/turkeytrotter/PlacePredictor';
import styles from './page.module.css';

type TabId = 'analytics' | 'tools' | 'halloffame' | 'predictor';

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

interface FrequentFlyer {
  name: string;
  count: number;
  bestTime: number;
  years: number[];
}

interface Props {
  runners: TurkeyTrotRunner[];
  overallStats: OverallStats | null;
  yearlyTrends: TurkeyTrotYearStats[];
  divisionStats: TurkeyTrotDivisionStats[];
  courseRecords: TurkeyTrotCourseRecord[];
  frequentFlyers: FrequentFlyer[];
  paceDistribution: { start: number; end: number; count: number }[];
  years: number[];
}

const tabs: { id: TabId; label: string }[] = [
  { id: 'analytics', label: 'Analytics & Trends' },
  { id: 'tools', label: 'Runner Tools' },
  { id: 'halloffame', label: 'Hall of Fame' },
  { id: 'predictor', label: 'Place Predictor' },
];

function TurkeyTrotClientInner({
  runners,
  overallStats,
  yearlyTrends,
  divisionStats,
  courseRecords,
  frequentFlyers,
  paceDistribution,
  years,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('analytics');

  return (
    <div className={styles.dashboard}>
      {/* Tab Navigation */}
      <nav className={styles.tabNav}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
            aria-pressed={activeTab === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === 'analytics' && (
          <div className={styles.analyticsTab}>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Race Overview</h2>
              {overallStats && <OverviewStats stats={overallStats} />}
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Performance Trends</h2>
              <TrendChart trends={yearlyTrends} />
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Pace Distribution</h2>
              <PaceDistribution
                distribution={paceDistribution}
                median={overallStats?.medianTimeSeconds ?? 0}
              />
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Division Analysis</h2>
              <DivisionAnalysis divisions={divisionStats} />
            </section>
          </div>
        )}

        {activeTab === 'tools' && (
          <div className={styles.toolsTab}>
            <RunnerLookup runners={runners} years={years} />
          </div>
        )}

        {activeTab === 'halloffame' && (
          <div className={styles.hallOfFameTab}>
            <HallOfFame
              courseRecords={courseRecords}
              frequentFlyers={frequentFlyers}
              runners={runners}
              years={years}
            />
          </div>
        )}

        {activeTab === 'predictor' && (
          <div className={styles.predictorTab}>
            <PlacePredictor runners={runners} years={years} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function TurkeyTrotClient(props: Props) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TurkeyTrotClientInner {...props} />
    </Suspense>
  );
}
