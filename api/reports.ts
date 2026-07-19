import { createClient } from "@sanity/client";
/**
 * /api/reports — saved photo-report library + version history.
 *
 *   GET    /api/reports            → { reports: ReportSummary[] }
 *   GET    /api/reports?id=<id>    → { report: ReportDetail }
 *   POST   /api/reports            → append a version (or create the report)
 *   DELETE /api/reports?id=<id>    → delete the report (+ best-effort blob cleanup)
 *
 * Google-auth gated (bearer ID token). Report data + version snapshots live in
 * the Sanity `reportDocument`; binary assets live in Vercel Blob.
 */
import { del } from "@vercel/blob";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { isAllowedGoogleUser, parseGoogleIdToken } from "./lib/google-auth.js";

const SANITY_PROJECT_ID = "7irm699i";
const SANITY_DATASET = "production";
const SANITY_API_VERSION = "2026-05-29";

const MAX_REPORT_BYTES = 4_000_000;

interface SavedVersion {
  _key?: string;
  versionNumber?: number;
  savedAt?: string;
  savedBy?: string;
  report?: string;
  pdfUrl?: string;
  previewUrl?: string;
  driveFileId?: string;
  driveWebViewLink?: string;
}

interface ReportDoc {
  _id: string;
  title?: string;
  propertyAddress?: string;
  updatedAt?: string;
  savedBy?: string;
  versions?: SavedVersion[];
}

const readWriteToken = (): string | undefined =>
  process.env.SANITY_WRITE_TOKEN?.trim() ||
  process.env.SANITY_API_WRITE_TOKEN?.trim() ||
  undefined;

const parseBearerToken = (header: string | undefined): string | null => {
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length).trim() || null;
};

