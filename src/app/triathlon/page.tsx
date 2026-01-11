// Triathlon landing page - shows the latest year's content with year selector

import Link from 'next/link';
import { getTriathlonYears, getTriathlonContent } from '@/lib/content';
import { getResultsYears } from '@/lib/results/fs';
import YearSelector from '@/components/YearSelector';
import Placeholder from '@/components/Placeholder';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Triathlon',
};

export default async function TriathlonPage() {
  const years = getTriathlonYears();
  const latestYear = years[0];

  if (!latestYear) {
    return (
      <div>
        <h1>Triathlon</h1>
        <Placeholder message="add triathlon content files in content/triathlon/" />
      </div>
    );
  }

  const content = await getTriathlonContent(latestYear);

  if (!content) {
    return (
      <div>
        <h1>Triathlon</h1>
        <YearSelector years={years} currentYear={latestYear} />
        <Placeholder message={`content file not found for ${latestYear}`} />
      </div>
    );
  }

  const title = (content.frontmatter.title as string) || `Triathlon ${latestYear}`;
  const resultsYears = getResultsYears();
  const hasResults = resultsYears.length > 0;

  return (
    <div>
      <h1>{title}</h1>
      <YearSelector years={years} currentYear={latestYear} />
      {hasResults && (
        <p style={{ marginBottom: '1.5rem' }}>
          <Link href="/triathlon/results" style={{ color: '#4a90a4' }}>
            View race results →
          </Link>
        </p>
      )}
      <article
        className="markdown-content"
        dangerouslySetInnerHTML={{ __html: content.contentHtml }}
      />
    </div>
  );
}
