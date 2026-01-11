// Pizza detail page - shows all fields for a single review

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllReviews, getReviewBySlug } from '@/lib/pizza/data';
import styles from './page.module.css';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const reviews = getAllReviews();
  return reviews.map((review) => ({
    slug: review.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const review = getReviewBySlug(slug);
  if (!review) {
    return { title: 'Not Found' };
  }
  return { title: `${review.restaurant} - Pizza Review` };
}

export default async function PizzaDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const review = getReviewBySlug(slug);

  if (!review) {
    notFound();
  }

  const ratingLabels: Record<string, string> = {
    crustTexture: 'Crust Texture (1-5)',
    undercarriage: 'Undercarriage (1-3)',
    flavorOfCrust: 'Flavor of Crust (1-5)',
    integrity: 'Integrity (1-3)',
    mouthCutter: 'Mouth Cutter (1-3)',
    edge: 'Edge (1-3)',
    sauce: 'Sauce (1-5)',
    choices: 'Choices (1-3)',
    toppingsPresentation: 'Toppings/Presentation (1-4)',
    madeInHouse: 'Made in House (1-3)',
    upchargeRating: 'Upcharge Rating (1-3)',
    service: 'Service (1-3)',
  };

  return (
    <div className={styles.container}>
      <nav className={styles.breadcrumb}>
        <Link href="/food/pizza">Pizza Reviews</Link>
        <span> / </span>
        <span>{review.restaurant}</span>
      </nav>

      <header className={styles.header}>
        <h1>{review.restaurant}</h1>
        {review.overallScore !== null && (
          <span className={styles.score}>{review.overallScore}</span>
        )}
      </header>

      <dl className={styles.details}>
        <div className={styles.detailRow}>
          <dt>Location</dt>
          <dd>{review.location}</dd>
        </div>

        <div className={styles.detailRow}>
          <dt>Date</dt>
          <dd>{review.date}</dd>
        </div>

        {review.address && (
          <div className={styles.detailRow}>
            <dt>Address</dt>
            <dd>{review.address}</dd>
          </div>
        )}

        <div className={styles.detailRow}>
          <dt>Pizza Ordered</dt>
          <dd>{review.pizzaOrdered || '-'}</dd>
        </div>

        <div className={styles.detailRow}>
          <dt>Cost</dt>
          <dd>{review.cost || '-'}</dd>
        </div>

        {review.upchargeAmount && review.upchargeAmount !== '$0.00' && (
          <div className={styles.detailRow}>
            <dt>Upcharge</dt>
            <dd>{review.upchargeAmount}</dd>
          </div>
        )}

        {review.toppings && review.toppings !== 'none' && (
          <div className={styles.detailRow}>
            <dt>Toppings</dt>
            <dd>{review.toppings}</dd>
          </div>
        )}

        {review.textureDescriptor && (
          <div className={styles.detailRow}>
            <dt>Texture</dt>
            <dd>{review.textureDescriptor}</dd>
          </div>
        )}

        {review.crustBrand && (
          <div className={styles.detailRow}>
            <dt>Crust</dt>
            <dd>{review.crustBrand}</dd>
          </div>
        )}

        {review.serviceNotes && (
          <div className={styles.detailRow}>
            <dt>Service Notes</dt>
            <dd>{review.serviceNotes}</dd>
          </div>
        )}
      </dl>

      <section className={styles.ratingsSection}>
        <h2>Ratings</h2>
        <dl className={styles.ratingsGrid}>
          {Object.entries(review.ratings).map(([key, value]) => (
            <div key={key} className={styles.ratingItem}>
              <dt>{ratingLabels[key] || key}</dt>
              <dd>{value !== null ? value : '-'}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* External Links */}
      {(review.website || review.googleMapsUrl) && (
        <section className={styles.linksSection}>
          <h2>Links</h2>
          <div className={styles.links}>
            {review.website && (
              <a
                href={review.website}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.externalLink}
              >
                Website
              </a>
            )}
            {review.googleMapsUrl && (
              <a
                href={review.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.externalLink}
              >
                Google Maps
              </a>
            )}
          </div>
        </section>
      )}

      {/* Generate Google Maps link from coordinates if no URL provided */}
      {!review.googleMapsUrl && review.lat && review.lon && (
        <section className={styles.linksSection}>
          <h2>Links</h2>
          <div className={styles.links}>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${review.lat},${review.lon}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.externalLink}
            >
              View on Google Maps
            </a>
          </div>
        </section>
      )}
    </div>
  );
}
