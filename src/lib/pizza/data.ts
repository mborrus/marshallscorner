// Data reading utilities for pizza reviews

import fs from 'fs';
import path from 'path';
import type { PizzaReviewsData, PizzaReview } from './types';

const generatedPath = path.join(
  process.cwd(),
  'content',
  'food',
  'pizza',
  'generated',
  'reviews.json'
);

/**
 * Read all pizza reviews from generated JSON
 */
export function readPizzaReviews(): PizzaReviewsData | null {
  if (!fs.existsSync(generatedPath)) return null;

  const content = fs.readFileSync(generatedPath, 'utf8');
  return JSON.parse(content) as PizzaReviewsData;
}

/**
 * Get all reviews
 */
export function getAllReviews(): PizzaReview[] {
  const data = readPizzaReviews();
  return data?.reviews ?? [];
}

/**
 * Get a single review by slug
 */
export function getReviewBySlug(slug: string): PizzaReview | null {
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
export function calculateStats(reviews: PizzaReview[]) {
  const scores = reviews
    .map((r) => r.overallScore)
    .filter((s): s is number => s !== null);

  const sortedScores = [...scores].sort((a, b) => a - b);
  const median =
    sortedScores.length > 0
      ? sortedScores.length % 2 === 0
        ? (sortedScores[sortedScores.length / 2 - 1] +
            sortedScores[sortedScores.length / 2]) /
          2
        : sortedScores[Math.floor(sortedScores.length / 2)]
      : 0;

  const average =
    scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

  // Count by location
  const locationCounts: Record<string, number> = {};
  const locationScores: Record<string, number[]> = {};
  for (const review of reviews) {
    if (review.location) {
      locationCounts[review.location] = (locationCounts[review.location] || 0) + 1;
      if (review.overallScore !== null) {
        if (!locationScores[review.location]) {
          locationScores[review.location] = [];
        }
        locationScores[review.location].push(review.overallScore);
      }
    }
  }

  const locationAvgs: Record<string, number> = {};
  for (const [loc, locScores] of Object.entries(locationScores)) {
    if (locScores.length >= 2) {
      locationAvgs[loc] = locScores.reduce((a, b) => a + b, 0) / locScores.length;
    }
  }

  return {
    count: reviews.length,
    averageScore: average,
    medianScore: median,
    locationCounts,
    locationAvgs,
  };
}
