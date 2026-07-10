import { afterEach, describe, expect, it, vi } from "vitest";

import {
  submitToProvider,
  verifyProviderConnection,
} from "./desk-direct-mail-connect.js";
import type {
  ReturnAddress,
  SubmitOrderInput,
} from "./desk-direct-mail-connect.js";
import type { MailRecipient } from "./desk-direct-mail.js";

// Lob submit must: build ONE postcard per recipient (full audience) with inline
// to/from addresses; refuse a live key while the send gate is off; and stay
// under Lob's 10k inline-HTML limit by hosting large base64 creatives as URLs.

const HOSTED_URL = "https://cdn.sanity.io/images/proj/production/hosted.png";
const HTTP_RE = /^https?:/i;

// Mock the creative-host boundary (the "upload") so no network/Sanity is hit:
// existing http(s) URLs pass through; base64 data-URIs resolve to a hosted URL.
vi.mock(import("./desk-creative-host.js"), () => ({
  hostHtmlReference: () => Promise.resolve({ ok: true, url: HOSTED_URL }),
  hostImageReference: (value?: string) =>
    Promise.resolve(
      value && HTTP_RE.test(value)
        ? { ok: true, url: value }
        : { ok: true, url: HOSTED_URL }
    ),
  isHttpUrl: (value: string) => HTTP_RE.test(value),
}));

const recipients: MailRecipient[] = [
  { addressLine1: "100 Oak St", city: "Austin", state: "TX", zip: "78724" },
  { addressLine1: "200 Elm St", city: "Austin", state: "TX", zip: "78724" },
  { addressLine1: "300 Pine St", city: "Austin", state: "TX", zip: "78724" },
];

const returnAddress: ReturnAddress = {
  city: "Round Rock",
  company: "Birdcreek Roofing",
  line1: "PO Box 340",
  line2: "",
  name: "Tandra Peters",
  state: "TX",
  zip: "78680",
};

const baseInput = (
  overrides: Partial<SubmitOrderInput> = {}
): SubmitOrderInput => ({
  front: "https://example.com/front.png",
  headline: "Roof age check",
  providerKey: "lob",
  returnAddress,
  structuredRecipients: recipients,
  totalMatched: recipients.length,
  ...overrides,
});

// A real saved Ad Builder creative: STRUCTURED layers (text/photo/logo) plus the
// ORIGINAL hero-photo URL — the source the front must render at print res.
const HERO_URL = "https://cdn.sanity.io/images/7irm699i/production/hero.jpg";
const structuredConfig = JSON.stringify({
  canvasElements: [
    {
      height: 100,
      id: "role-image",
      kind: "image",
      objectFit: "cover",
      opacity: 1,
      src: HERO_URL,
      width: 100,
      x: 0,
      y: 0,
    },
    {
      height: null,
      id: "role-logo",
      kind: "logo",
      opacity: 1,
      variant: "horizontal-white",
      width: 30,
      x: 64,
      y: 5,
    },
    {
      color: "#ffffff",
      fontFamily: '"IBM Plex Serif", serif',
      fontSize: 12.5,
      fontStyle: "normal",
      fontWeight: 400,
      height: null,
      id: "role-headline",
      kind: "text",
      letterSpacing: 0,
      lineHeight: 0.98,
      opacity: 1,
      text: "ROOF DAMAGE?",
      textAlign: "left",
      textTransform: "uppercase",
      width: 70,
      x: 7,
      y: 13,
    },
  ],
  creative: { backgroundColor: "#092a1d", imageUrl: HERO_URL },
  version: 2,
});

