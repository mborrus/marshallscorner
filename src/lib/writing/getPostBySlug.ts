// Get a single post by slug

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import html from 'remark-html';
import type { Post, PostFrontmatter } from './types';

const postsDirectory = path.join(process.cwd(), 'content/writing/posts');

function stripKramdownArtifacts(markdown: string): string {
  const cleanedLines = markdown.split('\n').filter((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      return true;
    }

    if (/^[.:\s]{3,}$/.test(trimmed)) {
      return false;
    }

    if (trimmed.includes(':::')) {
      return false;
    }

    if (trimmed.startsWith('{')) {
      if (trimmed.endsWith('}')) {
        return false;
      }

      if (/^\{[^}]+\}\s+[.#][\w.-]+/.test(trimmed)) {
        return false;
      }
    }

    if (/^:{2,}\s*[A-Za-z0-9_.-]*\s*$/.test(trimmed)) {
      return false;
    }

    if (
      trimmed.includes('subscription-widget') ||
      trimmed.includes('SubscribeWidget') ||
      trimmed.includes('fake-input') ||
      trimmed.includes('fake-button')
    ) {
      return false;
    }

    return true;
  });

  let cleaned = cleanedLines.join('\n');

  cleaned = cleaned.replace(/\)\s*\{[^}]*\}/g, ')');
  cleaned = cleaned.replace(/]\s*\{[^}]*\}/g, ']');
  cleaned = cleaned.replace(/\s*\{:\s*[^}]*\}/g, '');

  return cleaned;
}

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

  const cleanedContent = stripKramdownArtifacts(content);
  const processedContent = await remark()
    .use(remarkGfm)
    .use(html, { sanitize: false })
    .process(cleanedContent);

  return {
    frontmatter,
    contentHtml: processedContent.toString(),
    filename: matchingFile,
  };
}
