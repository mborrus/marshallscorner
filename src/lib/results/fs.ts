// File system utilities for triathlon results

import fs from 'fs';
import path from 'path';
import type { ResultsYear } from './schema';

const contentDir = path.join(process.cwd(), 'content', 'triathlon', 'results');
const rawDir = path.join(contentDir, 'raw');
const generatedDir = path.join(contentDir, 'generated');

/**
 * Get list of raw CSV years available
 */
export function getRawYears(): string[] {
  if (!fs.existsSync(rawDir)) return [];

  return fs
    .readdirSync(rawDir)
    .filter((f) => f.endsWith('.csv'))
    .map((f) => f.replace('.csv', ''))
    .sort((a, b) => b.localeCompare(a));
}

/**
 * Read raw CSV content for a year
 */
export function readRawCSV(year: string): string | null {
  const filePath = path.join(rawDir, `${year}.csv`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Get list of generated result years
 */
export function getResultsYears(): string[] {
  if (!fs.existsSync(generatedDir)) return [];

  return fs
    .readdirSync(generatedDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''))
    .sort((a, b) => b.localeCompare(a));
}

/**
 * Read generated results for a year
 */
export function readResultsYear(year: string): ResultsYear | null {
  const filePath = path.join(generatedDir, `${year}.json`);
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content) as ResultsYear;
}

/**
 * Read all generated results
 */
export function readAllResults(): ResultsYear[] {
  const years = getResultsYears();
  const results: ResultsYear[] = [];

  for (const year of years) {
    const data = readResultsYear(year);
    if (data) results.push(data);
  }

  return results;
}

/**
 * Write generated results for a year
 */
export function writeResultsYear(year: string, data: ResultsYear): void {
  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
  }

  const filePath = path.join(generatedDir, `${year}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Get paths for the results directories
 */
export function getResultsPaths() {
  return { contentDir, rawDir, generatedDir };
}
