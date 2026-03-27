/**
 * Pre-computes Texas county SVG path strings for a 960×580 viewBox.
 * Run with: node scripts/build-texas-geo.mjs
 * Output: src/components/texasCounties.json
 */
import { readFileSync, writeFileSync } from "fs";
import { feature } from "topojson-client";
import {
  geoMercator,
  geoBounds,
} from "../node_modules/.pnpm/d3-geo@3.1.1/node_modules/d3-geo/src/index.js";

// Manual path builder — bypasses geoPath's sphere/antimeridian clip frames
// which cause every county to render as a transparent hole.
function ringToD(ring) {
  if (ring.length < 2) return "";
  return (
    "M" +
    ring.map(([x, y]) => `${+x.toFixed(2)},${+y.toFixed(2)}`).join("L") +
    "Z"
  );
}

function featureToD(geometry, project) {
  const projectRing = (ring) =>
    ring.map((coord) => project(coord)).filter(Boolean);

  if (geometry.type === "Polygon") {
    return geometry.coordinates.map(projectRing).map(ringToD).join("");
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates
      .flatMap((poly) => poly.map(projectRing).map(ringToD))
      .join("");
  }
  return "";
}

function centroidOf(geometry, project) {
  const ring =
    geometry.type === "Polygon"
      ? geometry.coordinates[0]
      : geometry.coordinates[0][0];
  const pts = ring.map((coord) => project(coord)).filter(Boolean);
  if (!pts.length) return [0, 0];
  const x = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const y = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return [+x.toFixed(1), +y.toFixed(1)];
}

const MAP_W = 960;
const MAP_H = 580;
const PADDING = 20;

const FIPS_TO_KEY = {
  48453: "travis",
  48491: "williamson",
  48209: "hays",
  48021: "bastrop",
  48055: "caldwell",
  48091: "comal",
  48187: "guadalupe",
  48259: "kendall",
  48029: "bexar",
  48265: "kerr",
  48171: "gillespie",
  48031: "blanco",
  48027: "bell",
  48309: "mclennan",
  48439: "tarrant",
  48303: "lubbock",
  48375: "potter",
  48381: "randall",
};

const KEY_TO_CITY = {
  travis: "Austin",
  williamson: "Round Rock",
  hays: "San Marcos",
  bastrop: "Bastrop",
  caldwell: "Lockhart",
  comal: "New Braunfels",
  guadalupe: "Seguin",
  kendall: "Boerne",
  bexar: "San Antonio",
  kerr: "Kerrville",
  gillespie: "Fredericksburg",
  blanco: "Johnson City",
  bell: "Temple",
  mclennan: "Waco",
  tarrant: "Fort Worth",
  lubbock: "Lubbock",
  potter: "Amarillo",
  randall: "Canyon",
};

// 1. Load TopoJSON and extract all Texas county features
const topo = JSON.parse(
  readFileSync("./node_modules/us-atlas/counties-10m.json", "utf8"),
);
const all = feature(topo, topo.objects.counties);
const texas = all.features.filter((f) => String(f.id ?? "").startsWith("48"));

console.log("Texas counties:", texas.length);
console.log(
  "geoBounds:",
  JSON.stringify(geoBounds({ type: "FeatureCollection", features: texas })),
);

// 2. Build the projection fitted to all 254 Texas counties
const collection = { type: "FeatureCollection", features: texas };
const projection = geoMercator().fitExtent(
  [
    [PADDING, PADDING],
    [MAP_W - PADDING, MAP_H - PADDING],
  ],
  collection,
);

console.log("Projection scale:", projection.scale().toFixed(2));
console.log(
  "Projection translate:",
  projection.translate().map((v) => v.toFixed(2)),
);

// 3. Pre-compute centroid + path string for every county.
//    We manually project coordinates + build SVG "d" strings instead of using
//    geoPath(projection) to avoid D3's sphere/antimeridian clip frame, which
//    produces compound sub-paths that punch counties transparent in the browser.
const counties = texas.map((f) => {
  const fips = String(f.id ?? "");
  const key = FIPS_TO_KEY[fips] ?? null;

  return {
    fips,
    key,
    name: f.properties?.name ?? fips,
    city: key ? KEY_TO_CITY[key] : null,
    ...(() => {
      const [cx, cy] = centroidOf(f.geometry, projection);
      return { cx, cy };
    })(),
    d: featureToD(f.geometry, projection),
  };
});

// 4. Write output
const output = { mapW: MAP_W, mapH: MAP_H, counties };
writeFileSync("./src/components/texasCounties.json", JSON.stringify(output));

console.log("✓  Written src/components/texasCounties.json");
console.log("   Size (KB):", Math.round(JSON.stringify(output).length / 1024));
console.log(
  "   Service counties:",
  counties
    .filter((c) => c.key)
    .map((c) => c.key)
    .join(", "),
);

// Sanity check: show projected corners
console.log(
  "NW corner (Panhandle):",
  projection([-106.65, 36.5]).map((v) => v.toFixed(1)),
);
console.log(
  "SE corner (S Texas):",
  projection([-93.52, 25.84]).map((v) => v.toFixed(1)),
);
