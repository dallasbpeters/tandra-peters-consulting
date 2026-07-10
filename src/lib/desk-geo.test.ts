import { describe, expect, it } from "vitest";

import {
  polygonZoneMailEstimate,
  previewAreaCount,
  savedZoneIsRestorable,
  selectedZoneTargets,
  shouldSelectTract,
  targetContainingPoint,
  targetsOverlappingPolygon,
  zoneFromSavedTarget,
  zoneMailPieceEstimate,
} from "./desk-geo";
import type {
  AreaGeometry,
  DeskAreaTarget,
  DeskTargetZone,
  SavedTargetZone,
} from "./desk-types";

// ─── Fixtures ────────────────────────────────────────────────────────────────
// Two adjacent rectangular "tracts" sharing the meridian lng = -97.70 (real
// Austin coordinates, [lng, lat], closed rings). Tract sizes and the drawn
// polygons below are chosen so coverage shares are exact and easy to reason
// about, which is what lets these tests prove the selection rule empirically.

const closedRect = (
  minLng: number,
  minLat: number,
  maxLng: number,
  maxLat: number
): number[][][] => [
  [
    [minLng, minLat],
    [maxLng, minLat],
    [maxLng, maxLat],
    [minLng, maxLat],
    [minLng, minLat],
  ],
];

const polygon = (coordinates: number[][][]): AreaGeometry => ({
  coordinates,
  type: "Polygon",
});

const makeTarget = (
  id: string,
  longitude: number,
  latitude: number,
  geometry: AreaGeometry
): DeskAreaTarget => ({
  capturePath: `/desk/${id}`,
  countyFips: "48453",
  countyLabel: "Travis",
  dataMethod: "test",
  dataStatus: "test fixture",
  firstMove: "",
  geometry,
  id,
  latitude,
  longitude,
  mailingAudience: "",
  mailingCity: "Austin",
  mailingOffer: "",
  mailingRouteName: "",
  medianHomeAge: 20,
  medianIncome: 90_000,
  medianYearBuilt: 2004,
  neighborhoodLabel: id,
  olderHomeEstimate: 100,
  olderHomeShare: 0.5,
  ownerOccupied: 100,
  ownerOccupiedShare: 0.5,
  postalCode: "78724",
  priorityScore: 50,
  recommendedMailerCount: 100,
  squareMiles: 1,
  totalHousingUnits: 200,
  tractCount: 1,
  tractLabel: id,
  why: "",
});

// Tract A: lng [-97.72, -97.70]  · Tract B: lng [-97.70, -97.68] (share an edge)
const tractA = makeTarget(
  "A",
  -97.71,
  30.31,
  polygon(closedRect(-97.72, 30.3, -97.7, 30.32))
);
const tractB = makeTarget(
  "B",
  -97.69,
  30.31,
  polygon(closedRect(-97.7, 30.3, -97.68, 30.32))
);
// Tract C: a MultiPolygon well east of A/B, to exercise multipolygon handling.
const tractC = makeTarget("C", -97.65, 30.31, {
  coordinates: [
    closedRect(-97.66, 30.3, -97.64, 30.32),
    closedRect(-97.63, 30.3, -97.62, 30.32),
  ],
  type: "MultiPolygon",
});

const allTargets = [tractA, tractB, tractC];

const ids = (targets: DeskAreaTarget[]): string[] =>
  targets.map((target) => target.id).sort();

