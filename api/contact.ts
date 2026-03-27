/**
 * Vercel serverless: POST /api/contact → Attio People (assert by email).
 *
 * Env (Vercel → Project → Settings → Environment Variables):
 *   ATTIO_API_TOKEN   — Bearer token from Attio (Developers / API tokens).
 *                       Scopes: record_permission:read-write, object_configuration:read,
 *                       and note:read-write (needed to create a Note with the form message on the person).
 *   ALLOWED_ORIGINS   — Optional. Comma-separated exact Origin values, e.g.
 *                       https://tandra.me,https://www.tandra.me
 *                       If omitted, any origin is allowed (OK for early setup; tighten for production).
 *                       Requests with no Origin (e.g. curl) are allowed when Host matches one of these URLs’ hostnames.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Inline copy of labels/validation (see `contactServiceOptions.ts` in the app).
 * Kept inside `api/` so the Vercel function bundle does not depend on imports
 * outside this folder (avoids FUNCTION_INVOCATION_FAILED from missing modules).
 */
const CONTACT_SERVICE_ROWS = [
  { value: "shingle-roofing", label: "Shingle Roofing" },
  { value: "metal-roofing", label: "Metal Roofing" },
  { value: "storm-damage-restoration", label: "Storm Damage Restoration" },
  { value: "commercial-roofing", label: "Commercial Roofing" },
  {
    value: "hail-wind-damage-roof-inspection",
    label: "Hail & Wind Damage Roof Inspection",
  },
] as const;

const SERVICE_VALUE_SET = new Set<string>(
  CONTACT_SERVICE_ROWS.map((o) => o.value),
);

const isValidContactServiceValue = (v: string): boolean =>
  SERVICE_VALUE_SET.has(v);

const contactServiceLabel = (value: string): string | null => {
  const row = CONTACT_SERVICE_ROWS.find((o) => o.value === value);
  return row?.label ?? null;
};

const ATTIO_ASSERT_URL =
  "https://api.attio.com/v2/objects/people/records?matching_attribute=email_addresses";

const ATTIO_NOTES_URL = "https://api.attio.com/v2/notes";

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

const parseAllowedOrigins = (): string[] => {
  const raw = process.env.ALLOWED_ORIGINS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

/** True when the request may call this API: Origin in list, or Host matches an allowed origin (curl has no Origin). */
const isAllowedRequest = (req: VercelRequest): boolean => {
  const allowed = parseAllowedOrigins();
  if (allowed.length === 0) return true;

  const origin = req.headers.origin as string | undefined;
  if (origin && allowed.includes(origin)) return true;

  if (!origin) {
    const host = (req.headers.host ?? "").split(":")[0].toLowerCase();
    if (!host) return false;
    for (const o of allowed) {
      try {
        if (new URL(o).hostname.toLowerCase() === host) return true;
      } catch {
        continue;
      }
    }
  }
  return false;
};

/** Browsers send Origin on POST + JSON; preflight OPTIONS must echo ACAO or the request fails. */
const applyCors = (res: VercelResponse, origin: string | undefined): void => {
  const raw = process.env.ALLOWED_ORIGINS?.trim();
  if (!raw) {
    res.setHeader("Access-Control-Allow-Origin", origin ?? "*");
    if (origin) res.setHeader("Vary", "Origin");
    return;
  }
  if (origin && parseAllowedOrigins().includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
};

/** Attio assert expects `name` as [{ first_name, last_name, full_name }]; all three keys should be present. */
const nameValues = (fullName: string): Array<Record<string, string>> => {
  const trimmed = fullName.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const first_name = parts[0] ?? trimmed;
  const last_name = parts.length > 1 ? parts.slice(1).join(" ") : "";
  return [{ first_name, last_name, full_name: trimmed }];
};

/**
 * Normalize to E.164 when possible. Returns null if too short / unusable (caller omits `phone_numbers`).
 */
const normalizePhoneForAttio = (raw: string): string | null => {
  const s = raw.trim();
  if (!s) return null;
  const hasPlus = s.startsWith("+");
  const digits = s.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (hasPlus) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
};

const phoneNumbersPayload = (
  raw: string,
): Array<{ original_phone_number: string }> | null => {
  const normalized = normalizePhoneForAttio(raw);
  if (!normalized) return null;
  return [{ original_phone_number: normalized }];
};

/**
 * Assert schema requires every `primary_location` key; optional parts may be null.
 * Freeform form address is stored on `line_1` (see Attio assert example).
 */
const primaryLocationPayload = (
  line1: string,
): Array<{
  line_1: string;
  line_2: null;
  line_3: null;
  line_4: null;
  locality: null;
  region: null;
  postcode: null;
  country_code: string;
  latitude: null;
  longitude: null;
}> => [
  {
    line_1: line1,
    line_2: null,
    line_3: null,
    line_4: null,
    locality: null,
    region: null,
    postcode: null,
    country_code: "US",
    latitude: null,
    longitude: null,
  },
];

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
    try {
      const last = new URL(webUrl).pathname.split("/").filter(Boolean).pop();
      if (last && /^[0-9a-f-]{36}$/i.test(last)) return last;
    } catch {
      // ignore invalid URL
    }
  }

  return null;
};

