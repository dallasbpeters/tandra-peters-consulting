import type { IncomingMessage, ServerResponse } from "node:http";

import type { Plugin } from "vite";

import { captureDeskLead } from "../api/lib/desk-capture.js";
import { readRequestBody } from "./request-body";

const ROOF_CHECK_PATH = "/api/roof-check";

const pathnameOnly = (url: string | undefined): string =>
  (url ?? "").split("?")[0] ?? "";

const str = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const setCors = (res: ServerResponse): void => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

const json = (res: ServerResponse, status: number, body: unknown): void => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

const readWriteToken = (env: Record<string, string>): string | undefined =>
  env.SANITY_WRITE_TOKEN?.trim() ||
  env.SANITY_API_WRITE_TOKEN?.trim() ||
  process.env.SANITY_WRITE_TOKEN?.trim() ||
  process.env.SANITY_API_WRITE_TOKEN?.trim() ||
  undefined;

const parseJson = (buffer: Buffer): Record<string, unknown> => {
  if (!buffer.length) {
    return {};
  }
  try {
    return JSON.parse(buffer.toString("utf-8")) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const concernSummary = (body: Record<string, unknown>): string => {
  const concern = str(body.concern);
  const roofAge = str(body.roofAge);
  const timing = str(body.timing);
  return [
    concern,
    roofAge ? `Roof age: ${roofAge}.` : "",
    timing ? `Timing: ${timing}.` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
};

const normalizeCaptureBody = (body: Record<string, unknown>) => ({
  area: str(body.area),
  contactMethod: str(body.contactMethod),
  contactName: str(body.fullName),
  need: concernSummary(body),
  nextStep: str(body.timing) === "Not urgent" ? "send-checklist" : "call-today",
  notes: [
    str(body.address) ? `Address: ${str(body.address)}` : "",
    str(body.campaign) ? `Campaign: ${str(body.campaign)}` : "",
  ]
    .filter(Boolean)
    .join("\n"),
  source: "roof-check-page",
});

const handleRoofCheckRequest = async (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
  env: Record<string, string>
): Promise<void> => {
  if (pathnameOnly(req.url) !== ROOF_CHECK_PATH) {
    next();
    return;
  }

  setCors(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    json(res, 405, { error: "Method not allowed", ok: false });
    return;
  }

  const body = parseJson(await readRequestBody(req));
  if (str(body.company)) {
    json(res, 200, { ok: true });
    return;
  }

  const result = await captureDeskLead(normalizeCaptureBody(body), {
    capturedBy: "Roof-check page",
    sanityWriteToken: readWriteToken(env),
  });
  json(res, result.status, result.body);
};

export const viteRoofCheckApi = (env: Record<string, string>): Plugin => ({
  configureServer(server) {
    // oxlint-disable-next-line no-async-endpoint-handlers
    server.middlewares.use(async (req, res, next) => {
      try {
        await handleRoofCheckRequest(req, res, next, env);
      } catch (error) {
        console.error("[vite-roof-check-api]", error);
        json(res, 500, {
          error:
            error instanceof Error
              ? error.message
              : "Unexpected roof-check capture API error.",
          ok: false,
        });
      }
    });
  },
  name: "vite-roof-check-api",
});
