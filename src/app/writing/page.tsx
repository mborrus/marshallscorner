// Writing index page - lists all published posts

import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllPosts } from '@/lib/writing';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Writing',
  description: 'Field notes, fermentation, and travel writing.',
  openGraph: {
    title: 'Writing',
    description: 'Field notes, fermentation, and travel writing.',
  },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function WritingPage() {
  const posts = getAllPosts();

  return (
    <div className={styles.writingPage}>
      <div className={`${styles.hero} win98-box`}>
        <Image
          src="/images/writing/coffee-break.jpg"
          alt="Coffee poured into a cup, a snapshot from fieldwork travel."
          width={2400}
          height={1200}
          sizes="(max-width: 760px) 100vw, 760px"
          priority
          className={styles.heroImage}
        />
      </div>

      <div className={styles.intro}>
        <p className={styles.kicker}>Field Notes and Fermentation</p>
        <h1>Writing</h1>
        <p>
          If we are what we eat, does weather and climate&apos;s impact on our food
          change who we are? I spent 14 months investigating this question in the
          agave fields of Oaxaca, the vineyards of Rioja, and the highlands of the
          Peruvian Andes.
        </p>
        <p>
          When I was a senior at Williams, I was awarded a research-travel fellowship
          just as the world shut down to global travel. Based off the
          better-known-but-still-obscure Watson fellowship, the grant provides
          funding for one year of purpose-based travel and learning.
        </p>
        <p>
          My project proposal was titled, &quot;How climate change and globalization are
          affecting community scale fermentation.&quot; The cheesy subtitle was, &quot;How
          cultures are preserving their cultures.&quot; Fermentation traditions are
          elements of nearly every culture, arising from the fact they helped keep
          us alive for thousands of years. As climate change and globalization affect
          our food systems, how do these changes affect the people who are keeping
          these fermentation traditions alive?
        </p>
        <p>
          This question brought me to Mexico for mezcal, Belgium for bread, Peru for
          coffee, Spain for wine, and the UK for cider. In all these places I worked
          alongside passionate individuals innovating age-old traditions to adapt to
          the changing world we&apos;re living in, preserving cultures both biological
          and intangible.
        </p>
        <p className={styles.substackNote}>
          During my travels, I kept a Substack and I&apos;ve archived the files here for
          my own posterity.
        </p>
      </div>

      {posts.length === 0 ? (
        <p className="placeholder">[TODO: Add posts to content/writing/posts/]</p>
      ) : (
        <ul className={styles.postList}>
          {posts.map((post) => (
            <li key={post.slug} className={styles.postItem}>
              <Link href={`/writing/${post.slug}`} className={styles.postLink}>
                {post.title}
              </Link>
              <span className={styles.postDate}>{formatDate(post.date)}</span>
              {post.excerpt && (
                <p className={styles.postExcerpt}>{post.excerpt}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
