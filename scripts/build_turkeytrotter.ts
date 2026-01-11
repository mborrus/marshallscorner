#!/usr/bin/env npx tsx

/**
 * Build script for Turkey Trot race results
 * Reads raw CSVs from content/turkeytrotter/raw/
 * Generates normalized JSON to content/turkeytrotter/generated/
 *
 * Expected CSV format (Athlinks-style export):
 * Name,Gender,Age,Bib,City,State,FinishTime,OverallPlace,GenderPlace,AgeGroupPlace,AgeGroup
 *
 * Example:
 * Michael Chen,M,28,101,Austin,TX,17:03,1,1,1,25-29
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// Types matching src/lib/turkeytrotter/types.ts
interface TurkeyTrotRunner {
  id: string;
  name: string;
  gender: 'M' | 'F';
  age: number;
  year: number;
  finishTimeSeconds: number;
  overallPlace: number;
  genderPlace: number;
  ageGroupPlace: number;
  ageGroup: string;
  city: string;
  state: string;
  bib: string;
}

interface TurkeyTrotData {
  updatedAt: string;
  runners: TurkeyTrotRunner[];
}

// Paths
const contentDir = path.join(process.cwd(), 'content', 'turkeytrotter');
const rawDir = path.join(contentDir, 'raw');
const generatedDir = path.join(contentDir, 'generated');
const outputPath = path.join(generatedDir, 'results.json');

/**
 * Parse time string to seconds
 * Handles MM:SS, H:MM:SS, or raw seconds
 */
function parseTimeToSeconds(timeStr: string | undefined | null): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;

  const trimmed = timeStr.trim();
  if (!trimmed || trimmed.toLowerCase() === 'dnf' || trimmed.toLowerCase() === 'dns') {
    return null;
  }

  const parts = trimmed.split(':').map((p) => parseFloat(p.trim()));
  if (parts.some((p) => isNaN(p))) return null;

  if (parts.length === 3) {
    // H:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1 && !isNaN(parts[0])) {
    // Raw seconds
    return parts[0];
  }

  return null;
}

/**
 * Parse integer defensively
 */
function parseIntSafe(value: string | undefined | null): number | null {
  if (!value || typeof value !== 'string') return null;
  const num = parseInt(value.trim(), 10);
  return isNaN(num) ? null : num;
}

/**
 * Generate unique ID for a runner entry
 */
function generateId(year: number, index: number): string {
  return `${year}-${String(index + 1).padStart(3, '0')}`;
}

/**
 * Infer age group from age
 */
function inferAgeGroup(age: number): string {
  if (age < 1) return 'Unknown';
  if (age < 10) return '1-9';
  if (age < 15) return '10-14';
  if (age < 20) return '15-19';
  if (age < 25) return '20-24';
  if (age < 30) return '25-29';
  if (age < 35) return '30-34';
  if (age < 40) return '35-39';
  if (age < 45) return '40-44';
  if (age < 50) return '45-49';
  if (age < 55) return '50-54';
  if (age < 60) return '55-59';
  if (age < 65) return '60-64';
  if (age < 70) return '65-69';
  if (age < 75) return '70-74';
  if (age < 80) return '75-79';
  return '80+';
}

/**
 * Check for email addresses (privacy check)
 */
function containsEmail(value: string): boolean {
  return /@/.test(value);
}

/**
 * Get column value with multiple possible header names
 */
function getColumn(row: Record<string, string>, ...names: string[]): string {
  for (const name of names) {
    // Try exact match first
    if (row[name] !== undefined) return row[name];
    // Try case-insensitive match
    const key = Object.keys(row).find((k) => k.toLowerCase().trim() === name.toLowerCase());
    if (key && row[key] !== undefined) return row[key];
  }
  return '';
}

/**
 * Parse a CSV row into a TurkeyTrotRunner
 */
function parseRow(row: Record<string, string>, year: number, index: number): TurkeyTrotRunner | null {
  const name = getColumn(row, 'Name', 'Runner', 'Athlete').trim();

  if (!name) return null;

  // Privacy check
  if (containsEmail(name)) {
    console.warn(`  Skipping row with email in name field`);
    return null;
  }

  // Parse gender
  const genderRaw = getColumn(row, 'Gender', 'Sex', 'G').trim().toUpperCase();
  const gender: 'M' | 'F' = genderRaw === 'F' || genderRaw === 'W' ? 'F' : 'M';

  // Parse age
  const age = parseIntSafe(getColumn(row, 'Age')) ?? 0;

  // Parse finish time
  const finishTimeSeconds = parseTimeToSeconds(
    getColumn(row, 'FinishTime', 'Finish Time', 'Time', 'Chip Time', 'Gun Time', 'Net Time')
  );

  if (finishTimeSeconds === null || finishTimeSeconds <= 0) {
    return null; // Skip DNF/DNS
  }

  // Parse placements
  const overallPlace = parseIntSafe(getColumn(row, 'OverallPlace', 'Overall Place', 'Place', 'Overall')) ?? 0;
  const genderPlace = parseIntSafe(getColumn(row, 'GenderPlace', 'Gender Place', 'Sex Place')) ?? 0;
  const ageGroupPlace = parseIntSafe(
    getColumn(row, 'AgeGroupPlace', 'Age Group Place', 'Division Place', 'Div Place')
  ) ?? 0;

  // Parse age group - use provided or infer from age
  let ageGroup = getColumn(row, 'AgeGroup', 'Age Group', 'Division', 'Div').trim();
  if (!ageGroup && age > 0) {
    ageGroup = inferAgeGroup(age);
  }
  if (!ageGroup) {
    ageGroup = 'Unknown';
  }

  // Parse location
  const city = getColumn(row, 'City', 'Hometown').trim();
  const state = getColumn(row, 'State', 'St', 'Region').trim();

  // Parse bib
  const bib = getColumn(row, 'Bib', 'Bib #', 'Bib Number', 'Number').trim();

  return {
    id: generateId(year, index),
    name,
    gender,
    age,
    year,
    finishTimeSeconds,
    overallPlace,
    genderPlace,
    ageGroupPlace,
    ageGroup,
    city,
    state,
    bib,
  };
}

