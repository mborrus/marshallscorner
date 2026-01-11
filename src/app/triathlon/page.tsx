// Triathlon landing page - overview, history, and links

import Image from 'next/image';
import Link from 'next/link';
import { getTriathlonYears } from '@/lib/content';
import { getResultsYears } from '@/lib/results/fs';
import YearSelector from '@/components/YearSelector';
import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Triathlon',
  description: 'Meredith TryAthlon overview, history, and results.',
};

export default function TriathlonPage() {
  const years = getTriathlonYears();
  const resultsYears = getResultsYears();
  const hasResults = resultsYears.length > 0;
  const resultsSet = new Set(resultsYears);

  return (
    <div className={styles.page}>
      <div className={`${styles.hero} win98-box`}>
        <Image
          src="/images/triathlon/hero.jpg"
          alt="Triathletes running into the lake at the Meredith TryAthlon"
          width={2400}
          height={1200}
          priority
          sizes="(max-width: 760px) 100vw, 760px"
          className={styles.heroImage}
        />
      </div>

      <div className={styles.titleBlock}>
        <p className={styles.kicker}>Meredith, New Hampshire</p>
        <h1>Meredith TryAthlon</h1>
        <p className={styles.subtitle}>
          A backyard, community triathlon held the second weekend of September.
        </p>
        <div className={`${styles.timelineNote} win98-box-inset`}>
          <strong>Timeline:</strong> Friday arrival, Saturday race, Sunday rain date (second
          weekend of September).
        </div>
      </div>

      <section className={styles.section}>
        <h2>History</h2>
        <p>
          The Meredith TryAthlon began in 2024 as a friendly, low-key race for friends
          and family on the shores of Lake Winnipesaukee. It has become an annual
          tradition that mixes competition, lake time, and a weekend together.
        </p>
      </section>

      <section className={styles.section}>
        <h2>Route basics</h2>
        <div className={styles.infoGrid}>
          <div className={`${styles.card} win98-box`}>
            <h3>Course</h3>
            <ul className={styles.routeList}>
              <li>
                <strong>Swim:</strong> 1 mile out-and-back in the lake.
              </li>
              <li>
                <strong>Bike:</strong> 25-mile loop with steady climbing.
              </li>
              <li>
                <strong>Run:</strong> 6-mile road and gravel route with a big hill (twice).
              </li>
            </ul>
          </div>
          <div className={`${styles.card} win98-box`}>
            <h3>Weekend schedule</h3>
            <ul className={styles.routeList}>
              <li>
                <strong>Friday:</strong> arrive, settle in, route walkthrough.
              </li>
              <li>
                <strong>Saturday:</strong> race morning, awards and lunch after.
              </li>
              <li>
                <strong>Sunday:</strong> rain date and casual send-off.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Years & results</h2>
        {years.length > 0 ? (
          <>
            <YearSelector years={years} />
            <ul className={styles.yearList}>
              {years.map((year) => (
                <li key={year} className={styles.yearCard}>
                  <span className={styles.yearLabel}>{year}</span>
                  <div className={styles.yearLinks}>
                    <Link href={`/triathlon/${year}`}>Event page</Link>
                    {resultsSet.has(year) ? (
                      <Link href={`/triathlon/results/${year}`}>Results</Link>
                    ) : (
                      <span className={styles.resultsPending}>Results soon</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="placeholder">[TODO: Add triathlon years in content/triathlon/]</p>
        )}

        {hasResults && (
          <p className={styles.resultsCta}>
            <Link href="/triathlon/results" className="button">
              View all results →
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}
