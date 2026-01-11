---
title: "Another Sample Post"
date: "2024-09-03"
slug: "another-sample"
excerpt: "A second sample to show how the post list looks with multiple items."
tags: ["example", "demo"]
draft: false
---

This is a second sample post. It demonstrates how the writing index looks with multiple posts.

Posts are sorted by date in reverse chronological order, so newer posts appear first.

## Frontmatter Options

Each post supports these frontmatter fields:

| Field | Required | Description |
|-------|----------|-------------|
| title | Yes | The post title |
| date | Yes | Publication date (YYYY-MM-DD) |
| slug | Yes | URL slug (must match filename) |
| excerpt | No | Brief description for the index page |
| tags | No | Array of tags |
| draft | Yes | Set to true to hide from index |

## Source Attribution

If you're migrating from Substack, you can add source metadata:

```yaml
source:
  substack_url: "https://yourname.substack.com/p/post-slug"
  substack_id: "12345"
```

This helps track where content originated.
