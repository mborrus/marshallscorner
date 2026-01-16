'use client';

import { useState, useRef } from 'react';
import styles from './page.module.css';

// Art piece data structure
interface ArtPiece {
  id: string;
  title: string;
  medium: string;
  date: string;
  src: string;
  description?: string;
  tags?: string[];
}

// Medium category mapping for simpler filtering
const MEDIUM_CATEGORIES: Record<string, string> = {
  'Watercolor': 'Watercolor',
  'Watercolor & Colored Pens': 'Watercolor',
  'Ink & Watercolor': 'Watercolor',
  'guache on paper': 'Watercolor',
  'guache': 'Watercolor',
  'Oil on wood': 'Oil',
  'Colored Pencil on paper bag': 'Pencil',
  'Colored Pens & Ink': 'Ink',
  'Ink': 'Ink',
  'Markers': 'Ink',
  'Mosaic': 'Mosaic',
};

const getMediumCategory = (medium: string): string => {
  return MEDIUM_CATEGORIES[medium] || medium;
};

// Gallery data - add more pieces here
const GALLERY: ArtPiece[] = [
  {
    id: 'calvins-perch',
    title: "Calvin's Perch",
    medium: 'Watercolor',
    date: 'Dec 2025',
    src: '/images/art/calvins-perch.jpg',
    description: 'Our Neighbors dog, Calvin, had a special perch in the bay window on the first floor and would watch us come and go. ',
    tags: ['Animals', 'NYC'],
  },
  {
    id: 'dizzy-gillespie',
    title: 'Dizzy Gillespie',
    medium: 'guache on paper',
    date: 'Aug 2025',
    src: '/images/art/dizzy-gillespie.jpg',
    description: 'I was looking to try out some new paints I bought and couldnt pronounce and saw the artist on the screen of my TV from spotify. I painted this in about an hour as he played background music. Once it was finished, I liked how the tap looked along the border, so never took it off. I submitted it with the pond hockey painting, which took much much longer, to the Sandwich Fair and it won a big purple ribbon while the pond hockey painting got much less love.' ,
    tags: ['Portrait'],
  },
  {
    id: 'pond-hockey',
    title: 'Pond Hockey',
    medium: 'Oil on wood',
    date: 'Sep 2025',
    src: '/images/art/pond-hockey.jpg',
    description: 'A scene from the New England Pond Hockey Classic where my team got last place. This painting was painted for, and won third place in, the 2025 Sandwhich Fair',
    tags: ['Sports', 'New Hampshire'],
  },
  {
    id: 'evening-at-the-museum',
    title: 'Evening at the Museum',
    medium: 'Watercolor',
    date: 'Jun 2025',
    src: '/images/art/evening-at-the-museum.jpg',
    description: 'Originally drawn in a single sitting after work on a park bench, later painted in to make it prettier. Later touched up a second time once I had done the other food cart drawings. I particularly like the little sculptures on the ledges of Americana.',
    tags: ['NYC', 'Food Carts', 'Architecture'],
  },
  {
    id: 'ducks-on-a-rug',
    title: 'Ducks on a Rug',
    medium: 'Watercolor & Colored Pens',
    date: 'Dec 2024',
    src: '/images/art/ducks-on-a-rug.jpg',
    description: 'Done as a practice piece to try out pens on top of watercolors. The apartment I was in had small persian rug coasters, poorly rendered in the painting, but very fun in person.',
    tags: ['Rubber Ducks', 'Still Life'],
  },
  {
    id: 'everybody-eats',
    title: 'Everybody Eats',
    medium: 'Markers',
    date: 'Jan 2026',
    src: '/images/art/everybody-eats.jpg',
    description: 'I didnt mean to make this so colorful, but I like the bold lines of the markers and how silly some of the birds look',
    tags: ['Animals', 'NYC', 'Pigeons'],
  },
  {
    id: 'fruit-in-the-city',
    title: 'Fruit in the City',
    medium: 'Watercolor',
    date: 'Dec 2025',
    src: '/images/art/fruit-in-the-city.jpg',
    description: 'Behind my office on 48th and 3rd in Manhatten there is a fruit stand that I would buy snacks from. The fruit is always half way to going bad, but its also very cheap, and I eat it the same day. Hes always there and its a mystery to me how he sets it all up. Cheap berries.',
    tags: ['NYC', 'Food Carts'],
  },
  {
    id: 'great-lawn',
    title: 'August Afternoon, Great Lawn',
    medium: 'guache',
    date: 'Aug 2025',
    src: '/images/art/great-lawn.jpg',
    description: 'Drawn from a folding chair in the great lawn in Central Park during an afternoon where I was probably too hot for comfort. Painted in as another guache test.',
    tags: ['NYC', 'Central Park', 'People'],
  },
  {
    id: 'hot-dogs-and-fossils',
    title: 'Hot Dogs and Fossils',
    medium: 'Watercolor',
    date: 'Dec 2025',
    src: '/images/art/hot-dogs-and-fossils.jpg',
    description: 'I like the little park in front (or behind) the natural history museum. I also like how each section of the building looks different from the rest.',
    tags: ['NYC', 'Food Carts', 'Architecture'],
  },
  {
    id: 'i-came-i-saw-i-ate',
    title: 'I Came, I Saw, I Ate',
    medium: 'Mosaic',
    date: 'Feb 2025',
    src: '/images/art/i-came-i-saw-i-ate.jpg',
    description: 'New York is the mosaic capital of the modern world, and this is my first tribute to that.',
    tags: ['NYC', 'Food'],
  },
  {
    id: 'park-vendors',
    title: 'Park Vendors',
    medium: 'Watercolor',
    date: 'Dec 2025',
    src: '/images/art/park-vendors.jpg',
    description: 'A pretty place to sell snacks.',
    tags: ['NYC', 'Central Park', 'Food Carts'],
  },
  {
    id: 'sundays-in-the-park',
    title: 'Sundays in the Park',
    medium: 'Colored Pens & Ink',
    date: 'Jun 2025',
    src: '/images/art/sundays-in-the-park.jpg',
    description: 'Another practice piece drawn and colored in a single sitting in the park of two girls gossiping. Unfortunately, I made one look like a troll. I like the hatching of the pen nonetheless.',
    tags: ['NYC', 'Central Park', 'People'],
  },
  {
    id: 'dog-walkers',
    title: 'The Dog Walkers',
    medium: 'Ink',
    date: '2025',
    src: '/images/art/dog-walkers.jpg',
    description: 'I saw these dog walkers while I was on a run and had to step to take a photo. Something about the dog walkers all walking together is ammusing to me.',
    tags: ['Animals', 'NYC', 'People'],
  },
  {
    id: 'thirst-trap',
    title: 'Thirst Trap',
    medium: 'Colored Pencil on paper bag',
    date: 'Nov 2024',
    src: '/images/art/thirst-trap.jpg',
    description: 'Done while I was living in New Hampshire and looking for subjects to draw en vivo. Done on a cut up paper bag. Set up a rubber duck in a cactus shaped margarita glass.',
    tags: ['Rubber Ducks', 'Still Life', 'New Hampshire'],
  },
  {
    id: 'men-at-work',
    title: 'Men at Work',
    medium: 'Colored Pencil on paper bag',
    date: 'Nov 2024',
    src: '/images/art/men-at-work.jpg',
    description: 'Another New Hampshire drawing on a cut up paper bag. I had a lot of rubber ducks, and I like the artwork on the san marzano tomatoes, so I put them together for some practice. ',
    tags: ['Rubber Ducks', 'Still Life', 'New Hampshire'],
  },
  {
    id: 'natural-history-pretzels',
    title: 'Natural History Pretzels',
    medium: 'Watercolor',
    date: 'Dec 2025',
    src: '/images/art/natural-history-pretzels.jpg',
    description: 'There is a food cart in front of the museum which always has a pretzel hanging from a string. Ive never seen anyone or anything eating it, or even acknowledging it, but this it my tribute to it.',
    tags: ['NYC', 'Food Carts', 'Architecture'],
  },
  {
    id: 'rush-hour',
    title: 'Rush Hour',
    medium: 'Ink & Watercolor',
    date: 'Jan 2025',
    src: '/images/art/rush-hour.jpg',
    description: 'Saw this on one of my first commutes to work. Theyre just like me.',
    tags: ['NYC', 'Pigeons', 'Animals'],
  },
];

