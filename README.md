# Marshall's Corner

Personal website for marshallscorner.com.

## Run locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Build for production

```bash
npm run build
```

Static files will be output to the `out/` directory.

## Deploy

### Vercel

1. Push to GitHub
2. Import project at [vercel.com/new](https://vercel.com/new)
3. Vercel auto-detects Next.js settings

### Netlify

1. Push to GitHub
2. Import project at [app.netlify.com](https://app.netlify.com)
3. Set build command: `npm run build`
4. Set publish directory: `out`

## Adding content

**All copy is authored in `content/`.**

### Add a new triathlon year

1. Create `content/triathlon/YYYY.md` (e.g., `content/triathlon/2026.md`)
2. Add YAML frontmatter with at least `title` and `year`
3. Write the markdown content below the frontmatter
4. The year will automatically appear in the year selector

Example:

```markdown
---
title: "Event Name 2026"
year: "2026"
date: "2026-09-12"
---

## Event details

Content goes here...
```

### Add home page content

Create `content/home.md` with your intro text:

```markdown
---
title: "Welcome"
---

Your intro text here...
```

## Project structure

```
content/           # Markdown content (source of truth)
src/
  app/             # Next.js pages
  components/      # Reusable components
  lib/             # Utilities (markdown parsing)
  styles/          # Global CSS
```
