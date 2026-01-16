# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal website ("Marshall's Corner") built with Next.js 15, React 18, and TypeScript. Features a 90s web aesthetic with markdown-based content. Deployed on Vercel.

## Commands

```bash
npm run dev              # Start dev server (localhost:3000)
npm run build            # Full build (runs prebuild scripts + next build)
npm run build:results    # Process triathlon CSV data → JSON
npm run build:pizza      # Process pizza review data
npm run lint             # Run ESLint
```

**Build pipeline:** `prebuild` automatically runs `build:results` and `build:pizza` before `next build`.

## Architecture

### Content-Driven Design
- All content lives in `/content` as markdown with YAML frontmatter
- Markdown processed at build time using gray-matter + remark
- Build scripts in `/scripts` transform raw data (CSV, markdown) into JSON
- Generated data stored in `content/*/generated/` directories

### Data Flow
1. Raw content in `/content` (markdown, CSV)
2. Build scripts process and normalize data
3. Generated JSON consumed by `/src/lib/*` modules
4. Server components render pages at build time (SSG)

### Key Directories
- `src/app/` - Next.js App Router pages (file-based routing)
- `src/components/` - Reusable React components
- `src/lib/` - Data access and utilities (organized by domain: `writing/`, `pizza/`, `results/`)
- `content/` - Markdown content and data sources
- `scripts/` - Build-time data processing (TypeScript/Python)

### Client vs Server Components
- **Server (default):** Page layouts, markdown rendering, file I/O
- **Client (`'use client'`):** Interactive features (KonamiCode, PizzaReviewsClient, map components)

### Styling
- CSS custom properties define theme in `globals.css`
- CSS Modules (`*.module.css`) for component-scoped styles
- 90s aesthetic: VT323 font, cream backgrounds, 3D beveled borders

## Content Conventions

### Markdown Frontmatter (required)
```yaml
---
title: "Post Title"
date: "YYYY-MM-DD"
slug: "unique-url-slug"
excerpt: "Brief description"
draft: true  # Optional: hides from index
---
```

### Adding Content
- **Blog posts:** Add `.md` files to `content/writing/posts/`
- **Triathlon events:** Add `YYYY.md` to `content/triathlon/`
- **Pizza reviews:** Update data in `content/food/pizza/`

## Art Gallery

### Adding Artwork
1. **Optimize images** before adding (user typically provides raw PNGs from `/Users/mborrus/Downloads/portfolio/`):
   ```bash
   sips -Z 2000 -s format jpeg -s formatOptions 85 "source.png" --out "public/images/art/filename.jpg"
   ```
   - Resizes to max 2000px width
   - Converts to JPEG at 85% quality
   - Typical reduction: 80-95% file size

2. **Add entry to GALLERY array** in `src/app/art/page.tsx`:
   ```typescript
   {
     id: 'unique-slug',
     title: 'Artwork Title',
     medium: 'Watercolor',  // Will be grouped into categories for filtering
     date: 'Dec 2025',      // Format: "Mon YYYY" or just "YYYY"
     src: '/images/art/filename.jpg',
     description: 'Optional description shown in lightbox.',
     tags: ['NYC', 'Central Park'],  // For filtering
   }
   ```

### Medium Categories
Medium strings are mapped to simplified categories for filtering:
- **Watercolor**: Watercolor, guache, guache on paper, Ink & Watercolor, Watercolor & Colored Pens
- **Oil**: Oil on wood
- **Ink**: Ink, Markers, Colored Pens & Ink
- **Pencil**: Colored Pencil on paper bag
- **Mosaic**: Mosaic

To add new medium mappings, update `MEDIUM_CATEGORIES` in `page.tsx`.

### Tags
Tags are extracted automatically from all gallery entries. Current tags include: Animals, Architecture, Central Park, Food, Food Carts, NYC, New England, New Hampshire, People, Pigeons, Portrait, Rubber Ducks, Sports, Still Life, Street Vendors.

### Features
- **Polaroid-style cards** with tape decoration and slight rotation
- **Lightbox modal** (Windows 95 style) - click image to open, click image again for fullscreen
- **Filtering** by medium category and tags
- **Sorting** by date (newest/oldest) or title (A-Z)

### Note on Images
The art images already have titles/dates embedded in them, so the gallery displays them without additional captions on the polaroid cards.

## External Services
- **Vercel KV:** Visitor counter API (`/api/visitor-count`)
- **Leaflet:** Pizza location maps (client-side)