// Bagel reviews page

import Image from 'next/image';
import type { Metadata } from 'next';
import { getAllReviews, calculateStats } from '@/lib/bagels/data';
import BagelReviewsClient from './BagelReviewsClient';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Bagel Reviews',
};

export default function BagelsPage() {
  const reviews = getAllReviews();
  const stats = calculateStats(reviews);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Image
          src="/images/food/bagels/header.jpg"
          alt="Bagels"
          width={800}
          height={300}
          className={styles.headerImage}
          priority
        />
        <h1>Bagel Reviews</h1>
        <p className={styles.subtitle}>
          Gluten-free bagel reviews in NYC and beyond
        </p>
      </header>

      <BagelReviewsClient reviews={reviews} stats={stats} />
    </div>
  );
}
