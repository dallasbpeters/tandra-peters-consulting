import type { ServerResponse } from "node:http";

import { createClient } from "@sanity/client";
import { Resend } from "resend";
import type { Plugin } from "vite";

import { listAttioPeople, postAttioPersonNote } from "../server/email/attio.js";
import {
  listEmailContacts,
  mergeRecipients,
} from "../server/email/contactsStore.js";
import { fetchClientEmail } from "../server/email/sanity.js";
import { renderClientEmail } from "../server/email/template.js";
import type {
  ClientEmailContent,
  EmailAssets,
  EmailRecipient,
} from "../server/email/types.js";
import {
  authorizeSeoDashboardRequest,
  DashboardAuthError,
} from "../server/seo/googleAuth.js";
import { readRequestBody } from "./request-body";

const RENDER_PATH = "/api/email/render";
const RECIPIENTS_PATH = "/api/email/recipients";
const SEND_PATH = "/api/email/send";
const SAVE_DEFAULT_PATH = "/api/email/save-default";
const EMAIL_PATHS = new Set([
  RENDER_PATH,
  RECIPIENTS_PATH,
  SEND_PATH,
  SAVE_DEFAULT_PATH,
]);

const SANITY_PROJECT_ID = "7irm699i";
const SANITY_DATASET = "production";
const SANITY_API_VERSION = "2026-05-29";
const CLIENT_EMAIL_DOCUMENT_ID = "clientEmail";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TRAILING_SLASH_RE = /\/$/;

const pathnameOnly = (url: string | undefined): string =>
  (url ?? "").split("?")[0] ?? "";

