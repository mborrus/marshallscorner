// All-time triathlon results — camp-themed dashboard.
// All numbers are derived from the per-year results tables; see
// src/lib/results/allTime.ts and design_handoff_all_time_results/README.md.

import type { Metadata } from 'next';
import { readAllResults } from '@/lib/results/fs';
import { deriveAllTime } from '@/lib/results/allTime';
import CampAllTime from '@/components/results/campAllTime/CampAllTime';

export const metadata: Metadata = {
  title: 'All-Time Results',
};

export default function AllTimeResultsPage() {
  const allResults = readAllResults();

  if (allResults.length === 0) {
    return (
      <div>
        <h1>All-Time Results</h1>
        <p>No results available.</p>
      </div>
    );
  }

  const data = deriveAllTime(allResults);

  return <CampAllTime data={data} />;
}
