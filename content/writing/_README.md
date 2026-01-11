# Writing Content

This directory contains all blog posts for the `/writing` section.

## Directory Structure

```
content/writing/
├── posts/           # Markdown post files
│   └── YYYY-MM-DD-slug.md
├── assets/          # Images and media referenced by posts
│   └── image.png
└── _README.md       # This file
```

## Adding a New Post

1. Create a new `.md` file in `posts/` with the format: `YYYY-MM-DD-slug.md`
2. Add required frontmatter (see below)
3. Write your post content in Markdown
4. If you have images, place them in `assets/` and reference with relative paths

## Required Frontmatter

Every post must have this frontmatter at the top:

```yaml
---
title: "Your Post Title"
date: "YYYY-MM-DD"
slug: "your-post-slug"
draft: false
---
```

## Optional Frontmatter Fields

```yaml
---
title: "Your Post Title"
date: "YYYY-MM-DD"
slug: "your-post-slug"
excerpt: "A brief description for the post list"
tags: ["tag1", "tag2"]
source:
  substack_url: "https://yourname.substack.com/p/..."
  substack_id: "12345"
draft: false
---
```

## Important Rules

1. **slug must match filename**: The `slug` in frontmatter must match the slug portion of the filename
   - File: `2024-05-12-my-post.md` → slug: `my-post`

2. **date controls ordering**: Posts are sorted by `date` in reverse chronological order

3. **draft: true hides posts**: Posts with `draft: true` won't appear in the `/writing` index

4. **Don't invent content**: If something is missing, use `[TODO: ...]` placeholder

## Image Handling

- **Local images**: Place in `content/writing/assets/` and reference with relative paths:
  ```markdown
  ![Alt text](../assets/my-image.png)
  ```

- **External images**: You can link directly to external URLs:
  ```markdown
  ![Alt text](https://example.com/image.png)
  ```

- **Missing images**: If an image is missing, leave the reference as-is (don't invent)

## Migrating from Substack

When importing posts from Substack:

1. Export your Substack posts (HTML or Markdown)
2. Convert each post to a `.md` file with the frontmatter above
3. Put images in `assets/` and update image paths
4. Keep `source.substack_url` and `source.substack_id` for reference
5. Do NOT automatically remove Substack boilerplate (Subscribe links, etc.) unless instructed
