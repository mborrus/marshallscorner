// Turkey Trot Dashboard - Main page with 4 tabs

import type { Metadata } from 'next';
import {
  getAllRunners,
  getYearlyTrends,
  calculateOverallStats,
  getDivisionStats,
  getCourseRecords,
  getFrequentFlyers,
  getPaceDistribution,
  getUniqueYears,
} from '@/lib/turkeytrotter/data';
import Placeholder from '@/components/Placeholder';
import TurkeyTrotClient from './TurkeyTrotClient';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Turkey Trot Dashboard',
};

export default function TurkeyTrotPage() {
  const runners = getAllRunners();

  if (runners.length === 0) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Turkey Trot Dashboard</h1>
        <Placeholder message="No race data found. Add data to /content/turkeytrotter/generated/demo.json" />
      </div>
    );
  }

  const overallStats = calculateOverallStats();
  const yearlyTrends = getYearlyTrends();
  const divisionStats = getDivisionStats();
  const courseRecords = getCourseRecords();
  const frequentFlyers = getFrequentFlyers();
  const paceDistribution = getPaceDistribution();
  const years = getUniqueYears();

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Turkey Trot Dashboard</h1>
      <p className={styles.subtitle}>[TODO: Add dashboard description]</p>

      <TurkeyTrotClient
        runners={runners}
        overallStats={overallStats}
        yearlyTrends={yearlyTrends}
        divisionStats={divisionStats}
        courseRecords={courseRecords}
        frequentFlyers={frequentFlyers}
        paceDistribution={paceDistribution}
        years={years}
      />
    </div>
  );
}