describe(targetsOverlappingPolygon, () => {
  it("selects ONLY the dominant tract when a draw slivers into a neighbor", () => {
    // Drawn box lng [-97.715, -97.695]: 75% over A, 25% over B. The old 10%
    // coverage rule selected BOTH (0.25 ≥ 0.10) — the reported bug. The
    // dominance rule keeps only A (0.25 < 0.6 × 0.75 = 0.45).
    const ring: [number, number][] = [
      [-97.715, 30.305],
      [-97.695, 30.305],
      [-97.695, 30.315],
      [-97.715, 30.315],
      [-97.715, 30.305],
    ];
    expect(ids(targetsOverlappingPolygon(ring, allTargets))).toStrictEqual([
      "A",
    ]);
  });

  it("keeps both tracts for a deliberate ~50/50 straddle", () => {
    // Drawn box lng [-97.705, -97.695]: 50% over A, 50% over B → both kept.
    const ring: [number, number][] = [
      [-97.705, 30.305],
      [-97.695, 30.305],
      [-97.695, 30.315],
      [-97.705, 30.315],
      [-97.705, 30.305],
    ];
    expect(ids(targetsOverlappingPolygon(ring, allTargets))).toStrictEqual([
      "A",
      "B",
    ]);
  });

  it("selects a single tract drawn fully inside it, and no neighbor", () => {
    const ring: [number, number][] = [
      [-97.715, 30.305],
      [-97.705, 30.305],
      [-97.705, 30.315],
      [-97.715, 30.315],
      [-97.715, 30.305],
    ];
    expect(ids(targetsOverlappingPolygon(ring, allTargets))).toStrictEqual([
      "A",
    ]);
  });

  it("handles MultiPolygon tracts (draw over one sub-polygon of C)", () => {
    const ring: [number, number][] = [
      [-97.655, 30.305],
      [-97.645, 30.305],
      [-97.645, 30.315],
      [-97.655, 30.315],
      [-97.655, 30.305],
    ];
    expect(ids(targetsOverlappingPolygon(ring, allTargets))).toStrictEqual([
      "C",
    ]);
  });

  it("returns nothing when the outline misses every tract", () => {
    const ring: [number, number][] = [
      [-97.6, 30.305],
      [-97.59, 30.305],
      [-97.59, 30.315],
      [-97.6, 30.315],
      [-97.6, 30.305],
    ];
    expect(targetsOverlappingPolygon(ring, allTargets)).toStrictEqual([]);
  });
});

describe(polygonZoneMailEstimate, () => {
  // Draw mode selects NO tracts — the polygon is the whole zone. Its audience is
  // derived from polygon area × local homeowner density (fixtures: 100 pieces /
  // 1 sq mi = 100 pieces per sq mi). These tests pin that a drawn zone produces
  // a positive estimate WITHOUT selecting any tract.
  it("estimates a positive audience for a small draw fully inside one tract", () => {
    // ~0.41 sq mi inside tract A → ~41 pieces (a fraction of A's full 100).
    const ring: [number, number][] = [
      [-97.715, 30.305],
      [-97.705, 30.305],
      [-97.705, 30.315],
      [-97.715, 30.315],
      [-97.715, 30.305],
    ];
    const estimate = polygonZoneMailEstimate(ring, allTargets);
    expect(estimate).toBeGreaterThan(0);
    // Scales with the drawn area — never inherits the whole tract's count.
    expect(estimate).toBeLessThan(100);
  });

  it("scales up with a larger drawn area", () => {
    const small: [number, number][] = [
      [-97.715, 30.305],
      [-97.71, 30.305],
      [-97.71, 30.31],
      [-97.715, 30.31],
      [-97.715, 30.305],
    ];
    const large: [number, number][] = [
      [-97.715, 30.305],
      [-97.705, 30.305],
      [-97.705, 30.315],
      [-97.715, 30.315],
      [-97.715, 30.305],
    ];
    expect(polygonZoneMailEstimate(large, allTargets)).toBeGreaterThan(
      polygonZoneMailEstimate(small, allTargets)
    );
  });

  it("still estimates via citywide average density when no tract overlaps", () => {
    // A draw clear of every tract has no local density, so it falls back to the
    // average density across mapped tracts — a positive, area-scaled estimate.
    const ring: [number, number][] = [
      [-97.6, 30.305],
      [-97.59, 30.305],
      [-97.59, 30.315],
      [-97.6, 30.315],
      [-97.6, 30.305],
    ];
    // Confirm this outline genuinely selects NO tract (draw mode highlights none)…
    expect(targetsOverlappingPolygon(ring, allTargets)).toStrictEqual([]);
    // …yet still yields a positive mail-piece estimate from area × density.
    expect(polygonZoneMailEstimate(ring, allTargets)).toBeGreaterThan(0);
  });

  it("returns 0 for a degenerate (sub-triangle) ring", () => {
    const ring: [number, number][] = [
      [-97.71, 30.31],
      [-97.71, 30.31],
    ];
    expect(polygonZoneMailEstimate(ring, allTargets)).toBe(0);
  });
});

