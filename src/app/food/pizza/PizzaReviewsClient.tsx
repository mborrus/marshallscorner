'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { PizzaReview } from '@/lib/pizza/types';
import styles from './page.module.css';

// Dynamically import map to avoid SSR issues
const PizzaMap = dynamic(() => import('./PizzaMap'), { ssr: false });

interface Stats {
  count: number;
  averageScore: number;
  medianScore: number;
  locationCounts: Record<string, number>;
  locationAvgs: Record<string, number>;
}

interface Props {
  reviews: PizzaReview[];
  locations: string[];
  stats: Stats;
}

type SortOption = 'score-desc' | 'score-asc' | 'date-desc' | 'date-asc';

function PizzaReviewsInner({ reviews, locations, stats }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const view = searchParams.get('view') || 'list';
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sort, setSort] = useState<SortOption>('score-desc');

  const setView = useCallback(
    (newView: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('view', newView);
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const filteredReviews = useMemo(() => {
    let result = [...reviews];

    // Text search
    if (search.trim()) {
      const lowerSearch = search.toLowerCase();
      result = result.filter((r) =>
        r.restaurant.toLowerCase().includes(lowerSearch)
      );
    }

    // Location filter
    if (locationFilter) {
      result = result.filter((r) => r.location === locationFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sort) {
        case 'score-desc':
          return (b.overallScore ?? 0) - (a.overallScore ?? 0);
        case 'score-asc':
          return (a.overallScore ?? 0) - (b.overallScore ?? 0);
        case 'date-desc':
          return b.date.localeCompare(a.date);
        case 'date-asc':
          return a.date.localeCompare(b.date);
        default:
          return 0;
      }
    });

    return result;
  }, [reviews, search, locationFilter, sort]);

  const reviewsWithCoords = filteredReviews.filter(
    (r) => r.lat !== null && r.lon !== null
  );

  const [showScoring, setShowScoring] = useState(false);

  const scoringCategories = [
    { name: 'Crust Texture', max: 5 },
    { name: 'Undercarriage', max: 3 },
    { name: 'Flavor of Crust', max: 5 },
    { name: 'Integrity', max: 3 },
    { name: 'Mouth Cutter', max: 3 },
    { name: 'Edge', max: 3 },
    { name: 'Sauce', max: 5 },
    { name: 'Choices', max: 3 },
    { name: 'Toppings/Presentation', max: 4 },
    { name: 'Made in House', max: 3 },
    { name: 'Upcharge Amount', max: 3 },
    { name: 'Service', max: 3 },
  ];

  const maxPossibleScore = scoringCategories.reduce((sum, cat) => sum + cat.max, 0);

  return (
    <div className={styles.container}>
      {/* Scoring System Explainer */}
      <section className={styles.scoringSection}>
        <button
          className={styles.scoringToggle}
          onClick={() => setShowScoring(!showScoring)}
          aria-expanded={showScoring}
        >
          <span>Scoring System</span>
          <span className={styles.toggleIcon}>{showScoring ? '−' : '+'}</span>
        </button>
        {showScoring && (
          <div className={styles.scoringContent}>
            <p className={styles.scoringIntro}>
              Overall score is the sum of {scoringCategories.length} categories (max {maxPossibleScore}):
            </p>
            <div className={styles.scoringGrid}>
              {scoringCategories.map((cat) => (
                <div key={cat.name} className={styles.scoringItem}>
                  <span className={styles.scoringName}>{cat.name}</span>
                  <span className={styles.scoringMax}>1-{cat.max}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Stats Section */}
      <section className={styles.statsSection}>
        <h2>Stats</h2>
        <dl className={styles.statsGrid}>
          <div className={styles.statItem}>
            <dt>Places Reviewed</dt>
            <dd>{stats.count}</dd>
          </div>
          <div className={styles.statItem}>
            <dt>Average Score</dt>
            <dd>{stats.averageScore.toFixed(1)}</dd>
          </div>
          <div className={styles.statItem}>
            <dt>Median Score</dt>
            <dd>{stats.medianScore.toFixed(1)}</dd>
          </div>
          <div className={styles.statItem}>
            <dt>Max Possible</dt>
            <dd>{maxPossibleScore}</dd>
          </div>
        </dl>

        {Object.keys(stats.locationCounts).length > 0 && (
          <div className={styles.locationStats}>
            <h3>By Location</h3>
            <table className={styles.locationTable}>
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Count</th>
                  {Object.keys(stats.locationAvgs).length > 0 && <th>Avg Score</th>}
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.locationCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([loc, count]) => (
                    <tr key={loc}>
                      <td>{loc}</td>
                      <td>{count}</td>
                      {Object.keys(stats.locationAvgs).length > 0 && (
                        <td>
                          {stats.locationAvgs[loc]?.toFixed(1) ?? '-'}
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.toggleBtn} ${view === 'list' ? styles.active : ''}`}
            onClick={() => setView('list')}
          >
            List
          </button>
          <button
            className={`${styles.toggleBtn} ${view === 'map' ? styles.active : ''}`}
            onClick={() => setView('map')}
          >
            Map
          </button>
        </div>

        <div className={styles.filters}>
          <input
            type="text"
            placeholder="Search restaurant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />

          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className={styles.select}
          >
            <option value="">All Locations</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className={styles.select}
          >
            <option value="score-desc">Score (High to Low)</option>
            <option value="score-asc">Score (Low to High)</option>
            <option value="date-desc">Date (Newest)</option>
            <option value="date-asc">Date (Oldest)</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {view === 'list' ? (
        <div className={styles.reviewsList}>
          {filteredReviews.length === 0 ? (
            <p className={styles.noResults}>No reviews found.</p>
          ) : (
            filteredReviews.map((review) => (
              <Link
                key={review.slug}
                href={`/food/pizza/${review.slug}`}
                className={styles.reviewCard}
              >
                <div className={styles.cardHeader}>
                  <h3 className={styles.restaurantName}>{review.restaurant}</h3>
                  {review.overallScore !== null && (
                    <span className={styles.score}>{review.overallScore}</span>
                  )}
                </div>
                <div className={styles.cardMeta}>
                  <span>{review.location}</span>
                  <span>{review.date}</span>
                </div>
                {review.pizzaOrdered && (
                  <p className={styles.pizzaOrdered}>{review.pizzaOrdered}</p>
                )}
              </Link>
            ))
          )}
        </div>
      ) : (
        <div className={styles.mapContainer}>
          {reviewsWithCoords.length === 0 ? (
            <p className={styles.noResults}>
              [TODO: add Latitude/Longitude to reviews.csv to enable the map]
            </p>
          ) : (
            <PizzaMap reviews={reviewsWithCoords} />
          )}
        </div>
      )}
    </div>
  );
}

export default function PizzaReviewsClient(props: Props) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PizzaReviewsInner {...props} />
    </Suspense>
  );
}
