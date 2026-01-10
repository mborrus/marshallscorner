// CSV parsing utilities for triathlon results

import { parse } from 'csv-parse/sync';
import type { RawResultRow, ResultEntry, SplitsSeconds } from './schema';
import { parseTimeToSeconds, toPublicName, generateId } from './format';

/**
 * Check if a row should be dropped
 */
function shouldDropRow(row: RawResultRow): boolean {
  const name = row.Name?.trim() || '';

  // No name
  if (!name) return true;

  // Email-like (contains @)
  if (name.includes('@')) return true;

  // Summary rows
  const lowerName = name.toLowerCase();
  if (lowerName === 'median' || lowerName === 'max' || lowerName === 'min') {
    return true;
  }

  // Header row repeated (check if any time column has header text)
  const timeColumns = ['Swim', 'Bike', 'Run', 'T1', 'T2', 'Total'];
  for (const col of timeColumns) {
    const val = row[col]?.trim().toLowerCase();
    if (val && timeColumns.map((c) => c.toLowerCase()).includes(val)) {
      return true;
    }
  }

  return false;
}

/**
 * Parse a single row into a ResultEntry
 */
function parseRow(row: RawResultRow, year: number): ResultEntry | null {
  if (shouldDropRow(row)) return null;

  const nameRaw = row.Name?.trim() || '';

  // Safety check: fail on email in name
  if (nameRaw.includes('@')) {
    throw new Error(`Email found in name field: ${nameRaw}`);
  }

  const splits: SplitsSeconds = {
    swim: parseTimeToSeconds(row.Swim),
    t1: parseTimeToSeconds(row.T1),
    bike: parseTimeToSeconds(row.Bike),
    t2: parseTimeToSeconds(row.T2),
    run: parseTimeToSeconds(row.Run),
  };

  let totalSeconds = parseTimeToSeconds(row.Total);

  // Compute total if missing but all splits present
  const allSplitsPresent = Object.values(splits).every((v) => v !== null);
  if (totalSeconds === null && allSplitsPresent) {
    totalSeconds = Object.values(splits).reduce((sum, v) => sum! + v!, 0);
  }

  // Determine status
  const hasSomeSplit = Object.values(splits).some((v) => v !== null);
  const status: 'finished' | 'partial' =
    totalSeconds !== null && totalSeconds > 0 ? 'finished' : hasSomeSplit ? 'partial' : 'partial';

  // Drop truly empty rows
  if (!hasSomeSplit && totalSeconds === null) return null;

  const entry: ResultEntry = {
    id: generateId(nameRaw, year),
    name_public: toPublicName(nameRaw),
    status,
    splits_seconds: splits,
    total_seconds: totalSeconds,
  };

  // Parse ranks if present
  const totalRank = parseInt(row['Total Rank'] || '', 10);
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

  // Parse overtakes if present
  const bikeOvertakes = parseInt(row['Bike Overtakes'] || '', 10);
  const runOvertakes = parseInt(row['Run Overtakes'] || '', 10);

  if (!isNaN(bikeOvertakes) || !isNaN(runOvertakes)) {
    entry.overtakes = {};
    if (!isNaN(bikeOvertakes)) entry.overtakes.bike = bikeOvertakes;
    if (!isNaN(runOvertakes)) entry.overtakes.run = runOvertakes;
  }

  return entry;
}

/**
 * Parse CSV content into ResultEntry array
 */
export function parseResultsCSV(csvContent: string, year: number): ResultEntry[] {
  const records: RawResultRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  const entries: ResultEntry[] = [];

  for (const row of records) {
    const entry = parseRow(row, year);
    if (entry) {
      entries.push(entry);
    }
  }

  return entries;
}
