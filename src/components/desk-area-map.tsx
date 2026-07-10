import MapboxDraw from "@mapbox/mapbox-gl-draw";
import type { GeoJSONSource, MapMouseEvent } from "mapbox-gl";
import mapboxgl from "mapbox-gl";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { shouldSelectTract } from "../lib/desk-geo";
import { preventFocusScroll } from "../lib/prevent-focus-scroll";

import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

const MAP_STYLE = "mapbox://styles/mapbox/streets-v12";
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() ?? "";
// Fixed opening view framed on the Austin metro. The camera NEVER moves
// programmatically — only the user's mouse/gestures pan or zoom — so this is
// the one and only place the view is positioned.
const DEFAULT_CENTER: [number, number] = [-97.74, 30.32];
const DEFAULT_ZOOM = 9.7;

// Layer ids referenced by both the layer builders and the click hit-testing.
const ZONE_FILL_LAYER_ID = "desk-area-zone-fill";
const ZONE_LINE_LAYER_ID = "desk-area-zone-line";
const TARGET_FILL_LAYER_ID = "desk-area-target-fill";
const TARGET_DOT_LAYER_ID = "desk-area-target-dot";

const NORMAL_FILL = "#92d66f";
const SELECTED_FILL = "#f2a63d";
const ZONE_FILL = "#1f6f4a";
const ZONE_LINE = "#073320";
const ACTIVE_ZONE_FILL = "#f2a63d";
const EARTH_RADIUS_MILES = 3958.8;
const ZONE_CIRCLE_SEGMENTS = 72;

// mapbox-gl's typed event map does not include mapbox-gl-draw's "draw.*" events.
interface MapboxDrawEvented {
  on: (
    type: string,
    listener: (event: { features?: GeoJSON.Feature[] }) => void
  ) => void;
}

interface TractPolygon {
  coordinates: number[][][];
  type: "Polygon";
}

interface TractMultiPolygon {
  coordinates: number[][][][];
  type: "MultiPolygon";
}

type AreaGeometry = TractMultiPolygon | TractPolygon;

export interface DeskAreaMapTarget {
  countyLabel: string;
  dataStatus: string;
  geometry: AreaGeometry | null;
  id: string;
  latitude: number;
  longitude: number;
  medianHomeAge: number | null;
  medianIncome: number | null;
  medianYearBuilt: number | null;
  neighborhoodLabel: string;
  olderHomeEstimate: number;
  priorityScore: number;
  recommendedMailerCount: number;
  tractLabel: string;
}

export interface DeskAreaMapZone {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  mailPieces: number;
  /** Hand-drawn outline ([lng, lat] ring). When set, the map draws this instead of a radius circle. */
  polygon?: readonly [number, number][];
  radiusMiles: number;
  selected: boolean;
  targetCount: number;
}

export interface DeskAreaMapZonePoint {
  latitude: number;
  longitude: number;
}

interface DeskAreaMapProps {
  drawMode?: boolean;
  onCreateZone?: (point: DeskAreaMapZonePoint) => void;
  onDrawZone?: (ring: [number, number][]) => void;
  onToggleSelect?: (id: string) => void;
  selectedIds?: readonly string[];
  targets: readonly DeskAreaMapTarget[];
  zoneMode?: boolean;
  zones?: readonly DeskAreaMapZone[];
}

interface DeskAreaMapProperties {
  countyLabel: string;
  dataStatus: string;
  homes: number;
  id: string;
  medianHomeAge: number | null;
  medianIncome: number | null;
  medianYearBuilt: number | null;
  neighborhoodLabel: string;
  priorityScore: number;
  recommendedMailerCount: number;
  selected: boolean;
  tractLabel: string;
}

interface DeskAreaMapZoneProperties {
  id: string;
  label: string;
  mailPieces: number;
  radiusMiles: number;
  selected: boolean;
  targetCount: number;
}

