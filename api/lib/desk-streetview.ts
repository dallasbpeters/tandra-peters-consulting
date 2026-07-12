/**
 * Google Street View availability helpers.
 *
 * The Desk Walk detail drawer renders an INTERACTIVE (pannable/zoomable) Street
 * View via the Maps Embed API, which needs a browser-usable key. To avoid ever
 * mounting an empty/broken panorama, we still GATE on Google's Street View
 * *metadata* endpoint here — a free check that says whether imagery exists for a
 * location. This runs server-side with `GOOGLE_STREETVIEW_API_KEY` so that key
 * stays off the client; only the availability boolean is returned to the browser.
 */

const METADATA_URL = "https://maps.googleapis.com/maps/api/streetview/metadata";
const IMAGE_URL = "https://maps.googleapis.com/maps/api/streetview";

// 16:9 street-facing frame (matches the drawer's reserved box). 640 is the
// widest the free Static Street View tier allows on the long edge.
const IMAGE_SIZE = "640x360";
const IMAGE_FOV = "80";
const IMAGE_PITCH = "0";

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
 * Ask Google whether Street View imagery exists for this location. `status`
 * is `"OK"` only when a usable panorama is available; everything else (incl.
 * `ZERO_RESULTS`) means we should show a fallback rather than a panorama.
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
    const body = (await response.json()) as { status?: string };
    return body.status === "OK"
      ? { available: true }
      : { available: false, reason: "no-imagery" };
  } catch {
    return { available: false, reason: "error" };
  }
};

/**
 * Build the Static Street View image URL for one location. Returns null when
 * there's no key or no usable location so the caller can fall back gracefully.
 * `return_error_code=true` makes Google answer with a real HTTP error instead
 * of its gray "no imagery" placeholder image, so a missing panorama surfaces as
 * a status code rather than a broken-looking photo.
 */
export const streetViewImageUrl = (
  params: StreetViewParams,
  apiKey: string | undefined
): string | null => {
  const key = apiKey?.trim();
  if (!key) {
    return null;
  }
  const location = locationValue(params);
  if (!location) {
    return null;
  }
  const query = new URLSearchParams({
    fov: IMAGE_FOV,
    key,
    location,
    pitch: IMAGE_PITCH,
    return_error_code: "true",
    size: IMAGE_SIZE,
    source: "outdoor",
  });
  return `${IMAGE_URL}?${query.toString()}`;
};

export type StreetViewImageResult =
  | { body: ArrayBuffer; contentType: string; ok: true }
  | { ok: false; reason: StreetViewReason; status: number };

/**
 * Fetch the Static Street View image bytes server-side so the API key never
 * reaches the browser. The caller streams these bytes back to the client, which
 * renders them as a plain <img> (no client-exposed key, no referrer config).
 */
export const streetViewImage = async (
  params: StreetViewParams,
  deps: StreetViewDeps
): Promise<StreetViewImageResult> => {
  const url = streetViewImageUrl(params, deps.apiKey);
  if (!url) {
    const apiKey = deps.apiKey?.trim();
    return {
      ok: false,
      reason: apiKey ? "no-location" : "missing-key",
      status: apiKey ? 400 : 500,
    };
  }
  const fetchImpl = deps.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(url);
    if (!response.ok) {
      return { ok: false, reason: "no-imagery", status: 404 };
    }
    const body = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    return { body, contentType, ok: true };
  } catch {
    return { ok: false, reason: "error", status: 502 };
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
