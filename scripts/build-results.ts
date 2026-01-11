#!/usr/bin/env npx tsx

/**
 * Build script for triathlon results
 * Reads raw CSVs from content/triathlon/results/raw/
 * Generates normalized JSON to content/triathlon/results/generated/
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// Types
interface SplitsSeconds {
  swim: number | null;
  t1: number | null;
  bike: number | null;
  t2: number | null;
  run: number | null;
}

type Gender = 'M' | 'W';

interface ResultEntry {
  id: string;
  name_public: string;
  gender: Gender;
  status: 'finished' | 'partial';
  splits_seconds: SplitsSeconds;
  total_seconds: number | null;
  ranks?: { total?: number; swim?: number; bike?: number; run?: number };
  overtakes?: { bike?: number; run?: number };
}

interface ResultsYear {
  year: number;
  updated_at: string;
  entries: ResultEntry[];
  summary: {
    finishers_count: number;
    total_seconds: { min: number; median: number; max: number };
  };
}

// Paths
const contentDir = path.join(process.cwd(), 'content', 'triathlon', 'results');
const rawDir = path.join(contentDir, 'raw');
const generatedDir = path.join(contentDir, 'generated');

// Time parsing
function parseTimeToSeconds(timeStr: string | undefined | null): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;

  const trimmed = timeStr.trim();
  const invalidValues = ['', 'nan', 'xx', '#value!', 'swim', 'bike', 'run', 't1', 't2', 'total', 'name'];

  if (invalidValues.includes(trimmed.toLowerCase())) return null;

  const parts = trimmed.split(':').map((p) => parseFloat(p.trim()));
  if (parts.some((p) => isNaN(p))) return null;

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1 && !isNaN(parts[0])) {
    return parts[0];
  }

  return null;
}

// Name formatting
function toPublicName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] || '';
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function generateId(name: string, year: number): string {
  return `${year}-${name.toLowerCase().replace(/\s+/g, '-')}`;
}

// Median calculation
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// Row validation
function shouldDropRow(row: Record<string, string>): boolean {
  const name = (row.Name || row.name || '').trim();

  if (!name) return true;
  if (name.includes('@')) return true;

  const lowerName = name.toLowerCase();
  if (['median', 'max', 'min'].includes(lowerName)) return true;

  // Check for header rows
  const timeColumns = ['Swim', 'Bike', 'Run', 'T1', 'T2', 'Total'];
  for (const col of timeColumns) {
    const val = (row[col] || '').trim().toLowerCase();
    if (val && timeColumns.map((c) => c.toLowerCase()).includes(val)) {
      return true;
    }
  }

  return false;
}

// Parse CSV
function parseResultsCSV(csvContent: string, year: number): ResultEntry[] {
  const records: Record<string, string>[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  const entries: ResultEntry[] = [];

  for (const row of records) {
    if (shouldDropRow(row)) continue;

    const nameRaw = (row.Name || row.name || '').trim();

    // Safety: fail on emails
    if (nameRaw.includes('@')) {
      throw new Error(`Email found in name: ${nameRaw}`);
    }

    const splits: SplitsSeconds = {
      swim: parseTimeToSeconds(row.Swim || row.swim),
      t1: parseTimeToSeconds(row.T1 || row.t1),
      bike: parseTimeToSeconds(row.Bike || row.bike),
      t2: parseTimeToSeconds(row.T2 || row.t2),
      run: parseTimeToSeconds(row.Run || row.run),
    };

    let totalSeconds = parseTimeToSeconds(row.Total || row.total);

    // Compute total if all splits present
    const allSplits = Object.values(splits).every((v) => v !== null);
    if (totalSeconds === null && allSplits) {
      totalSeconds = Object.values(splits).reduce((sum, v) => sum! + v!, 0);
    }

    const hasSomeSplit = Object.values(splits).some((v) => v !== null);
    if (!hasSomeSplit && totalSeconds === null) continue;

    const status: 'finished' | 'partial' =
      totalSeconds !== null && totalSeconds > 0 ? 'finished' : 'partial';

    // Parse gender (default to M if not specified)
    const genderRaw = (row.Gender || row.gender || 'M').trim().toUpperCase();
    const gender: Gender = genderRaw === 'W' || genderRaw === 'F' ? 'W' : 'M';

    const entry: ResultEntry = {
      id: generateId(nameRaw, year),
      name_public: toPublicName(nameRaw),
      gender,
      status,
      splits_seconds: splits,
      total_seconds: totalSeconds,
    };

    // Ranks
    const totalRank = parseInt(row['Total Rank'] || row['Rank'] || '', 10);
    const swimRank = parseInt(row['Swim Rank'] || '', 10);
    const bikeRank = parseInt(row['Bike Rank'] || '', 10);
    const runRank = parseInt(row['Run Rank'] || '', 10);

    if (!isNaN(totalRank) || !isNaN(swimRank) || !isNaN(bikeRank) || !isNaN(runRank)) {
      entry.ranks = {};
      if (!isNaN(totalRank)) entry.ranks.total = totalRank;
      if (!isNaN(swimRank)) entry.ranks.swim = swimRank;
      if (!isNaN(bikeRank)) entry.ranks.bike = bikeRank;
      if (!isNaN(runRank)) entry.ranks.run = runRank;
    }

    // Overtakes
    const bikeOvertakes = parseInt(row['Bike Overtakes'] || '', 10);
    const runOvertakes = parseInt(row['Run Overtakes'] || '', 10);

    if (!isNaN(bikeOvertakes) || !isNaN(runOvertakes)) {
      entry.overtakes = {};
      if (!isNaN(bikeOvertakes)) entry.overtakes.bike = bikeOvertakes;
      if (!isNaN(runOvertakes)) entry.overtakes.run = runOvertakes;
    }

    entries.push(entry);
  }

  return entries;
}

// Main build function
function buildResults() {
  console.log('Building triathlon results...');

  // Create directories
  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
  }

  // Check if raw directory exists
  if (!fs.existsSync(rawDir)) {
    console.log('No raw directory found. Creating it...');
    fs.mkdirSync(rawDir, { recursive: true });
    console.log('Add CSV files to content/triathlon/results/raw/ and re-run');
    return;
  }

  // Get raw CSV files
  const csvFiles = fs
    .readdirSync(rawDir)
    .filter((f) => f.endsWith('.csv'));

  if (csvFiles.length === 0) {
    console.log('No CSV files found in raw/. Add files like 2024.csv, 2025.csv');
    return;
  }

  console.log(`Found ${csvFiles.length} CSV file(s): ${csvFiles.join(', ')}`);

  for (const csvFile of csvFiles) {
    const year = csvFile.replace('.csv', '');
    const yearNum = parseInt(year, 10);

    if (isNaN(yearNum)) {
      console.log(`Skipping ${csvFile} - invalid year format`);
      continue;
    }

    console.log(`Processing ${year}...`);

    const csvPath = path.join(rawDir, csvFile);
    const csvContent = fs.readFileSync(csvPath, 'utf8');

    const entries = parseResultsCSV(csvContent, yearNum);
    console.log(`  Parsed ${entries.length} entries`);

    // Compute summary
    const finishers = entries.filter(
      (e) => e.status === 'finished' && e.total_seconds !== null
    );
    const totalTimes = finishers.map((e) => e.total_seconds!);

    const summary = {
      finishers_count: finishers.length,
      total_seconds:
        totalTimes.length > 0
          ? {
              min: Math.min(...totalTimes),
              median: median(totalTimes),
              max: Math.max(...totalTimes),
            }
          : { min: 0, median: 0, max: 0 },
    };

    const resultsYear: ResultsYear = {
      year: yearNum,
      updated_at: new Date().toISOString(),
      entries,
      summary,
    };

    // Write JSON
    const jsonPath = path.join(generatedDir, `${year}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(resultsYear, null, 2), 'utf8');
    console.log(`  Wrote ${jsonPath}`);
    console.log(`  ${summary.finishers_count} finishers, ${entries.length - summary.finishers_count} partial`);
  }

  console.log('Done!');
}

// Run
buildResults();
