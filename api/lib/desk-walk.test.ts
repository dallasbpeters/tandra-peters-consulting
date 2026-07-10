import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { collectHomeRoster } from "./desk-direct-mail.js";
import { walkVisitDocId } from "./desk-walk.js";

// The walk feature has two server-side invariants worth locking down:
//   1. Deterministic Sanity ids so per-home upserts never clobber siblings.
//   2. `collectHomeRoster` NEVER leaks homeowner PII, honors the polygon
//      post-filter, and caps very large zones.

const ROSTER_HOME_KEYS = [
  "address",
  "addressLine1",
  "city",
  "homeAge",
  "homeKey",
  "latitude",
  "longitude",
  "ownerOccupied",
  "propertyType",
  "squareFootage",
  "state",
  "yearBuilt",
  "zip",
].toSorted();

const property = (
  addressLine1: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> => ({
  addressLine1,
  city: "Austin",
  latitude: 30.31,
  longitude: -97.71,
  state: "TX",
  yearBuilt: 1996,
  zipCode: "78724",
  ...extra,
});

const mockRentcast = (properties: Record<string, unknown>[]): void => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(properties),
        ok: true,
      } as Response)
    )
  );
};

const payload = {
  neighborhoods: [{ latitude: 30.31, longitude: -97.71 }],
};

describe(walkVisitDocId, () => {
  it("is deterministic for the same target + home", () => {
    const id = walkVisitDocId("drafts.deskCanvassTarget.abc", "rc-123");
    expect(walkVisitDocId("drafts.deskCanvassTarget.abc", "rc-123")).toBe(id);
  });

  it("is scoped under the deskWalkVisit drafts prefix", () => {
    expect(walkVisitDocId("t1", "h1")).toBe("drafts.deskWalkVisit.t1.h1");
  });

  it("gives sibling homes distinct ids (no clobbering)", () => {
    const first = walkVisitDocId("drafts.deskCanvassTarget.abc", "rc-1");
    const second = walkVisitDocId("drafts.deskCanvassTarget.abc", "rc-2");
    expect(first).not.toBe(second);
  });

  it("slugs disallowed id characters but stays stable", () => {
    const id = walkVisitDocId(
      "drafts.deskCanvassTarget.abc",
      "addr-9f3c/weird key"
    );
    expect(id).toMatch(/^drafts\.deskWalkVisit\.[a-zA-Z0-9.-]+$/u);
    expect(
      walkVisitDocId("drafts.deskCanvassTarget.abc", "addr-9f3c/weird key")
    ).toBe(id);
  });
});

describe(collectHomeRoster, () => {
  beforeEach(() => {
    // These assertions exercise the legacy RentCast path, which now lives
    // behind the DESK_PROPERTY_SOURCE flag (default is the CAD source).
    process.env.DESK_PROPERTY_SOURCE = "rentcast";
    process.env.RENTCAST_API_KEY = "test-rentcast-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RENTCAST_API_KEY;
    delete process.env.DESK_PROPERTY_SOURCE;
  });

  it("strips homeowner names — no PII reaches the client", async () => {
    mockRentcast([
      property("100 Oak St", {
        owner: { names: ["John Q Homeowner"] },
        owner1FullName: "John Q Homeowner",
        ownerName: "John Q Homeowner",
        ownerOccupied: true,
      }),
    ]);

    const result = await collectHomeRoster(payload);

    expect(result.body.homes).toHaveLength(1);
    const [home] = result.body.homes;
    // Only the non-PII roster shape survives.
    expect(Object.keys(home).toSorted()).toStrictEqual(ROSTER_HOME_KEYS);
    // The ownerOccupied signal is kept (it's not a name); the name is gone.
    expect(home.ownerOccupied).toBeTruthy();
    expect(JSON.stringify(result.body.homes)).not.toContain("Homeowner");
  });

  it("post-filters a polygon zone to homes inside the outline", async () => {
    mockRentcast([
      property("Inside Ln", { latitude: 30.31, longitude: -97.71 }),
      property("Outside Rd", { latitude: 31.5, longitude: -96 }),
    ]);

    const result = await collectHomeRoster({
      ...payload,
      zone: {
        kind: "polygon",
        polygon: [
          [-97.73, 30.29],
          [-97.69, 30.29],
          [-97.69, 30.33],
          [-97.73, 30.33],
          [-97.73, 30.29],
        ],
      },
    });

    expect(result.body.homes).toHaveLength(1);
    expect(result.body.homes[0].addressLine1).toBe("Inside Ln");
  });

  it("caps very large zones at ADDRESS_LIST_HARD_CAP and flags capped", async () => {
    const many = Array.from({ length: 800 }, (_, index) =>
      property(`${index} Cap St`)
    );
    mockRentcast(many);

    const result = await collectHomeRoster(payload);

    expect(result.body.total).toBe(800);
    expect(result.body.capped).toBeTruthy();
    expect(result.body.homes).toHaveLength(750);
  });

  it("dedupes repeated homes by homeKey", async () => {
    mockRentcast([
      property("100 Oak St"),
      property("100 Oak St"),
      property("200 Elm St"),
    ]);

    const result = await collectHomeRoster(payload);

    expect(result.body.homes).toHaveLength(2);
  });

  it("reports missing-key when RentCast is unconfigured", async () => {
    delete process.env.RENTCAST_API_KEY;
    mockRentcast([property("100 Oak St")]);

    const result = await collectHomeRoster(payload);

    expect(result.body.status).toBe("missing-key");
    expect(result.body.homes).toStrictEqual([]);
  });
});
