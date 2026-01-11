// Content utilities for reading and parsing markdown files
// All content lives in the /content directory

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import html from 'remark-html';

const contentDirectory = path.join(process.cwd(), 'content');

// Read and parse a markdown file, returning frontmatter and HTML content
export async function getMarkdownContent(relativePath: string): Promise<{
  frontmatter: Record<string, unknown>;
  contentHtml: string;
} | null> {
  const fullPath = path.join(contentDirectory, relativePath);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  const processedContent = await remark()
    .use(remarkGfm)
    .use(html, { sanitize: false })
    .process(content);

  return {
    frontmatter: data,
    contentHtml: processedContent.toString(),
  };
}

// Get list of triathlon years by scanning content/triathlon/*.md
// Excludes files starting with _ (like _template.md)
export function getTriathlonYears(): string[] {
  const triathlonDir = path.join(contentDirectory, 'triathlon');

  if (!fs.existsSync(triathlonDir)) {
    return [];
  }

  const files = fs.readdirSync(triathlonDir);

  const years = files
    .filter((file) => {
      return (
        file.endsWith('.md') &&
        !file.startsWith('_')
      );
    })
    .map((file) => file.replace('.md', ''))
    .sort((a, b) => b.localeCompare(a)); // Sort descending (newest first)

  return years;
}

// Get home content from content/home.md
export async function getHomeContent() {
  return getMarkdownContent('home.md');
}


// Get triathlon content for a specific year
export async function getTriathlonContent(year: string) {
  return getMarkdownContent(`triathlon/${year}.md`);
}

// Get list of photos for a triathlon year
// Scans public/images/triathlon/{year}/ for image files
export function getTriathlonPhotos(year: string): string[] {
  const photosDir = path.join(process.cwd(), 'public', 'images', 'triathlon', year);

  if (!fs.existsSync(photosDir)) {
    return [];
  }

  const files = fs.readdirSync(photosDir);
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  return files
    .filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext) && !file.startsWith('.');
    })
    .sort();
}
