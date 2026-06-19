const SANITY_PROJECT_ID = "7irm699i";
const SANITY_DATASET = "production";
const SANITY_CDN_PREFIX = `/images/${SANITY_PROJECT_ID}/${SANITY_DATASET}/`;

interface SanityImageTransform {
  fit?: "clip" | "crop" | "fill" | "fillmax" | "max" | "scale" | "min";
  fm?: "webp" | "jpg" | "png" | "pjpg";
  h?: number;
  q?: number;
  w?: number;
}

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

export const sanityImageUrl = (
  url: string,
  params: SanityImageTransform = {}
): string => {
  if (!(url && isSanityCdnUrl(url))) {
    return url;
  }

  const { fm = "webp", q = 80, w, h, fit } = params;
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

  return parsed.toString();
};
