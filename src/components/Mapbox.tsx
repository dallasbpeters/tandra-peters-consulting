import mapboxgl from "mapbox-gl";
import { useEffect, useMemo, useRef } from "react";

import "mapbox-gl/dist/mapbox-gl.css";
import { ChromaFlow, Shader } from "shaders/react";

import { useIsMobile } from "../hooks/is-mobile";
import { useNearViewport } from "../hooks/use-near-viewport";
import { mix, theme } from "../theme";
import type { ServiceAreaMapProps } from "../types";
import serviceAreasRaw from "./serviceAreas.json";
import geoJson from "./texasCounties.json";
import texasStateOutline from "./texasStateOutline.json";

type ServiceArea = NonNullable<ServiceAreaMapProps["areas"]>[number];

interface CountyMeta {
  city: string | null;
  fips: string;
  key: string | null;
  name: string;
}

const KEY_TO_FIPS = new Map<string, string>();
const FIPS_TO_META = new Map<string, CountyMeta>();

for (const c of geoJson.counties as CountyMeta[]) {
  FIPS_TO_META.set(c.fips, c);
  if (c.key) {
    KEY_TO_FIPS.set(c.key, c.fips);
  }
}

const ALL_SERVICE_FIPS = [...KEY_TO_FIPS.values()];

const COUNTY_GEOJSON: GeoJSON.FeatureCollection = {
  features: (serviceAreasRaw as GeoJSON.FeatureCollection).features.map(
    (feature) => {
      const geoid = String(feature.properties?.geoid ?? "");
      const meta = FIPS_TO_META.get(geoid);
      const label =
        meta?.city ??
        (typeof feature.properties?.name === "string"
          ? feature.properties.name
          : "");
      return {
        ...feature,
        id: geoid,
        properties: {
          ...feature.properties,
          fips: geoid,
          label,
        },
      };
    }
  ),
  type: "FeatureCollection",
};

const MAP_STYLE = "mapbox://styles/dallasbpeters/cmpp12ft3003f01s8fw2fdari";

const TEXAS_STATE_GEOJSON = texasStateOutline as GeoJSON.FeatureCollection;

/** Mapbox paint props must be sRGB hex. High opacity — Standard night basemap is dark underneath. */
const MAP_COLORS = {
  adminBoundary: "rgba(189, 188, 190, 0.88)",
  boundary: "rgba(255, 255, 255, 0.65)",
  fill: "#945bea78",
  fillOpacity: 1,
  label: "#ffffff",
  labelHalo: "rgba(8,28,18,0.85)",
  stateOutline: "#248e3f",
  stateOutlineWidth: 2.25,
  stroke: "#9a55e4",
  strokeWidth: 1.5,
} as const;

const BASEMAP_IMPORT_ID = "basemap";

const DEFAULT_EYEBROW = "Service Area";
const DEFAULT_TITLE = "Where We Work";
const DEFAULT_DESCRIPTION =
  "Serving homeowners across the Austin metro, Lubbock, and Amarillo — Travis, Williamson, Hays, Bastrop, and Caldwell counties plus the Panhandle.";
const DEFAULT_AREAS: NonNullable<ServiceAreaMapProps["areas"]> = [];

const TX_CENTER: [number, number] = [-99.5, 31];
const TX_ZOOM = 5.8;
const TX_BOUNDS = new mapboxgl.LngLatBounds([-106.65, 25.84], [-93.51, 36.5]);
const SERVICE_AREA_PADDING = { bottom: 48, left: 48, right: 48, top: 48 };
const SERVICE_AREA_MAX_ZOOM = 8;

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() ?? "";

const extractCoords = (geometry: GeoJSON.Geometry): [number, number][] => {
  if (geometry.type === "Polygon") {
    return geometry.coordinates[0] as [number, number][];
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.flatMap((p) => p[0]) as [number, number][];
  }
  return [];
};

const boundsFromFeatures = (
  features: GeoJSON.Feature[]
): mapboxgl.LngLatBounds | null => {
  if (!features.length) {
    return null;
  }
  const bounds = new mapboxgl.LngLatBounds();
  for (const f of features) {
    for (const [lng, lat] of extractCoords(f.geometry as GeoJSON.Geometry)) {
      bounds.extend([lng, lat]);
    }
  }
  return bounds;
};

