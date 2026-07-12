import { describe, expect, it, vi } from "vitest";

import {
  readStreetViewKey,
  streetViewImage,
  streetViewImageUrl,
  streetViewMetadata,
  streetViewParamsFrom,
} from "./desk-streetview.js";

const metaResponse = (status: string, ok = true): Response =>
  ({
    json: () => Promise.resolve({ status }),
    ok,
  }) as unknown as Response;

const metaFetch = (meta: Response) =>
  vi.fn<(input: RequestInfo | URL) => Promise<Response>>(() =>
    Promise.resolve(meta)
  ) as unknown as typeof fetch;

const AUSTIN = { lat: 30.31, lng: -97.71 };

describe(readStreetViewKey, () => {
  it("reads the server key, falls back to the maps key, ignores nothing else", () => {
    expect(readStreetViewKey({ GOOGLE_STREETVIEW_API_KEY: " sv-key " })).toBe(
      "sv-key"
    );
    expect(readStreetViewKey({ GOOGLE_MAPS_API_KEY: "maps-key" })).toBe(
      "maps-key"
    );
    expect(readStreetViewKey({})).toBeUndefined();
  });
});

describe(streetViewMetadata, () => {
  it("reports missing-key without hitting the network", async () => {
    const fetchImpl = metaFetch(metaResponse("OK"));
    const result = await streetViewMetadata(AUSTIN, {
      apiKey: undefined,
      fetchImpl,
    });
    expect(result).toStrictEqual({ available: false, reason: "missing-key" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reports no-location when neither coords nor address are usable", async () => {
    const fetchImpl = metaFetch(metaResponse("OK"));
    const result = await streetViewMetadata(
      {},
      { apiKey: "sv-key", fetchImpl }
    );
    expect(result).toStrictEqual({ available: false, reason: "no-location" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("marks imagery available only when Google returns status OK", async () => {
    const result = await streetViewMetadata(AUSTIN, {
      apiKey: "sv-key",
      fetchImpl: metaFetch(metaResponse("OK")),
    });
    expect(result).toStrictEqual({ available: true });
  });

  it("treats ZERO_RESULTS as no imagery (graceful fallback)", async () => {
    const result = await streetViewMetadata(AUSTIN, {
      apiKey: "sv-key",
      fetchImpl: metaFetch(metaResponse("ZERO_RESULTS")),
    });
    expect(result).toStrictEqual({ available: false, reason: "no-imagery" });
  });

  it("falls back to error on a non-OK response or thrown fetch", async () => {
    const notOk = await streetViewMetadata(AUSTIN, {
      apiKey: "sv-key",
      fetchImpl: metaFetch(metaResponse("OK", false)),
    });
    expect(notOk).toStrictEqual({ available: false, reason: "error" });

    const threw = await streetViewMetadata(AUSTIN, {
      apiKey: "sv-key",
      fetchImpl: (() => Promise.reject(new Error("network"))) as typeof fetch,
    });
    expect(threw).toStrictEqual({ available: false, reason: "error" });
  });

  it("sends the location + key to the metadata endpoint", async () => {
    const fetchImpl = metaFetch(metaResponse("OK"));
    await streetViewMetadata(AUSTIN, { apiKey: "sv-key", fetchImpl });
    const calledUrl = String(
      (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]
    );
    expect(calledUrl).toContain("streetview/metadata");
    expect(calledUrl).toContain("location=30.31%2C-97.71");
    expect(calledUrl).toContain("key=sv-key");
  });

  it("uses a free-text address when no coordinates are supplied", async () => {
    const fetchImpl = metaFetch(metaResponse("OK"));
    await streetViewMetadata(
      { address: "100 Oak St, Austin, TX" },
      { apiKey: "sv-key", fetchImpl }
    );
    const calledUrl = String(
      (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]
    );
    expect(calledUrl).toContain("location=100+Oak+St");
  });
});

const imageResponse = (
  ok: boolean,
  contentType = "image/jpeg"
): Response =>
  ({
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    headers: { get: () => contentType },
    ok,
  }) as unknown as Response;

const imageFetch = (response: Response) =>
  vi.fn<(input: RequestInfo | URL) => Promise<Response>>(() =>
    Promise.resolve(response)
  ) as unknown as typeof fetch;

describe(streetViewImageUrl, () => {
  it("returns null without a key or a usable location", () => {
    expect(streetViewImageUrl(AUSTIN, undefined)).toBeNull();
    expect(streetViewImageUrl({}, "sv-key")).toBeNull();
  });

  it("builds a Static Street View URL with the server key and location", () => {
    const url = streetViewImageUrl(AUSTIN, " sv-key ");
    expect(url).toContain("maps/api/streetview?");
    expect(url).toContain("location=30.31%2C-97.71");
    expect(url).toContain("key=sv-key");
    expect(url).toContain("return_error_code=true");
    expect(url).toContain("size=640x360");
  });
});

describe(streetViewImage, () => {
  it("reports missing-key with a 500 and no network call", async () => {
    const fetchImpl = imageFetch(imageResponse(true));
    const result = await streetViewImage(AUSTIN, {
      apiKey: undefined,
      fetchImpl,
    });
    expect(result).toStrictEqual({
      ok: false,
      reason: "missing-key",
      status: 500,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns image bytes and content type on success", async () => {
    const result = await streetViewImage(AUSTIN, {
      apiKey: "sv-key",
      fetchImpl: imageFetch(imageResponse(true, "image/png")),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.contentType).toBe("image/png");
      expect(result.body.byteLength).toBe(8);
    }
  });

  it("maps a non-OK response to no-imagery (404)", async () => {
    const result = await streetViewImage(AUSTIN, {
      apiKey: "sv-key",
      fetchImpl: imageFetch(imageResponse(false)),
    });
    expect(result).toStrictEqual({
      ok: false,
      reason: "no-imagery",
      status: 404,
    });
  });

  it("maps a thrown fetch to an upstream error (502)", async () => {
    const result = await streetViewImage(AUSTIN, {
      apiKey: "sv-key",
      fetchImpl: (() => Promise.reject(new Error("network"))) as typeof fetch,
    });
    expect(result).toStrictEqual({ ok: false, reason: "error", status: 502 });
  });
});

describe(streetViewParamsFrom, () => {
  it("coerces numeric coords and keeps the address", () => {
    expect(
      streetViewParamsFrom({
        address: "100 Oak St",
        lat: "30.31",
        lng: "-97.71",
      })
    ).toStrictEqual({
      address: "100 Oak St",
      lat: 30.31,
      lng: -97.71,
    });
  });

  it("drops non-numeric coords and takes the first of array values", () => {
    expect(
      streetViewParamsFrom({ lat: "abc", lng: ["-97.71", "0"] })
    ).toStrictEqual({
      address: undefined,
      lat: undefined,
      lng: -97.71,
    });
  });
});
