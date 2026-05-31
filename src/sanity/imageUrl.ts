import { SANITY_DATASET, SANITY_PROJECT_ID } from "./projectDetails";

export type SanityImageTransform = {
  w?: number;
  h?: number;
  fit?: "clip" | "crop" | "fill" | "fillmax" | "max" | "scale" | "min";
  q?: number;
  dpr?: 1 | 2 | 3;
  /** Output format. Defaults to webp per Sanity CDN `fm` param. */
  fm?: "webp" | "jpg" | "png" | "pjpg";
};

const SANITY_CDN_PREFIX = `/images/${SANITY_PROJECT_ID}/${SANITY_DATASET}/`;

export const isSanityCdnUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "cdn.sanity.io" &&
      parsed.pathname.startsWith(SANITY_CDN_PREFIX)
    );
  } catch {
    return false;
  }
};

/** Append Sanity CDN transform params. Non-Sanity URLs pass through unchanged. */
export const sanityImageUrl = (url: string, params: SanityImageTransform = {}): string => {
  if (!url || !isSanityCdnUrl(url)) {
    return url;
  }

  const { fm = "webp", q = 80, w, h, fit, dpr } = params;
  const parsed = new URL(url);

  parsed.searchParams.delete("auto");
  parsed.searchParams.set("fm", fm);
  parsed.searchParams.set("q", String(Math.round(q)));

  if (w !== undefined) {
    parsed.searchParams.set("w", String(Math.round(w)));
  }
  if (h !== undefined) {
    parsed.searchParams.set("h", String(Math.round(h)));
  }
  if (fit) {
    parsed.searchParams.set("fit", fit);
  }
  if (dpr !== undefined) {
    parsed.searchParams.set("dpr", String(dpr));
  }

  return parsed.toString();
};
