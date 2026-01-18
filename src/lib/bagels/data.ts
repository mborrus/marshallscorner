// Data reading utilities for bagel reviews

import fs from 'fs';
import path from 'path';
import type { BagelReviewsData, BagelReview } from './types';

const generatedPath = path.join(
  process.cwd(),
  'content',
  'food',
  'bagels',
  'generated',
  'reviews.json'
);

/**
 * Read all bagel reviews from generated JSON
 */
export function readBagelReviews(): BagelReviewsData | null {
  if (!fs.existsSync(generatedPath)) return null;

  const content = fs.readFileSync(generatedPath, 'utf8');
  return JSON.parse(content) as BagelReviewsData;
}

/**
 * Get all reviews
 */
export function getAllReviews(): BagelReview[] {
  const data = readBagelReviews();
  return data?.reviews ?? [];
}

/**
 * Get a single review by slug
 */
export function getReviewBySlug(slug: string): BagelReview | null {
  const reviews = getAllReviews();
  return reviews.find((r) => r.slug === slug) ?? null;
}

/**
 * Get all unique locations
 */
export function getUniqueLocations(): string[] {
  const reviews = getAllReviews();
  const locations = new Set(reviews.map((r) => r.location).filter(Boolean));
  return Array.from(locations).sort();
}

/**
 * Calculate stats from reviews
 */
export function calculateStats(reviews: BagelReview[]) {
  const scores = reviews
    .map((r) => r.overallScore)
    .filter((s): s is number => s !== null);

  const average =
    scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

  return {
    count: reviews.length,
    averageScore: average,
  };
}
