import type { IncomingMessage, ServerResponse } from "node:http";
import { createClient } from "@sanity/client";
import type { Plugin } from "vite";

import { parseGoogleIdToken } from "../api/lib/google-auth";

const AD_VERSIONS_PATH = "/api/ad-versions";
const SANITY_PROJECT_ID = "7irm699i";
const SANITY_DATASET = "production";
const SANITY_API_VERSION = "2026-05-29";
const MAX_CONFIG_BYTES = 200_000;

const pathnameOnly = (url: string | undefined): string =>
  (url ?? "").split("?")[0] ?? "";

const readBody = (req: IncomingMessage): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer | string) => {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });

const setCors = (res: ServerResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
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
  if (domain && normalize(user.hostedDomain ?? "") === domain) {
    return true;
  }
  return false;
};

const sanitizeString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

export const viteAdVersionsApi = (env: Record<string, string>): Plugin => ({
  name: "vite-ad-versions-api",
  configureServer(server) {
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex logic
    server.middlewares.use(async (req, res, next) => {
      if (pathnameOnly(req.url) !== AD_VERSIONS_PATH) {
        next();
        return;
      }

      setCors(res);

      if (req.method === "OPTIONS") {
        res.statusCode = 204;
        res.end();
        return;
      }

      if (req.method !== "POST" && req.method !== "DELETE") {
        json(res, 405, { error: "Method not allowed" });
        return;
      }

      const bearer = parseBearerToken(req.headers.authorization);
      if (!bearer) {
        json(res, 401, { error: "Missing Google authorization token." });
        return;
      }

      const user = parseGoogleIdToken(bearer);
      if (!(user && isAllowedGoogleUserFromEnv(user, env))) {
        json(res, 403, {
          error: "Google account is not authorized for ad versions.",
        });
        return;
      }

      const token =
        env.SANITY_WRITE_TOKEN?.trim() ||
        env.SANITY_API_WRITE_TOKEN?.trim() ||
        process.env.SANITY_WRITE_TOKEN?.trim() ||
        process.env.SANITY_API_WRITE_TOKEN?.trim() ||
        "";
      if (!token) {
        json(res, 500, {
          error: "SANITY_WRITE_TOKEN or SANITY_API_WRITE_TOKEN is not set.",
        });
        return;
      }

      try {
        const bodyBuffer = await readBody(req);
        const body = bodyBuffer.length
          ? (JSON.parse(bodyBuffer.toString("utf8")) as {
              id?: unknown;
              name?: unknown;
              config?: unknown;
            })
          : {};

        const client = createClient({
          projectId: SANITY_PROJECT_ID,
          dataset: SANITY_DATASET,
          apiVersion: SANITY_API_VERSION,
          token,
          useCdn: false,
        });

        if (req.method === "DELETE") {
          const id = sanitizeString(body.id);
          if (!id) {
            json(res, 400, { error: "Missing version id." });
            return;
          }
          await client.delete(id);
          json(res, 200, { ok: true, id });
          return;
        }

        const name = sanitizeString(body.name);
        const config = sanitizeString(body.config);
        if (!(name && config)) {
          json(res, 400, { error: "Missing version name or config." });
          return;
        }
        if (Buffer.byteLength(config, "utf8") > MAX_CONFIG_BYTES) {
          json(res, 413, { error: "Config payload is too large." });
          return;
        }

        const created = await client.create({
          _type: "adCreativeVersion",
          name,
          config,
          savedAt: new Date().toISOString(),
          savedBy: user.email,
        });

        json(res, 200, { ok: true, id: created._id, name: created.name });
      } catch (error) {
        console.error("[vite-ad-versions-api]", error);
        json(res, 500, {
          error:
            error instanceof Error
              ? error.message
              : "Unexpected ad version error.",
        });
      }
    });
  },
});
