/**
 * Provider connection, test-proof, and submit helpers for the Desk direct-mail
 * flow.
 *
 * Keys are resolved by the caller (encrypted store → env fallback) and passed
 * in as a `secrets` map — this module never reads process.env for API keys.
 *
 * Send gate: while DIRECT_MAIL_SEND_ENABLED is not "true", `submitToProvider`
 * only ever creates a no-charge TEST/DRAFT order (Stannp `test=true`; PostGrid
 * and Lob require a `test_` key and refuse a live key). A live send requires
 * both the gate on and a live provider key.
 */
import { hostHtmlReference, hostImageReference } from "./desk-creative-host.js";
import type { MailRecipient } from "./desk-direct-mail.js";
import {
  buildStructuredFrontHtml,
  CARD_BLEED_PER_SIDE_IN,
  frontBleedBoxIn,
} from "./desk-front-creative.js";

const STANNP_BASE = "https://api-us1.stannp.com/v1";
const LOB_BASE = "https://api.lob.com/v1";
const POSTGRID_BASE = "https://api.postgrid.com/print-mail/v1";
const POSTALYTICS_BASE = "https://api.postalytics.com/api/v1";

/** Postalytics var fields are capped at 255 chars each. */
const POSTALYTICS_VAR_FIELD_MAX = 255;

/**
 * Postalytics uses HTTP Basic auth with the API key as the username and an
 * empty password (docs: getting-started/authentication). Returns the ready
 * `Authorization` header value.
 */