/** Plaintext body for an Attio Note (timeline) — mirrors description so the message is always visible in-app. */
const buildFormNoteContent = (args: {
  message: string;
  propertyAddress: string;
  serviceLine: string | null;
  serviceInterestRaw: string;
  consentNote: string;
  phoneNumber: string;
}): string => {
  const lines = [
    "MESSAGE",
    args.message,
    "",
    "PROPERTY / ADDRESS (exact)",
    args.propertyAddress || "—",
    "",
    `Service: ${args.serviceLine ?? args.serviceInterestRaw}`,
  ];
  if (args.phoneNumber.trim()) {
    lines.push(`Phone (as entered): ${args.phoneNumber.trim()}`);
  }
  lines.push(args.consentNote, "", "Source: Website contact form");
  return lines.join("\n").replace(/\0/g, "").slice(0, 100_000);
};

const postAttioPersonNote = async (
  token: string,
  recordId: string,
  title: string,
  content: string,
): Promise<{ ok: boolean; status: number; body: string }> => {
  const res = await fetch(ATTIO_NOTES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        parent_object: "people",
        parent_record_id: recordId,
        title: title.slice(0, 500),
        format: "plaintext",
        content,
      },
    }),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
};

const contactHandler = async (
  req: VercelRequest,
  res: VercelResponse,
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
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  if (!isAllowedRequest(req)) {
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
    typeof body.propertyAddress === "string" ? body.propertyAddress.trim() : "";
  const phoneNumber =
    typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const serviceInterestRaw =
    typeof body.serviceInterest === "string" ? body.serviceInterest.trim() : "";
  const consentToContact = body.consentToContact === true;

  if (!consentToContact) {
    res.status(400).json({
      ok: false,
      error: "Please confirm you agree to be contacted before submitting.",
    });
    return;
  }

  if (!fullName || fullName.length > 200) {
    res.status(400).json({ ok: false, error: "Please enter your name." });
    return;
  }
  if (!email || !EMAIL_RE.test(email) || email.length > 320) {
    res.status(400).json({ ok: false, error: "Please enter a valid email." });
    return;
  }
  if (!isValidContactServiceValue(serviceInterestRaw)) {
    res.status(400).json({ ok: false, error: "Please select a service." });
    return;
  }
  const serviceLine = contactServiceLabel(serviceInterestRaw);
  if (!message || message.length > 8000) {
    res.status(400).json({ ok: false, error: "Please enter a message." });
    return;
  }
  if (propertyAddress.length > 500) {
    res.status(400).json({ ok: false, error: "Property address is too long." });
    return;
  }
  if (phoneNumber.length > 80) {
    res.status(400).json({ ok: false, error: "Phone number is too long." });
    return;
  }

  const consentNote = `Consent to be contacted: yes (website form, ${new Date().toISOString().slice(0, 10)})`;

  /** Person `description` — message and address first so previews and exports surface them. */
  const description = [
    "MESSAGE",
    message,
    "",
    "PROPERTY / ADDRESS (exact)",
    propertyAddress || "—",
    "",
    `Service: ${serviceLine ?? serviceInterestRaw}`,
    consentNote,
    "",
    "Source: Website contact form",
  ].join("\n");

  const baseValues: Record<string, unknown> = {
    email_addresses: [{ email_address: email.toLowerCase() }],
    name: nameValues(fullName),
  };

  const phonePayload = phoneNumbersPayload(phoneNumber);
  if (phonePayload) {
    baseValues.phone_numbers = phonePayload;
  }

  if (propertyAddress.length > 0) {
    baseValues.primary_location = primaryLocationPayload(propertyAddress);
  }

  const putAssert = async (values: Record<string, unknown>) =>
    fetch(ATTIO_ASSERT_URL, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: { values } }),
    });

  const descriptionPayload = (text: string) =>
    [{ value: text.replace(/\0/g, "").slice(0, 100_000) }] as const;

  let attioRes = await putAssert({
    ...baseValues,
    description: descriptionPayload(description),
  });

  let errText = !attioRes.ok ? await attioRes.text() : "";

  /**
   * Never retry with email+name only — that used to "succeed" while dropping
   * description (service, property address, message) in Attio.
   * If the first body fails validation, retry once with a shorter description shape.
   */
  if (!attioRes.ok && attioRes.status === 400) {
    const compactDescription = [
      "MESSAGE",
      message,
      "",
      "PROPERTY / ADDRESS (exact)",
      propertyAddress || "—",
      "",
      `Service: ${serviceLine ?? serviceInterestRaw}`,
      consentNote,
      "Source: Website contact form",
    ].join("\n");
    const retry = await putAssert({
      ...baseValues,
      description: descriptionPayload(compactDescription),
    });
    attioRes = retry;
    errText = retry.ok ? "" : await retry.text();
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
      error: attioMsg ?? "Could not save your message. Try again later.",
    });
    return;
  }

  let attioJson: unknown;
  try {
    attioJson = await attioRes.json();
  } catch {
    console.error("Attio: 2xx but response was not JSON");
    res
      .status(502)
      .json({
        ok: false,
        error: "Could not save your message. Try again later.",
      });
    return;
  }

  const recordId = recordIdFromAssertResponse(attioJson);
  if (!recordId) {
    console.error(
      "Attio: unexpected success payload",
      JSON.stringify(attioJson).slice(0, 800),
    );
    res
      .status(502)
      .json({
        ok: false,
        error: "Could not save your message. Try again later.",
      });
    return;
  }

  const noteTitle = `Website contact · ${serviceLine ?? serviceInterestRaw} · ${new Date().toISOString().slice(0, 10)}`;
  const noteContent = buildFormNoteContent({
    message,
    propertyAddress,
    serviceLine,
    serviceInterestRaw,
    consentNote,
    phoneNumber,
  });

  const noteRes = await postAttioPersonNote(
    token,
    recordId,
    noteTitle,
    noteContent,
  );
  if (!noteRes.ok) {
    console.error("Attio note create failed", {
      status: noteRes.status,
      body: noteRes.body.slice(0, 500),
      record_id: recordId,
    });
    if (noteRes.status === 401 || noteRes.status === 403) {
      console.error(
        "Attio: add note:read-write to the API token scope to create Notes with the form message.",
      );
    }
  }

  console.info("Attio person assert ok", {
    record_id: recordId,
    note_ok: noteRes.ok,
  });
  res.status(200).json({ ok: true });
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  try {
    await contactHandler(req, res);
  } catch (err) {
    console.error("[api/contact]", err);
    if (!res.headersSent) {
      const origin = req.headers.origin as string | undefined;
      applyCors(res, origin);
      res.status(500).json({
        ok: false,
        error: "Internal server error. Please try again or call.",
      });
    }
  }
}
