// PhotoGallery component for displaying triathlon photos
// Simple responsive grid with lightbox on click

'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from './PhotoGallery.module.css';

interface PhotoGalleryProps {
  photos: string[];
  year: string;
}

export default function PhotoGallery({ photos, year }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  if (photos.length === 0) {
    return null;
  }

  return (
    <>
      <section className={styles.gallery}>
        <h2 className={styles.heading}>Photos</h2>
        <div className={styles.grid}>
          {photos.map((photo, index) => (
            <button
              key={photo}
              className={styles.photoButton}
              onClick={() => setSelectedPhoto(photo)}
              aria-label={`View photo ${index + 1}`}
            >
              <Image
                src={`/images/triathlon/${year}/${photo}`}
                alt={`Triathlon ${year} photo ${index + 1}`}
                width={300}
                height={200}
                className={styles.thumbnail}
              />
            </button>
          ))}
        </div>
      </section>

      {selectedPhoto && (
        <div
          className={styles.lightbox}
          onClick={() => setSelectedPhoto(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Photo lightbox"
        >
          <button
            className={styles.closeButton}
            onClick={() => setSelectedPhoto(null)}
            aria-label="Close lightbox"
          >
            x
          </button>
          <Image
            src={`/images/triathlon/${year}/${selectedPhoto}`}
            alt={`Triathlon ${year} photo`}
            width={1200}
            height={800}
            className={styles.fullImage}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