// Rotation classes for organic feel
const rotations = [styles.rotate1, styles.rotate2, styles.rotate3];

// Extract unique medium categories for filter
const ALL_CATEGORIES = ['All', ...Array.from(new Set(GALLERY.map(art => getMediumCategory(art.medium))))];

// Extract all unique tags
const ALL_TAGS = ['All', ...Array.from(new Set(GALLERY.flatMap(art => art.tags || []))).sort()];

// Sort options
type SortOption = 'newest' | 'oldest' | 'title';

export default function ArtPage() {
  const [selectedArt, setSelectedArt] = useState<ArtPiece | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterTag, setFilterTag] = useState<string>('All');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const imageRef = useRef<HTMLDivElement>(null);

  const closeLightbox = () => setSelectedArt(null);

  // Parse date for sorting (handles "Dec 2025", "2025", etc.)
  const parseDate = (dateStr: string): number => {
    const months: Record<string, number> = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    const parts = dateStr.split(' ');
    if (parts.length === 2) {
      const month = months[parts[0]] || 0;
      const year = parseInt(parts[1]);
      return new Date(year, month).getTime();
    }
    return new Date(parseInt(dateStr), 0).getTime();
  };

  // Filter and sort gallery
  const filteredGallery = GALLERY
    .filter(art => filterCategory === 'All' || getMediumCategory(art.medium) === filterCategory)
    .filter(art => filterTag === 'All' || (art.tags && art.tags.includes(filterTag)))
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return parseDate(b.date) - parseDate(a.date);
        case 'oldest':
          return parseDate(a.date) - parseDate(b.date);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

  const toggleFullscreen = () => {
    if (!imageRef.current) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      imageRef.current.requestFullscreen();
    }
  };

  // Close on escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') closeLightbox();
  };

  return (
    <div>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Art Gallery</h1>
        <p className={styles.hint}>* Click an item to inspect closer *</p>
      </div>

      {/* Filter and Sort Controls */}
      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Medium:</label>
          <select
            className={styles.select}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            {ALL_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Tag:</label>
          <select
            className={styles.select}
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
          >
            {ALL_TAGS.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>Sort:</label>
          <select
            className={styles.select}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="title">Title A-Z</option>
          </select>
        </div>

        <span className={styles.resultCount}>
          {filteredGallery.length} piece{filteredGallery.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Gallery Grid */}
      {filteredGallery.length > 0 ? (
        <div className={styles.gallery}>
          {filteredGallery.map((art, index) => (
            <div
              key={art.id}
              className={`${styles.polaroid} ${rotations[index % rotations.length]}`}
              onClick={() => setSelectedArt(art)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedArt(art)}
            >
              {/* Tape decoration */}
              <div className={styles.tape} />

              {/* Photo frame */}
              <div className={styles.frame}>
                <div className={styles.imageWrapper}>
                  <img
                    src={art.src}
                    alt={art.title}
                    className={styles.image}
                    loading="lazy"
                  />
                </div>

                {/* Caption */}
                <div className={styles.caption}>
                  <h3 className={styles.artTitle}>{art.title}</h3>
                  <div className={styles.meta}>
                    <span className={styles.date}>{art.date}</span>
                    <span className={styles.dot} />
                    <span className={styles.medium}>{art.medium}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>No artwork to display yet.</p>
      )}

      {/* Lightbox Modal */}
      {selectedArt && (
        <div
          className={styles.lightbox}
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="lightbox-title"
        >
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Windows 95 style title bar */}
            <div className={styles.titleBar}>
              <span className={styles.titleBarText}>
                {selectedArt.title}.jpg
              </span>
              <div className={styles.titleBarButtons}>
                <button
                  className={styles.fullscreenButton}
                  onClick={toggleFullscreen}
                  aria-label="Fullscreen"
                  title="View fullscreen"
                >
                  [ ]
                </button>
                <button
                  className={styles.closeButton}
                  onClick={closeLightbox}
                  aria-label="Close"
                >
                  X
                </button>
              </div>
            </div>

            {/* Modal content */}
            <div className={styles.modalContent}>
              {/* Image */}
              <div
                className={styles.modalImageWrapper}
                ref={imageRef}
                onClick={toggleFullscreen}
                title="Click to view fullscreen"
              >
                <img
                  src={selectedArt.src}
                  alt={selectedArt.title}
                  className={styles.modalImage}
                />
              </div>

              {/* Info panel */}
              <div className={styles.modalInfo}>
                <h2 id="lightbox-title" className={styles.modalTitle}>
                  {selectedArt.title}
                </h2>

                <div className={styles.modalMeta}>
                  <p>Date: {selectedArt.date}</p>
                  <p>Medium: {selectedArt.medium}</p>
                </div>

                {selectedArt.description && (
                  <div className={styles.descriptionBox}>
                    <span className={styles.descriptionLabel}>NOTES.TXT</span>
                    <p className={styles.description}>
                      &ldquo;{selectedArt.description}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