const featureCentroid = (geometry: GeoJSON.Geometry): [number, number] => {
  const coords = extractCoords(geometry);
  if (!coords.length) {
    return TX_CENTER;
  }
  let lng = 0;
  let lat = 0;
  for (const [x, y] of coords) {
    lng += x;
    lat += y;
  }
  return [lng / coords.length, lat / coords.length];
};

/** Frame the configured service counties — not full Texas (that zooms out too far). */
const fitServiceCounties = (
  map: mapboxgl.Map,
  features: GeoJSON.Feature[],
  duration = 0
): void => {
  const bounds = boundsFromFeatures(features);
  if (!bounds) {
    map.fitBounds(TX_BOUNDS, { duration, padding: SERVICE_AREA_PADDING });
    return;
  }
  map.fitBounds(bounds, {
    duration,
    maxZoom: SERVICE_AREA_MAX_ZOOM,
    padding: SERVICE_AREA_PADDING,
  });
};

const buildFilter = (fipsList: string[]): mapboxgl.FilterSpecification => {
  if (fipsList.length === 0) {
    return [
      "==",
      ["literal", false],
      true,
    ] as unknown as mapboxgl.FilterSpecification;
  }
  return [
    "in",
    ["get", "fips"],
    ["literal", fipsList],
  ] as unknown as mapboxgl.FilterSpecification;
};

const COUNTY_LABELS_GEOJSON: GeoJSON.FeatureCollection = {
  features: COUNTY_GEOJSON.features.map((feature) => ({
    geometry: {
      coordinates: featureCentroid(feature.geometry as GeoJSON.Geometry),
      type: "Point",
    },
    properties: {
      fips: feature.properties?.fips,
      label: feature.properties?.label,
    },
    type: "Feature",
  })),
  type: "FeatureCollection",
};

const resolveLabelFont = (map: mapboxgl.Map): string[] => {
  const layers = map.getStyle()?.layers ?? [];
  for (const layer of layers) {
    if (layer.type !== "symbol") {
      continue;
    }
    const font = layer.layout?.["text-font"];
    if (Array.isArray(font) && font.every((f) => typeof f === "string")) {
      return font as string[];
    }
  }
  return ["Hanken Grotesk Variable", "Arial Unicode MS Bold"];
};

const applyBasemapConfig = (map: mapboxgl.Map): void => {
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
    map.setConfigProperty(
      BASEMAP_IMPORT_ID,
      "colorAdminBoundaries",
      MAP_COLORS.adminBoundary
    );
  } catch (error) {
    console.warn("[MapBox] Could not adjust Standard basemap config:", error);
  }
};

const applyCountyPaint = (map: mapboxgl.Map): void => {
  if (!map.getLayer("counties-fill")) {
    return;
  }
  map.setPaintProperty("counties-fill", "fill-color", MAP_COLORS.fill);
  map.setPaintProperty("counties-fill", "fill-opacity", MAP_COLORS.fillOpacity);
  map.setPaintProperty("counties-fill", "fill-emissive-strength", 1);
  map.setPaintProperty("counties-line", "line-color", MAP_COLORS.stroke);
  map.setPaintProperty("counties-line", "line-width", MAP_COLORS.strokeWidth);
  map.setPaintProperty("counties-line", "line-emissive-strength", 1);
  map.setPaintProperty("counties-boundary", "line-color", MAP_COLORS.boundary);
  map.setPaintProperty("counties-boundary", "line-emissive-strength", 1);
  if (map.getLayer("tx-state-outline")) {
    map.setPaintProperty(
      "tx-state-outline",
      "line-color",
      MAP_COLORS.stateOutline
    );
    map.setPaintProperty(
      "tx-state-outline",
      "line-width",
      MAP_COLORS.stateOutlineWidth
    );
    map.setPaintProperty("tx-state-outline", "line-emissive-strength", 1);
  }
  map.setPaintProperty("counties-labels", "text-color", MAP_COLORS.label);
  map.setPaintProperty(
    "counties-labels",
    "text-halo-color",
    MAP_COLORS.labelHalo
  );
  map.setPaintProperty("counties-labels", "text-emissive-strength", 1);
};

