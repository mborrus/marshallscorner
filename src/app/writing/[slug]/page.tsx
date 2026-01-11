// Individual post page

import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPostBySlug, getAllPostSlugs } from '@/lib/writing';
import styles from './page.module.css';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return { title: 'Post Not Found' };
  }

  return {
    title: post.frontmatter.title,
    description: post.frontmatter.excerpt,
    openGraph: {
      title: post.frontmatter.title,
      description: post.frontmatter.excerpt,
    },
  };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <article className={styles.postPage}>
      <header className={styles.postHeader}>
        <h1>{post.frontmatter.title}</h1>
        <time className={styles.postDate}>{formatDate(post.frontmatter.date)}</time>
      </header>

      <div
        className="markdown-content"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />

      <footer className={styles.postFooter}>
        <Link href="/writing">&larr; Back to Writing</Link>
      </footer>
    </article>
  );
}
