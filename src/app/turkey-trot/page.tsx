// Turkey Trot dashboard page.
// The dashboard is a Streamlit (Python) app, which Vercel can't run, so it is
// hosted separately and shown here in a frame. Set NEXT_PUBLIC_TURKEY_TROT_URL
// to the app's address (e.g. https://your-app.streamlit.app).

import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Turkey Trot',
  description: 'Every year of turkey trot results: trends, rivals, and a place predictor.',
};

const DASHBOARD_URL = (process.env.NEXT_PUBLIC_TURKEY_TROT_URL ?? '').replace(/\/+$/, '');

export default function TurkeyTrotPage() {
  return (
    <div className={styles.page}>
      <div>
        <p className={styles.kicker}>Side project</p>
        <h1>Turkey Trot Results Program</h1>
        <p>
          To some, the community Turkey Trot is a family tradition. To others, it&apos;s the one day
          a year to race their seventh-grade English teacher. Look up any runner, find your rivals,
          and see where a finish time would place you.
        </p>
      </div>

      {DASHBOARD_URL ? (
        <>
          <div className={styles.frameWrap}>
            <iframe
              className={styles.frame}
              src={`${DASHBOARD_URL}/?embed=true`}
              title="Turkey Trot Results Program"
              loading="lazy"
            />
          </div>
          <p className={styles.note}>
            Slow to wake up? The dashboard naps when nobody has visited in a while.{' '}
            <a href={DASHBOARD_URL} target="_blank" rel="noopener noreferrer">
              Open it in its own window
            </a>
            .
          </p>
        </>
      ) : (
        <p className={styles.note}>The dashboard is being set up. Check back before Thanksgiving!</p>
      )}
    </div>
  );
}
