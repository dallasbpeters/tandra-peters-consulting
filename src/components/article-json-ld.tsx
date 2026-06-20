import { useEffect } from "react";

import { postCoverImageSrc } from "../article/post-cover-image";
import type { PostDetail } from "../types/article";
import { resolveSiteOrigin } from "../utils/site-url";

const SCRIPT_ID = "article-json-ld";

interface ArticleJsonLdProps {
  path: string;
  post: PostDetail;
}

export const ArticleJsonLd = ({ post, path }: ArticleJsonLdProps) => {
  useEffect(() => {
    const origin = resolveSiteOrigin();
    const url = `${origin}${path.startsWith("/") ? path : `/${path}`}`;
    const imageUrl = postCoverImageSrc(post.image, { fit: "max", w: 1200 });
    const authorName = post.authorName?.trim() || "Tandra Peters";
    const description =
      post.seoDescription?.trim() || post.excerpt?.trim() || post.title;

    const data = {
      "@context": "https://schema.org",
      "@type": "Article",
      author: {
        "@type": "Person",
        name: authorName,
      },
      datePublished: post.publishedAt,
      description,
      headline: post.title,
      mainEntityOfPage: {
        "@id": url,
        "@type": "WebPage",
      },
      publisher: {
        "@type": "Organization",
        name: "Tandra Peters Consulting",
        url: origin,
      },
      ...(imageUrl ? { image: [imageUrl] } : {}),
    };

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(data);
    document.head.append(script);
    return () => {
      script.remove();
    };
  }, [post, path]);

  return null;
};
