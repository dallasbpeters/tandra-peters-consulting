import mapboxgl from "mapbox-gl";
import { useEffect, useMemo, useRef } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import { Shader, ChromaFlow } from "shaders/react";

import type { ServiceAreaMapProps } from "../types";

import { useIsMobile } from "../hooks/isMobile";
import { useNearViewport } from "../hooks/useNearViewport";
import { mix, theme } from "../theme";
import serviceAreasRaw from "./serviceAreas.json";
import geoJson from "./texasCounties.json";
import texasStateOutline from "./texasStateOutline.json";

type ServiceArea = NonNullable<ServiceAreaMapProps["areas"]>[number];

type CountyMeta = {
  fips: string;
  key: string | null;
  name: string;
  city: string | null;
};

const KEY_TO_FIPS = new Map<string, string>();
const FIPS_TO_META = new Map<string, CountyMeta>();

(geoJson.counties as CountyMeta[]).forEach((c) => {
  FIPS_TO_META.set(c.fips, c);
  if (c.key) KEY_TO_FIPS.set(c.key, c.fips);
});

const ALL_SERVICE_FIPS = Array.from(KEY_TO_FIPS.values());

const COUNTY_GEOJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: (serviceAreasRaw as GeoJSON.FeatureCollection).features.map((feature) => {
    const geoid = String(feature.properties?.geoid ?? "");
    const meta = FIPS_TO_META.get(geoid);
    const label =
      meta?.city ?? (typeof feature.properties?.name === "string" ? feature.properties.name : "");
    return {
      ...feature,
      id: geoid,
      properties: {
        ...feature.properties,
        fips: geoid,
        label,
      },
    };
  }),
};

const MAP_STYLE = "mapbox://styles/dallasbpeters/cmpp12ft3003f01s8fw2fdari";

const TEXAS_STATE_GEOJSON = texasStateOutline as GeoJSON.FeatureCollection;

/** Mapbox paint props must be sRGB hex. High opacity — Standard night basemap is dark underneath. */
const MAP_COLORS = {
  fill: "#945bea78",
  fillOpacity: 1,
  stroke: "#9a55e4",
  strokeWidth: 1.5,
  boundary: "rgba(255, 255, 255, 0.65)",
  stateOutline: "#248e3f",
  stateOutlineWidth: 2.25,
  adminBoundary: "rgba(189, 188, 190, 0.88)",
  label: "#ffffff",
  labelHalo: "rgba(8,28,18,0.85)",
} as const;

const BASEMAP_IMPORT_ID = "basemap";

const DEFAULT_EYEBROW = "Service Area";
const DEFAULT_TITLE = "Where We Work";
const DEFAULT_DESCRIPTION =
  "Serving homeowners across the Austin metro, Lubbock, and Amarillo — Travis, Williamson, Hays, Bastrop, and Caldwell counties plus the Panhandle.";

const TX_CENTER: [number, number] = [-99.5, 31.0];
const TX_ZOOM = 5.8;
const TX_BOUNDS = new mapboxgl.LngLatBounds([-106.65, 25.84], [-93.51, 36.5]);
const SERVICE_AREA_PADDING = { top: 48, bottom: 48, left: 48, right: 48 };
const SERVICE_AREA_MAX_ZOOM = 8;

function boundsFromFeatures(features: GeoJSON.Feature[]): mapboxgl.LngLatBounds | null {
  if (!features.length) return null;
  const bounds = new mapboxgl.LngLatBounds();
  features.forEach((f) => {
    extractCoords(f.geometry as GeoJSON.Geometry).forEach(([lng, lat]) =>
      bounds.extend([lng, lat]),
    );
  });
  return bounds;
}

function extractCoords(geometry: GeoJSON.Geometry): [number, number][] {
  if (geometry.type === "Polygon") return geometry.coordinates[0] as [number, number][];
  if (geometry.type === "MultiPolygon")
    return geometry.coordinates.flatMap((p) => p[0]) as [number, number][];
  return [];
}

function featureCentroid(geometry: GeoJSON.Geometry): [number, number] {
  const coords = extractCoords(geometry);
  if (!coords.length) return TX_CENTER;
  let lng = 0;
  let lat = 0;
  coords.forEach(([x, y]) => {
    lng += x;
    lat += y;
  });
  return [lng / coords.length, lat / coords.length];
}

