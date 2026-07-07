import type { GeoJSONSource, MapMouseEvent } from "mapbox-gl";
import mapboxgl from "mapbox-gl";
import { useCallback, useEffect, useMemo, useRef } from "react";

import "mapbox-gl/dist/mapbox-gl.css";

const MAP_STYLE = "mapbox://styles/mapbox/streets-v12";
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() ?? "";
const DEFAULT_CENTER: [number, number] = [-97.74, 30.62];

const NORMAL_FILL = "#92d66f";
const SELECTED_FILL = "#f2a63d";

interface TractPolygon {
  coordinates: number[][][];
  type: "Polygon";
}

export interface DeskAreaMapTarget {
  countyLabel: string;
  geometry: TractPolygon | null;
  id: string;
  latitude: number;
  longitude: number;
  neighborhoodLabel: string;
  olderHomeEstimate: number;
  priorityScore: number;
  tractLabel: string;
}

interface DeskAreaMapProps {
  focusIds?: readonly string[];
  onToggleSelect?: (id: string) => void;
  selectedIds?: readonly string[];
  targets: readonly DeskAreaMapTarget[];
}

interface DeskAreaMapProperties {
  countyLabel: string;
  homes: number;
  id: string;
  neighborhoodLabel: string;
  priorityScore: number;
  selected: boolean;
  tractLabel: string;
}

const buildProperties = (
  target: DeskAreaMapTarget,
  selected: boolean
): DeskAreaMapProperties => ({
  countyLabel: target.countyLabel,
  homes: target.olderHomeEstimate,
  id: target.id,
  neighborhoodLabel: target.neighborhoodLabel,
  priorityScore: target.priorityScore,
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
): GeoJSON.FeatureCollection<GeoJSON.Polygon, DeskAreaMapProperties> => ({
  features: targets
    .filter((target) => target.geometry)
    .map((target) => ({
      geometry: target.geometry as GeoJSON.Polygon,
      properties: buildProperties(target, selected.has(target.id)),
      type: "Feature",
    })),
  type: "FeatureCollection",
});

const boundsFor = (
  targets: readonly DeskAreaMapTarget[]
): mapboxgl.LngLatBounds => {
  const bounds = new mapboxgl.LngLatBounds();
  for (const target of targets) {
    bounds.extend([target.longitude, target.latitude]);
    for (const ring of target.geometry?.coordinates ?? []) {
      for (const [lng, lat] of ring) {
        bounds.extend([lng, lat]);
      }
    }
  }
  return bounds;
};

const fitTo = (
  map: mapboxgl.Map,
  targets: readonly DeskAreaMapTarget[],
  duration: number
): void => {
  if (targets.length === 0) {
    map.easeTo({ center: DEFAULT_CENTER, duration, zoom: 6.6 });
    return;
  }
  map.fitBounds(boundsFor(targets), {
    duration,
    maxZoom: 12,
    padding: { bottom: 56, left: 56, right: 56, top: 56 },
  });
};

const addTargetLayers = (
  map: mapboxgl.Map,
  pointData: GeoJSON.FeatureCollection<GeoJSON.Point, DeskAreaMapProperties>,
  polygonData: GeoJSON.FeatureCollection<GeoJSON.Polygon, DeskAreaMapProperties>
): void => {
  map.addSource("desk-area-target-polygons", {
    data: polygonData,
    type: "geojson",
  });
  map.addLayer({
    id: "desk-area-target-fill",
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
    id: "desk-area-target-dot",
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

export const DeskAreaMap = ({
  focusIds,
  onToggleSelect,
  selectedIds,
  targets,
}: DeskAreaMapProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const onToggleRef = useRef(onToggleSelect);
  const readyRef = useRef(false);

  const selectedSet = useMemo(() => new Set(selectedIds ?? []), [selectedIds]);

  const pointData = useMemo(
    () => toPointGeoJson(targets, selectedSet),
    [targets, selectedSet]
  );
  const polygonData = useMemo(
    () => toPolygonGeoJson(targets, selectedSet),
    [targets, selectedSet]
  );

  const pointRef = useRef(pointData);
  const polygonRef = useRef(polygonData);
  const targetsRef = useRef(targets);

  useEffect(() => {
    onToggleRef.current = onToggleSelect;
  }, [onToggleSelect]);

  useEffect(() => {
    pointRef.current = pointData;
    polygonRef.current = polygonData;
    targetsRef.current = targets;
  }, [pointData, polygonData, targets]);

  const handleFillClick = useCallback(
    (event: MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
      const id = event.features?.[0]?.properties?.id;
      if (typeof id === "string") {
        onToggleRef.current?.(id);
      }
    },
    []
  );

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
      cooperativeGestures: true,
      style: MAP_STYLE,
      zoom: 6.6,
    });
    mapRef.current = map;
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
      map.getCanvas().style.cursor = "pointer";
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
      popup
        .setLngLat(event.lngLat)
        .setHTML(
          `<strong>${props.neighborhoodLabel || props.tractLabel}</strong>` +
            `<span>${props.countyLabel}</span>` +
            `<span>${props.homes.toLocaleString()} homes to canvass</span>` +
            `<em>${picked}</em>`
        )
        .addTo(map);
    };
    const onLeave = () => {
      map.getCanvas().style.cursor = "";
      popup.remove();
    };

    map.on("load", () => {
      addTargetLayers(map, pointRef.current, polygonRef.current);
      fitTo(map, targetsRef.current, 0);
      readyRef.current = true;
      map.on("click", "desk-area-target-fill", handleFillClick);
      map.on("mouseenter", "desk-area-target-fill", onEnter);
      map.on("mousemove", "desk-area-target-fill", onMove);
      map.on("mouseleave", "desk-area-target-fill", onLeave);
    });

    return () => {
      readyRef.current = false;
      popup.remove();
      map.remove();
      mapRef.current = null;
      popupRef.current = null;
    };
  }, [handleFillClick]);

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
  }, [pointData, polygonData]);

  // Fit to all targets when the underlying set changes.
  useEffect(() => {
    const map = mapRef.current;
    if (map && readyRef.current) {
      fitTo(map, targets, 0);
    }
  }, [targets]);

  // Zoom to a saved selection when the user reopens a target.
  useEffect(() => {
    const map = mapRef.current;
    if (!(map && readyRef.current && focusIds && focusIds.length > 0)) {
      return;
    }
    const focusSet = new Set(focusIds);
    const focused = targetsRef.current.filter((target) =>
      focusSet.has(target.id)
    );
    if (focused.length > 0) {
      fitTo(map, focused, 600);
    }
  }, [focusIds]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="desk-area-map desk-area-map--fallback">
        <span>Map needs VITE_MAPBOX_ACCESS_TOKEN.</span>
      </div>
    );
  }

  return <div className="desk-area-map" ref={containerRef} />;
};
