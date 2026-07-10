import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearParcelCache,
  COUNTY_REGISTRY,
  countiesForRings,
  deriveQueryRings,
  fetchParcelsInZone,
  PARCEL_FETCH_HARD_CAP,
} from "./desk-parcels.js";

// Mocked ArcGIS parcel responses prove the CAD source structurally fixes the
// polygon undercount: the drawn ring is queried directly and PAGINATED via
// resultOffset, so a big polygon returns far more than one page (vs RentCast's
// old ~16). Also covers A1 filtering, the owner-occupancy proxy, per-county
// field normalization, PII stripping, county routing, and graceful degradation.

type Attrs = Record<string, unknown>;

const PARCEL_RING: [number, number][][] = [];

// A Travis-only ring (lat 30.31 sits below Williamson's bbox min 30.44).
const travisRing: [number, number][] = [
  [-97.72, 30.3],
  [-97.7, 30.3],
  [-97.7, 30.32],
  [-97.72, 30.32],
  [-97.72, 30.3],
];
// A Williamson-only ring (lat 30.8 sits above Travis's bbox max 30.63).
const williamsonRing: [number, number][] = [
  [-97.65, 30.78],
  [-97.6, 30.78],
  [-97.6, 30.82],
  [-97.65, 30.82],
  [-97.65, 30.78],
];
// A Hays-only ring (lat 29.95 below Travis min 30.02; Hays has no live endpoint).
const haysRing: [number, number][] = [
  [-98.05, 29.9],
  [-98, 29.9],
  [-98, 30],
  [-98.05, 30],
  [-98.05, 29.9],
];

const parcelGeometry = {
  rings: [
    [
      [-97.71, 30.31],
      [-97.709, 30.31],
      [-97.709, 30.311],
      [-97.71, 30.311],
      [-97.71, 30.31],
    ],
  ],
};

const travisFeature = (index: number, overrides: Attrs = {}) => ({
  attributes: {
    F1year_imprv: 1990,
    PROP_ID: 100_000 + index,
    imprv_homesite_val: 240_000,
    land_state_cd: "A1",
    // PII that must NEVER survive normalization:
    py_owner_name: "JANE HOMEOWNER",
    situs_address: `${100 + index} TANGLEBRIAR TRL AUSTIN 78750`,
    situs_city: "AUSTIN",
    situs_num: String(100 + index),
    situs_street: "TANGLEBRIAR",
    situs_street_prefx: "",
    situs_street_suffix: "TRL",
    situs_zip: "78750",
    ...overrides,
  },
  geometry: parcelGeometry,
});

const williamsonFeature = (index: number, overrides: Attrs = {}) => ({
  attributes: {
    ExemptionList: "HS,OA",
    Mailing1: "PO BOX 42",
    OBJECTID: 500 + index,
    PARCELID: `W${500 + index}`,
    RESYRBLT: 1995,
    Scity: "ROUND ROCK",
    SITEADDRESS: `${200 + index} MESA DR, ROUND ROCK, TX  78664`,
    SitusAddress: `${200 + index} MESA DR, ROUND ROCK, TX  78664`,
    Sstate: "TX",
    Szip: "78664",
    TotalSqFtLivingArea: 2100,
    USEDSCRP: "Residential",
    OWNERNME1: "JOHN OWNER",
    ...overrides,
  },
  geometry: parcelGeometry,
});

interface CapturedRequest {
  body: string;
  method: string;
  url: string;
}

const captured: CapturedRequest[] = [];

/** Mock fetch that pages by `resultOffset`: pageSizes[0] for offset 0, etc. */
const mockArcgisPages = (
  makeFeature: (index: number) => unknown,
  pageSizes: number[]
): void => {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init: { body: string; method?: string }) => {
      captured.push({ body: init.body, method: init.method ?? "GET", url });
      const params = new URLSearchParams(init.body);
      const offset = Number(params.get("resultOffset") ?? "0");
      const pageIndex = Math.floor(offset / 1000);
      const count = pageSizes[pageIndex] ?? 0;
      const features = Array.from({ length: count }, (_unused, item) =>
        makeFeature(offset + item)
      );
      return Promise.resolve({
        json: () => Promise.resolve({ features }),
        ok: true,
      } as Response);
    })
  );
};

