/**
 * Minimal Sanity reader for the client email. Uses the public query API
 * (no token) since the `production` dataset is public-read, mirroring how the
 * main site fetches published content.
 */
import type { ClientEmailContent } from "./types.js";

const PROJECT_ID = "7irm699i";
const DATASET = "production";
const API_VERSION = "2026-05-29";

const CLIENT_EMAIL_QUERY = `*[_type == "clientEmail"][0]{
  subject,
  previewText,
  greeting,
  body,
  ctaLabel,
  ctaUrl,
  closing,
  "signature": signature->{
    name,
    jobTitle,
    company,
    tagline,
    phone,
    email,
    website,
    "headshotUrl": headshot.asset->url,
    "logoUrl": companyLogo.asset->url
  }
}`;

/** Append Sanity CDN transform params (no-op for non-Sanity URLs). */
export const sanityImage = (
  url: string | undefined,
  params: { w?: number; h?: number; fit?: string } = {}
): string | undefined => {
  if (!url) {
    return;
  }
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "cdn.sanity.io") {
      return url;
    }
    parsed.searchParams.set("fm", "png");
    parsed.searchParams.set("q", "80");
    if (params.w) {
      parsed.searchParams.set("w", String(params.w));
    }
    if (params.h) {
      parsed.searchParams.set("h", String(params.h));
    }
    if (params.fit) {
      parsed.searchParams.set("fit", params.fit);
    }
    return parsed.toString();
  } catch {
    return url;
  }
};

/**
 * Fetch the published Client email document. Returns null on any failure so
 * callers can fall back to static defaults (e.g. offline previews).
 */
export const fetchClientEmail =
  async (): Promise<ClientEmailContent | null> => {
    const url =
      `https://${PROJECT_ID}.apicdn.sanity.io/v${API_VERSION}/data/query/${DATASET}` +
      `?query=${encodeURIComponent(CLIENT_EMAIL_QUERY)}`;

    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        return null;
      }
      const json = (await res.json()) as { result?: ClientEmailContent | null };
      return json.result ?? null;
    } catch {
      return null;
    }
  };