const sanitizeString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const randomKey = (): string =>
  `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const applyCors = (res: VercelResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

const parseBody = (req: VercelRequest): Record<string, unknown> => {
  const raw = req.body;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (raw && typeof raw === "object") {
    return raw as Record<string, unknown>;
  }
  return {};
};

type SanityClient = ReturnType<typeof createClient>;

const listReports = async (client: SanityClient, res: VercelResponse) => {
  const reports = await client.fetch(
    `*[_type == "reportDocument"] | order(updatedAt desc){
      "id": _id, title, propertyAddress, updatedAt, savedBy,
      "versionCount": count(versions),
      "latest": versions[-1]{ versionNumber, savedAt, pdfUrl, previewUrl, driveWebViewLink }
    }`
  );
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ reports });
};

const getReport = async (
  client: SanityClient,
  id: string,
  res: VercelResponse
) => {
  const report = await client.fetch<ReportDoc | null>(
    `*[_type == "reportDocument" && _id == $id][0]`,
    { id }
  );
  if (!report) {
    res.status(404).json({ error: "Report not found." });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ report });
};

const buildVersion = (
  body: Record<string, unknown>,
  versionNumber: number,
  email: string
): SavedVersion => ({
  _key: randomKey(),
  driveFileId: sanitizeString(body.driveFileId) || undefined,
  driveWebViewLink: sanitizeString(body.driveWebViewLink) || undefined,
  pdfUrl: sanitizeString(body.pdfUrl),
  previewUrl: sanitizeString(body.previewUrl) || undefined,
  report: sanitizeString(body.report),
  savedAt: new Date().toISOString(),
  savedBy: email,
  versionNumber,
});

const saveVersion = async (
  client: SanityClient,
  req: VercelRequest,
  res: VercelResponse,
  email: string
) => {
  const body = parseBody(req);
  const title = sanitizeString(body.title) || "Untitled report";
  const propertyAddress = sanitizeString(body.propertyAddress);
  const report = sanitizeString(body.report);
  const pdfUrl = sanitizeString(body.pdfUrl);

  if (!(report && pdfUrl)) {
    res.status(400).json({ error: "Missing report state or PDF URL." });
    return;
  }
  if (Buffer.byteLength(report, "utf-8") > MAX_REPORT_BYTES) {
    res.status(413).json({ error: "Report payload is too large." });
    return;
  }

  const id = sanitizeString(body.id);
  const now = new Date().toISOString();

  if (id) {
    const existing = await client.fetch<ReportDoc | null>(
      `*[_type == "reportDocument" && _id == $id][0]{ "versions": versions[]{ versionNumber } }`,
      { id }
    );
    const nextNumber =
      (existing?.versions ?? []).reduce(
        (max, v) => Math.max(max, v.versionNumber ?? 0),
        0
      ) + 1;
    const version = buildVersion(body, nextNumber, email);
    await client
      .patch(id)
      .setIfMissing({ versions: [] })
      .set({ propertyAddress, title, updatedAt: now })
      .append("versions", [version])
      .commit();
    res.status(200).json({ id, ok: true, versionNumber: nextNumber });
    return;
  }

  const version = buildVersion(body, 1, email);
  const created = await client.create({
    _type: "reportDocument",
    propertyAddress,
    savedBy: email,
    title,
    updatedAt: now,
    versions: [version],
  });
  res.status(200).json({ id: created._id, ok: true, versionNumber: 1 });
};

const collectBlobUrls = (doc: ReportDoc | null): string[] => {
  if (!doc?.versions) {
    return [];
  }
  const urls = new Set<string>();
  for (const version of doc.versions) {
    for (const url of [version.pdfUrl, version.previewUrl]) {
      if (url && url.includes("blob.vercel-storage.com")) {
        urls.add(url);
      }
    }
    try {
      const parsed = JSON.parse(version.report ?? "{}") as {
        photos?: { previewUrl?: string }[];
      };
      for (const photo of parsed.photos ?? []) {
        if (photo.previewUrl?.includes("blob.vercel-storage.com")) {
          urls.add(photo.previewUrl);
        }
      }
    } catch {
      // Ignore unparseable snapshots.
    }
  }
  return [...urls];
};

const deleteReport = async (
  client: SanityClient,
  id: string,
  res: VercelResponse
) => {
  const doc = await client.fetch<ReportDoc | null>(
    `*[_type == "reportDocument" && _id == $id][0]`,
    { id }
  );
  const urls = collectBlobUrls(doc);
  if (urls.length > 0) {
    await del(urls).catch((error) => {
      console.error("[api/reports] blob cleanup", error);
    });
  }
  await client.delete(id);
  res.status(200).json({ id, ok: true });
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  applyCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const bearer = parseBearerToken(req.headers.authorization);
  const user = bearer ? parseGoogleIdToken(bearer) : null;
  if (!(user && isAllowedGoogleUser(user))) {
    res.status(403).json({ error: "Google account is not authorized." });
    return;
  }

  const token = readWriteToken();
  if (!token) {
    res.status(500).json({
      error: "SANITY_WRITE_TOKEN or SANITY_API_WRITE_TOKEN is not set.",
    });
    return;
  }

  const client = createClient({
    apiVersion: SANITY_API_VERSION,
    dataset: SANITY_DATASET,
    projectId: SANITY_PROJECT_ID,
    token,
    useCdn: false,
  });

  const id = typeof req.query.id === "string" ? req.query.id.trim() : "";

  try {
    if (req.method === "GET") {
      await (id ? getReport(client, id, res) : listReports(client, res));
      return;
    }
    if (req.method === "POST") {
      await saveVersion(client, req, res, user.email);
      return;
    }
    if (req.method === "DELETE") {
      const targetId = id || sanitizeString(parseBody(req).id);
      if (!targetId) {
        res.status(400).json({ error: "Missing report id." });
        return;
      }
      await deleteReport(client, targetId, res);
      return;
    }
    res.setHeader("Allow", "GET, POST, DELETE, OPTIONS");
    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("[api/reports]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unexpected error.",
    });
  }
}
