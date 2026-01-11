// Pizza reviews page - list/map views with filters and stats

import type { Metadata } from 'next';
import { getAllReviews, getUniqueLocations, calculateStats } from '@/lib/pizza/data';
import PizzaReviewsClient from './PizzaReviewsClient';

export const metadata: Metadata = {
  title: 'Pizza Reviews',
};

export default function PizzaPage() {
  const reviews = getAllReviews();
  const locations = getUniqueLocations();
  const stats = calculateStats(reviews);

  return (
    <div>
      <h1>Pizza Reviews</h1>
      <PizzaReviewsClient
        reviews={reviews}
        locations={locations}
        stats={stats}
      />
    </div>
  );
}