/** Frame the configured service counties — not full Texas (that zooms out too far). */
function fitServiceCounties(map: mapboxgl.Map, features: GeoJSON.Feature[], duration = 0) {
  const bounds = boundsFromFeatures(features);
  if (!bounds) {
    map.fitBounds(TX_BOUNDS, { padding: SERVICE_AREA_PADDING, duration });
    return;
  }
  map.fitBounds(bounds, {
    padding: SERVICE_AREA_PADDING,
    maxZoom: SERVICE_AREA_MAX_ZOOM,
    duration,
  });
}

function buildFilter(fipsList: string[]): mapboxgl.FilterSpecification {
  if (fipsList.length === 0)
    return ["==", ["literal", false], true] as unknown as mapboxgl.FilterSpecification;
  return ["in", ["get", "fips"], ["literal", fipsList]] as unknown as mapboxgl.FilterSpecification;
}

const COUNTY_LABELS_GEOJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: COUNTY_GEOJSON.features.map((feature) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: featureCentroid(feature.geometry as GeoJSON.Geometry),
    },
    properties: {
      fips: feature.properties?.fips,
      label: feature.properties?.label,
    },
  })),
};

function resolveLabelFont(map: mapboxgl.Map): string[] {
  const layers = map.getStyle()?.layers ?? [];
  for (const layer of layers) {
    if (layer.type !== "symbol") continue;
    const font = layer.layout?.["text-font"];
    if (Array.isArray(font) && font.every((f) => typeof f === "string")) {
      return font as string[];
    }
  }
  return ["Hanken Grotesk Variable", "Arial Unicode MS Bold"];
}

function applyBasemapConfig(map: mapboxgl.Map) {
  try {
    map.setTerrain(null);
  } catch {
    /* flat choropleth */
  }

  // Standard import uses night + 3D buildings — washes out semi-transparent fills.
  try {
    map.setConfigProperty(BASEMAP_IMPORT_ID, "lightPreset", "dusk");
    map.setConfigProperty(BASEMAP_IMPORT_ID, "show3dObjects", false);
    map.setConfigProperty(BASEMAP_IMPORT_ID, "showAdminBoundaries", true);
    map.setConfigProperty(BASEMAP_IMPORT_ID, "colorAdminBoundaries", MAP_COLORS.adminBoundary);
  } catch (err) {
    console.warn("[MapBox] Could not adjust Standard basemap config:", err);
  }
}

function applyCountyPaint(map: mapboxgl.Map) {
  if (!map.getLayer("counties-fill")) return;
  map.setPaintProperty("counties-fill", "fill-color", MAP_COLORS.fill);
  map.setPaintProperty("counties-fill", "fill-opacity", MAP_COLORS.fillOpacity);
  map.setPaintProperty("counties-fill", "fill-emissive-strength", 1);
  map.setPaintProperty("counties-line", "line-color", MAP_COLORS.stroke);
  map.setPaintProperty("counties-line", "line-width", MAP_COLORS.strokeWidth);
  map.setPaintProperty("counties-line", "line-emissive-strength", 1);
  map.setPaintProperty("counties-boundary", "line-color", MAP_COLORS.boundary);
  map.setPaintProperty("counties-boundary", "line-emissive-strength", 1);
  if (map.getLayer("tx-state-outline")) {
    map.setPaintProperty("tx-state-outline", "line-color", MAP_COLORS.stateOutline);
    map.setPaintProperty("tx-state-outline", "line-width", MAP_COLORS.stateOutlineWidth);
    map.setPaintProperty("tx-state-outline", "line-emissive-strength", 1);
  }
  map.setPaintProperty("counties-labels", "text-color", MAP_COLORS.label);
  map.setPaintProperty("counties-labels", "text-halo-color", MAP_COLORS.labelHalo);
  map.setPaintProperty("counties-labels", "text-emissive-strength", 1);
}

