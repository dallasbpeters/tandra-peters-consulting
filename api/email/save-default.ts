/**
 * POST /api/email/save-default → { ok: true }
 *
 * Body: { content: ClientEmailContent }
 *
 * Saves the composer's current message fields onto the published `clientEmail`
 * singleton so it becomes the default the composer (and react-email preview)
 * load next time. The signature reference is left untouched. Google-auth gated.
 *
 * Env:
 *   SANITY_WRITE_TOKEN or SANITY_API_WRITE_TOKEN — Sanity token with write access.
 */

import { createClient } from "@sanity/client";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import type { ClientEmailContent } from "../../server/email/types.js";

import {
  authorizeSeoDashboardRequest,
  DashboardAuthError,
} from "../../server/seo/googleAuth.js";

const SANITY_PROJECT_ID = "7irm699i";
const SANITY_DATASET = "production";
const SANITY_API_VERSION = "2026-05-29";
const CLIENT_EMAIL_DOCUMENT_ID = "clientEmail";

const readWriteToken = (): string | undefined =>
  process.env.SANITY_WRITE_TOKEN?.trim() ||
  process.env.SANITY_API_WRITE_TOKEN?.trim() ||
  undefined;

const applyCors = (res: VercelResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

const parseBody = (req: VercelRequest): Record<string, unknown> => {
  const raw = req.body;
  if (raw == null) {
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

const rand = () => Math.random().toString(36).slice(2, 10);

type LooseObject = Record<string, unknown> & { _key?: string; _type?: string };

/** Ensure every block, span, and markDef carries a `_key` (Sanity rejects array items without one). */
const normalizeBlocks = (input: unknown): LooseObject[] => {
  if (!Array.isArray(input)) {
    return [];
  }
  return input
    .map((raw, i): LooseObject | null => {
      if (!raw || typeof raw !== "object") {
        return null;
      }
      const block: LooseObject = { ...(raw as LooseObject) };
      if (!block._key) {
        block._key = `b-${i}-${rand()}`;
      }

      if (Array.isArray(block.children)) {
        block.children = block.children
          .map((child, ci): LooseObject | null => {
            if (!child || typeof child !== "object") {
              return null;
            }
            const span: LooseObject = { ...(child as LooseObject) };
            if (!span._key) {
              span._key = `s-${i}-${ci}-${rand()}`;
            }
            return span;
          })
          .filter((c): c is LooseObject => c !== null);
      }

      if (Array.isArray(block.markDefs)) {
        block.markDefs = block.markDefs
          .map((def, di): LooseObject | null => {
            if (!def || typeof def !== "object") {
              return null;
            }
            const markDef: LooseObject = { ...(def as LooseObject) };
            if (!markDef._key) {
              markDef._key = `m-${i}-${di}-${rand()}`;
            }
            return markDef;
          })
          .filter((d): d is LooseObject => d !== null);
      }

      return block;
    })
    .filter((b): b is LooseObject => b !== null);
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
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    await authorizeSeoDashboardRequest(req.headers.authorization);

    const token = readWriteToken();
    if (!token) {
      res.status(503).json({
        error:
          "Saving defaults is not configured (missing SANITY_WRITE_TOKEN).",
      });
      return;
    }

    const body = parseBody(req);
    const content = (body.content as ClientEmailContent | undefined) ?? {};

    const fields = {
      subject: str(content.subject),
      previewText: str(content.previewText),
      greeting: str(content.greeting),
      body: normalizeBlocks(content.body),
      ctaLabel: str(content.ctaLabel),
      ctaUrl: str(content.ctaUrl),
      closing: str(content.closing),
    };

    const client = createClient({
      projectId: SANITY_PROJECT_ID,
      dataset: SANITY_DATASET,
      apiVersion: SANITY_API_VERSION,
      token,
      useCdn: false,
    });

    await client
      .transaction()
      .createIfNotExists({
        _id: CLIENT_EMAIL_DOCUMENT_ID,
        _type: "clientEmail",
      })
      .patch(CLIENT_EMAIL_DOCUMENT_ID, (p) => p.set(fields))
      .commit();

    console.info("[api/email/save-default]", { blocks: fields.body.length });
    res.status(200).json({ ok: true });
  } catch (error) {
    if (error instanceof DashboardAuthError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error("[api/email/save-default]", error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Could not save default email.",
    });
  }
}