/**
 * Parse a single CSV file
 */
function parseResultsCSV(csvContent: string, year: number): TurkeyTrotRunner[] {
  const records: Record<string, string>[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    bom: true,
  });

  const runners: TurkeyTrotRunner[] = [];

  for (let i = 0; i < records.length; i++) {
    const runner = parseRow(records[i], year, i);
    if (runner) {
      runners.push(runner);
    }
  }

  // Sort by overall place or finish time
  runners.sort((a, b) => {
    if (a.overallPlace && b.overallPlace) {
      return a.overallPlace - b.overallPlace;
    }
    return a.finishTimeSeconds - b.finishTimeSeconds;
  });

  // Assign places if missing
  let overallCount = 0;
  const genderCounts: Record<string, number> = { M: 0, F: 0 };
  const ageGroupCounts: Record<string, number> = {};

  for (const runner of runners) {
    overallCount++;
    genderCounts[runner.gender] = (genderCounts[runner.gender] || 0) + 1;
    ageGroupCounts[runner.ageGroup] = (ageGroupCounts[runner.ageGroup] || 0) + 1;

    if (!runner.overallPlace) {
      runner.overallPlace = overallCount;
    }
    if (!runner.genderPlace) {
      runner.genderPlace = genderCounts[runner.gender];
    }
    if (!runner.ageGroupPlace) {
      runner.ageGroupPlace = ageGroupCounts[runner.ageGroup];
    }
  }

  return runners;
}

/**
 * Main build function
 */
function buildTurkeyTrotter() {
  console.log('Building Turkey Trot results...');

  // Create directories
  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
  }

  // Check if raw directory exists
  if (!fs.existsSync(rawDir)) {
    console.log('No raw directory found. Creating it...');
    fs.mkdirSync(rawDir, { recursive: true });
    console.log('');
    console.log('Add CSV files to content/turkeytrotter/raw/ and re-run.');
    console.log('');
    console.log('Expected CSV format:');
    console.log('  Name,Gender,Age,Bib,City,State,FinishTime,OverallPlace,GenderPlace,AgeGroupPlace,AgeGroup');
    console.log('');
    console.log('Example:');
    console.log('  Michael Chen,M,28,101,Austin,TX,17:03,1,1,1,25-29');
    console.log('');
    console.log('File naming: Use year as filename (e.g., 2024.csv, 2023.csv)');
    return;
  }

  // Get raw CSV files
  const csvFiles = fs.readdirSync(rawDir).filter((f) => f.endsWith('.csv'));

  if (csvFiles.length === 0) {
    console.log('No CSV files found in raw/.');
    console.log('Add files like 2024.csv, 2023.csv');
    return;
  }

  console.log(`Found ${csvFiles.length} CSV file(s): ${csvFiles.join(', ')}`);

  const allRunners: TurkeyTrotRunner[] = [];

  for (const csvFile of csvFiles) {
    const yearStr = csvFile.replace('.csv', '');
    const year = parseInt(yearStr, 10);

    if (isNaN(year)) {
      console.log(`Skipping ${csvFile} - invalid year format`);
      continue;
    }

    console.log(`Processing ${yearStr}...`);

    const csvPath = path.join(rawDir, csvFile);
    const csvContent = fs.readFileSync(csvPath, 'utf8');

    const runners = parseResultsCSV(csvContent, year);
    console.log(`  Parsed ${runners.length} runners`);

    allRunners.push(...runners);
  }

  // Sort all runners by year (desc) then place
  allRunners.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return a.overallPlace - b.overallPlace;
  });

  // Generate output
  const data: TurkeyTrotData = {
    updatedAt: new Date().toISOString(),
    runners: allRunners,
  };

  // Write JSON
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\nWrote ${outputPath}`);

  // Stats
  const years = [...new Set(allRunners.map((r) => r.year))].sort((a, b) => b - a);
  console.log(`\nSummary:`);
  console.log(`  Total runners: ${allRunners.length}`);
  console.log(`  Years: ${years.join(', ')}`);

  for (const year of years) {
    const yearRunners = allRunners.filter((r) => r.year === year);
    const times = yearRunners.map((r) => r.finishTimeSeconds).sort((a, b) => a - b);
    const fastest = times[0];
    const median = times[Math.floor(times.length / 2)];

    console.log(`  ${year}: ${yearRunners.length} runners, fastest ${formatTime(fastest)}, median ${formatTime(median)}`);
  }

  console.log('\nDone!');
}

/**
 * Format seconds to MM:SS
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Run
buildTurkeyTrotter();
