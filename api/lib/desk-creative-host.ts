/**
 * Hosts postcard creatives (front image, QR, or a whole back HTML doc) as stable
 * PUBLIC remote URLs so mail providers with inline-size limits (Lob, Stannp,
 * PostGrid) can reference them by URL and fetch them without auth.
 *
 * Why Vercel Blob (not Sanity): this previously uploaded to Sanity assets and
 * returned `cdn.sanity.io` URLs. Those URLs are publicly fetchable, BUT Sanity
 * serves hosted HTML *file* assets as `text/html` with a restrictive
 * `content-security-policy: default-src 'self'` header — unsuitable as a
 * provider-fetched creative URL: Lob's `front`/`back`-by-URL expects a
 * raster/PDF asset, and the CSP blocks the creative's cross-origin subresources
 * (Google Fonts, the tandra.me logo). Vercel Blob serves every object publicly
 * with the correct `content-type` and no CSP, and it is already the repo's
 * public-object store (Remotion renders, ElevenLabs voiceovers) — so it is the
 * right host for creatives handed to third-party mailers.
 *
 * Server-only: reads BLOB_READ_WRITE_TOKEN from the environment (auto-injected
 * when a Vercel Blob store is linked to the project; set it in `.env.local` for
 * local dev). Never exposed to the client. A per-process cache keyed by content
 * SHA-256 avoids re-uploading the same creative within a warm lambda.
 */
import { createHash } from "node:crypto";

import { put } from "@vercel/blob";

const DATA_URL_RE = /^data:([^;,]*?)(;base64)?,(.*)$/s;

/** Blob key prefix so postcard creatives are grouped in the store. */
const BLOB_DIR = "desk-creatives";

export const isHttpUrl = (value: string): boolean =>
  /^https?:\/\//i.test(value);

export interface HostedReference {
  error?: string;
  ok: boolean;
  url?: string;
}

interface DataUrlParts {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

// content hash → hosted URL, so repeated submits of the same creative reuse it.
const uploadCache = new Map<string, string>();

const blobToken = (): string | undefined =>
  process.env.BLOB_READ_WRITE_TOKEN?.trim() || undefined;

const parseDataUrl = (value: string): DataUrlParts | null => {
  const match = value.match(DATA_URL_RE);
  if (!match) {
    return null;
  }
  const contentType = match[1] || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const data = match[3] ?? "";
  const buffer = isBase64
    ? Buffer.from(data, "base64")
    : Buffer.from(decodeURIComponent(data), "utf-8");
  const extension = contentType.split("/")[1]?.split("+")[0] || "bin";
  return { buffer, contentType, extension };
};

/**
 * Upload bytes to Vercel Blob as a public object and return its URL. The blob
 * key is the content SHA-256 so identical creatives dedupe to one object
 * (`allowOverwrite` makes a re-upload of the same bytes idempotent across cold
 * starts). Returns `{ ok: false }` with a clear message on missing token/error.
 */
const uploadBuffer = async (
  buffer: Buffer,
  contentType: string,
  extension: string
): Promise<HostedReference> => {
  const token = blobToken();
  if (!token) {
    return {
      error:
        "BLOB_READ_WRITE_TOKEN is not set — cannot host the creative for providers that require a public URL. Attach a Vercel Blob store to the project (or set BLOB_READ_WRITE_TOKEN in .env.local).",
      ok: false,
    };
  }
  const hash = createHash("sha256").update(buffer).digest("hex");
  const cached = uploadCache.get(hash);
  if (cached) {
    return { ok: true, url: cached };
  }
  try {
    const { url } = await put(`${BLOB_DIR}/${hash}.${extension}`, buffer, {
      access: "public",
      addRandomSuffix: false,
      // Same content-hash key ⇒ identical bytes, so overwriting is a no-op that
      // keeps the call idempotent when the object already exists.
      allowOverwrite: true,
      contentType,
      token,
    });
    uploadCache.set(hash, url);
    return { ok: true, url };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? `Vercel Blob upload failed: ${error.message}`
          : "Vercel Blob upload failed.",
      ok: false,
    };
  }
};

/**
 * Resolve an image reference to a public remote URL. Passes through existing
 * http(s) URLs; uploads base64 data-URIs to Vercel Blob and returns the URL.
 */
export const hostImageReference = async (
  value: string | undefined
): Promise<HostedReference> => {
  if (!value) {
    return { error: "No creative provided.", ok: false };
  }
  if (isHttpUrl(value)) {
    return { ok: true, url: value };
  }
  const parts = parseDataUrl(value);
  if (!parts) {
    return { error: "Creative must be a URL or base64 data-URI.", ok: false };
  }
  return await uploadBuffer(
    parts.buffer,
    parts.contentType || "image/png",
    parts.extension === "bin" ? "png" : parts.extension
  );
};

/** Host an HTML string as a public text/html blob and return its URL. */
export const hostHtmlReference = async (
  html: string
): Promise<HostedReference> =>
  await uploadBuffer(Buffer.from(html, "utf-8"), "text/html", "html");
