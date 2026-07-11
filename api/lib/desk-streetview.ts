/**
 * Google Street View helpers — a SINGLE server-side key (`GOOGLE_STREETVIEW_API_KEY`).
 *
 * The Desk Walk detail drawer renders an INTERACTIVE (pannable/zoomable) Street
 * View via the Maps Embed API, which needs a key present in the iframe URL. That
 * key is NOT shipped as a `VITE_` build-time var (those are inlined at build time
 * and were absent from the Vercel bundle → broken panorama in production).
 * Instead, this module runs server-side: it (a) GATES on Google's free Street
 * View *metadata* endpoint so we never mount an empty panorama, and (b) builds
 * the fully-formed Maps Embed URL — key already in it — which the serverless
 * endpoint returns to the browser at RUNTIME. The client depends on no build-time
 * env var. Because the key is embedded in the returned URL (reaching the client),
 * it MUST be an API-restricted key (Maps Embed API + Street View Static API), not
 * a broad key — see `.env.example`.
 */

const METADATA_URL = "https://maps.googleapis.com/maps/api/streetview/metadata";
const EMBED_URL = "https://www.google.com/maps/embed/v1/streetview";

export type StreetViewReason =
  | "missing-key"
  | "no-imagery"
  | "no-location"
  | "error";

export interface StreetViewParams {
  address?: string;
  lat?: number;
  lng?: number;
}

export interface StreetViewMeta {
  available: boolean;
  /**
   * Ready-to-mount Maps Embed API iframe `src` (key already embedded). Present
   * only when `available` is true and coordinates were resolvable.
   */
  embedUrl?: string;
  reason?: StreetViewReason;
}

export interface StreetViewDeps {
  apiKey: string | undefined;
  fetchImpl?: typeof fetch;
}

/** Read the server-side Street View key (never a `VITE_`-prefixed value). */
export const readStreetViewKey = (
  env: Record<string, string | undefined> = process.env
): string | undefined =>
  env.GOOGLE_STREETVIEW_API_KEY?.trim() ||
  env.GOOGLE_MAPS_API_KEY?.trim() ||
  undefined;

const finiteNumber = (value: number | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value);

/**
 * `location=` value for the Google request: prefer real lat/lng, else a
 * free-text address. Returns null when neither is usable so the caller can fall
 * back gracefully instead of firing a doomed request.
 */
const locationValue = (params: StreetViewParams): string | null => {
  if (finiteNumber(params.lat) && finiteNumber(params.lng)) {
    return `${params.lat},${params.lng}`;
  }
  const address = params.address?.trim();
  return address ? address : null;
};

/**
 * Fully-formed Maps Embed API Street View URL the browser mounts in the iframe.
 * The `key` is embedded here and reaches the client, so `GOOGLE_STREETVIEW_API_KEY`
 * MUST be API-restricted (Maps Embed API + Street View Static API), not a broad
 * or HTTP-referrer-restricted key — see the module docs and `.env.example`.
 */
export const buildStreetViewEmbedUrl = (
  apiKey: string,
  lat: number,
  lng: number
): string => {
  const params = new URLSearchParams({
    fov: "90",
    heading: "0",
    key: apiKey,
    location: `${lat},${lng}`,
    pitch: "0",
  });
  return `${EMBED_URL}?${params.toString()}`;
};

/**
 * Ask Google whether Street View imagery exists for this location and, when it
 * does, return the ready-to-mount interactive embed URL. `status` is `"OK"` only
 * when a usable panorama is available; everything else (incl. `ZERO_RESULTS`)
 * yields a fallback rather than a panorama. On `OK` we prefer the panorama's own
 * `location` (snaps to the nearest real imagery) and fall back to the requested
 * coordinates so an address-only lookup can still center the embed.
 */
export const streetViewMetadata = async (
  params: StreetViewParams,
  deps: StreetViewDeps
): Promise<StreetViewMeta> => {
  const apiKey = deps.apiKey?.trim();
  if (!apiKey) {
    return { available: false, reason: "missing-key" };
  }
  const location = locationValue(params);
  if (!location) {
    return { available: false, reason: "no-location" };
  }
  const fetchImpl = deps.fetchImpl ?? fetch;
  try {
    const query = new URLSearchParams({ key: apiKey, location });
    const response = await fetchImpl(`${METADATA_URL}?${query.toString()}`);
    if (!response.ok) {
      return { available: false, reason: "error" };
    }
    const body = (await response.json()) as {
      location?: { lat?: number; lng?: number };
      status?: string;
    };
    if (body.status !== "OK") {
      return { available: false, reason: "no-imagery" };
    }
    const metaLat = body.location?.lat;
    const metaLng = body.location?.lng;
    const lat = finiteNumber(metaLat) ? metaLat : params.lat;
    const lng = finiteNumber(metaLng) ? metaLng : params.lng;
    if (!(finiteNumber(lat) && finiteNumber(lng))) {
      // Imagery exists, but we have no coordinates to center the embed on.
      return { available: false, reason: "no-location" };
    }
    return {
      available: true,
      embedUrl: buildStreetViewEmbedUrl(apiKey, lat, lng),
    };
  } catch {
    return { available: false, reason: "error" };
  }
};

/** Parse + coerce raw query values (strings) into typed Street View params. */
export const streetViewParamsFrom = (
  query: Record<string, string | string[] | undefined>
): StreetViewParams => {
  const first = (value: string | string[] | undefined): string | undefined =>
    Array.isArray(value) ? value[0] : value;
  const latRaw = first(query.lat);
  const lngRaw = first(query.lng);
  const lat = latRaw === undefined ? undefined : Number(latRaw);
  const lng = lngRaw === undefined ? undefined : Number(lngRaw);
  return {
    address: first(query.address),
    lat: finiteNumber(lat) ? lat : undefined,
    lng: finiteNumber(lng) ? lng : undefined,
  };
};
