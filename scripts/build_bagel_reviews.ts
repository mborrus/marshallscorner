#!/usr/bin/env npx tsx

/**
 * Build script for bagel reviews
 * Reads raw CSV from content/food/bagels/raw/reviews.csv
 * Generates normalized JSON to content/food/bagels/generated/reviews.json
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// Types
interface BagelReview {
  slug: string;
  restaurant: string;
  location: string;
  date: string;
  dateRaw: string;
  order: string;
  cost: string;
  costNumeric: number | null;
  upchargeAmount: string;
  upchargeNumeric: number | null;
  bagelSource: string;
  bagelReview: string;
  bagelRating: number | null;
  fillingsNotes: string;
  fillingsRating: number | null;
  serviceNotes: string;
  overallScore: number | null;
  address: string | null;
  lat: number | null;
  lon: number | null;
  photos: string[];
}

interface BagelReviewsData {
  updatedAt: string;
  reviews: BagelReview[];
}

// Paths
const contentDir = path.join(process.cwd(), 'content', 'food', 'bagels');
const rawDir = path.join(contentDir, 'raw');
const generatedDir = path.join(contentDir, 'generated');
const csvPath = path.join(rawDir, 'reviews.csv');
const jsonPath = path.join(generatedDir, 'reviews.json');
const photosDir = path.join(process.cwd(), 'public', 'images', 'food', 'bagels');

// Find photos for a given slug
function findPhotos(slug: string): string[] {
  const slugDir = path.join(photosDir, slug);
  if (!fs.existsSync(slugDir)) return [];

  const files = fs.readdirSync(slugDir)
    .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.split('.')[0], 10);
      const numB = parseInt(b.split('.')[0], 10);
      return numA - numB;
    });

  return files.map(f => `/images/food/bagels/${slug}/${f}`);
}

// Generate URL-safe slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Parse numeric value defensively
function parseNumeric(value: string | undefined | null): number | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'n/a') return null;

  // Remove $ and parse
  const cleaned = trimmed.replace(/[$,]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Parse date defensively
function parseDate(dateStr: string | undefined | null): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  // Try MM/DD/YY format
  const parts = trimmed.split('/');
  if (parts.length === 3) {
    const [month, day, year] = parts;
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    let y = parseInt(year, 10);
    if (!isNaN(m) && !isNaN(d) && !isNaN(y)) {
      // Handle 2-digit year
      if (y < 100) {
        y = y > 50 ? 1900 + y : 2000 + y;
      }
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  return trimmed;
}

// Parse CSV row
function parseRow(row: Record<string, string>): BagelReview | null {
  // Get restaurant name (handle trailing space in header)
  const restaurantKey = Object.keys(row).find(k => k.trim() === 'Restaurant');
  const restaurant = restaurantKey ? row[restaurantKey]?.trim() : '';

  if (!restaurant) return null;

  const slug = generateSlug(restaurant);
  if (!slug) return null;

  const dateRaw = (row['Date'] || '').trim();
  const date = parseDate(dateRaw);

  const bagelRating = parseNumeric(row['Bagel Rating']);
  const fillingsRating = parseNumeric(row['Things inside the bagel ratings']);

  // Get overall score from Sum column, or compute if missing
  let overallScore = parseNumeric(row['Sum']);
  if (overallScore === null && (bagelRating !== null || fillingsRating !== null)) {
    const values = [bagelRating, fillingsRating].filter((v): v is number => v !== null);
    if (values.length > 0) {
      overallScore = values.reduce((sum, v) => sum + v, 0);
    }
  }

  const lat = parseNumeric(row['Lat']);
  const lon = parseNumeric(row['Lon']);

  return {
    slug,
    restaurant,
    location: (row['Location'] || '').trim(),
    date,
    dateRaw,
    order: (row['My Order'] || '').trim(),
    cost: (row['Total Cost'] || row['Cost'] || '').trim(),
    costNumeric: parseNumeric(row['Total Cost'] || row['Cost']),
    upchargeAmount: (row['Upcharge Amount'] || '').trim(),
    upchargeNumeric: parseNumeric(row['Upcharge Amount']),
    bagelSource: (row['Bagel Source'] || '').trim(),
    bagelReview: (row['Bagel Review'] || '').trim(),
    bagelRating,
    fillingsNotes: (row['Things inside the bagel notes'] || '').trim(),
    fillingsRating,
    serviceNotes: (row['Service Notes'] || '').trim(),
    overallScore,
    address: (row['Address used'] || '').trim() || null,
    lat,
    lon,
    photos: [],
  };
}

// Main build function
function buildBagelReviews() {
  console.log('Building bagel reviews...');

  // Create directories
  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
  }

  // Check if raw directory exists
  if (!fs.existsSync(rawDir)) {
    console.log('No raw directory found. Creating it...');
    fs.mkdirSync(rawDir, { recursive: true });
    console.log('Add reviews.csv to content/food/bagels/raw/ and re-run');
    return;
  }

  // Check if CSV exists
  if (!fs.existsSync(csvPath)) {
    console.log('No reviews.csv found in raw/. Add the file and re-run');
    return;
  }

  console.log('Processing reviews.csv...');

  const csvContent = fs.readFileSync(csvPath, 'utf8');

  // Parse without column names to avoid duplicate column issues
  const rawRecords: string[][] = parse(csvContent, {
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  // Get headers from first row and create records manually
  const headers = rawRecords[0];
  const records: Record<string, string>[] = rawRecords.slice(1).map(row => {
    const record: Record<string, string> = {};
    // Only use the first 16 columns to avoid duplicate headers
    const maxCols = Math.min(headers.length, 16);
    for (let i = 0; i < maxCols; i++) {
      const header = headers[i]?.trim();
      if (header) {
        record[header] = row[i] || '';
      }
    }
    return record;
  });

  const reviews: BagelReview[] = [];
  const seenSlugs = new Set<string>();

  for (const row of records) {
    const review = parseRow(row);
    if (!review) continue;

    // Handle duplicate slugs
    let finalSlug = review.slug;
    let counter = 1;
    while (seenSlugs.has(finalSlug)) {
      finalSlug = `${review.slug}-${counter}`;
      counter++;
    }
    seenSlugs.add(finalSlug);
    review.slug = finalSlug;
    review.photos = findPhotos(finalSlug);

    reviews.push(review);
  }

  console.log(`  Parsed ${reviews.length} reviews`);

  const data: BagelReviewsData = {
    updatedAt: new Date().toISOString(),
    reviews,
  };

  // Write JSON
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`  Wrote ${jsonPath}`);

  // Stats
  const withCoords = reviews.filter(r => r.lat !== null && r.lon !== null);
  console.log(`  ${withCoords.length}/${reviews.length} have coordinates for map`);

  const scores = reviews.map(r => r.overallScore).filter((s): s is number => s !== null);
  if (scores.length > 0) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    console.log(`  Average score: ${avg.toFixed(1)}`);
  }

  console.log('Done!');
}

// Run
buildBagelReviews();
