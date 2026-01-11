#!/usr/bin/env npx tsx

/**
 * Build script for pizza reviews
 * Reads raw CSV from content/food/pizza/raw/reviews.csv
 * Generates normalized JSON to content/food/pizza/generated/reviews.json
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// Types
interface PizzaRatings {
  crustTexture: number | null;
  undercarriage: number | null;
  flavorOfCrust: number | null;
  integrity: number | null;
  mouthCutter: number | null;
  edge: number | null;
  sauce: number | null;
  choices: number | null;
  toppingsPresentation: number | null;
  madeInHouse: number | null;
  upchargeRating: number | null;
  service: number | null;
}

interface PizzaReview {
  slug: string;
  restaurant: string;
  location: string;
  date: string;
  dateRaw: string;
  pizzaOrdered: string;
  cost: string;
  costNumeric: number | null;
  upchargeAmount: string;
  upchargeNumeric: number | null;
  toppings: string;
  overallFlavorVibes: string;
  textureDescriptor: string;
  crustBrand: string;
  serviceNotes: string;
  ratings: PizzaRatings;
  overallScore: number | null;
  address: string | null;
  lat: number | null;
  lon: number | null;
  googleMapsUrl: string | null;
  website: string | null;
}

interface PizzaReviewsData {
  updatedAt: string;
  reviews: PizzaReview[];
}

// Paths
const contentDir = path.join(process.cwd(), 'content', 'food', 'pizza');
const rawDir = path.join(contentDir, 'raw');
const generatedDir = path.join(contentDir, 'generated');
const csvPath = path.join(rawDir, 'reviews.csv');
const jsonPath = path.join(generatedDir, 'reviews.json');

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

  // Try MM/DD/YYYY format
  const parts = trimmed.split('/');
  if (parts.length === 3) {
    const [month, day, year] = parts;
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    const y = parseInt(year, 10);
    if (!isNaN(m) && !isNaN(d) && !isNaN(y)) {
      // Return ISO format
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // Return raw value if parsing fails
  return trimmed;
}

// Check for email addresses (privacy check)
function containsEmail(value: string): boolean {
  return /@/.test(value);
}

// Parse CSV row
function parseRow(row: Record<string, string>): PizzaReview | null {
  // Get restaurant name (handle trailing space in header)
  const restaurantKey = Object.keys(row).find(k => k.trim() === 'Restaurant');
  const restaurant = restaurantKey ? row[restaurantKey]?.trim() : '';

  if (!restaurant) return null;

  // Privacy check
  if (containsEmail(restaurant)) {
    console.warn(`Skipping row with email in restaurant name`);
    return null;
  }

  const slug = generateSlug(restaurant);
  if (!slug) return null;

  const dateRaw = (row['Date'] || '').trim();
  const date = parseDate(dateRaw);

  const ratings: PizzaRatings = {
    crustTexture: parseNumeric(row['Crust Texture (1-5)']),
    undercarriage: parseNumeric(row['Undercarriage (1-3)']),
    flavorOfCrust: parseNumeric(row['Flavor of Crust (1-5)']),
    integrity: parseNumeric(row['Integrity (1-3)']),
    mouthCutter: parseNumeric(row['Mouth cutter (1-3)']),
    edge: parseNumeric(row['Edge (1-3)']),
    sauce: parseNumeric(row['Sauce (1-5)']),
    choices: parseNumeric(row['Choices (1-3)']),
    toppingsPresentation: parseNumeric(row['Toppings/composition/presentation (1-4)']),
    madeInHouse: parseNumeric(row['Made in house (1-3)']),
    upchargeRating: parseNumeric(row['Up charge amount (1-3)']),
    service: parseNumeric(row['Service (1-3)']),
  };

  // Get overall score from Sum column, or compute if missing
  let overallScore = parseNumeric(row['Sum']);
  if (overallScore === null) {
    // Compute sum of all ratings
    const values = Object.values(ratings).filter((v): v is number => v !== null);
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
    pizzaOrdered: (row['Pizza ordered'] || '').trim(),
    cost: (row['Cost'] || '').trim(),
    costNumeric: parseNumeric(row['Cost']),
    upchargeAmount: (row['Upcharge Amount'] || '').trim(),
    upchargeNumeric: parseNumeric(row['Upcharge Amount']),
    toppings: (row['Toppings'] || '').trim(),
    overallFlavorVibes: (row['Overall Flavor Vibes'] || '').trim(),
    textureDescriptor: (row['Texture Descriptor'] || '').trim(),
    crustBrand: (row['Crust Brand?'] || '').trim(),
    serviceNotes: (row['Service Notes'] || '').trim(),
    ratings,
    overallScore,
    address: (row['Address used'] || row['Address'] || '').trim() || null,
    lat,
    lon,
    googleMapsUrl: (row['GoogleMapsUrl'] || '').trim() || null,
    website: (row['Website'] || '').trim() || null,
  };
}

// Main build function
function buildPizzaReviews() {
  console.log('Building pizza reviews...');

  // Create directories
  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
  }

  // Check if raw directory exists
  if (!fs.existsSync(rawDir)) {
    console.log('No raw directory found. Creating it...');
    fs.mkdirSync(rawDir, { recursive: true });
    console.log('Add reviews.csv to content/food/pizza/raw/ and re-run');
    return;
  }

  // Check if CSV exists
  if (!fs.existsSync(csvPath)) {
    console.log('No reviews.csv found in raw/. Add the file and re-run');
    return;
  }

  console.log('Processing reviews.csv...');

  const csvContent = fs.readFileSync(csvPath, 'utf8');

  const records: Record<string, string>[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  const reviews: PizzaReview[] = [];
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

    reviews.push(review);
  }

  console.log(`  Parsed ${reviews.length} reviews`);

  const data: PizzaReviewsData = {
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
buildPizzaReviews();
