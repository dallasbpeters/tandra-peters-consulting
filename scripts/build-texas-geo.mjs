/**
 * Pre-computes Texas service-county SVG paths for a 960×580 viewBox.
 * Source: src/data/texas-service-counties.geojson (Cartographic boundary extract).
 * Run with: node scripts/build-texas-geo.mjs
 * Output: src/components/texasCounties.json, src/components/serviceAreas.json,
 *         src/components/texasStateOutline.json
 */
import { readFileSync, writeFileSync } from "node:fs";

import { feature } from "topojson-client";

import {
  geoBounds,
  geoMercator,
} from "../node_modules/.pnpm/d3-geo@3.1.1/node_modules/d3-geo/src/index.js";

function ringToD(ring) {
  if (ring.length < 2) {
    return "";
  }
  return `M${ring
    .map(([x, y]) => `${+x.toFixed(2)},${+y.toFixed(2)}`)
    .join("L")}Z`;
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
  if (!pts.length) {
    return [0, 0];
  }
  const x = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const y = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return [+x.toFixed(1), +y.toFixed(1)];
}

const MAP_W = 960;
const MAP_H = 580;
const PADDING = 36;

/** Counties kept in texas-service-counties.geojson — Amarillo, Lubbock, Austin + 4 neighbors. */
const NAME_TO_KEY = {
  Bastrop: "bastrop",
  Caldwell: "caldwell",
  Hays: "hays",
  Lubbock: "lubbock",
  Potter: "potter",
  Travis: "travis",
  Williamson: "williamson",
};

const KEY_TO_CITY = {
  bastrop: "Bastrop",
  caldwell: "Lockhart",
  hays: "San Marcos",
  lubbock: "Lubbock",
  potter: "Amarillo",
  travis: "Austin",
  williamson: "Round Rock",
};

const geo = JSON.parse(
  readFileSync("./src/data/texas-service-counties.geojson", "utf-8")
);

const features = geo.features.filter((f) => NAME_TO_KEY[f.properties?.name]);
if (features.length !== Object.keys(NAME_TO_KEY).length) {
  const got = new Set(features.map((f) => f.properties.name));
  const missing = Object.keys(NAME_TO_KEY).filter((n) => !got.has(n));
  throw new Error(`Missing counties in geojson: ${missing.join(", ")}`);
}

const collection = { features, type: "FeatureCollection" };
const [[west, south], [east, north]] = geoBounds(collection);

const projection = geoMercator().fitExtent(
  [
    [PADDING, PADDING],
    [MAP_W - PADDING, MAP_H - PADDING],
  ],
  collection
);

const counties = features.map((f) => {
  const { name } = f.properties;
  const key = NAME_TO_KEY[name];
  const fips = String(f.properties.geoid ?? "");
  const [cx, cy] = centroidOf(f.geometry, projection);

  return {
    city: KEY_TO_CITY[key] ?? null,
    cx,
    cy,
    d: featureToD(f.geometry, projection),
    fips,
    key,
    name,
  };
});

counties.sort((a, b) => a.name.localeCompare(b.name));

const projectedBounds = counties.reduce(
  (acc, c) => {
    const nums = c.d.match(/-?\d+\.?\d*/g)?.map(Number) ?? [];
    for (let i = 0; i < nums.length; i += 2) {
      const x = nums[i];
      const y = nums[i + 1];
      if (x === undefined || y === undefined) {
        continue;
      }
      acc.minX = Math.min(acc.minX, x);
      acc.minY = Math.min(acc.minY, y);
      acc.maxX = Math.max(acc.maxX, x);
      acc.maxY = Math.max(acc.maxY, y);
    }
    return acc;
  },
  {
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
  }
);

const vbPad = 24;
const defaultViewBox = {
  h: Math.ceil(projectedBounds.maxY - projectedBounds.minY + vbPad * 2),
  w: Math.ceil(projectedBounds.maxX - projectedBounds.minX + vbPad * 2),
  x: Math.floor(projectedBounds.minX - vbPad),
  y: Math.floor(projectedBounds.minY - vbPad),
};

const texasOutput = {
  counties,
  defaultViewBox,
  mapH: MAP_H,
  mapW: MAP_W,
};

writeFileSync(
  "./src/components/texasCounties.json",
  JSON.stringify(texasOutput)
);

const serviceAreasOutput = {
  features: features.map((f) => {
    const key = NAME_TO_KEY[f.properties.name];
    return {
      geometry: f.geometry,
      properties: {
        city: KEY_TO_CITY[key] ?? null,
        geoid: f.properties.geoid,
        id: key,
        name: f.properties.name,
      },
      type: "Feature",
    };
  }),
  type: "FeatureCollection",
};

writeFileSync(
  "./src/components/serviceAreas.json",
  JSON.stringify(serviceAreasOutput)
);

const statesTopo = JSON.parse(
  readFileSync("./node_modules/us-atlas/states-10m.json", "utf-8")
);
const stateFeatures = feature(statesTopo, statesTopo.objects.states).features;
const texasState = stateFeatures.find((f) => String(f.id) === "48");
if (!texasState) {
  throw new Error("Texas state feature not found in us-atlas");
}

writeFileSync(
  "./src/components/texasStateOutline.json",
  JSON.stringify({
    features: [texasState],
    type: "FeatureCollection",
  })
);

console.log("✓  Written src/components/texasCounties.json");
console.log("✓  Written src/components/serviceAreas.json");
console.log("✓  Written src/components/texasStateOutline.json");
console.log("   Counties:", counties.map((c) => c.key).join(", "));
console.log("   defaultViewBox:", defaultViewBox);
console.log("   WGS84 bounds:", { east, north, south, west });
