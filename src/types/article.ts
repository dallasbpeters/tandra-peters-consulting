import type { PortableTextBlock } from "@portabletext/types";

export type PostCategory =
  | "roof-replacement"
  | "insurance-claims"
  | "inspections"
  | "maintenance"
  | "texas-homeowners";

/** Singleton CMS document for /articles (heading, intro, SEO). */
export type ArticlesPageDoc = {
  pageTitle?: string | null;
  intro?: PortableTextBlock[] | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export type PostListItem = {
  _id: string;
  title: string;
  slug: string;
  publishedAt?: string;
  excerpt?: string;
  category?: PostCategory | string;
  seoDescription?: string;
  authorName?: string;
  image?: string;
};

export type PostDetail = PostListItem & {
  /** Sanity `blockContent` or plain string */
  body?: PortableTextBlock[] | string;
  faq?: {
    tagline?: string | null;
    title?: string | null;
    intro?: PortableTextBlock[] | string | null;
    items?: Array<{
      _key?: string | null;
      question?: string | null;
      answer?: PortableTextBlock[] | string | null;
    }> | null;
  } | null;
};
