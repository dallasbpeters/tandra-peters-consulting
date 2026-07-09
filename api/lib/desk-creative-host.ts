/**
 * Hosts postcard creatives (front image, QR, or a whole back HTML doc) as stable
 * remote URLs so providers with inline-size limits can reference them by URL.
 *
 * Lob caps inline `front`/`back` HTML at 10,000 characters; our creatives embed
 * large base64 data-URIs (the Ad Builder front thumbnail, and the QR), which
 * blow past that. Uploading those bytes to Sanity yields a stable
 * `cdn.sanity.io` URL — the repo already writes to Sanity with SANITY_WRITE_TOKEN,
 * and Sanity content-addresses assets (identical bytes dedupe to one asset), so
 * this is the right, already-provisioned hosting mechanism (no new infra/env).
 *
 * Server-only: reads SANITY_WRITE_TOKEN from the environment; never exposed to
 * the client. A per-process cache keyed by content hash avoids re-uploading the
 * same creative within a warm lambda.
 */
import { createHash } from "node:crypto";

import { createClient } from "@sanity/client";
import type { SanityClient } from "@sanity/client";

const SANITY_PROJECT_ID = "7irm699i";
const SANITY_DATASET = "production";
const SANITY_API_VERSION = "2026-05-29";

const DATA_URL_RE = /^data:([^;,]*?)(;base64)?,(.*)$/s;

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

const writeToken = (): string | undefined =>
  process.env.SANITY_WRITE_TOKEN?.trim() ||
  process.env.SANITY_API_WRITE_TOKEN?.trim() ||
  undefined;

const client = (token: string): SanityClient =>
  createClient({
    apiVersion: SANITY_API_VERSION,
    dataset: SANITY_DATASET,
    projectId: SANITY_PROJECT_ID,
    token,
    useCdn: false,
  });

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

const uploadAsset = async (
  kind: "file" | "image",
  buffer: Buffer,
  contentType: string,
  extension: string
): Promise<HostedReference> => {
  const token = writeToken();
  if (!token) {
    return {
      error:
        "SANITY_WRITE_TOKEN is not set — cannot host the creative for providers that require a URL.",
      ok: false,
    };
  }
  const hash = createHash("sha256").update(buffer).digest("hex");
  const cached = uploadCache.get(hash);
  if (cached) {
    return { ok: true, url: cached };
  }
  const asset = await client(token).assets.upload(kind, buffer, {
    contentType,
    filename: `desk-creative-${hash.slice(0, 16)}.${extension}`,
  });
  uploadCache.set(hash, asset.url);
  return { ok: true, url: asset.url };
};

/**
 * Resolve an image reference to a remote URL. Passes through existing http(s)
 * URLs; uploads base64 data-URIs to Sanity and returns the CDN URL.
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
  return await uploadAsset(
    "image",
    parts.buffer,
    parts.contentType || "image/png",
    parts.extension === "bin" ? "png" : parts.extension
  );
};

/** Host an HTML string as a text/html file asset and return its URL. */
export const hostHtmlReference = async (
  html: string
): Promise<HostedReference> =>
  await uploadAsset("file", Buffer.from(html, "utf-8"), "text/html", "html");
