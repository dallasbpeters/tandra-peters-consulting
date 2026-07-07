/**
 * Public homeowner capture: POST /api/roof-check.
 *
 * Saves a homeowner's roof-check request into private Sanity Desk leads. Unlike
 * the full contact form, this accepts phone-or-email so postcard/social traffic
 * has a low-friction path into Tandra's follow-up queue.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { captureDeskLead } from "./lib/desk-capture.js";

const parseBody = (req: VercelRequest): Record<string, unknown> => {
  const raw = req.body;
  if (raw === null) {
    return {};
  }
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof raw === "object") {
    return raw as Record<string, unknown>;
  }
  return {};
};

const str = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const parseAllowedOrigins = (): string[] => {
  const raw = process.env.ALLOWED_ORIGINS?.trim();
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const isAllowedRequest = (req: VercelRequest): boolean => {
  const allowed = parseAllowedOrigins();
  if (allowed.length === 0) {
    return true;
  }

  const origin = req.headers.origin as string | undefined;
  if (origin && allowed.includes(origin)) {
    return true;
  }

  if (!origin) {
    const host = (req.headers.host ?? "").split(":")[0].toLowerCase();
    for (const allowedOrigin of allowed) {
      try {
        if (new URL(allowedOrigin).hostname.toLowerCase() === host) {
          return true;
        }
      } catch {
        // Ignore malformed env entries.
      }
    }
  }

  return false;
};

const applyCors = (res: VercelResponse, origin: string | undefined): void => {
  const allowed = parseAllowedOrigins();
  if (allowed.length === 0) {
    res.setHeader("Access-Control-Allow-Origin", origin ?? "*");
    if (origin) {
      res.setHeader("Vary", "Origin");
    }
    return;
  }
  if (origin && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
};

const readWriteToken = (): string | undefined =>
  process.env.SANITY_WRITE_TOKEN?.trim() ||
  process.env.SANITY_API_WRITE_TOKEN?.trim() ||
  undefined;

const concernSummary = (body: Record<string, unknown>): string => {
  const concern = str(body.concern);
  const roofAge = str(body.roofAge);
  const timing = str(body.timing);
  const pieces = [
    concern,
    roofAge ? `Roof age: ${roofAge}.` : "",
    timing ? `Timing: ${timing}.` : "",
  ].filter(Boolean);
  return pieces.join("\n\n");
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

const roofCheckHandler = async (
  req: VercelRequest,
  res: VercelResponse
): Promise<void> => {
  const origin = req.headers.origin as string | undefined;
  applyCors(res, origin);

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "86400");
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    res.status(405).json({ error: "Method not allowed", ok: false });
    return;
  }

  if (!isAllowedRequest(req)) {
    res.status(403).json({ error: "Forbidden", ok: false });
    return;
  }

  const body = parseBody(req);
  if (str(body.company)) {
    res.status(200).json({ ok: true });
    return;
  }

  const result = await captureDeskLead(normalizeCaptureBody(body), {
    capturedBy: "Roof-check page",
    sanityWriteToken: readWriteToken(),
  });

  res.status(result.status).json(result.body);
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    await roofCheckHandler(req, res);
  } catch (error) {
    console.error("[api/roof-check]", error);
    if (!res.headersSent) {
      const origin = req.headers.origin as string | undefined;
      applyCors(res, origin);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Unexpected roof-check capture error.",
        ok: false,
      });
    }
  }
}
