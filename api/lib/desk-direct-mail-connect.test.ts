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
  });

  it("passes a URL front (not >10k inline HTML) and keeps back under 10k", async () => {
    const fetchMock = mockLobOk();
    // A real Ad Builder thumbnail is a large base64 PNG — the 10k culprit.
    const bigFront = `data:image/png;base64,${"A".repeat(20_000)}`;
    const bigQr = `data:image/png;base64,${"B".repeat(4000)}`;

    const result = await submitToProvider(
      baseInput({ front: bigFront, qrDataUri: bigQr }),
      { LOB_API_KEY: "test_abc123" },
      false
    );

    expect(result.ok).toBeTruthy();
    const params = paramsOf(fetchMock);
    // Front is the hosted URL, NOT the oversized base64/HTML.
    expect(params.get("front")).toBe(HOSTED_URL);
    // Back stays comfortably under Lob's inline limit (QR hosted, not inlined).
    expect((params.get("back") ?? "").length).toBeLessThan(10_000);
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