const mockLobOk = () => {
  const fetchMock = vi.fn<(...args: unknown[]) => Promise<Response>>(() =>
    Promise.resolve({
      json: () => Promise.resolve({ id: "psc_test", url: "https://lob/pdf" }),
      ok: true,
    } as Response)
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const paramsOf = (
  fetchMock: ReturnType<typeof mockLobOk>,
  index = 0
): URLSearchParams => {
  const init = fetchMock.mock.calls[index]?.[1] as
    | { body?: string }
    | undefined;
  return new URLSearchParams(init?.body ?? "");
};

describe("submitLob", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates one postcard per recipient (test key, gate off)", async () => {
    const fetchMock = mockLobOk();

    const result = await submitToProvider(
      baseInput(),
      { LOB_API_KEY: "test_abc123" },
      false
    );

    expect(result.ok).toBeTruthy();
    expect(result.mode).toBe("test");
    expect(result.orderCount).toBe(3);
    // One Lob call per recipient (full audience, not a single test address).
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("sends the recipient inline as to[] and the return address as from[]", async () => {
    const fetchMock = mockLobOk();

    await submitToProvider(baseInput(), { LOB_API_KEY: "test_abc123" }, false);

    const params = paramsOf(fetchMock);
    expect(params.get("to[address_line1]")).toBe("100 Oak St");
    expect(params.get("to[name]")).toBe("Neighbor");
    // Editable return address becomes the inline from address (no adr_ id needed).
    expect(params.get("from[name]")).toBe("Tandra Peters");
    expect(params.get("from[address_line1]")).toBe("PO Box 340");
    // Lob now requires use_type on postcard creation; this is direct-mail marketing.
    expect(params.get("use_type")).toBe("marketing");
  });

  it("wraps the front image in full-bleed HTML so Lob renders it to print size", async () => {
    const fetchMock = mockLobOk();
    // A real Ad Builder thumbnail is a small, low-res base64 PNG — Lob rejects a
    // raster below 300 DPI, so it must be delivered as size-rendered HTML.
    const thumbFront = `data:image/png;base64,${"A".repeat(400)}`;

    const result = await submitToProvider(
      baseInput({ front: thumbFront, size: "6x9" }),
      { LOB_API_KEY: "test_abc123" },
      false
    );

    expect(result.ok).toBeTruthy();
    const params = paramsOf(fetchMock);
    const front = params.get("front") ?? "";
    // Front is now an HTML creative (Lob renders HTML to `size`, dodging the
    // PNG/JPG minimum-resolution check), NOT a bare low-res image URL.
    expect(front.startsWith("<!doctype html>")).toBeTruthy();
    // It links the hosted image and is sized to the 6x9 full-bleed card
    // (9.25in × 6.25in → 2775 × 1875 px at 300 DPI).
    expect(front).toContain(HOSTED_URL);
    expect(front).toContain("9.25in");
    // Delivered inline as HTML (doctype prefix proves it's not a hosted URL),
    // sized to the 6x9 full-bleed card.
    expect(front).toContain("6.25in");
  });

  it("renders the SAVED creative's structured layers as HTML sized to print", async () => {
    const fetchMock = mockLobOk();
    // A tiny low-res thumbnail is still sent, but the structured config must win
    // so the front is print-resolution rather than an upscaled 320px raster.
    const thumbFront = `data:image/png;base64,${"A".repeat(400)}`;

    const result = await submitToProvider(
      baseInput({
        front: thumbFront,
        frontConfig: structuredConfig,
        size: "6x9",
      }),
      { LOB_API_KEY: "test_abc123" },
      false
    );

    expect(result.ok).toBeTruthy();
    const front = paramsOf(fetchMock).get("front") ?? "";
    // HTML front (Lob rasterizes at 300 DPI), sized to the 6x9 full-bleed card.
    expect(front.startsWith("<!doctype html>")).toBeTruthy();
    expect(front).toContain("9.25in");
    expect(front).toContain("6.25in");
  });

  it("draws the front from full-res sources — real text, hero photo, vector logo", async () => {
    const fetchMock = mockLobOk();
    const thumbFront = `data:image/png;base64,${"A".repeat(400)}`;

    await submitToProvider(
      baseInput({
        front: thumbFront,
        frontConfig: structuredConfig,
        size: "6x9",
      }),
      { LOB_API_KEY: "test_abc123" },
      false
    );

    const front = paramsOf(fetchMock).get("front") ?? "";
    // Real vector headline, the ORIGINAL full-res hero photo at print width, and
    // the vector logo SVG — the low-res thumbnail is never hosted for the front.
    expect(front).toContain("ROOF DAMAGE?");
    expect(front).toContain(`${HERO_URL}?w=2775`);
    expect(front).toContain("/BC_Horizontal_White.svg");
    expect(front).not.toContain(HOSTED_URL);
  });

  it("sizes the front HTML to the 4x6 full-bleed card", async () => {
    const fetchMock = mockLobOk();

    await submitToProvider(
      baseInput({ front: "https://example.com/front.png", size: "4x6" }),
      { LOB_API_KEY: "test_abc123" },
      false
    );

    const front = paramsOf(fetchMock).get("front") ?? "";
    // 4x6 full bleed → 6.25in × 4.25in (1875 × 1275 px at 300 DPI).
    expect(front).toContain("6.25in");
    expect(front).toContain("4.25in");
  });

  it("keeps the back HTML under Lob's inline limit (QR hosted, not inlined)", async () => {
    const fetchMock = mockLobOk();
    const bigQr = `data:image/png;base64,${"B".repeat(4000)}`;

    const result = await submitToProvider(
      baseInput({ qrDataUri: bigQr }),
      { LOB_API_KEY: "test_abc123" },
      false
    );

    expect(result.ok).toBeTruthy();
    const params = paramsOf(fetchMock);
    // Back stays comfortably under Lob's inline limit (QR hosted, not inlined).
    expect((params.get("back") ?? "").length).toBeLessThan(10_000);
    // The hosted QR URL is linked, not embedded as base64.
    expect(params.get("back")).toContain(HOSTED_URL);
  });

  it("refuses a LIVE key while the send gate is off (never mails)", async () => {
    const fetchMock = mockLobOk();

    const result = await submitToProvider(
      baseInput(),
      { LOB_API_KEY: "live_secret" },
      false
    );

    expect(result.ok).toBeFalsy();
    expect(result.message).toContain("LIVE key");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// Postalytics: HTTP Basic (API key as username, empty password); verify hits
// GET /api/v1/account/me; submit triggers a drop per recipient against a
// pre-built campaign endpoint (POSTALYTICS_SEND_ENDPOINT) — no ad-hoc creative,
// and no per-piece test mode (submit only sends when the gate is on).
const POSTALYTICS_KEY = "12345EF4-3AEF-7ADE-A468-9D51756E5D32";
const POSTALYTICS_ENDPOINT = "abc-drip-endpoint";
const expectedPostalyticsAuth = `Basic ${Buffer.from(
  `${POSTALYTICS_KEY}:`
).toString("base64")}`;

const mockPostalyticsSend = () => {
  const fetchMock = vi.fn<(...args: unknown[]) => Promise<Response>>(() =>
    Promise.resolve({
      json: () => Promise.resolve({ send_date: "1999-02-19T12:00:00.00:00" }),
      ok: true,
    } as Response)
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const jsonBodyOf = (
  fetchMock: ReturnType<typeof mockPostalyticsSend>,
  index = 0
): Record<string, unknown> => {
  const init = fetchMock.mock.calls[index]?.[1] as
    | { body?: string }
    | undefined;
  return JSON.parse(init?.body ?? "{}") as Record<string, unknown>;
};

const headersOf = (
  fetchMock: ReturnType<typeof mockPostalyticsSend>,
  index = 0
): Record<string, string> =>
  (fetchMock.mock.calls[index]?.[1] as { headers?: Record<string, string> })
    ?.headers ?? {};

const postalyticsInput = (
  overrides: Partial<SubmitOrderInput> = {}
): SubmitOrderInput => ({
  headline: "Roof age check",
  providerKey: "postalytics",
  structuredRecipients: recipients,
  totalMatched: recipients.length,
  ...overrides,
});

describe("verifyPostalytics", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.POSTALYTICS_SEND_ENDPOINT;
  });

  it("connects with HTTP Basic auth against /account/me", async () => {
    const fetchMock = vi.fn<(...args: unknown[]) => Promise<Response>>(() =>
      Promise.resolve({
        json: () => Promise.resolve({ data: { name: "Birdcreek Roofing" } }),
        ok: true,
      } as Response)
    );
    vi.stubGlobal("fetch", fetchMock);

    const connection = await verifyProviderConnection("postalytics", {
      POSTALYTICS_API_KEY: POSTALYTICS_KEY,
    });

    expect(connection.ok).toBeTruthy();
    // API key configured → never the generic "not wired" fallback.
    expect(connection.message).not.toContain("not wired");
    expect(connection.accountLabel).toBe("Birdcreek Roofing");
    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      { headers: Record<string, string> },
    ];
    expect(url).toBe("https://api.postalytics.com/api/v1/account/me");
    expect(init.headers.Authorization).toBe(expectedPostalyticsAuth);
  });

  it("reports missing key without a raw 'not wired' message", async () => {
    const connection = await verifyProviderConnection("postalytics", {});
    expect(connection.ok).toBeFalsy();
    expect(connection.configured).toBeFalsy();
    expect(connection.message).toContain("Add a Postalytics API key");
    expect(connection.message).not.toContain("not wired");
  });
});

describe("submitPostalytics", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.POSTALYTICS_SEND_ENDPOINT;
  });

  it("triggers one live drop per recipient against the campaign endpoint", async () => {
    process.env.POSTALYTICS_SEND_ENDPOINT = POSTALYTICS_ENDPOINT;
    const fetchMock = mockPostalyticsSend();

    const result = await submitToProvider(
      postalyticsInput(),
      { POSTALYTICS_API_KEY: POSTALYTICS_KEY },
      true
    );

    expect(result.ok).toBeTruthy();
    expect(result.mode).toBe("live");
    expect(result.orderCount).toBe(3);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe(
      `https://api.postalytics.com/api/v1/send/${POSTALYTICS_ENDPOINT}`
    );
  });

  it("sends the recipient address as JSON with HTTP Basic auth", async () => {
    process.env.POSTALYTICS_SEND_ENDPOINT = POSTALYTICS_ENDPOINT;
    const fetchMock = mockPostalyticsSend();

    await submitToProvider(
      postalyticsInput(),
      { POSTALYTICS_API_KEY: POSTALYTICS_KEY },
      true
    );

    expect(headersOf(fetchMock).Authorization).toBe(expectedPostalyticsAuth);
    const body = jsonBodyOf(fetchMock);
    expect(body.address_street).toBe("100 Oak St");
    expect(body.address_city).toBe("Austin");
    expect(body.address_state).toBe("TX");
    expect(body.address_zip).toBe("78724");
  });

  it("passes recipient names and the headline as a merge-tag var field", async () => {
    process.env.POSTALYTICS_SEND_ENDPOINT = POSTALYTICS_ENDPOINT;
    const fetchMock = mockPostalyticsSend();

    await submitToProvider(
      postalyticsInput(),
      { POSTALYTICS_API_KEY: POSTALYTICS_KEY },
      true
    );

    const body = jsonBodyOf(fetchMock);
    expect(body.first_name).toBe("Neighbor");
    expect(body.last_name).toBe("Resident");
    // Headline flows into a merge-tag var field for the campaign template.
    expect(body.var_field_1).toBe("Roof age check");
  });

  it("refuses to send while the gate is off (no per-piece test — never mails)", async () => {
    process.env.POSTALYTICS_SEND_ENDPOINT = POSTALYTICS_ENDPOINT;
    const fetchMock = mockPostalyticsSend();

    const result = await submitToProvider(
      postalyticsInput(),
      { POSTALYTICS_API_KEY: POSTALYTICS_KEY },
      false
    );

    expect(result.ok).toBeFalsy();
    expect(result.message).toContain("no no-charge test send");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("asks for the campaign endpoint when it is not configured", async () => {
    const fetchMock = mockPostalyticsSend();

    const result = await submitToProvider(
      postalyticsInput(),
      { POSTALYTICS_API_KEY: POSTALYTICS_KEY },
      true
    );

    expect(result.ok).toBeFalsy();
    expect(result.message).toContain("POSTALYTICS_SEND_ENDPOINT");
    // A configured key must never yield the generic "not wired" fallback.
    expect(result.message).not.toContain("not wired");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