describe("saved-area reuse (Use area)", () => {
  // These pin the state that drives the side builder after clicking "Use area":
  // audienceCount = selectedTargets.length || (activeZone && zoneMailPieces > 0 ? 1 : 0)
  // so the builder + DirectMailPlanPanel only unlock when the restored area
  // produces either selected tracts or a positive zone estimate.
  const savedPolygon: SavedTargetZone = {
    estimatedPieces: 120,
    kind: "polygon",
    latitude: 30.31,
    longitude: -97.71,
    polygon: [
      [-97.715, 30.305],
      [-97.705, 30.305],
      [-97.705, 30.315],
      [-97.715, 30.315],
      [-97.715, 30.305],
    ],
    radiusMiles: 0.6,
  };

  it("restores a drawn polygon zone without reattaching any tract", () => {
    expect(savedZoneIsRestorable(savedPolygon)).toBeTruthy();
    const zone = zoneFromSavedTarget(savedPolygon, "Serenada draw", ["A", "B"]);
    // Draw-mode-selects-nothing: no predefined tract is reattached.
    expect(zone.targetIds).toStrictEqual([]);
    expect(zone.kind).toBe("polygon");
    expect(zone.polygon).toHaveLength(5);
  });

  it("gives a restored drawn polygon a positive builder audience", () => {
    const zone = zoneFromSavedTarget(savedPolygon, "Serenada draw", []);
    // Side-builder audience: zero selected tracts, but a positive zone estimate
    // (from the saved estimatedPieces) → audienceCount would be 1 → builder shows.
    const zoneTargets = selectedZoneTargets(zone, allTargets);
    expect(zoneTargets).toStrictEqual([]);
    expect(zoneMailPieceEstimate(zone, zoneTargets)).toBe(120);
  });

  it("restores a radius (circle) save with its tract ids reattached", () => {
    const saved: SavedTargetZone = {
      estimatedPieces: 100,
      kind: "circle",
      latitude: 30.31,
      longitude: -97.71,
      radiusMiles: 0.5,
    };
    expect(savedZoneIsRestorable(saved)).toBeTruthy();

    const zone = zoneFromSavedTarget(saved, "Serenada radius", ["A"]);
    expect(zone.kind).toBe("circle");
    expect(zone.polygon).toBeUndefined();
    // Circle zones reattach the saved tract(s) so the selection/summary shows.
    expect(zone.targetIds).toStrictEqual(["A"]);
    expect(selectedZoneTargets(zone, allTargets)).toStrictEqual([tractA]);
  });

  it("treats a geometry-less (older) save as non-restorable", () => {
    expect(savedZoneIsRestorable()).toBeFalsy();
    // A polygon record missing a usable ring cannot be restored as a zone.
    expect(
      savedZoneIsRestorable({
        kind: "polygon",
        latitude: 30.31,
        longitude: -97.71,
        radiusMiles: 0.6,
      })
    ).toBeFalsy();
  });
});

