// Get all published posts for the writing index

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { PostListItem, PostFrontmatter } from './types';

const postsDirectory = path.join(process.cwd(), 'content/writing/posts');

export function getAllPosts(): PostListItem[] {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const files = fs.readdirSync(postsDirectory);

  const posts = files
    .filter((file) => file.endsWith('.md') || file.endsWith('.mdx'))
    .map((filename) => {
      const fullPath = path.join(postsDirectory, filename);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);
      const frontmatter = data as PostFrontmatter;

      return {
        title: frontmatter.title,
        date: frontmatter.date,
        slug: frontmatter.slug,
        excerpt: frontmatter.excerpt,
        tags: frontmatter.tags,
        draft: frontmatter.draft,
      };
    })
    // Filter out drafts
    .filter((post) => !post.draft)
    // Sort by date descending (newest first)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    // Remove draft field from returned items
    .map(({ draft, ...post }) => post);

  return posts;
}

export function getAllPostSlugs(): string[] {
  const posts = getAllPosts();
  return posts.map((post) => post.slug);
}
