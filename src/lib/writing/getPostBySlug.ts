// Get a single post by slug

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import type { Post, PostFrontmatter } from './types';

const postsDirectory = path.join(process.cwd(), 'content/writing/posts');

export async function getPostBySlug(slug: string): Promise<Post | null> {
  if (!fs.existsSync(postsDirectory)) {
    return null;
  }

  const files = fs.readdirSync(postsDirectory);

  // Find the file that matches the slug
  const matchingFile = files.find((file) => {
    if (!file.endsWith('.md') && !file.endsWith('.mdx')) {
      return false;
    }

    const fullPath = path.join(postsDirectory, file);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data } = matter(fileContents);

    return data.slug === slug;
  });

  if (!matchingFile) {
    return null;
  }

  const fullPath = path.join(postsDirectory, matchingFile);
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);
  const frontmatter = data as PostFrontmatter;

  // Don't return draft posts
  if (frontmatter.draft) {
    return null;
  }

  const processedContent = await remark()
    .use(html, { sanitize: false })
    .process(content);

  return {
    frontmatter,
    contentHtml: processedContent.toString(),
    filename: matchingFile,
  };
}