const addBoundaryLayers = (map: mapboxgl.Map, fips: string[]): void => {
  if (map.getSource("tx-state-outline")) {
    return;
  }

  map.addSource("tx-state-outline", {
    data: TEXAS_STATE_GEOJSON,
    type: "geojson",
  });

  const filter = buildFilter(fips);

  map.addSource("tx-counties", {
    data: COUNTY_GEOJSON,
    type: "geojson",
  });

  map.addSource("tx-county-labels", {
    data: COUNTY_LABELS_GEOJSON,
    type: "geojson",
  });

  // County fills first; state + county strokes on top so borders read clearly.
  map.addLayer({
    filter,
    id: "counties-fill",
    paint: {
      "fill-color": MAP_COLORS.fill,
      "fill-emissive-strength": 1,
      "fill-opacity": MAP_COLORS.fillOpacity,
    },
    slot: "middle",
    source: "tx-counties",
    type: "fill",
  });

  map.addLayer({
    filter,
    id: "counties-line",
    paint: {
      "line-color": MAP_COLORS.stroke,
      "line-emissive-strength": 1,
      "line-width": MAP_COLORS.strokeWidth,
    },
    slot: "middle",
    source: "tx-counties",
    type: "line",
  });

  map.addLayer({
    filter,
    id: "counties-boundary",
    paint: {
      "line-color": MAP_COLORS.boundary,
      "line-emissive-strength": 1,
      "line-opacity": 0.9,
      "line-width": 0.75,
    },
    slot: "middle",
    source: "tx-counties",
    type: "line",
  });

  map.addLayer({
    id: "tx-state-outline",
    paint: {
      "line-color": MAP_COLORS.stateOutline,
      "line-emissive-strength": 1,
      "line-opacity": 1,
      "line-width": MAP_COLORS.stateOutlineWidth,
    },
    slot: "middle",
    source: "tx-state-outline",
    type: "line",
  });

  map.addLayer({
    filter,
    id: "counties-labels",
    layout: {
      "text-allow-overlap": true,
      "text-anchor": "center",
      "text-field": ["get", "label"],
      "text-font": resolveLabelFont(map),
      "text-ignore-placement": true,
      "text-max-width": 10,
      "text-size": 13,
    },
    paint: {
      "text-color": MAP_COLORS.label,
      "text-emissive-strength": 1,
      "text-halo-color": MAP_COLORS.labelHalo,
      "text-halo-width": 1.25,
    },
    slot: "top",
    source: "tx-county-labels",
    type: "symbol",
  });

  applyCountyPaint(map);
};

const addCountyLayers = (map: mapboxgl.Map, fips: string[]): void => {
  addBoundaryLayers(map, fips);
};