const buildProperties = (
  target: DeskAreaMapTarget,
  selected: boolean
): DeskAreaMapProperties => ({
  countyLabel: target.countyLabel,
  dataStatus: target.dataStatus,
  homes: target.olderHomeEstimate,
  id: target.id,
  medianHomeAge: target.medianHomeAge,
  medianIncome: target.medianIncome,
  medianYearBuilt: target.medianYearBuilt,
  neighborhoodLabel: target.neighborhoodLabel,
  priorityScore: target.priorityScore,
  recommendedMailerCount: target.recommendedMailerCount,
  selected,
  tractLabel: target.tractLabel,
});

const toPointGeoJson = (
  targets: readonly DeskAreaMapTarget[],
  selected: ReadonlySet<string>
): GeoJSON.FeatureCollection<GeoJSON.Point, DeskAreaMapProperties> => ({
  features: targets.map((target) => ({
    geometry: {
      coordinates: [target.longitude, target.latitude],
      type: "Point",
    },
    properties: buildProperties(target, selected.has(target.id)),
    type: "Feature",
  })),
  type: "FeatureCollection",
});

const toPolygonGeoJson = (
  targets: readonly DeskAreaMapTarget[],
  selected: ReadonlySet<string>
): GeoJSON.FeatureCollection<
  GeoJSON.MultiPolygon | GeoJSON.Polygon,
  DeskAreaMapProperties
> => ({
  features: targets
    .filter((target) => target.geometry)
    .map((target) => ({
      geometry: target.geometry as GeoJSON.MultiPolygon | GeoJSON.Polygon,
      properties: buildProperties(target, selected.has(target.id)),
      type: "Feature",
    })),
  type: "FeatureCollection",
});

const degreesToRadians = (value: number): number => (value * Math.PI) / 180;

const radiansToDegrees = (value: number): number => (value * 180) / Math.PI;

const zoneCirclePoint = (
  longitude: number,
  latitude: number,
  radiusMiles: number,
  bearingDegrees: number
): [number, number] => {
  const distance = radiusMiles / EARTH_RADIUS_MILES;
  const bearing = degreesToRadians(bearingDegrees);
  const lat1 = degreesToRadians(latitude);
  const lng1 = degreesToRadians(longitude);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distance) +
      Math.cos(lat1) * Math.sin(distance) * Math.cos(bearing)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(distance) * Math.cos(lat1),
      Math.cos(distance) - Math.sin(lat1) * Math.sin(lat2)
    );
  return [radiansToDegrees(lng2), radiansToDegrees(lat2)];
};

const zoneCircleCoordinates = (zone: DeskAreaMapZone): GeoJSON.Position[][] => [
  Array.from({ length: ZONE_CIRCLE_SEGMENTS + 1 }, (_, index) =>
    zoneCirclePoint(
      zone.longitude,
      zone.latitude,
      zone.radiusMiles,
      (index / ZONE_CIRCLE_SEGMENTS) * 360
    )
  ),
];

const zoneRingCoordinates = (zone: DeskAreaMapZone): GeoJSON.Position[][] => {
  if (zone.polygon && zone.polygon.length >= 3) {
    const ring: GeoJSON.Position[] = zone.polygon.map(([lng, lat]) => [
      lng,
      lat,
    ]);
    const [firstLng, firstLat] = ring[0];
    const [lastLng, lastLat] = ring.at(-1) ?? ring[0];
    if (firstLng !== lastLng || firstLat !== lastLat) {
      ring.push([firstLng, firstLat]);
    }
    return [ring];
  }
  return zoneCircleCoordinates(zone);
};

const toZoneGeoJson = (
  zones: readonly DeskAreaMapZone[]
): GeoJSON.FeatureCollection<GeoJSON.Polygon, DeskAreaMapZoneProperties> => ({
  features: zones.map((zone) => ({
    geometry: {
      coordinates: zoneRingCoordinates(zone),
      type: "Polygon",
    },
    properties: {
      id: zone.id,
      label: zone.label,
      mailPieces: zone.mailPieces,
      radiusMiles: zone.radiusMiles,
      selected: zone.selected,
      targetCount: zone.targetCount,
    },
    type: "Feature",
  })),
  type: "FeatureCollection",
});

