/**
 * Vercel serverless: POST /api/contact → Attio People (assert by email).
 *
 * Env (Vercel → Project → Settings → Environment Variables):
 *   ATTIO_API_TOKEN   — Bearer token from Attio (Developers / API tokens).
 *                       Scopes: record_permission:read-write, object_configuration:read
 *   ALLOWED_ORIGINS   — Optional. Comma-separated exact Origin values, e.g.
 *                       https://tandra.me,https://www.tandra.me
 *                       If omitted, any origin is allowed (OK for early setup; tighten for production).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

const ATTIO_ASSERT_URL =
  "https://api.attio.com/v2/objects/people/records?matching_attribute=email_addresses";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const parseBody = (req: VercelRequest): Record<string, unknown> => {
  const raw = req.body;
  if (raw == null) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof raw === "object") return raw as Record<string, unknown>;
  return {};
};

const isAllowedOrigin = (origin: string | undefined): boolean => {
  const raw = process.env.ALLOWED_ORIGINS?.trim();
  if (!raw) return true;
  if (!origin) return false;
  const allowed = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return allowed.includes(origin);
};

/** Browsers send Origin on POST + JSON; preflight OPTIONS must echo ACAO or the request fails. */
const applyCors = (res: VercelResponse, origin: string | undefined): void => {
  const raw = process.env.ALLOWED_ORIGINS?.trim();
  if (!raw) {
    res.setHeader("Access-Control-Allow-Origin", origin ?? "*");
    if (origin) res.setHeader("Vary", "Origin");
    return;
  }
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
};

const nameValues = (fullName: string): Array<Record<string, string>> => {
  const trimmed = fullName.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const first_name = parts[0] ?? trimmed;
  const last_name = parts.length > 1 ? parts.slice(1).join(" ") : "";
  const row: Record<string, string> = { first_name, full_name: trimmed };
  if (last_name) row.last_name = last_name;
  return [row];
};

type AttioErrJson = {
  type?: string;
  message?: string;
  status_code?: number;
};

const parseAttioErrorMessage = (bodyText: string): string | null => {
  try {
    const j = JSON.parse(bodyText) as AttioErrJson;
    if (typeof j.message === "string" && j.message.trim()) {
      return j.message.trim().slice(0, 400);
    }
  } catch {
    // ignore
  }
  return null;
};

const recordIdFromAssertResponse = (j: unknown): string | null => {
  if (!j || typeof j !== "object") return null;
  const data = (j as { data?: unknown }).data;
  if (!data || typeof data !== "object" || data === null) return null;
  const d = data as Record<string, unknown>;

  const id = d.id;
  if (id && typeof id === "object" && id !== null) {
    const rid = (id as { record_id?: unknown }).record_id;
    if (typeof rid === "string" && rid.length > 0) return rid;
  }

  const webUrl = d.web_url;
  if (typeof webUrl === "string") {
    const m = webUrl.match(/\/(?:person|people)\/([0-9a-f-]{36})/i);
    if (m) return m[1];
  }

  return null;
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
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
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  if (!isAllowedOrigin(origin)) {
    res.status(403).json({ ok: false, error: "Forbidden" });
    return;
  }

  const token = process.env.ATTIO_API_TOKEN?.trim();
  if (!token) {
    res.status(503).json({ ok: false, error: "Service not configured" });
    return;
  }

  const body = parseBody(req);

  const honeypot =
    typeof body._hp === "string"
      ? body._hp.trim()
      : typeof body.company === "string"
        ? body.company.trim()
        : "";
  if (honeypot) {
    res.status(200).json({ ok: true });
    return;
  }

  const fullName =
    typeof body.fullName === "string" ? body.fullName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const propertyAddress =
    typeof body.propertyAddress === "string"
      ? body.propertyAddress.trim()
      : "";
  const message =
    typeof body.message === "string" ? body.message.trim() : "";

  if (!fullName || fullName.length > 200) {
    res.status(400).json({ ok: false, error: "Please enter your name." });
    return;
  }
  if (!email || !EMAIL_RE.test(email) || email.length > 320) {
    res.status(400).json({ ok: false, error: "Please enter a valid email." });
    return;
  }
  if (!message || message.length > 8000) {
    res.status(400).json({ ok: false, error: "Please enter a message." });
    return;
  }
  if (propertyAddress.length > 500) {
    res.status(400).json({ ok: false, error: "Property address is too long." });
    return;
  }

  const description = [
    "Source: Website contact form",
    `Property / address: ${propertyAddress || "—"}`,
    "",
    message,
  ].join("\n");

  const baseValues: Record<string, unknown> = {
    email_addresses: [{ email_address: email.toLowerCase() }],
    name: nameValues(fullName),
  };

  const putAssert = async (values: Record<string, unknown>) =>
    fetch(ATTIO_ASSERT_URL, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: { values } }),
    });

  let attioRes = await putAssert({
    ...baseValues,
    description: [{ value: description.slice(0, 100_000) }],
  });

  let errText = !attioRes.ok ? await attioRes.text() : "";

  if (!attioRes.ok && attioRes.status === 400) {
    const retry = await putAssert(baseValues);
    if (retry.ok) {
      attioRes = retry;
      errText = "";
    } else {
      errText = await retry.text();
    }
  }

  if (!attioRes.ok) {
    console.error("Attio error", attioRes.status, errText);
    const attioMsg = parseAttioErrorMessage(errText);
    if (attioRes.status === 401 || attioRes.status === 403) {
      res.status(502).json({
        ok: false,
        error:
          "CRM rejected the API token. Confirm ATTIO_API_TOKEN in Vercel and token scopes (read-write records).",
      });
      return;
    }
    res.status(502).json({
      ok: false,
      error:
        attioMsg ??
        "Could not save your message. Try again later.",
    });
    return;
  }

  let attioJson: unknown;
  try {
    attioJson = await attioRes.json();
  } catch {
    console.error("Attio: 2xx but response was not JSON");
    res.status(502).json({ ok: false, error: "Could not save your message. Try again later." });
    return;
  }

  const recordId = recordIdFromAssertResponse(attioJson);
  if (!recordId) {
    const data =
      attioJson &&
      typeof attioJson === "object" &&
      "data" in attioJson &&
      attioJson.data &&
      typeof attioJson.data === "object" &&
      attioJson.data !== null
        ? (attioJson.data as Record<string, unknown>)
        : null;
    if (data && typeof data.web_url === "string" && data.web_url.length > 0) {
      console.info("Attio person assert ok (web_url only)", { web_url: data.web_url });
      res.status(200).json({ ok: true });
      return;
    }
    console.error(
      "Attio: unexpected success payload",
      JSON.stringify(attioJson).slice(0, 800),
    );
    res.status(502).json({ ok: false, error: "Could not save your message. Try again later." });
    return;
  }

  console.info("Attio person assert ok", { record_id: recordId });
  res.status(200).json({ ok: true });
}