const mockArcgisFixed = (features: unknown[]): void => {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init: { body: string; method?: string }) => {
      captured.push({ body: init.body, method: init.method ?? "GET", url });
      const params = new URLSearchParams(init.body);
      const offset = Number(params.get("resultOffset") ?? "0");
      return Promise.resolve({
        json: () => Promise.resolve({ features: offset === 0 ? features : [] }),
        ok: true,
      } as Response);
    })
  );
};

describe(deriveQueryRings, () => {
  it("uses a drawn polygon outline directly (no centroid clamp)", () => {
    const rings = deriveQueryRings({
      zone: { kind: "polygon", polygon: travisRing },
    });
    expect(rings).toHaveLength(1);
    expect(rings[0]).toStrictEqual(travisRing);
  });

  it("prefers a drawn polygon over neighborhood centroids (undercount fix)", () => {
    // A SAVED polygon target carries the tracts its outline overlaps in
    // `neighborhoods` (for the estimate). Those centroids must NOT win — else
    // the query becomes tiny offset circles and the roster's point-in-polygon
    // post-filter collapses a 1,500-home polygon to a sliver (~23 homes).
    const rings = deriveQueryRings({
      neighborhoods: [
        { latitude: 30.235, longitude: -97.63, radiusMiles: 0.6 },
        { latitude: 30.24, longitude: -97.61 },
      ],
      zone: { kind: "polygon", polygon: travisRing },
    });
    expect(rings).toHaveLength(1);
    expect(rings[0]).toStrictEqual(travisRing);
  });

  it("parses a flat interleaved polygon ring (not just nested pairs)", () => {
    const flat = travisRing.flat();
    const rings = deriveQueryRings({
      zone: { kind: "polygon", polygon: flat },
    });
    expect(rings).toHaveLength(1);
    expect(rings[0]).toStrictEqual(travisRing);
  });

  it("builds one circle ring per tract-selection centroid (no geometry)", () => {
    const rings = deriveQueryRings({
      neighborhoods: [
        { latitude: 30.31, longitude: -97.71 },
        { latitude: 30.8, longitude: -97.62 },
      ],
    });
    expect(rings).toHaveLength(2);
    // Closed N-gon approximation of a circle.
    expect(rings[0].length).toBeGreaterThan(8);
    expect(rings[0].at(0)).toStrictEqual(rings[0].at(-1));
  });

  it("queries a selected neighborhood's TRUE boundary, not a centroid circle", () => {
    // The undercount fix: a selected tract carries its real polygon in
    // `geometry`. That footprint (not a tiny 0.6-mi centroid circle) must be the
    // query ring — the circle collapses a 1,500-home tract to a few hundred.
    const rings = deriveQueryRings({
      neighborhoods: [
        {
          geometry: { coordinates: [travisRing], type: "Polygon" },
          latitude: 30.31,
          longitude: -97.71,
        },
      ],
    });
    expect(rings).toStrictEqual([travisRing]);
  });

  it("unions the boundaries of every selected neighborhood", () => {
    const rings = deriveQueryRings({
      neighborhoods: [
        { geometry: { coordinates: [travisRing], type: "Polygon" } },
        {
          geometry: {
            coordinates: [[williamsonRing]],
            type: "MultiPolygon",
          },
        },
      ],
    });
    expect(rings).toStrictEqual([travisRing, williamsonRing]);
  });

  it("falls back to a centroid circle only when a boundary is missing", () => {
    const rings = deriveQueryRings({
      neighborhoods: [
        { geometry: { coordinates: [travisRing], type: "Polygon" } },
        { latitude: 30.8, longitude: -97.62 },
      ],
    });
    expect(rings[0]).toStrictEqual(travisRing);
    // Second neighborhood has no geometry → centroid circle (closed N-gon).
    expect(rings[1].length).toBeGreaterThan(8);
  });

  it("builds a circle for a radius (circle) zone", () => {
    const rings = deriveQueryRings({
      zone: {
        kind: "circle",
        latitude: 30.31,
        longitude: -97.71,
        radiusMiles: 0.5,
      },
    });
    expect(rings).toHaveLength(1);
  });

  it("returns no rings when the payload carries no geometry", () => {
    expect(deriveQueryRings({})).toStrictEqual(PARCEL_RING);
  });
});