const postalyticsAuth = (apiKey: string): string =>
  `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;

/**
 * The triggered-drop campaign "endpoint" token (server config, not a per-user
 * secret) that a Postalytics `/send` call targets. It encapsulates the
 * template, postage, and return address configured in the Postalytics campaign,
 * so the creative/sender are NOT supplied per-send. Read from the environment
 * like the PostGrid/Lob from-address config.
 */
const postalyticsSendEndpoint = (): string =>
  process.env.POSTALYTICS_SEND_ENDPOINT?.trim() ?? "";

/**
 * Accident-guard cap on postcards created in a single submit — applies to BOTH
 * test and live orders. A `test_` order never mails or charges, so test mode
 * fills the whole audience up to this cap; when the true matched count exceeds
 * it, we submit the first N and report "N of M".
 */
const MAX_SUBMIT_RECIPIENTS = 100;

const PROVIDER_NAMES: Record<string, string> = {
  lob: "Lob",
  postalytics: "Postalytics",
  postgrid: "PostGrid",
  stannp: "Stannp",
};

export type ProviderSecrets = Record<string, string>;

export interface ProviderConnection {
  accountLabel?: string;
  configured: boolean;
  message: string;
  ok: boolean;
  provider: string;
  providerKey: string;
}

export interface TestProofResult {
  message: string;
  ok: boolean;
  proofUrl?: string;
  provider: string;
  providerKey: string;
}

export interface TestPostcardInput {
  back?: string;
  body?: string;
  cta?: string;
  front?: string;
  /**
   * Serialized Ad Builder creative (`config` JSON). When present the front is
   * rendered as print-resolution HTML instead of upscaling the ~320px `front`
   * raster thumbnail, so the test proof matches the crisp submitted order.
   */
  frontConfig?: string;
  headline?: string;
  message?: string;
  providerKey: string;
  qrDataUri?: string;
  size?: string;
}

export interface SubmitOrderInput {
  back?: string;
  batchName?: string;
  body?: string;
  cta?: string;
  front?: string;
  /**
   * Serialized Ad Builder creative (`config` JSON: canvas layers + creative
   * state). When present it is rendered as print-resolution HTML (vector text,
   * full-res photo, vector logo) instead of upscaling the small `front` raster.
   */
  frontConfig?: string;
  headline?: string;
  message?: string;
  providerKey: string;
  qrDataUri?: string;
  /** Formatted display-address fallback (parsed) when structured is absent. */
  recipients?: string[];
  returnAddress?: ReturnAddress;
  size?: string;
  /** Full structured recipient list rebuilt server-side (preferred source). */
  structuredRecipients?: MailRecipient[];
  /** Distinct recipients matched before the safety cap, for "N of M" reporting. */
  totalMatched?: number;
  zoneLabel?: string;
}

export interface SubmitOrderResult {
  message: string;
  mode: "live" | "test";
  ok: boolean;
  orderCount?: number;
  orderId?: string;
  previewUrl?: string;
  provider: string;
  providerKey: string;
}

const providerName = (key: string): string => PROVIDER_NAMES[key] ?? key;

const pick = (secrets: ProviderSecrets, name: string): string =>
  secrets[name]?.trim() ?? "";

const stripDataUrl = (value: string): string => {
  const marker = ";base64,";
  const index = value.indexOf(marker);
  return index === -1 ? value : value.slice(index + marker.length);
};

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const DEFAULT_BACK_MESSAGE =
  "Roof age check — text 512-968-3965 for a free look.";

export interface ReturnAddress {
  city: string;
  company: string;
  line1: string;
  line2: string;
  name: string;
  state: string;
  zip: string;
}

export interface BackHtmlContent {
  body: string;
  cta: string;
  headline: string;
  qrDataUri?: string;
  returnLines?: readonly string[];
  size?: string;
}

/** Physical postcard trim size in inches (landscape) keyed by app size. */
const CARD_DIMS: Record<string, { height: number; width: number }> = {
  "4x6": { height: 4, width: 6 },
  "6x9": { height: 6, width: 9 },
};

const cardDims = (size?: string): { height: number; width: number } =>
  CARD_DIMS[size ?? "6x9"] ?? CARD_DIMS["6x9"];

const HTML_ESCAPES: Record<string, string> = {
  '"': "&quot;",
  "&": "&amp;",
  "'": "&#39;",
  "<": "&lt;",
  ">": "&gt;",
};
const HTML_ESCAPE_RE = /[&<>"']/g;
const escapeHtml = (value: string): string =>
  value.replace(HTML_ESCAPE_RE, (char) => HTML_ESCAPES[char] ?? char);

const RA_ZIP_RE = /^\d{5}(-\d{4})?$/;
const RA_STATE_RE = /^[A-Za-z]{2}$/;

/** Returns a human phrase for the missing part, or null when valid. */
const validateReturnAddress = (ra: ReturnAddress): string | null => {
  if (!(ra.name.trim() || ra.company.trim())) {
    return "a return name or company";
  }
  if (!ra.line1.trim()) {
    return "a return street address";
  }
  if (!ra.city.trim()) {
    return "a return city";
  }
  if (!RA_STATE_RE.test(ra.state.trim())) {
    return "a 2-letter return state";
  }
  if (!RA_ZIP_RE.test(ra.zip.trim())) {
    return "a 5-digit return ZIP";
  }
  return null;
};

const returnAddressLinesFrom = (ra: ReturnAddress): string[] => {
  const cityLine = [
    ra.city.trim(),
    [ra.state.trim(), ra.zip.trim()].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  return [
    ra.name.trim(),
    ra.company.trim(),
    ra.line1.trim(),
    ra.line2.trim(),
    cityLine,
  ].filter(Boolean);
};

const backContentFromInput = (input: {
  body?: string;
  cta?: string;
  headline?: string;
  message?: string;
}): { body: string; cta: string; headline: string } => ({
  body: input.body?.trim() ?? "",
  cta: input.cta?.trim() ?? "",
  headline:
    input.headline?.trim() || input.message?.trim() || DEFAULT_BACK_MESSAGE,
});

/**
 * Fully self-contained postcard-back HTML (no external stylesheet) sized to the
 * full-bleed artboard (trim + bleed) in inches — the SAME box the front is
 * authored at. Authoring at trim+bleed (not trim) guarantees the provider
 * rasterizes the back to at least the required print resolution (6x9 → 2775 ×
 * 1875 px at 300 DPI) and that the white background covers the bleed strip the
 * provider trims off, so no unpainted edge shows after the cut.
 *
 * Edge-anchored content (return block, QR, address column) is offset from the
 * bleed-box edge by the safe margin PLUS the per-side bleed, so it stays exactly
 * the same distance from the TRIM line as before. Marketing content sits in a
 * left column so it stays clear of the provider's right-side address safe zone;
 * the QR anchors bottom-left, and an optional return-address block sits top-left
 * (used for providers that do not auto-print a custom sender). Text wraps.
 */
export const buildPostcardBackHtml = (content: BackHtmlContent): string => {
  const trim = cardDims(content.size);
  const box = frontBleedBoxIn(content.size);
  const small = trim.width <= 6;
  // Keep content the same distance from the trim line by adding the bleed strip
  // (which the provider cuts off) to the safe margin.
  const margin = 0.3 + CARD_BLEED_PER_SIDE_IN;
  // Address/marketing column width is measured against the TRIM width so the
  // right-side USPS address safe zone stays clear regardless of the bleed.
  const contentWidth = (trim.width * 0.55).toFixed(2);
  const headlinePt = small ? 15 : 21;
  const bodyPt = small ? 9 : 11.5;
  const qrIn = small ? 0.9 : 1.15;
  const returnPt = small ? 7 : 8;

  const headline = escapeHtml(content.headline);
  const body = escapeHtml(content.body);
  const cta = escapeHtml(content.cta);

  const hasReturn = Boolean(content.returnLines?.length);
  const returnBlock = hasReturn
    ? `<div style="position:absolute;top:${margin}in;left:${margin}in;font-family:Arial,Helvetica,sans-serif;font-size:${returnPt}pt;line-height:1.25;color:#123a34;">${(
        content.returnLines ?? []
      )
        .map((line) => `<div>${escapeHtml(line)}</div>`)
        .join("")}</div>`
    : "";

  const qrBlock = content.qrDataUri
    ? `<img alt="Scan for a roof check" src="${content.qrDataUri}" style="position:absolute;left:${margin}in;bottom:${margin}in;width:${qrIn}in;height:${qrIn}in;display:block;"/>`
    : "";

  const contentTop = (
    hasReturn ? margin + (small ? 0.7 : 0.9) : margin
  ).toFixed(2);
  const contentBottom = (margin + qrIn + 0.15).toFixed(2);
  const ctaBlock = cta
    ? `<div style="margin-top:0.12in;font-size:${bodyPt}pt;font-weight:700;color:#123a34;overflow-wrap:break-word;word-wrap:break-word;">${cta}</div>`
    : "";

  return `<!doctype html><html><head><meta charset="utf-8"/><style>*{box-sizing:border-box;margin:0;padding:0;}html,body{margin:0;padding:0;}</style></head><body style="width:${box.widthIn}in;height:${box.heightIn}in;position:relative;background:#ffffff;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#1f2d2a;">${returnBlock}<div style="position:absolute;top:${contentTop}in;left:${margin}in;width:${contentWidth}in;bottom:${contentBottom}in;overflow:hidden;"><div style="font-size:${headlinePt}pt;font-weight:800;line-height:1.12;color:#123a34;overflow-wrap:break-word;word-wrap:break-word;">${headline}</div><p style="margin-top:0.12in;font-size:${bodyPt}pt;line-height:1.35;overflow-wrap:break-word;word-wrap:break-word;">${body}</p>${ctaBlock}</div>${qrBlock}</body></html>`;
};

/**
 * Legacy raster front (creatives saved without structured layers): wrap the
 * image in a full-bleed HTML doc so the provider rasterizes it to print size.
 * Authored at trim + bleed (like the structured front) so the photo covers the
 * provider's bleed artboard edge-to-edge instead of leaving a framed inset.
 */
const buildFrontHtml = (src: string, size?: string): string => {
  const { widthIn, heightIn } = frontBleedBoxIn(size);
  const width = widthIn.toFixed(2);
  const height = heightIn.toFixed(2);
  return `<!doctype html><html><head><meta charset="utf-8"/><style>*{margin:0;padding:0;box-sizing:border-box;}html,body{margin:0;padding:0;}</style></head><body style="margin:0;width:${width}in;height:${height}in;overflow:hidden;"><img alt="postcard front" src="${src}" style="display:block;width:${width}in;height:${height}in;object-fit:cover;"/></body></html>`;
};

/**
 * Stannp `front` value. When a structured Ad Builder `frontConfig` is present,
 * render it to print-resolution HTML (Stannp rasterizes the HTML to the card
 * size, so text/logo are vector-sharp and the photo comes from its full-res
 * source) and pass it as a base64 HTML data URL — exactly like the back. Falls
 * back to the raw `front` raster (URL or base64) for legacy creatives that were
 * saved without structured layers.
 */
const resolveStannpFront = (input: {
  front?: string;
  frontConfig?: string;
  size?: string;
}): string | undefined => {
  if (input.frontConfig) {
    // Stannp rasterizes the HTML onto its own bleed artboard, so author at
    // trim + bleed — otherwise the hero stops at the trim and Stannp's bleed
    // strip frames the photo with the creative background.
    const structured = buildStructuredFrontHtml(
      input.frontConfig,
      frontBleedBoxIn(input.size)
    );
    if (structured.ok && structured.html) {
      return stripDataUrl(
        `data:text/html;base64,${Buffer.from(structured.html).toString(
          "base64"
        )}`
      );
    }
  }
  if (!input.front) {
    return undefined;
  }
  return isHttpUrl(input.front) ? input.front : stripDataUrl(input.front);
};

// ---------------------------------------------------------------------------
// Connection checks
// ---------------------------------------------------------------------------

const verifyStannp = async (
  secrets: ProviderSecrets
): Promise<ProviderConnection> => {
  const apiKey = pick(secrets, "STANNP_API_KEY");
  const base: ProviderConnection = {
    configured: Boolean(apiKey),
    message: "",
    ok: false,
    provider: providerName("stannp"),
    providerKey: "stannp",
  };
  if (!apiKey) {
    return { ...base, message: "Add a Stannp API key to connect." };
  }
  const response = await fetch(
    `${STANNP_BASE}/accounts/me?api_key=${encodeURIComponent(apiKey)}`,
    { headers: { Accept: "application/json" } }
  );
  const body = asRecord(await response.json().catch(() => ({})));
  if (response.ok && body.success === true) {
    const data = asRecord(body.data);
    const balance =
      typeof data.balance === "number" || typeof data.balance === "string"
        ? String(data.balance)
        : undefined;
    return {
      ...base,
      accountLabel: balance ? `Balance ${balance}` : undefined,
      message: "Connected to Stannp. Ready to submit a test proof or order.",
      ok: true,
    };
  }
  return {
    ...base,
    message:
      typeof body.error === "string"
        ? `Stannp rejected the key: ${body.error}`
        : "Stannp did not accept this API key.",
  };
};

const verifyLob = async (
  secrets: ProviderSecrets
): Promise<ProviderConnection> => {
  const apiKey = pick(secrets, "LOB_API_KEY");
  const base: ProviderConnection = {
    configured: Boolean(apiKey),
    message: "",
    ok: false,
    provider: providerName("lob"),
    providerKey: "lob",
  };
  if (!apiKey) {
    return { ...base, message: "Add a Lob API key to connect." };
  }
  const auth = Buffer.from(`${apiKey}:`).toString("base64");
  const response = await fetch(`${LOB_BASE}/postcards?limit=1`, {
    headers: { Accept: "application/json", Authorization: `Basic ${auth}` },
  });
  if (response.ok) {
    const live = apiKey.startsWith("live_");
    return {
      ...base,
      message: live
        ? "Connected to Lob (live key)."
        : "Connected to Lob (test key).",
      ok: true,
    };
  }
  return { ...base, message: "Lob did not accept this API key." };
};

const verifyPostgrid = async (
  secrets: ProviderSecrets
): Promise<ProviderConnection> => {
  const apiKey = pick(secrets, "POSTGRID_API_KEY");
  const base: ProviderConnection = {
    configured: Boolean(apiKey),
    message: "",
    ok: false,
    provider: providerName("postgrid"),
    providerKey: "postgrid",
  };
  if (!apiKey) {
    return { ...base, message: "Add a PostGrid API key to connect." };
  }
  const response = await fetch(`${POSTGRID_BASE}/postcards?limit=1`, {
    headers: { Accept: "application/json", "x-api-key": apiKey },
  });
  if (response.ok) {
    const live = apiKey.startsWith("live_");
    return {
      ...base,
      message: live
        ? "Connected to PostGrid (live key)."
        : "Connected to PostGrid (test key).",
      ok: true,
    };
  }
  return { ...base, message: "PostGrid did not accept this API key." };
};

/**
 * Postalytics verify only needs the API key — a live send additionally needs a
 * configured triggered-drop campaign endpoint (POSTALYTICS_SEND_ENDPOINT), so
 * the message calls that out when it is missing.
 */
const verifyPostalytics = async (
  secrets: ProviderSecrets
): Promise<ProviderConnection> => {
  const apiKey = pick(secrets, "POSTALYTICS_API_KEY");
  const base: ProviderConnection = {
    configured: Boolean(apiKey),
    message: "",
    ok: false,
    provider: providerName("postalytics"),
    providerKey: "postalytics",
  };
  if (!apiKey) {
    return { ...base, message: "Add a Postalytics API key to connect." };
  }
  const response = await fetch(`${POSTALYTICS_BASE}/account/me`, {
    headers: {
      Accept: "application/json",
      Authorization: postalyticsAuth(apiKey),
    },
  });
  const body = asRecord(await response.json().catch(() => ({})));
  if (response.ok) {
    const data = asRecord(body.data ?? body);
    const label =
      (typeof data.name === "string" && data.name) ||
      (typeof data.company === "string" && data.company) ||
      undefined;
    const hasEndpoint = Boolean(postalyticsSendEndpoint());
    return {
      ...base,
      accountLabel: label || undefined,
      message: hasEndpoint
        ? "Connected to Postalytics. Ready to trigger a drop to the configured campaign."
        : "Connected to Postalytics. Set POSTALYTICS_SEND_ENDPOINT (a triggered-drop campaign endpoint) to submit.",
      ok: true,
    };
  }
  const error = asRecord(body.error);
  return {
    ...base,
    message:
      typeof error.message === "string"
        ? `Postalytics rejected the key: ${error.message}`
        : "Postalytics did not accept this API key.",
  };
};

export const verifyProviderConnection = async (
  providerKey: string,
  secrets: ProviderSecrets
): Promise<ProviderConnection> => {
  if (providerKey === "stannp") {
    return await verifyStannp(secrets);
  }
  if (providerKey === "lob") {
    return await verifyLob(secrets);
  }
  if (providerKey === "postgrid") {
    return await verifyPostgrid(secrets);
  }
  if (providerKey === "postalytics") {
    return await verifyPostalytics(secrets);
  }
  return {
    configured: false,
    message: `Connection check for ${providerName(
      providerKey
    )} is not wired yet — verify from their dashboard.`,
    ok: false,
    provider: providerName(providerKey),
    providerKey,
  };
};

// ---------------------------------------------------------------------------
// Test proofs
// ---------------------------------------------------------------------------

const createStannpTestProof = async (
  input: TestPostcardInput,
  secrets: ProviderSecrets
): Promise<TestProofResult> => {
  const apiKey = pick(secrets, "STANNP_API_KEY");
  const base: TestProofResult = {
    message: "",
    ok: false,
    provider: providerName("stannp"),
    providerKey: "stannp",
  };
  if (!apiKey) {
    return { ...base, message: "Add a Stannp API key before testing." };
  }
  if (!input.front) {
    return {
      ...base,
      message: "Select a saved Ad Builder creative for the postcard front.",
    };
  }
  const frontValue = resolveStannpFront(input);
  if (!frontValue) {
    return {
      ...base,
      message: "Select a saved Ad Builder creative for the postcard front.",
    };
  }
  const form = new URLSearchParams();
  form.set("test", "true");
  form.set("size", input.size ?? "6x9");
  form.set("front", frontValue);
  if (input.back) {
    form.set(
      "back",
      isHttpUrl(input.back) ? input.back : stripDataUrl(input.back)
    );
  } else {
    const backHtml = buildPostcardBackHtml({
      ...backContentFromInput(input),
      qrDataUri: input.qrDataUri,
      size: input.size,
    });
    form.set(
      "back",
      stripDataUrl(
        `data:text/html;base64,${Buffer.from(backHtml).toString("base64")}`
      )
    );
  }
  form.set("recipient[firstname]", "Sample");
  form.set("recipient[lastname]", "Resident");
  form.set("recipient[address1]", "123 Test Street");
  form.set("recipient[city]", "Austin");
  form.set("recipient[state]", "TX");
  form.set("recipient[zipcode]", "78701");
  form.set("recipient[country]", "US");

  const response = await fetch(
    `${STANNP_BASE}/postcards/create?api_key=${encodeURIComponent(apiKey)}`,
    {
      body: form.toString(),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    }
  );
  const body = asRecord(await response.json().catch(() => ({})));
  if (response.ok && body.success === true) {
    const data = asRecord(body.data);
    const pdf = typeof data.pdf === "string" ? data.pdf : undefined;
    return {
      ...base,
      message: "Stannp built a no-charge test proof. Nothing was mailed.",
      ok: true,
      proofUrl: pdf,
    };
  }
  return {
    ...base,
    message:
      typeof body.error === "string"
        ? `Stannp test failed: ${body.error}`
        : "Stannp could not build a test proof from this creative.",
  };
};

export const createTestPostcard = async (
  input: TestPostcardInput,
  secrets: ProviderSecrets
): Promise<TestProofResult> => {
  if (input.providerKey === "stannp") {
    return await createStannpTestProof(input, secrets);
  }
  return {
    message: `No-charge test proofs are only wired for Stannp right now. Use "Submit to service" for a test order, or send a test from the ${providerName(
      input.providerKey
    )} dashboard.`,
    ok: false,
    provider: providerName(input.providerKey),
    providerKey: input.providerKey,
  };
};

// ---------------------------------------------------------------------------
// Submit (test/draft or live order)
// ---------------------------------------------------------------------------

interface ParsedAddress {
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
}

const ADDRESS_TAIL = /,?\s*([A-Za-z]{2})\s+(\d{5})(?:-\d{4})?\s*$/;

const SAMPLE_RECIPIENT: ParsedAddress = {
  addressLine1: "123 Test Street",
  city: "Austin",
  state: "TX",
  zip: "78701",
};

/** Best-effort parse of a formatted US address string into structured parts. */
const parseAddress = (formatted: string): ParsedAddress | null => {
  const trimmed = formatted.trim();
  const match = trimmed.match(ADDRESS_TAIL);
  const state = match ? match[1].toUpperCase() : "TX";
  const zip = match ? match[2] : "";
  const head = (match ? trimmed.slice(0, match.index) : trimmed)
    .replace(/,\s*$/, "")
    .trim();
  const segments = head
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const addressLine1 = segments[0] ?? "";
  const city = segments.length > 1 ? (segments.at(-1) ?? "Austin") : "Austin";
  if (!(addressLine1 && zip)) {
    return null;
  }
  return { addressLine1, city, state, zip };
};

/**
 * The recipient list a submit actually mails. Prefers the full structured list
 * rebuilt server-side; falls back to parsing the client's formatted display
 * strings, then to a single sample. Test and live use the SAME set (a test_
 * order never mails), bounded only by the accident-guard cap.
 */
const recipientsFor = (input: SubmitOrderInput): ParsedAddress[] => {
  const structured = input.structuredRecipients ?? [];
  const base: ParsedAddress[] =
    structured.length > 0
      ? structured.map((recipient) => ({
          addressLine1: recipient.addressLine1,
          city: recipient.city,
          state: recipient.state,
          zip: recipient.zip,
        }))
      : (input.recipients ?? [])
          .map(parseAddress)
          .filter((value): value is ParsedAddress => value !== null);
  const usable = base.length > 0 ? base : [SAMPLE_RECIPIENT];
  return usable.slice(0, MAX_SUBMIT_RECIPIENTS);
};

/** "N of M matched addresses", noting when the safety cap trimmed the batch. */
const recipientScope = (created: number, totalMatched?: number): string => {
  const total = totalMatched && totalMatched > created ? totalMatched : created;
  const label = `${created} of ${total} matched address${
    total === 1 ? "" : "es"
  }`;
  if (total > created) {
    return `${label} (safety cap ${MAX_SUBMIT_RECIPIENTS} — raise the cap or tighten the zone to reach all ${total})`;
  }
  return label;
};

const submitSummary = (
  provider: string,
  mode: "live" | "test",
  created: number,
  totalMatched?: number
): string => {
  const scope = recipientScope(created, totalMatched);
  if (mode === "test") {
    return `${provider} created a no-charge TEST order for ${scope}. Nothing was mailed.`;
  }
  return `${provider} accepted a LIVE order for ${scope}.`;
};

const stannpSize = (size?: string): string => size ?? "6x9";

const postgridSize = (size?: string): string => {
  if (size === "4x6") {
    return "6x4";
  }
  return "9x6";
};

const submitStannp = async (
  input: SubmitOrderInput,
  secrets: ProviderSecrets,
  sendEnabled: boolean
): Promise<SubmitOrderResult> => {
  const apiKey = pick(secrets, "STANNP_API_KEY");
  const base: SubmitOrderResult = {
    message: "",
    mode: sendEnabled ? "live" : "test",
    ok: false,
    provider: providerName("stannp"),
    providerKey: "stannp",
  };
  if (!apiKey) {
    return { ...base, message: "Connect Stannp before submitting." };
  }
  if (!input.front) {
    return { ...base, message: "Select a creative for the postcard front." };
  }
  const isTest = !sendEnabled;
  if (!isTest && input.returnAddress) {
    const invalid = validateReturnAddress(input.returnAddress);
    if (invalid) {
      return { ...base, message: `Add ${invalid} before a live send.` };
    }
  }
  const recipients = recipientsFor(input);
  // Stannp uses the account address as sender, so print the editable return
  // address into the creative itself (top-left, clear of the address panel).
  const returnLines =
    input.returnAddress && validateReturnAddress(input.returnAddress) === null
      ? returnAddressLinesFrom(input.returnAddress)
      : undefined;
  const backValue = input.back
    ? isHttpUrl(input.back)
      ? input.back
      : stripDataUrl(input.back)
    : stripDataUrl(
        `data:text/html;base64,${Buffer.from(
          buildPostcardBackHtml({
            ...backContentFromInput(input),
            qrDataUri: input.qrDataUri,
            returnLines,
            size: input.size,
          })
        ).toString("base64")}`
      );
  const frontValue = resolveStannpFront(input);
  if (!frontValue) {
    return { ...base, message: "Select a creative for the postcard front." };
  }

  let firstId: string | undefined;
  let firstPdf: string | undefined;
  let created = 0;
  for (const recipient of recipients) {
    const form = new URLSearchParams();
    form.set("test", isTest ? "true" : "false");
    form.set("size", stannpSize(input.size));
    form.set("front", frontValue);
    form.set("back", backValue);
    form.set("recipient[firstname]", "Neighbor");
    form.set("recipient[address1]", recipient.addressLine1);
    form.set("recipient[city]", recipient.city);
    form.set("recipient[state]", recipient.state);
    form.set("recipient[zipcode]", recipient.zip);
    form.set("recipient[country]", "US");
    const response = await fetch(
      `${STANNP_BASE}/postcards/create?api_key=${encodeURIComponent(apiKey)}`,
      {
        body: form.toString(),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        method: "POST",
      }
    );
    const body = asRecord(await response.json().catch(() => ({})));
    if (!(response.ok && body.success === true)) {
      return {
        ...base,
        message:
          typeof body.error === "string"
            ? `Stannp rejected the order: ${body.error}`
            : "Stannp could not create the order from this creative.",
      };
    }
    const data = asRecord(body.data);
    created += 1;
    if (!firstId && data.id !== undefined) {
      firstId = String(data.id);
    }
    if (!firstPdf && typeof data.pdf === "string") {
      firstPdf = data.pdf;
    }
  }
  return {
    ...base,
    message: submitSummary(
      providerName("stannp"),
      isTest ? "test" : "live",
      created,
      input.totalMatched
    ),
    ok: true,
    orderCount: created,
    orderId: firstId,
    previewUrl: firstPdf,
  };
};

const envPostgridFrom = (): Record<string, string> => {
  const contactId = process.env.POSTGRID_FROM_CONTACT_ID?.trim();
  if (contactId) {
    return { from: contactId };
  }
  return {
    "from[addressLine1]":
      process.env.POSTGRID_FROM_ADDRESS_LINE1?.trim() || "2300 Forsam Bend",
    "from[city]": process.env.POSTGRID_FROM_CITY?.trim() || "Austin",
    "from[companyName]":
      process.env.POSTGRID_FROM_NAME?.trim() || "Birdcreek Roofing",
    "from[countryCode]": "US",
    "from[postalOrZip]": process.env.POSTGRID_FROM_ZIP?.trim() || "78725",
    "from[provinceOrState]": process.env.POSTGRID_FROM_STATE?.trim() || "TX",
  };
};

/**
 * PostGrid prints the sender in its own address zone from these `from[...]`
 * fields, so we pass the editable return address here (falling back to the
 * POSTGRID_FROM_* env defaults when it is missing or incomplete).
 */
const buildPostgridFrom = (ra?: ReturnAddress): Record<string, string> => {
  if (ra && validateReturnAddress(ra) === null) {
    const from: Record<string, string> = {
      "from[addressLine1]": ra.line1.trim(),
      "from[city]": ra.city.trim(),
      "from[companyName]": ra.company.trim() || ra.name.trim(),
      "from[countryCode]": "US",
      "from[postalOrZip]": ra.zip.trim(),
      "from[provinceOrState]": ra.state.trim(),
    };
    if (ra.name.trim()) {
      from["from[firstName]"] = ra.name.trim();
    }
    if (ra.line2.trim()) {
      from["from[addressLine2]"] = ra.line2.trim();
    }
    return from;
  }
  return envPostgridFrom();
};

const submitPostgrid = async (
  input: SubmitOrderInput,
  secrets: ProviderSecrets,
  sendEnabled: boolean
): Promise<SubmitOrderResult> => {
  const apiKey = pick(secrets, "POSTGRID_API_KEY");
  const isTestKey = apiKey.startsWith("test_");
  const mode: "live" | "test" = isTestKey ? "test" : "live";
  const base: SubmitOrderResult = {
    message: "",
    mode,
    ok: false,
    provider: providerName("postgrid"),
    providerKey: "postgrid",
  };
  if (!apiKey) {
    return { ...base, message: "Connect PostGrid before submitting." };
  }
  if (!input.front) {
    return { ...base, message: "Select a creative for the postcard front." };
  }
  // PostGrid test/live is key-based. Refuse a live key while the gate is off so
  // "test-only" truly cannot mail.
  if (!(sendEnabled || isTestKey)) {
    return {
      ...base,
      message:
        "This is a PostGrid LIVE key and sending is disabled. Add a PostGrid test key (test_…) for a no-charge order, or set DIRECT_MAIL_SEND_ENABLED=true to send live.",
    };
  }
  if (mode === "live" && input.returnAddress) {
    const invalid = validateReturnAddress(input.returnAddress);
    if (invalid) {
      return {
        ...base,
        message: `Return address needs ${invalid} before a live send.`,
      };
    }
  }
  const recipients = recipientsFor(input);
  // Prefer the structured (vector text + full-res photo) front so PostGrid
  // rasterizes a crisp 300-DPI creative; fall back to wrapping the raster.
  // Author at trim + bleed so the hero bleeds edge-to-edge on PostGrid's
  // artboard (a trim-only body leaves a framed inset after PostGrid's cut).
  const structuredPgFront = buildStructuredFrontHtml(
    input.frontConfig,
    frontBleedBoxIn(input.size)
  );
  const frontHtml =
    structuredPgFront.ok && structuredPgFront.html
      ? structuredPgFront.html
      : buildFrontHtml(input.front, input.size);
  // PostGrid overlays the sender from `from[...]`, so the back creative carries
  // only marketing content (no return block) to avoid a double return address.
  const backHtml = buildPostcardBackHtml({
    ...backContentFromInput(input),
    qrDataUri: input.qrDataUri,
    size: input.size,
  });
  const from = buildPostgridFrom(input.returnAddress);

  let firstId: string | undefined;
  let firstUrl: string | undefined;
  let created = 0;
  for (const recipient of recipients) {
    const form = new URLSearchParams({
      ...from,
      backHTML: backHtml,
      frontHTML: frontHtml,
      size: postgridSize(input.size),
      "to[addressLine1]": recipient.addressLine1,
      "to[city]": recipient.city,
      "to[countryCode]": "US",
      "to[firstName]": "Neighbor",
      "to[postalOrZip]": recipient.zip,
      "to[provinceOrState]": recipient.state,
    });
    const response = await fetch(`${POSTGRID_BASE}/postcards`, {
      body: form.toString(),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "x-api-key": apiKey,
      },
      method: "POST",
    });
    const body = asRecord(await response.json().catch(() => ({})));
    if (!response.ok) {
      const error = asRecord(body.error);
      return {
        ...base,
        message:
          typeof error.message === "string"
            ? `PostGrid rejected the order: ${error.message}`
            : "PostGrid could not create the order from this creative.",
      };
    }
    created += 1;
    if (!firstId && typeof body.id === "string") {
      firstId = body.id;
    }
    if (!firstUrl && typeof body.url === "string") {
      firstUrl = body.url;
    }
  }
  return {
    ...base,
    message: submitSummary(
      providerName("postgrid"),
      mode,
      created,
      input.totalMatched
    ),
    ok: true,
    orderCount: created,
    orderId: firstId,
    previewUrl: firstUrl,
  };
};

/** Map our app size to a Lob-supported size (Lob: 4x6, 6x9, 6x11). */
const LOB_SIZES: Record<string, string> = { "4x6": "4x6", "6x9": "6x9" };
const lobSize = (size?: string): string => LOB_SIZES[size ?? "6x9"] ?? "6x9";

const envLobFromId = (): string | undefined =>
  process.env.LOB_FROM_ADDRESS_ID?.trim() || undefined;

/**
 * Lob prints the sender from the `from` address, so pass the editable return
 * address as an inline `from[...]` object; fall back to a saved
 * LOB_FROM_ADDRESS_ID (adr_...) when a return address isn't provided. Returns
 * null when neither is available (Lob requires a from address).
 */
const buildLobFrom = (ra?: ReturnAddress): Record<string, string> | null => {
  if (ra && validateReturnAddress(ra) === null) {
    const from: Record<string, string> = {
      "from[address_city]": ra.city.trim(),
      "from[address_line1]": ra.line1.trim(),
      "from[address_state]": ra.state.trim(),
      "from[address_zip]": ra.zip.trim(),
      "from[name]": ra.name.trim() || ra.company.trim(),
    };
    if (ra.company.trim()) {
      from["from[company]"] = ra.company.trim();
    }
    if (ra.line2.trim()) {
      from["from[address_line2]"] = ra.line2.trim();
    }
    return from;
  }
  const fromId = envLobFromId();
  return fromId ? { from: fromId } : null;
};

/** Lob's inline front/back HTML hard limit (chars). */
const LOB_INLINE_HTML_LIMIT = 10_000;

interface LobCreative {
  back: string;
  front: string;
  message: string;
  ok: boolean;
}

interface LobHtmlReference {
  error?: string;
  ok: boolean;
  value?: string;
}

/**
 * Turn an HTML creative into a Lob-safe reference: pass it inline when it fits
 * under the 10k limit, otherwise host it as an HTML-file URL. Either way Lob
 * renders the HTML to the postcard `size`, so it is never subject to the
 * PNG/JPG minimum-resolution check.
 */
const resolveLobHtml = async (html: string): Promise<LobHtmlReference> => {
  if (html.length < LOB_INLINE_HTML_LIMIT) {
    return { ok: true, value: html };
  }
  const hosted = await hostHtmlReference(html);
  if (hosted.ok && hosted.url) {
    return { ok: true, value: hosted.url };
  }
  return { error: hosted.error, ok: false };
};

/**
 * Resolve the front/back into Lob-safe HTML references.
 *
 * Both front and back are delivered as HTML so Lob rasterizes them to the
 * postcard `size` at 300 DPI — this is what makes them meet Lob's creative
 * dimensions (6x9 → 2775 × 1875 px, 4x6 → 1875 × 1275 px) regardless of the
 * source raster. The front image (often a small Ad Builder thumbnail) is hosted
 * as a remote URL and linked from a full-bleed HTML wrapper; the QR is hosted
 * too, keeping both docs small enough to pass inline. If either HTML somehow
 * exceeds the inline limit it is hosted as an HTML-file URL instead.
 */
const resolveLobCreative = async (
  input: SubmitOrderInput
): Promise<LobCreative> => {
  const fail = (message: string): LobCreative => ({
    back: "",
    front: "",
    message,
    ok: false,
  });
  // Prefer rendering the saved creative's STRUCTURED layers as HTML: Lob
  // rasterizes it at 300 DPI so text + the SVG logo are razor-sharp and the hero
  // photo comes from its full-resolution source — no upscaling of the ~320px
  // thumbnail. Lob adds a 1/8" bleed per side, so author at trim + 0.25" total.
  const structuredFront = buildStructuredFrontHtml(
    input.frontConfig,
    frontBleedBoxIn(input.size)
  );
  let frontHtml: string;
  if (structuredFront.ok && structuredFront.html) {
    frontHtml = structuredFront.html;
  } else {
    // Legacy fallback (older versions without saved layers): host the raster
    // thumbnail and wrap it full-bleed so Lob still renders it to print size.
    const hostedFront = await hostImageReference(input.front);
    if (!(hostedFront.ok && hostedFront.url)) {
      return fail(
        hostedFront.error ?? "Could not host the front creative for Lob."
      );
    }
    frontHtml = buildFrontHtml(hostedFront.url, input.size);
  }
  const front = await resolveLobHtml(frontHtml);
  if (!(front.ok && front.value)) {
    return fail(front.error ?? "Could not host the postcard front for Lob.");
  }
  // Host the QR so it isn't inlined as base64 (keeps the back HTML tiny).
  let qr = input.qrDataUri;
  if (qr && !isHttpUrl(qr)) {
    const hostedQr = await hostImageReference(qr);
    qr = hostedQr.ok ? hostedQr.url : undefined;
  }
  const back = await resolveLobHtml(
    buildPostcardBackHtml({
      ...backContentFromInput(input),
      qrDataUri: qr,
      // Lob prints the sender from `from`, so no return block on the back.
      size: input.size,
    })
  );
  if (!(back.ok && back.value)) {
    return fail(back.error ?? "Could not host the postcard back for Lob.");
  }
  return { back: back.value, front: front.value, message: "", ok: true };
};

const submitLob = async (
  input: SubmitOrderInput,
  secrets: ProviderSecrets,
  sendEnabled: boolean
): Promise<SubmitOrderResult> => {
  const apiKey = pick(secrets, "LOB_API_KEY");
  const isTestKey = apiKey.startsWith("test_");
  const mode: "live" | "test" = isTestKey ? "test" : "live";
  const base: SubmitOrderResult = {
    message: "",
    mode,
    ok: false,
    provider: providerName("lob"),
    providerKey: "lob",
  };
  if (!apiKey) {
    return { ...base, message: "Connect Lob before submitting." };
  }
  if (!input.front) {
    return { ...base, message: "Select a creative for the postcard front." };
  }
  // Lob test/live is key-based (no test flag). Refuse a live key while the gate
  // is off so "test-only" truly cannot mail.
  if (!(sendEnabled || isTestKey)) {
    return {
      ...base,
      message:
        "This is a Lob LIVE key and sending is disabled. Add a Lob test key (test_…) for a no-charge order, or set DIRECT_MAIL_SEND_ENABLED=true to send live.",
    };
  }
  if (mode === "live" && input.returnAddress) {
    const invalid = validateReturnAddress(input.returnAddress);
    if (invalid) {
      return {
        ...base,
        message: `Return address needs ${invalid} before a live send.`,
      };
    }
  }
  const from = buildLobFrom(input.returnAddress);
  if (!from) {
    return {
      ...base,
      message:
        "Add a return address (or set LOB_FROM_ADDRESS_ID) before submitting — Lob requires a sender address.",
    };
  }
  // Lob caps inline front/back HTML at 10k chars, and our creatives embed large
  // base64 (front image + QR). Resolve the front to a remote URL and host the QR
  // so the back HTML stays small. Done ONCE per submit, before the loop.
  const creative = await resolveLobCreative(input);
  if (!creative.ok) {
    return { ...base, message: creative.message };
  }
  const recipients = recipientsFor(input);
  const auth = Buffer.from(`${apiKey}:`).toString("base64");

  let firstId: string | undefined;
  let firstUrl: string | undefined;
  let created = 0;
  for (const recipient of recipients) {
    const form = new URLSearchParams({
      ...from,
      back: creative.back,
      front: creative.front,
      size: lobSize(input.size),
      // Lob now requires use_type on postcard creation; this is direct-mail
      // marketing, so "marketing" is the correct classification.
      use_type: "marketing",
      "to[address_city]": recipient.city,
      "to[address_line1]": recipient.addressLine1,
      "to[address_state]": recipient.state,
      "to[address_zip]": recipient.zip,
      "to[name]": "Neighbor",
    });
    const response = await fetch(`${LOB_BASE}/postcards`, {
      body: form.toString(),
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });
    const body = asRecord(await response.json().catch(() => ({})));
    if (!response.ok) {
      const error = asRecord(body.error);
      return {
        ...base,
        message:
          typeof error.message === "string"
            ? `Lob rejected the order: ${error.message}`
            : "Lob could not create the order from this creative.",
      };
    }
    created += 1;
    if (!firstId && typeof body.id === "string") {
      firstId = body.id;
    }
    if (!firstUrl && typeof body.url === "string") {
      firstUrl = body.url;
    }
  }
  return {
    ...base,
    message: submitSummary(
      providerName("lob"),
      mode,
      created,
      input.totalMatched
    ),
    ok: true,
    orderCount: created,
    orderId: firstId,
    previewUrl: firstUrl,
  };
};

/**
 * Trigger a Postalytics drop for each recipient against the configured
 * triggered-drop campaign endpoint. The creative + return address live in that
 * Postalytics campaign (Postalytics has no ad-hoc per-send creative), so this
 * only sends the recipient fields; the headline/CTA are passed as var fields so
 * a merge-tag template can reference them.
 *
 * Postalytics has NO per-piece test mode — a `/send` call enqueues a real,
 * billable drop — so a submit only proceeds when the send gate is on. While it
 * is off, this refuses without ever calling the API (nothing is mailed).
 */
const submitPostalytics = async (
  input: SubmitOrderInput,
  secrets: ProviderSecrets,
  sendEnabled: boolean
): Promise<SubmitOrderResult> => {
  const apiKey = pick(secrets, "POSTALYTICS_API_KEY");
  const base: SubmitOrderResult = {
    message: "",
    mode: sendEnabled ? "live" : "test",
    ok: false,
    provider: providerName("postalytics"),
    providerKey: "postalytics",
  };
  if (!apiKey) {
    return { ...base, message: "Connect Postalytics before submitting." };
  }
  const endpoint = postalyticsSendEndpoint();
  if (!endpoint) {
    return {
      ...base,
      message:
        "Set POSTALYTICS_SEND_ENDPOINT (a triggered-drop campaign endpoint from Postalytics) before submitting — Postalytics sends use a pre-built campaign template, not an ad-hoc creative.",
    };
  }
  // No per-piece test path: refuse (never mail) while the gate is off.
  if (!sendEnabled) {
    return {
      ...base,
      message:
        "Postalytics has no no-charge test send — each drop is a real, billable mail piece. Set DIRECT_MAIL_SEND_ENABLED=true to trigger a live drop (or test in the Postalytics sandbox).",
    };
  }
  const recipients = recipientsFor(input);
  const headline = input.headline?.trim() || input.message?.trim() || "";
  const cta = input.cta?.trim() || "";

  let firstSendDate: string | undefined;
  let created = 0;
  for (const recipient of recipients) {
    const payload: Record<string, string> = {
      address_city: recipient.city,
      address_state: recipient.state,
      address_street: recipient.addressLine1,
      address_zip: recipient.zip,
      first_name: "Neighbor",
      last_name: "Resident",
    };
    if (headline) {
      payload.var_field_1 = headline.slice(0, POSTALYTICS_VAR_FIELD_MAX);
    }
    if (cta) {
      payload.var_field_2 = cta.slice(0, POSTALYTICS_VAR_FIELD_MAX);
    }
    const response = await fetch(
      `${POSTALYTICS_BASE}/send/${encodeURIComponent(endpoint)}`,
      {
        body: JSON.stringify(payload),
        headers: {
          Accept: "application/json",
          Authorization: postalyticsAuth(apiKey),
          "Content-Type": "application/json",
        },
        method: "POST",
      }
    );
    const body = asRecord(await response.json().catch(() => ({})));
    if (!response.ok) {
      const error = asRecord(body.error);
      return {
        ...base,
        message:
          typeof error.message === "string"
            ? `Postalytics rejected the drop: ${error.message}`
            : "Postalytics could not trigger a drop for this campaign endpoint.",
      };
    }
    created += 1;
    if (!firstSendDate && typeof body.send_date === "string") {
      firstSendDate = body.send_date;
    }
  }
  return {
    ...base,
    message: submitSummary(
      providerName("postalytics"),
      "live",
      created,
      input.totalMatched
    ),
    ok: true,
    orderCount: created,
    orderId: firstSendDate,
  };
};

export const submitToProvider = async (
  input: SubmitOrderInput,
  secrets: ProviderSecrets,
  sendEnabled: boolean
): Promise<SubmitOrderResult> => {
  if (input.providerKey === "stannp") {
    return await submitStannp(input, secrets, sendEnabled);
  }
  if (input.providerKey === "postgrid") {
    return await submitPostgrid(input, secrets, sendEnabled);
  }
  if (input.providerKey === "lob") {
    return await submitLob(input, secrets, sendEnabled);
  }
  if (input.providerKey === "postalytics") {
    return await submitPostalytics(input, secrets, sendEnabled);
  }
  return {
    message: `Submit isn't wired for ${providerName(
      input.providerKey
    )} yet — connect Stannp, PostGrid, or Lob to submit from here, or send from the ${providerName(
      input.providerKey
    )} dashboard.`,
    mode: sendEnabled ? "live" : "test",
    ok: false,
    provider: providerName(input.providerKey),
    providerKey: input.providerKey,
  };
};