function addBoundaryLayers(map: mapboxgl.Map, fips: string[]) {
  if (map.getSource("tx-state-outline")) return;

  map.addSource("tx-state-outline", {
    type: "geojson",
    data: TEXAS_STATE_GEOJSON,
  });

  const filter = buildFilter(fips);

  map.addSource("tx-counties", {
    type: "geojson",
    data: COUNTY_GEOJSON,
  });

  map.addSource("tx-county-labels", {
    type: "geojson",
    data: COUNTY_LABELS_GEOJSON,
  });

  // County fills first; state + county strokes on top so borders read clearly.
  map.addLayer({
    id: "counties-fill",
    type: "fill",
    source: "tx-counties",
    slot: "middle",
    filter,
    paint: {
      "fill-color": MAP_COLORS.fill,
      "fill-opacity": MAP_COLORS.fillOpacity,
      "fill-emissive-strength": 1,
    },
  });

  map.addLayer({
    id: "counties-line",
    type: "line",
    source: "tx-counties",
    slot: "middle",
    filter,
    paint: {
      "line-color": MAP_COLORS.stroke,
      "line-width": MAP_COLORS.strokeWidth,
      "line-emissive-strength": 1,
    },
  });

  map.addLayer({
    id: "counties-boundary",
    type: "line",
    source: "tx-counties",
    slot: "middle",
    filter,
    paint: {
      "line-color": MAP_COLORS.boundary,
      "line-width": 0.75,
      "line-opacity": 0.9,
      "line-emissive-strength": 1,
    },
  });

  map.addLayer({
    id: "tx-state-outline",
    type: "line",
    source: "tx-state-outline",
    slot: "middle",
    paint: {
      "line-color": MAP_COLORS.stateOutline,
      "line-width": MAP_COLORS.stateOutlineWidth,
      "line-opacity": 1,
      "line-emissive-strength": 1,
    },
  });

  map.addLayer({
    id: "counties-labels",
    type: "symbol",
    source: "tx-county-labels",
    slot: "top",
    filter,
    layout: {
      "text-field": ["get", "label"],
      "text-font": resolveLabelFont(map),
      "text-size": 13,
      "text-anchor": "center",
      "text-max-width": 10,
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: {
      "text-color": MAP_COLORS.label,
      "text-halo-color": MAP_COLORS.labelHalo,
      "text-halo-width": 1.25,
      "text-emissive-strength": 1,
    },
  });

  applyCountyPaint(map);
}

function addCountyLayers(map: mapboxgl.Map, fips: string[]) {
  addBoundaryLayers(map, fips);
}

export const MapBox = ({
  eyebrow = DEFAULT_EYEBROW,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  areas = [],
}: ServiceAreaMapProps) => {
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const isNearViewport = useNearViewport(containerRef, "480px 0px");
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const txFeaturesRef = useRef<GeoJSON.Feature[]>([]);
  const configuredFipsRef = useRef<string[]>([]);
  const fipsToAreaRef = useRef(new Map<string, ServiceArea>());

  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() ?? "";

  const configuredFips = useMemo(() => {
    const list: string[] = [];
    areas.forEach((a) => {
      const fips = a?.countyKey ? KEY_TO_FIPS.get(a.countyKey) : undefined;
      if (fips) list.push(fips);
    });
    return list.length > 0 ? list : ALL_SERVICE_FIPS;
  }, [areas]);

  const fipsToArea = useMemo(() => {
    const m = new Map<string, ServiceArea>();
    areas.forEach((a) => {
      const fips = a?.countyKey ? KEY_TO_FIPS.get(a.countyKey) : undefined;
      if (fips) m.set(fips, a);
    });
    return m;
  }, [areas]);

  useEffect(() => {
    configuredFipsRef.current = configuredFips;
  }, [configuredFips]);

  useEffect(() => {
    fipsToAreaRef.current = fipsToArea;
  }, [fipsToArea]);

  useEffect(() => {
    if (!isNearViewport) {
      return;
    }

    const container = containerRef.current;
    if (!container || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    const map = new mapboxgl.Map({
      container,
      style: MAP_STYLE,
      center: TX_CENTER,
      zoom: TX_ZOOM,
      minZoom: 4,
      maxZoom: 12,
      attributionControl: false,
      scrollZoom: true,
    });

    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 12,
    });

    let countiesReady = false;

    const setupCounties = () => {
      if (countiesReady) return;
      countiesReady = true;

      const txFeatures = COUNTY_GEOJSON.features;
      const fips = configuredFipsRef.current;

      applyBasemapConfig(map);
      addCountyLayers(map, fips);
      txFeaturesRef.current = txFeatures;

      const active = txFeatures.filter((f) => fips.includes(String(f.properties?.fips ?? f.id)));
      fitServiceCounties(map, active);

      map.on("mouseenter", "counties-fill", (e) => {
        map.getCanvas().style.cursor = "pointer";
        if (!e.features?.length) return;
        const fipsCode = String(e.features[0].properties?.fips ?? "");
        const area = fipsToAreaRef.current.get(fipsCode);
        const meta = FIPS_TO_META.get(fipsCode);
        const name = area?.displayName ?? meta?.city ?? meta?.name ?? "County";
        popup
          .setLngLat(e.lngLat)
          .setHTML(`<strong style="font-size:0.8125rem">${name}</strong>`)
          .addTo(map);
      });
      map.on("mousemove", "counties-fill", (e) => popup.setLngLat(e.lngLat));
      map.on("mouseleave", "counties-fill", () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
      });
    };

    map.once("style.load", setupCounties);
    if (map.isStyleLoaded()) setupCounties();

    return () => {
      txFeaturesRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [isNearViewport, mapboxToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer("counties-fill")) return;

    map.setFilter("counties-fill", buildFilter(configuredFips));
    map.setFilter("counties-line", buildFilter(configuredFips));
    map.setFilter("counties-boundary", buildFilter(configuredFips));
    if (map.getLayer("counties-labels")) {
      map.setFilter("counties-labels", buildFilter(configuredFips));
    }

    applyCountyPaint(map);
  }, [configuredFips]);

  const displayAreas =
    areas.length > 0
      ? areas
      : ALL_SERVICE_FIPS.map((fips) => {
          const meta = FIPS_TO_META.get(fips);
          return {
            countyKey: meta?.key ?? fips,
            displayName: meta?.name ? `${meta.name} County` : fips,
            clientCount: 0,
          };
        });

  return (
    <section
      id="service-area"
      style={{
        scrollMarginTop: theme.spacing.section,
        overflow: "hidden",
        backgroundColor: theme.palette.everglade["950"],
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          minHeight: "580px",
        }}
        className="service-area-map-grid"
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: theme.spacing.lg,
            borderRight: `1px solid ${mix(theme.colors.white, 8)}`,
            maxInlineSize: isMobile ? "80vw" : "40vw",
            position: "absolute",
            top: isMobile ? "10%" : "15%",
            left: isMobile ? "5%" : "10%",
            zIndex: 10,
            backgroundColor: isMobile ? "rgba(0, 0, 0, 0.5)" : "transparent",
          }}
          className="service-area-map-copy"
        >
          {eyebrow ? (
            <p
              style={{
                marginBottom: theme.spacing.lg,
                fontFamily: theme.fonts.headline,
                fontSize: "0.6875rem",
                fontWeight: 800,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: theme.palette.purple["200"],
              }}
            >
              {eyebrow}
            </p>
          ) : null}
          {title ? (
            <h2
              style={{
                marginBottom: theme.spacing.lg,
                fontFamily: theme.fonts.headlineAlt,
                fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
                lineHeight: 1.1,
                fontWeight: 400,
                color: theme.colors.white,
              }}
            >
              {title}
            </h2>
          ) : null}
          {description ? (
            <p
              style={{
                marginBottom: theme.spacing.xxxxl,
                fontSize: "0.9375rem",
                lineHeight: 1.6,

                color: mix(theme.colors.white, 95),
              }}
            >
              {description}
            </p>
          ) : null}
        </div>

        <div
          ref={containerRef}
          style={{ minHeight: "20rem", position: "relative" }}
          role="img"
          aria-label={
            displayAreas.length > 0
              ? `Map of ${displayAreas.length} service ${displayAreas.length === 1 ? "county" : "counties"} in Texas`
              : "Service area map of Texas"
          }
        >
          {!mapboxToken ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: theme.spacing.xxl,
                textAlign: "center",
                fontSize: "0.875rem",
                color: mix(theme.colors.white, 55),
                background: theme.palette.everglade["900"],
              }}
            >
              Add <code>VITE_MAPBOX_ACCESS_TOKEN</code> to <code>.env.local</code> to load the map.
            </div>
          ) : null}
        </div>
      </div>
      <Shader style={{ position: "absolute", inset: 0, zIndex: 10 }}>
        {/* Explicit id: React useId() fallback yields `__` GLSL names that fail on Safari. */}
        {/* All four corner colors stay in the purple family so the multiply blend tints
            every county the same hue regardless of position. A green right/up corner
            (the previous values) desaturated counties on the east/north — e.g. Dallas,
            Fort Worth, Waco — making them read paler than the Austin cluster. Brand green
            still appears via the green state outline (MAP_COLORS.stateOutline). */}
        <ChromaFlow
          id="mapChromaFlow"
          baseColor="#7449d6"
          blendMode="multiply"
          downColor="#7935b5"
          intensity={1}
          momentum={19}
          radius={2.5}
          rightColor="#8a5ae8"
          transform={{ offsetX: 0.01 }}
          upColor="#9a6cf0"
        />
      </Shader>
    </section>
  );
};

export default MapBox;
