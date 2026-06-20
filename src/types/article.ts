import type { PortableTextBlock } from "@portabletext/types";

export type PostCategory =
  | "roof-replacement"
  | "insurance-claims"
  | "inspections"
  | "maintenance"
  | "texas-homeowners";

/** Singleton CMS document for /articles (heading, intro, SEO). */
export interface ArticlesPageDoc {
  intro?: PortableTextBlock[] | null;
  pageTitle?: string | null;
  seoDescription?: string | null;
  seoTitle?: string | null;
}

export interface PostListItem {
  _id: string;
  authorName?: string;
  category?: PostCategory | string;
  excerpt?: string;
  image?: string;
  publishedAt?: string;
  seoDescription?: string;
  slug: string;
  title: string;
}

export type PostDetail = PostListItem & {
  /** Sanity `blockContent` or plain string */
  body?: PortableTextBlock[] | string;
  faq?: {
    tagline?: string | null;
    title?: string | null;
    intro?: PortableTextBlock[] | string | null;
    items?:
      | {
          _key?: string | null;
          question?: string | null;
          answer?: PortableTextBlock[] | string | null;
        }[]
      | null;
  } | null;
};
