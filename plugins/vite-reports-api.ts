/**
 * Serves /api/reports (GET / POST / DELETE) during `vite` dev so the Photo
 * Report library + version history works locally without `vercel dev`. Mirrors
 * api/reports.ts. Requires SANITY_WRITE_TOKEN (+ BLOB_READ_WRITE_TOKEN for
 * delete cleanup) in repo-root `.env.local`. Google-gated like production.
 */
import type { ServerResponse } from "node:http";

import { createClient } from "@sanity/client";
import { del } from "@vercel/blob";
import type { Plugin } from "vite";

import { parseGoogleIdToken } from "../api/lib/google-auth";
import { readRequestBody } from "./request-body";

const PATH = "/api/reports";
const SANITY_PROJECT_ID = "7irm699i";
const SANITY_DATASET = "production";
const SANITY_API_VERSION = "2026-05-29";
const MAX_REPORT_BYTES = 4_000_000;

interface SavedVersion {
  _key?: string;
  driveFileId?: string;
  driveWebViewLink?: string;
  pdfUrl?: string;
  previewUrl?: string;
  report?: string;
  savedAt?: string;
  savedBy?: string;
  versionNumber?: number;
}

interface ReportDoc {
  _id: string;
  propertyAddress?: string;
  savedBy?: string;
  title?: string;
  updatedAt?: string;
  versions?: SavedVersion[];
}

const pathnameOnly = (url: string | undefined): string =>
  (url ?? "").split("?")[0] ?? "";

const queryId = (url: string | undefined): string => {
  const search = (url ?? "").split("?")[1] ?? "";
  const value = new URLSearchParams(search).get("id");
  return value ? value.trim() : "";
};

const setCors = (res: ServerResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

const json = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

const parseBearerToken = (header: string | undefined): string | null => {
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length).trim() || null;
};

const normalize = (value: string): string => value.trim().toLowerCase();

const isAllowedGoogleUserFromEnv = (
  user: { email: string; hostedDomain?: string },
  env: Record<string, string>
): boolean => {
  const emails = new Set(
    (env.GOOGLE_ALLOWED_EMAILS ?? env.VITE_GOOGLE_ALLOWED_EMAILS ?? "")
      .split(",")
      .map((entry) => normalize(entry))
      .filter(Boolean)
  );
  const domain = normalize(
    env.GOOGLE_ALLOWED_DOMAIN ?? env.VITE_GOOGLE_ALLOWED_DOMAIN ?? ""
  );
  if (emails.size === 0 && !domain) {
    return false;
  }
  const email = normalize(user.email);
  if (emails.has(email)) {
    return true;
  }
  return Boolean(domain && normalize(user.hostedDomain ?? "") === domain);
};

const sanitizeString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const randomKey = (): string =>
  `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

type SanityClient = ReturnType<typeof createClient>;

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

const listReports = async (client: SanityClient, res: ServerResponse) => {
  const reports = await client.fetch(
    `*[_type == "reportDocument"] | order(updatedAt desc){
      "id": _id, title, propertyAddress, updatedAt, savedBy,
      "versionCount": count(versions),
      "latest": versions[-1]{ versionNumber, savedAt, pdfUrl, previewUrl, driveWebViewLink }
    }`
  );
  res.setHeader("Cache-Control", "no-store");
  json(res, 200, { reports });
};

const getReport = async (
  client: SanityClient,
  id: string,
  res: ServerResponse
) => {
  const report = await client.fetch<ReportDoc | null>(
    `*[_type == "reportDocument" && _id == $id][0]`,
    { id }
  );
  if (!report) {
    json(res, 404, { error: "Report not found." });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  json(res, 200, { report });
};

const saveVersion = async (
  client: SanityClient,
  body: Record<string, unknown>,
  res: ServerResponse,
  email: string
) => {
  const title = sanitizeString(body.title) || "Untitled report";
  const propertyAddress = sanitizeString(body.propertyAddress);
  const report = sanitizeString(body.report);
  const pdfUrl = sanitizeString(body.pdfUrl);

  if (!(report && pdfUrl)) {
    json(res, 400, { error: "Missing report state or PDF URL." });
    return;
  }
  if (Buffer.byteLength(report, "utf-8") > MAX_REPORT_BYTES) {
    json(res, 413, { error: "Report payload is too large." });
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
    json(res, 200, { id, ok: true, versionNumber: nextNumber });
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
  json(res, 200, { id: created._id, ok: true, versionNumber: 1 });
};

const deleteReport = async (
  client: SanityClient,
  id: string,
  res: ServerResponse,
  blobToken: string | undefined
) => {
  const doc = await client.fetch<ReportDoc | null>(
    `*[_type == "reportDocument" && _id == $id][0]`,
    { id }
  );
  const urls = collectBlobUrls(doc);
  if (urls.length > 0 && blobToken) {
    await del(urls, { token: blobToken }).catch((error) => {
      console.error("[vite-reports-api] blob cleanup", error);
    });
  }
  await client.delete(id);
  json(res, 200, { id, ok: true });
};

export const viteReportsApi = (env: Record<string, string>): Plugin => ({
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (pathnameOnly(req.url) !== PATH) {
        next();
        return;
      }

      setCors(res);

      if (req.method === "OPTIONS") {
        res.statusCode = 204;
        res.end();
        return;
      }

      const bearer = parseBearerToken(req.headers.authorization);
      const user = bearer ? parseGoogleIdToken(bearer) : null;
      if (!(user && isAllowedGoogleUserFromEnv(user, env))) {
        json(res, 403, { error: "Google account is not authorized." });
        return;
      }

      const token =
        env.SANITY_WRITE_TOKEN?.trim() ||
        env.SANITY_API_WRITE_TOKEN?.trim() ||
        "";
      if (!token) {
        json(res, 500, {
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

      const id = queryId(req.url);

      try {
        if (req.method === "GET") {
          await (id ? getReport(client, id, res) : listReports(client, res));
          return;
        }
        if (req.method === "POST") {
          const raw = await readRequestBody(req);
          const body = raw.length
            ? (JSON.parse(raw.toString("utf-8")) as Record<string, unknown>)
            : {};
          await saveVersion(client, body, res, user.email);
          return;
        }
        if (req.method === "DELETE") {
          const raw = await readRequestBody(req);
          const body = raw.length
            ? (JSON.parse(raw.toString("utf-8")) as Record<string, unknown>)
            : {};
          const targetId = id || sanitizeString(body.id);
          if (!targetId) {
            json(res, 400, { error: "Missing report id." });
            return;
          }
          await deleteReport(client, targetId, res, env.BLOB_READ_WRITE_TOKEN);
          return;
        }
        json(res, 405, { error: "Method not allowed" });
      } catch (error) {
        console.error("[vite-reports-api]", error);
        json(res, 500, {
          error: error instanceof Error ? error.message : "Unexpected error.",
        });
      }
    });
  },
  name: "vite-reports-api",
});
