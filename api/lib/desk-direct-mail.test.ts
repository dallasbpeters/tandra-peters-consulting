import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  collectHomeRoster,
  collectSubmitRecipients,
  prepareDirectMailAddresses,
} from "./desk-direct-mail.js";
import { clearParcelCache } from "./desk-parcels.js";

// A drawn/selected zone matches many homes. The submit must mail the WHOLE set
// (deduped), not a single address (the old test-mode bug) nor the ~60-address
// preview sample. These tests exercise the real recipient-building function
// with a mocked RentCast response.

const property = (
  addressLine1: string,
  zipCode: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> => ({
  addressLine1,
  city: "Austin",
  state: "TX",
  zipCode,
  ...extra,
});

const mockRentcast = (properties: Record<string, unknown>[]): void => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(properties),
      } as Response)
    )
  );
};

const payload = {
  neighborhoods: [{ latitude: 30.31, longitude: -97.71 }],
};

describe(collectSubmitRecipients, () => {
  beforeEach(() => {
    // Exercise the legacy RentCast path explicitly — it stays fully wired
    // behind the DESK_PROPERTY_SOURCE flag (default is the free CAD source).
    process.env.DESK_PROPERTY_SOURCE = "rentcast";
    process.env.RENTCAST_API_KEY = "test-rentcast-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RENTCAST_API_KEY;
    delete process.env.DESK_PROPERTY_SOURCE;
  });

  const mixedProperties = [
    property("100 Oak St", "78724"),
    property("200 Elm St", "78724", { state: "tx" }),
    property("300 Pine St", "78724", { city: "", state: "" }),
    property("100 Oak St", "78724"), // duplicate of the first → collapsed
    { formattedAddress: "No line1, dropped" }, // no addressLine1 → dropped
    property("400 Birch St", ""), // no zip → dropped
  ];

  it("returns the FULL deduped recipient set (not one, not a sample)", async () => {
    mockRentcast(mixedProperties);

    const result = await collectSubmitRecipients(payload);

    expect(result.status).toBe("configured");
    expect(result.totalMatched).toBe(3);
    // The whole batch — K > 1 — is what a K-address zone must submit.
    expect(result.recipients).toHaveLength(3);
    expect(
      result.recipients.map((recipient) => recipient.addressLine1)
    ).toStrictEqual(["100 Oak St", "200 Elm St", "300 Pine St"]);
  });

  it("normalizes recipient fields (default city/state, upper-cased state)", async () => {
    mockRentcast(mixedProperties);

    const result = await collectSubmitRecipients(payload);

    expect(result.recipients[1].state).toBe("TX");
    expect(result.recipients[2].city).toBe("Austin");
    expect(result.recipients[2].state).toBe("TX");
  });

  it("reports missing-key with no recipients when RentCast is unconfigured", async () => {
    delete process.env.RENTCAST_API_KEY;
    mockRentcast([property("100 Oak St", "78724")]);

    const result = await collectSubmitRecipients(payload);

    expect(result.status).toBe("missing-key");
    expect(result.recipients).toStrictEqual([]);
    expect(result.totalMatched).toBe(0);
  });

  it("is unavailable when no query has coordinates", async () => {
    mockRentcast([property("100 Oak St", "78724")]);

    const result = await collectSubmitRecipients({ neighborhoods: [{}] });

    expect(result.status).toBe("unavailable");
    expect(result.recipients).toStrictEqual([]);
  });
});

// End-to-end through the pipeline with the DEFAULT (CAD) source: the drawn
// polygon is queried against the Travis CAD endpoint with mocked, paginated
// ArcGIS responses. Proves the roster/address consumers work unchanged on CAD,
// that the polygon pagination returns far more than one page (16-cap gone), and
// that owner PII never reaches the roster.

// A drawn polygon over Travis county (contains the mocked parcel centroid).
const travisPolygon: [number, number][] = [
  [-97.72, 30.3],
  [-97.7, 30.3],
  [-97.7, 30.32],
  [-97.72, 30.32],
  [-97.72, 30.3],
];

const cadFeature = (index: number): unknown => ({
  attributes: {
    F1year_imprv: 1988,
    PROP_ID: 200_000 + index,
    imprv_homesite_val: 300_000,
    land_state_cd: "A1",
    py_owner_name: "SECRET OWNER",
    situs_address: `${index} PECAN LN AUSTIN 78750`,
    situs_city: "AUSTIN",
    situs_num: String(index),
    situs_street: "PECAN",
    situs_street_suffix: "LN",
    situs_zip: "78750",
  },
  geometry: {
    rings: [
      [
        [-97.71, 30.31],
        [-97.709, 30.31],
        [-97.709, 30.311],
        [-97.71, 30.311],
        [-97.71, 30.31],
      ],
    ],
  },
});

const mockCadPages = (pageSizes: number[]): void => {
  vi.stubGlobal(
    "fetch",
    vi.fn((_url: string, init: { body: string }) => {
      const offset = Number(
        new URLSearchParams(init.body).get("resultOffset") ?? "0"
      );
      const count = pageSizes[Math.floor(offset / 1000)] ?? 0;
      const features = Array.from({ length: count }, (_unused, item) =>
        cadFeature(offset + item)
      );
      return Promise.resolve({
        json: () => Promise.resolve({ features }),
        ok: true,
      } as Response);
    })
  );
};

describe("CAD source (default) pipeline", () => {
  beforeEach(() => {
    clearParcelCache();
    // No RENTCAST_API_KEY and no DESK_PROPERTY_SOURCE → defaults to CAD.
    delete process.env.RENTCAST_API_KEY;
    delete process.env.DESK_PROPERTY_SOURCE;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds a polygon roster far past one page with the proxy + no PII", async () => {
    mockCadPages([1000, 400]);

    const result = await collectHomeRoster({
      zone: { kind: "polygon", polygon: travisPolygon },
    });

    expect(result.body.status).toBe("configured");
    // 1400 matched, far more than RentCast's old single-circle ~16.
    expect(result.body.total).toBe(1400);
    expect(result.body.capped).toBeTruthy();
    // Owner-occupancy proxy survived (homestead value > 0) …
    expect(
      result.body.homes.every((home) => home.ownerOccupied === true)
    ).toBeTruthy();
    // … and the owner name never left the server.
    expect(JSON.stringify(result.body.homes)).not.toContain("SECRET OWNER");
  });

  it("lists CAD addresses for a polygon with no RentCast key", async () => {
    mockCadPages([3]);

    const result = await prepareDirectMailAddresses({
      zone: { kind: "polygon", polygon: travisPolygon },
    });

    expect(result.body.status).toBe("configured");
    expect(result.body.matchedProperties).toBe(3);
    expect(result.body.totalAddresses).toBe(3);
  });

  it("is unavailable when the payload has no usable geometry", async () => {
    mockCadPages([3]);

    const result = await prepareDirectMailAddresses({});

    expect(result.body.status).toBe("unavailable");
    expect(result.body.totalAddresses).toBe(0);
  });
});
