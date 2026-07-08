/**
 * POST /api/calendar-agent
 *
 * Generates a month of content-calendar proposals grounded in live Desk
 * signals (leads, canvassing targets) and existing site content. Requires an
 * authorized Google session because the planning context includes private
 * Desk data.
 *
 * Expected body: { month: number, year: number, focus?: string }
 * Returns:       { ok, monthKey, proposals: CalendarPlanProposal[] }
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { generateCalendarPlan } from "./lib/calendar-agent.js";
import { isAllowedGoogleUser, parseGoogleIdToken } from "./lib/google-auth.js";

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

const parseBearerToken = (header: string | undefined): string | null => {
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length).trim() || null;
};

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

const authenticate = (req: VercelRequest): string | null => {
  const bearer = parseBearerToken(req.headers.authorization);
  if (!bearer) {
    return null;
  }

  const user = parseGoogleIdToken(bearer);
  if (!(user && isAllowedGoogleUser(user))) {
    return null;
  }

  return user.email;
};

const calendarAgentHandler = async (
  req: VercelRequest,
  res: VercelResponse
): Promise<void> => {
  const origin = req.headers.origin as string | undefined;
  applyCors(res, origin);

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    res.setHeader("Access-Control-Max-Age", "86400");
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    res.status(405).json({ error: "Method not allowed", ok: false });
    return;
  }

  if (!authenticate(req)) {
    res
      .status(401)
      .json({ error: "Missing authorized Google session.", ok: false });
    return;
  }

  const result = await generateCalendarPlan(parseBody(req), {
    groqApiKey: process.env.GROQ_API_KEY,
    sanityToken:
      process.env.SANITY_WRITE_TOKEN?.trim() ||
      process.env.SANITY_API_WRITE_TOKEN?.trim() ||
      process.env.SANITY_API_READ_TOKEN?.trim(),
  });

  res.status(result.status).json(result.body);
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    await calendarAgentHandler(req, res);
  } catch (error) {
    console.error("[api/calendar-agent]", error);
    if (!res.headersSent) {
      const origin = req.headers.origin as string | undefined;
      applyCors(res, origin);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Unexpected calendar agent error.",
        ok: false,
      });
    }
  }
}
