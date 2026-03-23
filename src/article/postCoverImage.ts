import { stegaClean } from "@sanity/client/stega";

/** Public fallback when a post has no Sanity cover (matches `public/`). */
export const FALLBACK_ARTICLE_COVER = "/roofline.svg";

export const formatArticleCardDate = (iso: string | undefined) => {
  if (!iso) {
    return "";
  }
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
};

/** GROQ `image.asset->url`; strip stega when Visual Editing encodes strings. */
export const postCoverImageSrc = (image: unknown): string | undefined => {
  if (typeof image !== "string") {
    return undefined;
  }
  const t = image.trim();
  if (t.length === 0) {
    return undefined;
  }
  try {
    const cleaned = stegaClean(t);
    if (typeof cleaned === "string" && cleaned.trim().length > 0) {
      return cleaned.trim();
    }
  } catch {
    /* ignore */
  }
  return t;
};
