'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { BagelReview } from '@/lib/bagels/types';
import styles from './page.module.css';

// Dynamically import map to avoid SSR issues
const BagelMap = dynamic(() => import('./BagelMap'), { ssr: false });

interface Stats {
  count: number;
  averageScore: number;
}

interface Props {
  reviews: BagelReview[];
  stats: Stats;
}

export default function BagelReviewsClient({ reviews, stats }: Props) {
  const [view, setView] = useState<'list' | 'map'>('list');

  // Sort by score, highest first
  const sortedReviews = [...reviews].sort((a, b) => {
    return (b.overallScore ?? 0) - (a.overallScore ?? 0);
  });

  const reviewsWithCoords = reviews.filter(
    (r) => r.lat !== null && r.lon !== null
  );

  return (
    <>
      <div className={styles.controls}>
        <div className={styles.stats}>
          <span>{stats.count} review{stats.count !== 1 ? 's' : ''}</span>
          {stats.averageScore > 0 && (
            <span>Avg score: {stats.averageScore.toFixed(1)}</span>
          )}
        </div>
        {reviewsWithCoords.length > 0 && (
          <div className={styles.viewToggle}>
            <button
              onClick={() => setView('list')}
              className={view === 'list' ? styles.active : ''}
            >
              List
            </button>
            <button
              onClick={() => setView('map')}
              className={view === 'map' ? styles.active : ''}
            >
              Map
            </button>
          </div>
        )}
      </div>

      {view === 'map' ? (
        <div className={styles.mapContainer}>
          <BagelMap reviews={reviewsWithCoords} />
        </div>
      ) : (
        <div className={styles.reviewList}>
          {sortedReviews.map((review) => (
            <Link
              key={review.slug}
              href={`/food/bagels/${review.slug}`}
              className={styles.reviewCard}
            >
              <div className={styles.cardContent}>
                <h2>{review.restaurant}</h2>
                {review.location && (
                  <p className={styles.location}>{review.location}</p>
                )}
                {review.order && (
                  <p className={styles.order}>{review.order}</p>
                )}
                {review.bagelSource && (
                  <p className={styles.source}>Bagel: {review.bagelSource}</p>
                )}
              </div>
              {review.overallScore !== null && (
                <div className={styles.score}>{review.overallScore}</div>
              )}
            </Link>
          ))}

          {sortedReviews.length === 0 && (
            <p className={styles.empty}>No reviews yet. Check back soon!</p>
          )}
        </div>
      )}
    </>
  );
}
