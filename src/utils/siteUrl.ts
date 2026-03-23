/** Canonical site origin for JSON-LD, canonical URLs, and OG tags. */
export const resolveSiteOrigin = (): string => {
  const fromEnv = import.meta.env.VITE_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) {
    return fromEnv;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "https://www.tandra.me";
};

/**
 * Public URL to put in share dialogs. Uses `VITE_SITE_URL` + current route so
 * Facebook/LinkedIn/X get a real https link (localhost URLs are rejected or useless).
 */
export const buildSharePageUrl = (
  pathname: string,
  search: string,
  hash: string,
): string => {
  const origin = resolveSiteOrigin();
  return `${origin}${pathname}${search}${hash}`;
};
