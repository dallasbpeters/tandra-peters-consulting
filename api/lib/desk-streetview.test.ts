import { describe, expect, it, vi } from "vitest";

import {
  buildStreetViewEmbedUrl,
  readStreetViewKey,
  streetViewMetadata,
  streetViewParamsFrom,
} from "./desk-streetview.js";

const metaResponse = (
  status: string,
  options: { location?: { lat: number; lng: number }; ok?: boolean } = {}
): Response =>
  ({
    json: () => Promise.resolve({ location: options.location, status }),
    ok: options.ok ?? true,
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

  it("returns available + a ready-to-mount embed URL when Google returns OK", async () => {
    const result = await streetViewMetadata(AUSTIN, {
      apiKey: "sv-key",
      fetchImpl: metaFetch(metaResponse("OK")),
    });
    expect(result.available).toBeTruthy();
    expect(result.reason).toBeUndefined();
    expect(result.embedUrl).toContain("maps/embed/v1/streetview");
    expect(result.embedUrl).toContain("location=30.31%2C-97.71");
    expect(result.embedUrl).toContain("key=sv-key");
  });

  it("prefers the panorama's own location over the requested coordinates", async () => {
    const result = await streetViewMetadata(AUSTIN, {
      apiKey: "sv-key",
      fetchImpl: metaFetch(
        metaResponse("OK", { location: { lat: 30.4, lng: -97.8 } })
      ),
    });
    expect(result.available).toBeTruthy();
    expect(result.embedUrl).toContain("location=30.4%2C-97.8");
  });

  it("treats OK with no resolvable coordinates as no-location (no embed)", async () => {
    const result = await streetViewMetadata(
      { address: "100 Oak St, Austin, TX" },
      { apiKey: "sv-key", fetchImpl: metaFetch(metaResponse("OK")) }
    );
    expect(result).toStrictEqual({ available: false, reason: "no-location" });
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
      fetchImpl: metaFetch(metaResponse("OK", { ok: false })),
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

  it("uses a free-text address for the metadata lookup + returned location for the embed", async () => {
    const fetchImpl = metaFetch(
      metaResponse("OK", { location: { lat: 30.27, lng: -97.74 } })
    );
    const result = await streetViewMetadata(
      { address: "100 Oak St, Austin, TX" },
      { apiKey: "sv-key", fetchImpl }
    );
    const calledUrl = String(
      (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]
    );
    expect(calledUrl).toContain("location=100+Oak+St");
    expect(result.available).toBeTruthy();
    expect(result.embedUrl).toContain("location=30.27%2C-97.74");
  });
});

describe(buildStreetViewEmbedUrl, () => {
  it("embeds the key + location and interactive defaults", () => {
    const url = new URL(buildStreetViewEmbedUrl("sv-key", 30.31, -97.71));
    expect(`${url.origin}${url.pathname}`).toBe(
      "https://www.google.com/maps/embed/v1/streetview"
    );
    expect(Object.fromEntries(url.searchParams)).toStrictEqual({
      fov: "90",
      heading: "0",
      key: "sv-key",
      location: "30.31,-97.71",
      pitch: "0",
    });
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