describe(previewAreaCount, () => {
  // "N homes across M areas" in the address-preview header. The bug: a drawn
  // polygon selects no tracts, so the header used selectedTargets.length = 0 and
  // read "0 areas". previewAreaCount fixes it by counting the ACS tracts the
  // outline overlaps for a polygon zone.
  const polygonZone = (ring: [number, number][]): DeskTargetZone => ({
    createdAt: new Date().toISOString(),
    estimatedPieces: 100,
    id: "zone-1",
    kind: "polygon",
    label: "Drawn zone",
    latitude: 30.31,
    longitude: -97.71,
    polygon: ring,
    radiusMiles: 0.6,
    targetIds: [],
  });

  it("counts selected tracts when a tract selection exists", () => {
    expect(previewAreaCount(3, null, allTargets)).toBe(3);
  });

  it("counts overlapped tracts for a drawn polygon (never 0 areas)", () => {
    // A ~50/50 straddle of tracts A and B → 2 overlapped areas, not 0.
    const straddle: [number, number][] = [
      [-97.705, 30.305],
      [-97.695, 30.305],
      [-97.695, 30.315],
      [-97.705, 30.315],
      [-97.705, 30.305],
    ];
    expect(previewAreaCount(0, polygonZone(straddle), allTargets)).toBe(2);
  });

  it("clamps a polygon clear of every tract to at least one area", () => {
    const away: [number, number][] = [
      [-97.6, 30.305],
      [-97.59, 30.305],
      [-97.59, 30.315],
      [-97.6, 30.315],
      [-97.6, 30.305],
    ];
    expect(targetsOverlappingPolygon(away, allTargets)).toStrictEqual([]);
    expect(previewAreaCount(0, polygonZone(away), allTargets)).toBe(1);
  });

  it("counts a radius/circle zone as one area", () => {
    const circleZone: DeskTargetZone = {
      createdAt: new Date().toISOString(),
      estimatedPieces: 80,
      id: "zone-2",
      kind: "circle",
      label: "Radius zone",
      latitude: 30.31,
      longitude: -97.71,
      radiusMiles: 0.5,
      targetIds: [],
    };
    expect(previewAreaCount(0, circleZone, allTargets)).toBe(1);
  });

  it("reports zero areas when there is no selection and no zone", () => {
    expect(previewAreaCount(0, null, allTargets)).toBe(0);
  });
});

describe(shouldSelectTract, () => {
  // This predicate is the click-routing rule for the predefined tract layer.
  // The reported bug: clicking ON a drawn/selected zone still toggled the tract
  // beneath it. The rule below is what suppresses that.
  it("selects the tract on a plain click (no mode, no zone under click)", () => {
    expect(
      shouldSelectTract({
        drawMode: false,
        zoneMode: false,
        zoneUnderClick: false,
      })
    ).toBeTruthy();
  });

  it("never selects a tract in DRAW mode (tracts fully non-selectable)", () => {
    expect(
      shouldSelectTract({
        drawMode: true,
        zoneMode: false,
        zoneUnderClick: false,
      })
    ).toBeFalsy();
  });

  it("never selects a tract in radius ZONE mode", () => {
    expect(
      shouldSelectTract({
        drawMode: false,
        zoneMode: true,
        zoneUnderClick: false,
      })
    ).toBeFalsy();
  });

  it("does NOT toggle the tract when the click lands on an existing zone", () => {
    // No tool active, but the click is inside a drawn/selected zone that sits on
    // top of the tract layer → the click belongs to the zone, not the tract.
    expect(
      shouldSelectTract({
        drawMode: false,
        zoneMode: false,
        zoneUnderClick: true,
      })
    ).toBeFalsy();
  });

  it("suppresses tract selection if ANY guard is set", () => {
    for (const drawMode of [true, false]) {
      for (const zoneMode of [true, false]) {
        for (const zoneUnderClick of [true, false]) {
          const anyGuard = drawMode || zoneMode || zoneUnderClick;
          expect(
            shouldSelectTract({ drawMode, zoneMode, zoneUnderClick })
          ).toBe(!anyGuard);
        }
      }
    }
  });
});

describe("targetContainingPoint (radius drop)", () => {
  it("returns exactly the tract under the point, never a neighbor", () => {
    const inA = targetContainingPoint(
      { latitude: 30.31, longitude: -97.71 },
      allTargets
    );
    expect(inA?.id).toBe("A");
    const inB = targetContainingPoint(
      { latitude: 30.31, longitude: -97.69 },
      allTargets
    );
    expect(inB?.id).toBe("B");
  });

  it("returns null when the point is outside every tract", () => {
    expect(
      targetContainingPoint({ latitude: 30.5, longitude: -97.5 }, allTargets)
    ).toBeNull();
  });
});