const addZoneLayers = (
  map: mapboxgl.Map,
  zoneData: GeoJSON.FeatureCollection<
    GeoJSON.Polygon,
    DeskAreaMapZoneProperties
  >
): void => {
  map.addSource("desk-area-zones", { data: zoneData, type: "geojson" });
  map.addLayer(
    {
      id: ZONE_FILL_LAYER_ID,
      paint: {
        "fill-color": [
          "case",
          ["boolean", ["get", "selected"], false],
          ACTIVE_ZONE_FILL,
          ZONE_FILL,
        ],
        "fill-opacity": [
          "case",
          ["boolean", ["get", "selected"], false],
          0.28,
          0.18,
        ],
      },
      source: "desk-area-zones",
      type: "fill",
    },
    "desk-area-target-outline"
  );
  map.addLayer(
    {
      id: ZONE_LINE_LAYER_ID,
      paint: {
        "line-color": ZONE_LINE,
        "line-dasharray": [2, 1],
        "line-opacity": 0.9,
        "line-width": [
          "case",
          ["boolean", ["get", "selected"], false],
          2.8,
          1.8,
        ],
      },
      source: "desk-area-zones",
      type: "line",
    },
    TARGET_DOT_LAYER_ID
  );
};

const addTargetLayers = (
  map: mapboxgl.Map,
  pointData: GeoJSON.FeatureCollection<GeoJSON.Point, DeskAreaMapProperties>,
  polygonData: GeoJSON.FeatureCollection<
    GeoJSON.MultiPolygon | GeoJSON.Polygon,
    DeskAreaMapProperties
  >
): void => {
  map.addSource("desk-area-target-polygons", {
    data: polygonData,
    type: "geojson",
  });
  map.addLayer({
    id: TARGET_FILL_LAYER_ID,
    paint: {
      "fill-color": [
        "case",
        ["boolean", ["get", "selected"], false],
        SELECTED_FILL,
        NORMAL_FILL,
      ],
      "fill-opacity": [
        "case",
        ["boolean", ["get", "selected"], false],
        0.55,
        [
          "interpolate",
          ["linear"],
          ["get", "priorityScore"],
          1,
          0.14,
          100,
          0.34,
        ],
      ],
    },
    source: "desk-area-target-polygons",
    type: "fill",
  });
  map.addLayer({
    id: "desk-area-target-outline",
    paint: {
      "line-color": [
        "case",
        ["boolean", ["get", "selected"], false],
        "#b4600c",
        "#112519",
      ],
      "line-opacity": 0.78,
      "line-width": ["case", ["boolean", ["get", "selected"], false], 2.6, 1.2],
    },
    source: "desk-area-target-polygons",
    type: "line",
  });

  map.addSource("desk-area-targets", { data: pointData, type: "geojson" });
  map.addLayer({
    id: TARGET_DOT_LAYER_ID,
    paint: {
      "circle-color": [
        "case",
        ["boolean", ["get", "selected"], false],
        SELECTED_FILL,
        "#f8fff4",
      ],
      "circle-opacity": 0.95,
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["get", "priorityScore"],
        1,
        5,
        100,
        11,
      ],
      "circle-stroke-color": "#112519",
      "circle-stroke-width": 2,
    },
    source: "desk-area-targets",
    type: "circle",
  });
  map.addLayer({
    id: "desk-area-target-label",
    layout: {
      "text-field": ["get", "neighborhoodLabel"],
      "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
      "text-offset": [0, 1.1],
      "text-size": 11,
    },
    paint: {
      "text-color": "#112519",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.4,
    },
    source: "desk-area-targets",
    type: "symbol",
  });
};

const formatCurrency = (value: number | null): string =>
  value === null ? "No income data" : `$${value.toLocaleString()}`;

