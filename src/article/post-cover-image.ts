import { stegaClean } from "@sanity/client/stega";

import type { SanityImageTransform } from "../sanity/image-url";
import { sanityImageUrl } from "../sanity/image-url";

/** Public fallback when a post has no Sanity cover (matches `public/`). */
export const FALLBACK_ARTICLE_COVER = "/roofline.svg";

export const formatArticleCardDate = (iso: string | undefined) => {
  if (!iso) {
    return "";
  }
  try {
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
};

/** GROQ `image.asset->url`; strip stega when Visual Editing encodes strings. */
export const postCoverImageSrc = (
  image: unknown,
  params?: SanityImageTransform
): string | undefined => {
  if (typeof image !== "string") {
    return;
  }
  const t = image.trim();
  if (t.length === 0) {
    return;
  }
  try {
    const cleaned = stegaClean(t);
    if (typeof cleaned === "string" && cleaned.trim().length > 0) {
      return sanityImageUrl(cleaned.trim(), params);
    }
  } catch {
    /* ignore */
  }
  return sanityImageUrl(t, params);
};
