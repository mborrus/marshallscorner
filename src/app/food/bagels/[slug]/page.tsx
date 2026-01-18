// Bagel detail page - shows all fields for a single review

import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { getAllReviews, getReviewBySlug } from '@/lib/bagels/data';
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
  return { title: `${review.restaurant} - Bagel Review` };
}

export default async function BagelDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const review = getReviewBySlug(slug);

  if (!review) {
    notFound();
  }

  return (
    <div className={styles.container}>
      <nav className={styles.breadcrumb}>
        <Link href="/food/bagels">Bagel Reviews</Link>
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
          <dd>{review.location || '-'}</dd>
        </div>

        <div className={styles.detailRow}>
          <dt>Date</dt>
          <dd>{review.date || '-'}</dd>
        </div>

        {review.address && (
          <div className={styles.detailRow}>
            <dt>Address</dt>
            <dd>{review.address}</dd>
          </div>
        )}

        <div className={styles.detailRow}>
          <dt>Order</dt>
          <dd>{review.order || '-'}</dd>
        </div>

        <div className={styles.detailRow}>
          <dt>Cost</dt>
          <dd>{review.cost || '-'}</dd>
        </div>

        {review.upchargeAmount && review.upchargeAmount !== '$0' && (
          <div className={styles.detailRow}>
            <dt>Upcharge</dt>
            <dd>{review.upchargeAmount}</dd>
          </div>
        )}
      </dl>

      {/* Bagel Section */}
      <section className={styles.section}>
        <h2>The Bagel</h2>
        <dl className={styles.details}>
          {review.bagelSource && (
            <div className={styles.detailRow}>
              <dt>Source</dt>
              <dd>{review.bagelSource}</dd>
            </div>
          )}
          {review.bagelRating !== null && (
            <div className={styles.detailRow}>
              <dt>Rating</dt>
              <dd className={styles.rating}>{review.bagelRating}</dd>
            </div>
          )}
          {review.bagelReview && (
            <div className={styles.detailRow}>
              <dt>Notes</dt>
              <dd>{review.bagelReview}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Fillings Section */}
      {(review.fillingsNotes || review.fillingsRating !== null) && (
        <section className={styles.section}>
          <h2>The Fillings</h2>
          <dl className={styles.details}>
            {review.fillingsRating !== null && (
              <div className={styles.detailRow}>
                <dt>Rating</dt>
                <dd className={styles.rating}>{review.fillingsRating}</dd>
              </div>
            )}
            {review.fillingsNotes && (
              <div className={styles.detailRow}>
                <dt>Notes</dt>
                <dd>{review.fillingsNotes}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {/* Service */}
      {review.serviceNotes && (
        <section className={styles.section}>
          <h2>Service</h2>
          <p>{review.serviceNotes}</p>
        </section>
      )}

      {/* Google Maps Link */}
      {review.lat && review.lon && (
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

      {/* Photos */}
      {review.photos && review.photos.length > 0 && (
        <section className={styles.photosSection}>
          <h2>Photos</h2>
          <div className={styles.photosGrid}>
            {review.photos.map((photo, index) => (
              <Image
                key={photo}
                src={photo}
                alt={`${review.restaurant} photo ${index + 1}`}
                width={400}
                height={400}
                className={styles.photo}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