const formatHomeAge = (
  age: number | null,
  yearBuilt: number | null
): string => {
  if (age === null || yearBuilt === null) {
    return "No home-age data";
  }
  return `${age.toLocaleString()} yrs · built ${yearBuilt}`;
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const resizeMapToContainer = (map: mapboxgl.Map): void => {
  window.requestAnimationFrame(() => {
    map.resize();
  });
};

export const DeskAreaMap = ({
  drawMode = false,
  onCreateZone,
  onDrawZone,
  onToggleSelect,
  selectedIds,
  targets,
  zoneMode = false,
  zones = [],
}: DeskAreaMapProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const onCreateZoneRef = useRef(onCreateZone);
  const onDrawZoneRef = useRef(onDrawZone);
  const onToggleRef = useRef(onToggleSelect);
  const readyRef = useRef(false);
  const zoneModeRef = useRef(zoneMode);
  const drawModeRef = useRef(drawMode);

  const selectedSet = useMemo(() => new Set(selectedIds ?? []), [selectedIds]);

  const pointData = useMemo(
    () => toPointGeoJson(targets, selectedSet),
    [targets, selectedSet]
  );
  const polygonData = useMemo(
    () => toPolygonGeoJson(targets, selectedSet),
    [targets, selectedSet]
  );
  const zoneData = useMemo(() => toZoneGeoJson(zones), [zones]);

  const pointRef = useRef(pointData);
  const polygonRef = useRef(polygonData);
  const zoneRef = useRef(zoneData);

  useEffect(() => {
    onToggleRef.current = onToggleSelect;
  }, [onToggleSelect]);

  useEffect(() => {
    onCreateZoneRef.current = onCreateZone;
  }, [onCreateZone]);

  useEffect(() => {
    onDrawZoneRef.current = onDrawZone;
  }, [onDrawZone]);

  useEffect(() => {
    zoneModeRef.current = zoneMode;
    const map = mapRef.current;
    if (map) {
      map.getCanvas().style.cursor = zoneMode ? "crosshair" : "";
      // Guarantee the drawing buffer matches the container the instant the user
      // starts placing zones, so clicks unproject to the exact spot clicked.
      if (zoneMode) {
        map.resize();
      }
      // doubleClickZoom stays disabled for the whole map lifetime (see the map
      // creation effect) — no per-mode toggling, so a completing double-click
      // can never re-enable it and zoom the camera.
    }
  }, [zoneMode]);

  // Toggle the polygon draw tool. Kept separate from the radius-click zone mode;
  // the two are mutually exclusive from the parent.
  useEffect(() => {
    drawModeRef.current = drawMode;
    const map = mapRef.current;
    const draw = drawRef.current;
    if (!(map && draw && readyRef.current)) {
      return;
    }
    if (drawMode) {
      map.resize();
      // doubleClickZoom is already disabled for the map's lifetime (see the map
      // creation effect), so finishing a polygon on a double-click can never
      // zoom/recenter the camera. mapbox-gl-draw also won't re-enable it because
      // it was disabled before the draw control was added.
      draw.changeMode("draw_polygon");
      map.getCanvas().style.cursor = "crosshair";
    } else {
      draw.deleteAll();
      draw.changeMode("simple_select");
      map.getCanvas().style.cursor = zoneModeRef.current ? "crosshair" : "";
    }
  }, [drawMode]);

  useEffect(() => {
    pointRef.current = pointData;
    polygonRef.current = polygonData;
    zoneRef.current = zoneData;
  }, [pointData, polygonData, zoneData]);

  // Zone creation runs only through the single global map click below so one
  // click always makes exactly one zone — even when it lands on a target
  // (whose fill + dot layer handlers would otherwise each fire again).
  const handleFillClick = useCallback(
    (event: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
      // A drawn/selected zone renders ON TOP of the predefined tract layer, so a
      // click inside that zone also hits the tract fill/dot beneath it. Query
      // the zone fill at the exact click point: if a zone is under the pointer,
      // the click belongs to the zone and must NOT toggle the tract underneath.
      const map = event.target;
      const zoneUnderClick =
        map.getLayer(ZONE_FILL_LAYER_ID) !== undefined &&
        map.queryRenderedFeatures(event.point, {
          layers: [ZONE_FILL_LAYER_ID],
        }).length > 0;
      if (
        !shouldSelectTract({
          drawMode: drawModeRef.current,
          zoneMode: zoneModeRef.current,
          zoneUnderClick,
        })
      ) {
        return;
      }
      const id = event.features?.[0]?.properties?.id;
      if (typeof id === "string") {
        onToggleRef.current?.(id);
      }
    },
    []
  );

  const handleMapClick = useCallback((event: MapMouseEvent) => {
    if (drawModeRef.current || !zoneModeRef.current) {
      return;
    }
    onCreateZoneRef.current?.({
      latitude: event.lngLat.lat,
      longitude: event.lngLat.lng,
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!(container && MAPBOX_TOKEN)) {
      return;
    }
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      attributionControl: false,
      center: DEFAULT_CENTER,
      container,
      // Require ⌘/Ctrl + scroll (or two-finger) to zoom so scrolling the page
      // past this tall map doesn't hijack into a jarring zoom.
      cooperativeGestures: true,
      style: MAP_STYLE,
      zoom: DEFAULT_ZOOM,
    });
    mapRef.current = map;
    // Kill double-click-to-zoom for the map's ENTIRE lifetime, BEFORE the draw
    // control is added below. Two reasons: (1) finishing a drawn polygon is a
    // double-click, and dbl-click zoom would recenter/zoom the camera onto the
    // click the instant the shape completes ("jumps the map to the center, out
    // of view"); (2) mapbox-gl-draw snapshots doubleClickZoom's enabled state
    // when it connects (on addControl) and RE-ENABLES it on every draw stop via
    // a setTimeout — so if it were enabled at addControl time it would keep
    // coming back and race the completing double-click. Disabling it here means
    // draw records it as initially-disabled and never re-enables it. The desk
    // map only moves by pan / cooperative-gesture zoom, never a click.
    map.doubleClickZoom.disable();
    // Mapbox marks the interactive canvas tabindex="0", so clicking the map
    // natively focuses it. The map is taller than the viewport, so that focus
    // makes the browser scroll the PAGE to reveal the canvas — the "click jumps
    // the page down" bug. Neutralize the focus-induced scroll (the map camera
    // never moves programmatically either, so a click now changes nothing but
    // the selection). This is NOT a camera move.
    const detachFocusScroll = preventFocusScroll(map.getCanvas());
    const observer = new ResizeObserver(() => resizeMapToContainer(map));
    observer.observe(container);
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right"
    );
    map.addControl(new mapboxgl.AttributionControl({ compact: true }));

    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 12,
    });
    popupRef.current = popup;

    const onEnter = () => {
      map.getCanvas().style.cursor = zoneModeRef.current
        ? "crosshair"
        : "pointer";
    };
    const onMove = (
      event: MapMouseEvent & { features?: GeoJSON.Feature[] }
    ) => {
      const props = event.features?.[0]?.properties as
        | DeskAreaMapProperties
        | undefined;
      if (!props) {
        return;
      }
      const picked = props.selected
        ? "Selected · click to remove"
        : "Click to add";
      const title = props.neighborhoodLabel || props.tractLabel;
      popup
        .setLngLat(event.lngLat)
        .setHTML(
          `<strong>${escapeHtml(title)}</strong>` +
            `<span>${escapeHtml(props.countyLabel)}</span>` +
            `<span>Median income: ${formatCurrency(props.medianIncome)}</span>` +
            `<span>Median home age: ${formatHomeAge(
              props.medianHomeAge,
              props.medianYearBuilt
            )}</span>` +
            `<span>${props.homes.toLocaleString()} older owner homes · ${props.recommendedMailerCount.toLocaleString()} mail pieces</span>` +
            `<small>${escapeHtml(props.dataStatus)}</small>` +
            `<em>${picked}</em>`
        )
        .addTo(map);
    };
    const onLeave = () => {
      map.getCanvas().style.cursor = "";
      popup.remove();
    };

    const draw = new MapboxDraw({
      controls: {},
      displayControlsDefault: false,
    });
    const handleDrawCreate = (event: { features?: GeoJSON.Feature[] }) => {
      const feature = event.features?.[0];
      if (feature?.geometry?.type === "Polygon") {
        const ring = feature.geometry.coordinates[0] as [number, number][];
        onDrawZoneRef.current?.(ring.map(([lng, lat]) => [lng, lat]));
      }
      // We persist and render zones through our own layers, so clear the
      // transient draw feature immediately after capturing its shape.
      draw.deleteAll();
    };

    map.on("load", () => {
      // Match the drawing buffer to the container before interacting. Otherwise
      // a stale (too-short) buffer makes clicks unproject too far south, so new
      // zones land at the bottom of the map. resize() preserves center/zoom, so
      // it never moves the camera — the view stays on the fixed Austin frame.
      map.resize();
      addTargetLayers(map, pointRef.current, polygonRef.current);
      addZoneLayers(map, zoneRef.current);
      map.addControl(draw);
      drawRef.current = draw;
      (map as unknown as MapboxDrawEvented).on("draw.create", handleDrawCreate);
      readyRef.current = true;
      map.on("click", handleMapClick);
      map.on("click", TARGET_FILL_LAYER_ID, handleFillClick);
      map.on("click", TARGET_DOT_LAYER_ID, handleFillClick);
      map.on("mouseenter", TARGET_FILL_LAYER_ID, onEnter);
      map.on("mouseenter", TARGET_DOT_LAYER_ID, onEnter);
      map.on("mousemove", TARGET_FILL_LAYER_ID, onMove);
      map.on("mousemove", TARGET_DOT_LAYER_ID, onMove);
      map.on("mouseleave", TARGET_FILL_LAYER_ID, onLeave);
      map.on("mouseleave", TARGET_DOT_LAYER_ID, onLeave);
    });

    // Catch late layout shifts (font swaps, scrollbar, sticky settle) that the
    // ResizeObserver misses because the container's box size never changes.
    map.once("idle", () => map.resize());
    const lateResize = window.setTimeout(() => map.resize(), 300);

    return () => {
      readyRef.current = false;
      window.clearTimeout(lateResize);
      detachFocusScroll();
      observer.disconnect();
      popup.remove();
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
      popupRef.current = null;
    };
  }, [handleFillClick, handleMapClick]);

  // Push new / re-selected data to the map.
  useEffect(() => {
    const map = mapRef.current;
    if (!(map && readyRef.current && map.isStyleLoaded())) {
      return;
    }
    (
      map.getSource("desk-area-target-polygons") as GeoJSONSource | undefined
    )?.setData(polygonData);
    (map.getSource("desk-area-targets") as GeoJSONSource | undefined)?.setData(
      pointData
    );
    (map.getSource("desk-area-zones") as GeoJSONSource | undefined)?.setData(
      zoneData
    );
  }, [pointData, polygonData, zoneData]);

  // NOTE: There is intentionally NO camera-movement effect here. The map view
  // is only ever changed by the user's mouse/gestures. We never auto-fit to
  // targets, focus a selection, or frame a zone — doing so "jumped the map all
  // over" while drawing. Data updates above repaint layers in place.

  if (!MAPBOX_TOKEN) {
    return (
      <div className="desk-area-map desk-area-map--fallback">
        <span>Map needs VITE_MAPBOX_ACCESS_TOKEN.</span>
      </div>
    );
  }

  return (
    <div
      className={
        zoneMode ? "desk-area-map desk-area-map--zoning" : "desk-area-map"
      }
      ref={containerRef}
    />
  );
};
