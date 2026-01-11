// Writing index page - lists all published posts

import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllPosts } from '@/lib/writing';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Writing',
  description: 'Essays and thoughts',
  openGraph: {
    title: 'Writing',
    description: 'Essays and thoughts',
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
      <h1>Writing</h1>

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
