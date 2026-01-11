// Types for the Writing section

export interface PostFrontmatter {
  title: string;
  date: string;
  slug: string;
  excerpt?: string;
  tags?: string[];
  source?: {
    substack_url?: string;
    substack_id?: string;
  };
  draft: boolean;
}

export interface Post {
  frontmatter: PostFrontmatter;
  contentHtml: string;
  filename: string;
}

export interface PostListItem {
  title: string;
  date: string;
  slug: string;
  excerpt?: string;
  tags?: string[];
}