const setCors = (res: ServerResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

const json = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

const pick = (env: Record<string, string>, key: string): string =>
  env[key]?.trim() || process.env[key]?.trim() || "";

const assetsFrom = (env: Record<string, string>): EmailAssets => {
  const base = (
    pick(env, "EMAIL_ASSET_BASE_URL") || "https://www.tandra.me"
  ).replace(TRAILING_SLASH_RE, "");
  return {
    headerLogoUrl: `${base}/BC_Horizontal_Color.png`,
    signatureLogoFallback: `${base}/BC_Horizontal_Color.png`,
  };
};

const str = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const rand = () => Math.random().toString(36).slice(2, 10);

type LooseObject = Record<string, unknown> & { _key?: string; _type?: string };

/** Ensure every block, span, and markDef carries a `_key` (Sanity rejects keyless array items). */
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

const parseRecipients = (value: unknown): EmailRecipient[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const out: EmailRecipient[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const rec = item as Record<string, unknown>;
    const email =
      typeof rec.email === "string" ? rec.email.trim().toLowerCase() : "";
    if (!(email && EMAIL_RE.test(email)) || seen.has(email)) {
      continue;
    }
    seen.add(email);
    out.push({
      email,
      id: typeof rec.id === "string" ? rec.id : "",
      name:
        typeof rec.name === "string" && rec.name.trim()
          ? rec.name.trim()
          : email,
    });
  }
  return out;
};

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

/**
 * Dev-only middleware that mirrors the `/api/email/*` Vercel serverless
 * functions so the composer (preview, recipients, send, save) works under
 * `pnpm dev`. Reuses the same shared `server/email/*` modules and Google auth.
 */
export const viteEmailDevApi = (env: Record<string, string>): Plugin => ({
  configureServer(server) {
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex logic
    server.middlewares.use(async (req, res, next) => {
      const pathname = pathnameOnly(req.url);
      if (!EMAIL_PATHS.has(pathname)) {
        next();
        return;
      }

      setCors(res);

      if (req.method === "OPTIONS") {
        res.statusCode = 204;
        res.end();
        return;
      }

      try {
        await authorizeSeoDashboardRequest(
          typeof req.headers.authorization === "string"
            ? req.headers.authorization
            : undefined,
          env
        );

        if (pathname === RECIPIENTS_PATH) {
          if (req.method !== "GET") {
            json(res, 405, { error: "Method not allowed" });
            return;
          }
          const attioToken = pick(env, "ATTIO_API_TOKEN");
          const sanityToken =
            pick(env, "SANITY_WRITE_TOKEN") ||
            pick(env, "SANITY_API_WRITE_TOKEN");
          if (!(attioToken || sanityToken)) {
            json(res, 503, {
              error:
                "No recipient source configured (set SANITY_WRITE_TOKEN and/or ATTIO_API_TOKEN).",
            });
            return;
          }
          const requestUrl = new URL(
            req.url ?? RECIPIENTS_PATH,
            "http://localhost"
          );
          const search = requestUrl.searchParams.get("search") ?? undefined;
          const [attio, sanity] = await Promise.all([
            attioToken
              ? listAttioPeople(attioToken, { search }).catch((error) => {
                  console.error("[vite-email-dev-api] Attio", error);
                  return [];
                })
              : Promise.resolve([]),
            sanityToken
              ? listEmailContacts(sanityToken, { search }).catch((error) => {
                  console.error("[vite-email-dev-api] Sanity", error);
                  return [];
                })
              : Promise.resolve([]),
          ]);
          json(res, 200, { recipients: mergeRecipients(attio, sanity) });
          return;
        }

        if (pathname === RENDER_PATH) {
          if (req.method !== "POST") {
            json(res, 405, { error: "Method not allowed" });
            return;
          }
          const body = parseJson(await readRequestBody(req));
          const provided = body.content as ClientEmailContent | undefined;
          const content = provided ?? (await fetchClientEmail()) ?? {};
          const html = await renderClientEmail(content, assetsFrom(env));
          json(res, 200, { html });
          return;
        }

        if (pathname === SEND_PATH) {
          if (req.method !== "POST") {
            json(res, 405, { error: "Method not allowed" });
            return;
          }
          const apiKey = pick(env, "RESEND_API_KEY");
          const from = pick(env, "EMAIL_FROM");
          if (!(apiKey && from)) {
            json(res, 503, {
              error:
                "Email sending is not configured (missing RESEND_API_KEY or EMAIL_FROM).",
            });
            return;
          }
          const body = parseJson(await readRequestBody(req));
          const recipients = parseRecipients(body.recipients);
          if (recipients.length === 0) {
            json(res, 400, { error: "Add at least one valid recipient." });
            return;
          }
          const content =
            (body.content as ClientEmailContent | undefined) ?? {};
          const subject =
            content.subject?.trim() || "A note from Tandra Peters";
          const replyTo =
            pick(env, "EMAIL_REPLY_TO") || content.signature?.email?.trim();
          const html = await renderClientEmail(content, assetsFrom(env));

          const resend = new Resend(apiKey);
          const attioToken = pick(env, "ATTIO_API_TOKEN");
          const today = new Date().toISOString().slice(0, 10);
          const sent: string[] = [];
          const failed: { email: string; error: string }[] = [];

          for (const recipient of recipients) {
            try {
              const result = await resend.emails.send({
                from,
                html,
                subject,
                to: [recipient.email],
                ...(replyTo ? { replyTo } : {}),
              });
              if (result.error) {
                failed.push({
                  email: recipient.email,
                  error: result.error.message,
                });
                continue;
              }
              sent.push(recipient.email);
              if (attioToken && recipient.id) {
                await postAttioPersonNote(
                  attioToken,
                  recipient.id,
                  `Email sent · ${subject} · ${today}`,
                  `Subject: ${subject}\nSent to: ${recipient.email}\nSource: Email composer (dev)`
                );
              }
            } catch (error) {
              failed.push({
                email: recipient.email,
                error: error instanceof Error ? error.message : "Send failed",
              });
            }
          }
          json(res, failed.length && !sent.length ? 502 : 200, {
            failed,
            sent,
          });
          return;
        }

        if (pathname === SAVE_DEFAULT_PATH) {
          if (req.method !== "POST") {
            json(res, 405, { error: "Method not allowed" });
            return;
          }
          const token =
            pick(env, "SANITY_WRITE_TOKEN") ||
            pick(env, "SANITY_API_WRITE_TOKEN");
          if (!token) {
            json(res, 503, {
              error:
                "Saving defaults is not configured (missing SANITY_WRITE_TOKEN).",
            });
            return;
          }
          const body = parseJson(await readRequestBody(req));
          const content =
            (body.content as ClientEmailContent | undefined) ?? {};
          const fields = {
            body: normalizeBlocks(content.body),
            closing: str(content.closing),
            ctaLabel: str(content.ctaLabel),
            ctaUrl: str(content.ctaUrl),
            greeting: str(content.greeting),
            previewText: str(content.previewText),
            subject: str(content.subject),
          };
          const client = createClient({
            apiVersion: SANITY_API_VERSION,
            dataset: SANITY_DATASET,
            projectId: SANITY_PROJECT_ID,
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
          json(res, 200, { ok: true });
          return;
        }

        json(res, 404, { error: "Not found" });
      } catch (error) {
        if (error instanceof DashboardAuthError) {
          json(res, error.status, { error: error.message });
          return;
        }
        console.error("[vite-email-dev-api]", pathname, error);
        json(res, 500, {
          error:
            error instanceof Error
              ? error.message
              : "Unexpected email API error.",
        });
      }
    });
  },
  name: "vite-email-dev-api",
});