describe(countiesForRings, () => {
  it("routes a Travis ring to Travis only", () => {
    expect(countiesForRings([travisRing]).map((c) => c.key)).toStrictEqual([
      "travis",
    ]);
  });

  it("routes a Williamson ring to Williamson only", () => {
    expect(countiesForRings([williamsonRing]).map((c) => c.key)).toStrictEqual([
      "williamson",
    ]);
  });

  it("routes a Hays ring to no live county (unconfirmed endpoint)", () => {
    expect(countiesForRings([haysRing])).toStrictEqual([]);
  });
});

describe(fetchParcelsInZone, () => {
  beforeEach(() => {
    captured.length = 0;
    clearParcelCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("paginates a polygon far past one page (the 16-cap bug is gone)", async () => {
    // Page 0 returns a FULL 1000-row page, forcing a second fetch at offset
    // 1000; page 1 returns a short page, ending pagination. 1500 >> 16.
    mockArcgisPages((index) => travisFeature(index), [1000, 500]);

    const parcels = await fetchParcelsInZone([travisRing]);

    expect(parcels).toHaveLength(1500);
    // Proof it advanced past page one: a request with resultOffset=1000 exists.
    const offsets = captured.map((request) =>
      new URLSearchParams(request.body).get("resultOffset")
    );
    expect(offsets).toContain("0");
    expect(offsets).toContain("1000");
  });

  it("posts an auto-closed polygon with the right spatial params", async () => {
    mockArcgisFixed([travisFeature(0)]);

    // An UNCLOSED ring (first !== last) — the code must close it for ArcGIS.
    const openRing: [number, number][] = [
      [-97.72, 30.3],
      [-97.7, 30.3],
      [-97.7, 30.32],
      [-97.72, 30.32],
    ];
    await fetchParcelsInZone([openRing]);

    const [request] = captured;
    const params = new URLSearchParams(request.body);
    // Long geometry must go in a POST body, never a truncatable GET query string.
    expect(request.method).toBe("POST");
    expect({
      geometryType: params.get("geometryType"),
      inSR: params.get("inSR"),
      spatialRel: params.get("spatialRel"),
    }).toStrictEqual({
      geometryType: "esriGeometryPolygon",
      inSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
    });
    const geometry = JSON.parse(params.get("geometry") ?? "{}") as {
      rings: number[][][];
      spatialReference?: { wkid?: number };
    };
    const ring = geometry.rings[0];
    expect(geometry.spatialReference?.wkid).toBe(4326);
    // The open ring was closed: first vertex repeated as the last (len+1).
    expect(ring).toStrictEqual([...openRing, openRing[0]]);
  });

  it("requests the A1 single-family + older-than-2009 WHERE clause", async () => {
    mockArcgisFixed([travisFeature(0)]);

    await fetchParcelsInZone([travisRing]);

    const where = new URLSearchParams(captured[0].body).get("where") ?? "";
    expect(where).toContain("land_state_cd = 'A1'");
    expect(where).toContain("F1year_imprv <= 2009");
  });

  it("never requests or emits owner-name (PII) fields", async () => {
    mockArcgisFixed([travisFeature(0)]);

    const parcels = await fetchParcelsInZone([travisRing]);

    const outFields =
      new URLSearchParams(captured[0].body).get("outFields") ?? "";
    expect(outFields.toLowerCase()).not.toContain("owner");
    expect(outFields).not.toContain("py_owner_name");
    // The normalized record carries no owner key and no owner value.
    const serialized = JSON.stringify(parcels[0]);
    expect(serialized).not.toContain("JANE HOMEOWNER");
    expect(Object.keys(parcels[0])).not.toContain("ownerName");
  });

  it("normalizes Travis fields into the common non-PII shape", async () => {
    mockArcgisFixed([travisFeature(0)]);

    const [parcel] = await fetchParcelsInZone([travisRing]);

    expect(parcel).toMatchObject({
      addressLine1: "100 TANGLEBRIAR TRL",
      city: "AUSTIN",
      county: "travis",
      landUseCode: "A1",
      propertyType: "Single Family",
      state: "TX",
      yearBuilt: 1990,
      zipCode: "78750",
    });
    // Centroid computed from the returned polygon geometry (outSR=4326).
    expect(parcel.latitude).toBeCloseTo(30.3105, 3);
    expect(parcel.longitude).toBeCloseTo(-97.7095, 3);
  });

  it("derives the Travis owner-occupancy proxy from homestead value", async () => {
    mockArcgisFixed([
      travisFeature(0, { PROP_ID: 1, imprv_homesite_val: 240_000 }),
      travisFeature(1, { PROP_ID: 2, imprv_homesite_val: 0 }),
    ]);

    const parcels = await fetchParcelsInZone([travisRing]);
    const byId = new Map(parcels.map((parcel) => [parcel.id, parcel]));

    expect(byId.get("travis-1")?.ownerOccupied).toBeTruthy();
    expect(byId.get("travis-2")?.ownerOccupied).toBeFalsy();
  });

  it("normalizes Williamson fields and its homestead/owner-mail proxy", async () => {
    mockArcgisFixed([
      williamsonFeature(0, { PARCELID: "HS", ExemptionList: "HS,OA" }),
      williamsonFeature(1, {
        PARCELID: "MAIL",
        ExemptionList: "",
        SITEADDRESS: "250 MESA DR, ROUND ROCK, TX  78664",
        SitusAddress: "250 MESA DR, ROUND ROCK, TX  78664",
        Mailing1: "250 MESA DR",
      }),
      williamsonFeature(2, {
        PARCELID: "NONE",
        ExemptionList: "",
        Mailing1: "PO BOX 9",
      }),
    ]);

    const parcels = await fetchParcelsInZone([williamsonRing]);
    const byId = new Map(parcels.map((parcel) => [parcel.id, parcel]));

    expect(byId.get("williamson-HS")?.addressLine1).toBe("200 MESA DR");
    expect(byId.get("williamson-HS")?.squareFootage).toBe(2100);
    expect(byId.get("williamson-HS")?.ownerOccupied).toBeTruthy();
    // Homestead exemption absent but owner-mail == situs → still owner-occupied.
    expect(byId.get("williamson-MAIL")?.ownerOccupied).toBeTruthy();
    // Neither signal → not owner-occupied.
    expect(byId.get("williamson-NONE")?.ownerOccupied).toBeFalsy();
  });

  it("degrades gracefully when a county endpoint is not confirmed (Hays)", async () => {
    mockArcgisFixed([travisFeature(0)]);

    const parcels = await fetchParcelsInZone([haysRing]);

    expect(parcels).toStrictEqual([]);
    // No confirmed endpoint → no network call at all.
    expect(captured).toHaveLength(0);
  });

  it("degrades gracefully when a county server errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({}),
          ok: false,
          status: 500,
        } as Response)
      )
    );

    const parcels = await fetchParcelsInZone([travisRing]);

    expect(parcels).toStrictEqual([]);
  });

  it("bounds a runaway zone to the hard cap", async () => {
    // Every page is full, so pagination would never end without the cap.
    mockArcgisPages(
      (index) => travisFeature(index),
      Array.from({ length: 20 }, () => 1000)
    );

    const parcels = await fetchParcelsInZone([travisRing]);

    expect(parcels.length).toBeLessThanOrEqual(PARCEL_FETCH_HARD_CAP);
  });
});

describe("COUNTY_REGISTRY config", () => {
  it("wires Travis + Williamson as confirmed and Hays as unconfirmed", () => {
    const byKey = new Map(
      COUNTY_REGISTRY.map((county) => [county.key, county])
    );
    expect(byKey.get("travis")).toMatchObject({ confirmed: true });
    expect(byKey.get("travis")?.queryUrl).toContain("TCAD_Parcels_Dec_2025");
    expect(byKey.get("williamson")).toMatchObject({ confirmed: true });
    expect(byKey.get("williamson")?.queryUrl).toContain("wilco.org");
    expect(byKey.get("hays")).toMatchObject({
      confirmed: false,
      queryUrl: null,
    });
  });

  it("keeps owner-name columns out of every county's outFields", () => {
    for (const county of COUNTY_REGISTRY) {
      const joined = county.outFields.join(",").toLowerCase();
      expect(joined).not.toContain("owner");
      expect(joined).not.toContain("py_owner_name");
      expect(joined).not.toContain("primaryowner");
      expect(joined).not.toContain("fullname");
    }
  });
});
