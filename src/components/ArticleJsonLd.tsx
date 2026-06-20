import { useEffect } from "react";

import { postCoverImageSrc } from "../article/postCoverImage";
import type { PostDetail } from "../types/article";
import { resolveSiteOrigin } from "../utils/siteUrl";

const SCRIPT_ID = "article-json-ld";

interface ArticleJsonLdProps {
  path: string;
  post: PostDetail;
}

export const ArticleJsonLd = ({ post, path }: ArticleJsonLdProps) => {
  useEffect(() => {
    const origin = resolveSiteOrigin();
    const url = `${origin}${path.startsWith("/") ? path : `/${path}`}`;
    const imageUrl = postCoverImageSrc(post.image, { w: 1200, fit: "max" });
    const authorName = post.authorName?.trim() || "Tandra Peters";
    const description =
      post.seoDescription?.trim() || post.excerpt?.trim() || post.title;

    const data = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description,
      datePublished: post.publishedAt,
      author: {
        "@type": "Person",
        name: authorName,
      },
      publisher: {
        "@type": "Organization",
        name: "Tandra Peters Consulting",
        url: origin,
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": url,
      },
      ...(imageUrl ? { image: [imageUrl] } : {}),
    };

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [post, path]);

  return null;
};