export const MapBox = ({
  eyebrow = DEFAULT_EYEBROW,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  areas = DEFAULT_AREAS,
}: ServiceAreaMapProps) => {
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const isNearViewport = useNearViewport(containerRef, "480px 0px");
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const txFeaturesRef = useRef<GeoJSON.Feature[]>([]);
  const configuredFipsRef = useRef<string[]>([]);
  const fipsToAreaRef = useRef(new Map<string, ServiceArea>());

  const configuredFips = useMemo(() => {
    const list: string[] = [];
    for (const a of areas) {
      const fips = a?.countyKey ? KEY_TO_FIPS.get(a.countyKey) : undefined;
      if (fips) {
        list.push(fips);
      }
    }
    return list.length > 0 ? list : ALL_SERVICE_FIPS;
  }, [areas]);

  const fipsToArea = useMemo(() => {
    const m = new Map<string, ServiceArea>();
    for (const a of areas) {
      const fips = a?.countyKey ? KEY_TO_FIPS.get(a.countyKey) : undefined;
      if (fips) {
        m.set(fips, a);
      }
    }
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
    if (!(container && MAPBOX_TOKEN)) {
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      attributionControl: false,
      center: TX_CENTER,
      container,
      maxZoom: 12,
      minZoom: 4,
      scrollZoom: true,
      style: MAP_STYLE,
      zoom: TX_ZOOM,
    });

    mapRef.current = map;

    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right"
    );
    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 12,
    });

    let countiesReady = false;

    const setupCounties = () => {
      if (countiesReady) {
        return;
      }
      countiesReady = true;

      const txFeatures = COUNTY_GEOJSON.features;
      const fips = configuredFipsRef.current;

      applyBasemapConfig(map);
      addCountyLayers(map, fips);
      txFeaturesRef.current = txFeatures;

      const active = txFeatures.filter((f) =>
        fips.includes(String(f.properties?.fips ?? f.id))
      );
      fitServiceCounties(map, active);

      map.on("mouseenter", "counties-fill", (e) => {
        map.getCanvas().style.cursor = "pointer";
        if (!e.features?.length) {
          return;
        }
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
    if (map.isStyleLoaded()) {
      setupCounties();
    }

    return () => {
      txFeaturesRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [isNearViewport]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer("counties-fill")) {
      return;
    }

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
            clientCount: 0,
            countyKey: meta?.key ?? fips,
            displayName: meta?.name ? `${meta.name} County` : fips,
          };
        });

  return (
    <section
      id="service-area"
      style={{
        backgroundColor: theme.palette.everglade["950"],
        overflow: "hidden",
        scrollMarginTop: theme.spacing.section,
      }}
    >
      <div
        className="service-area-map-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          minHeight: "580px",
        }}
      >
        <div
          className="service-area-map-copy"
          style={{
            backgroundColor: isMobile
              ? "rgba(0, 0, 0, 0.5)"
              : "rgba(0, 0, 0, 0)",
            borderRight: `1px solid ${mix(theme.colors.white, 8)}`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            left: isMobile ? "5%" : "15%",
            maxInlineSize: isMobile ? "80vw" : "40vw",
            padding: theme.spacing.lg,
            position: "absolute",
            top: isMobile ? "10%" : "8%",
            zIndex: 10,
          }}
        >
          {eyebrow ? (
            <p
              style={{
                color: theme.palette.purple["200"],
                fontFamily: theme.fonts.headline,
                fontSize: "0.6875rem",
                fontWeight: 800,
                letterSpacing: "0.16em",
                marginBottom: theme.spacing.lg,
                textTransform: "uppercase",
              }}
            >
              {eyebrow}
            </p>
          ) : null}
          {title ? (
            <h2
              style={{
                color: theme.colors.white,
                fontFamily: theme.fonts.headlineAlt,
                fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
                fontWeight: 400,
                lineHeight: 1.1,
                marginBottom: theme.spacing.lg,
              }}
            >
              {title}
            </h2>
          ) : null}
          {description ? (
            <p
              style={{
                color: mix(theme.colors.white, 95),
                fontSize: "0.9375rem",
                lineHeight: 1.6,
                marginBottom: theme.spacing.xxxxl,
              }}
            >
              {description}
            </p>
          ) : null}
        </div>

        <section
          aria-label={
            displayAreas.length > 0
              ? `Map of ${displayAreas.length} service ${displayAreas.length === 1 ? "county" : "counties"} in Texas`
              : "Service area map of Texas"
          }
          ref={containerRef}
          style={{ minHeight: "20rem", position: "relative" }}
        >
          {MAPBOX_TOKEN ? null : (
            <div
              style={{
                alignItems: "center",
                background: theme.palette.everglade["900"],
                color: mix(theme.colors.white, 55),
                display: "flex",
                fontSize: "0.875rem",
                inset: 0,
                justifyContent: "center",
                padding: theme.spacing.xxl,
                position: "absolute",
                textAlign: "center",
              }}
            >
              Add <code>VITE_MAPBOX_ACCESS_TOKEN</code> to{" "}
              <code>.env.local</code> to load the map.
            </div>
          )}
        </section>
      </div>
      <Shader style={{ inset: 0, position: "absolute", zIndex: 10 }}>
        {/* Explicit id: React useId() fallback yields `__` GLSL names that fail on Safari. */}
        {/* All four corner colors stay in the purple family so the multiply blend tints
            every county the same hue regardless of position. A green right/up corner
            (the previous values) desaturated counties on the east/north — e.g. Dallas,
            Fort Worth, Waco — making them read paler than the Austin cluster. Brand green
            still appears via the green state outline (MAP_COLORS.stateOutline). */}
        <ChromaFlow
          baseColor="#7449d6"
          blendMode="multiply"
          downColor="#7935b5"
          id="mapChromaFlow"
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
