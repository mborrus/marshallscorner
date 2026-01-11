// Dynamic triathlon year page - renders content for a specific year

import Link from 'next/link';
import { getTriathlonYears, getTriathlonContent, getTriathlonPhotos } from '@/lib/content';
import { getResultsYears } from '@/lib/results/fs';
import YearSelector from '@/components/YearSelector';
import PhotoGallery from '@/components/PhotoGallery';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ year: string }>;
}

// Generate static paths for all available years
export async function generateStaticParams() {
  const years = getTriathlonYears();
  return years.map((year) => ({ year }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { year } = await params;
  const content = await getTriathlonContent(year);
  const title = (content?.frontmatter.title as string) || `Triathlon ${year}`;
  return { title };
}

export default async function TriathlonYearPage({ params }: PageProps) {
  const { year } = await params;
  const years = getTriathlonYears();
  const content = await getTriathlonContent(year);
  const photos = getTriathlonPhotos(year);
  const resultsYears = getResultsYears();
  const hasResults = resultsYears.length > 0;

  if (!content) {
    notFound();
  }

  const title = (content.frontmatter.title as string) || `Triathlon ${year}`;

  return (
    <div>
      <h1>{title}</h1>
      <YearSelector years={years} currentYear={year} />
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
      <PhotoGallery photos={photos} year={year} />
    </div>
  );
}
