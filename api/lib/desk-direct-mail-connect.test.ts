import { afterEach, describe, expect, it, vi } from "vitest";

import { submitToProvider } from "./desk-direct-mail-connect.js";
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
