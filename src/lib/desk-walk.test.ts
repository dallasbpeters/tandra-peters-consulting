import { describe, expect, it } from "vitest";

import {
  coerceWalkStatus,
  deriveHomeKey,
  isWalkStatus,
  mergeRosterWithVisits,
  roofAgeYears,
  summarizeWalk,
  WALK_STATUS_ORDER,
  walkStatusColors,
  walkStatusLabels,
  walkStatusShortLabels,
} from "./desk-walk";
import type { RosterHome, WalkStatus, WalkVisit } from "./desk-walk";

const rosterHome = (overrides: Partial<RosterHome> = {}): RosterHome => ({
  address: "100 Oak St, Austin, TX 78724",
  addressLine1: "100 Oak St",
  city: "Austin",
  homeAge: 30,
  homeKey: "home-1",
  latitude: 30.31,
  longitude: -97.71,
  ownerOccupied: true,
  propertyType: "Single Family",
  squareFootage: 1800,
  state: "TX",
  yearBuilt: 1996,
  zip: "78724",
  ...overrides,
});

const visit = (overrides: Partial<WalkVisit> = {}): WalkVisit => ({
  homeKey: "home-1",
  status: "talked",
  targetId: "drafts.deskCanvassTarget.abc",
  ...overrides,
});

describe(deriveHomeKey, () => {
  it("prefers the RentCast id when present", () => {
    expect(deriveHomeKey("rc-123", "100 Oak St", "78724")).toBe("rc-123");
    expect(deriveHomeKey("  rc-123  ", "100 Oak St", "78724")).toBe("rc-123");
  });

  it("hashes address|zip when no RentCast id (stable + deterministic)", () => {
    const first = deriveHomeKey(null, "100 Oak St", "78724");
    const second = deriveHomeKey("", "100 Oak St", "78724");
    expect(first).toBe(second);
    expect(first).toMatch(/^addr-[0-9a-f]{8}$/u);
  });

  it("is case- and whitespace-insensitive for the address key", () => {
    expect(deriveHomeKey(null, "  100 OAK st ", "78724")).toBe(
      deriveHomeKey(null, "100 oak st", " 78724 ")
    );
  });

  it("produces different keys for different addresses", () => {
    expect(deriveHomeKey(null, "100 Oak St", "78724")).not.toBe(
      deriveHomeKey(null, "200 Elm St", "78724")
    );
  });
});

describe(mergeRosterWithVisits, () => {
  it("defaults homes with no visit to not-started", () => {
    const merged = mergeRosterWithVisits([rosterHome()], []);
    expect(merged).toHaveLength(1);
    expect(merged[0].status).toBe("not-started");
    expect(merged[0].notes).toBeUndefined();
  });

  it("applies a visit's status/notes to the matching home by homeKey", () => {
    const merged = mergeRosterWithVisits(
      [rosterHome({ homeKey: "home-1" }), rosterHome({ homeKey: "home-2" })],
      [visit({ homeKey: "home-2", notes: "left a hanger", status: "booked" })]
    );
    expect(merged[0].status).toBe("not-started");
    expect(merged[1].status).toBe("booked");
    expect(merged[1].notes).toBe("left a hanger");
  });

  it("coerces an unknown persisted status back to the default", () => {
    const merged = mergeRosterWithVisits(
      [rosterHome()],
      [visit({ status: "bogus" as WalkStatus })]
    );
    expect(merged[0].status).toBe("not-started");
  });
});

describe(summarizeWalk, () => {
  it("counts knocked homes and per-status totals", () => {
    const homes = mergeRosterWithVisits(
      [
        rosterHome({ homeKey: "a" }),
        rosterHome({ homeKey: "b" }),
        rosterHome({ homeKey: "c" }),
      ],
      [
        visit({ homeKey: "b", status: "talked" }),
        visit({ homeKey: "c", status: "booked" }),
      ]
    );
    const progress = summarizeWalk(homes);
    expect(progress.total).toBe(3);
    expect(progress.knocked).toBe(2);
    expect(progress.byStatus.talked).toBe(1);
    expect(progress.byStatus.booked).toBe(1);
    expect(progress.byStatus["not-started"]).toBe(1);
  });
});

describe("status metadata", () => {
  it("has a label, short label, and color for every status in the enum", () => {
    for (const status of WALK_STATUS_ORDER) {
      expect(walkStatusLabels[status]).toBeTruthy();
      expect(walkStatusShortLabels[status]).toBeTruthy();
      expect(walkStatusColors[status]).toMatch(/^#[0-9a-f]{6}$/u);
    }
    expect(WALK_STATUS_ORDER).toHaveLength(8);
  });

  it("recognizes valid statuses and rejects others", () => {
    expect(isWalkStatus("booked")).toBeTruthy();
    expect(isWalkStatus("nope")).toBeFalsy();
    expect(coerceWalkStatus("nope")).toBe("not-started");
    expect(coerceWalkStatus("come-back")).toBe("come-back");
  });
});

describe(roofAgeYears, () => {
  it("uses homeAge, then yearBuilt, then the zone fallback", () => {
    expect(roofAgeYears({ homeAge: 22, yearBuilt: null })).toBe(22);
    const currentYear = new Date().getFullYear();
    expect(roofAgeYears({ homeAge: null, yearBuilt: currentYear - 40 })).toBe(
      40
    );
    expect(roofAgeYears({ homeAge: null, yearBuilt: null }, 18)).toBe(18);
    expect(roofAgeYears({ homeAge: null, yearBuilt: null })).toBeNull();
  });
});
