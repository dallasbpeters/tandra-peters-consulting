import { Expand, Position } from "iconoir-react";
import type { GeoJSONSource, MapMouseEvent } from "mapbox-gl";
import mapboxgl from "mapbox-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import "mapbox-gl/dist/mapbox-gl.css";

import { WALK_STATUS_ORDER, walkStatusColors } from "../../../lib/desk-walk";
import type { WalkHome } from "../../../lib/desk-walk";

type LocationHint = "denied" | "unavailable" | null;

// How close (in degrees, ~6 km) the canvasser must be to the roster bounds
// before we pull the camera out to include their "you are here" dot. Keeps the
// map framed on the zone when they haven't arrived yet.
const NEAR_ZONE_PADDING_DEG = 0.06;

const boundsOfFeatures = (
  features: GeoJSON.Feature<GeoJSON.Point>[]
): mapboxgl.LngLatBounds | null => {
  if (features.length === 0) {
    return null;
  }
  const bounds = new mapboxgl.LngLatBounds();
  for (const feature of features) {
    bounds.extend(feature.geometry.coordinates as [number, number]);
  }
  return bounds;
};

const isNearBounds = (
  point: [number, number],
  bounds: mapboxgl.LngLatBounds
): boolean => {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  return (
    point[0] >= sw.lng - NEAR_ZONE_PADDING_DEG &&
    point[0] <= ne.lng + NEAR_ZONE_PADDING_DEG &&
    point[1] >= sw.lat - NEAR_ZONE_PADDING_DEG &&
    point[1] <= ne.lat + NEAR_ZONE_PADDING_DEG
  );
};

const LOCATION_HINT_TEXT: Record<Exclude<LocationHint, null>, string> = {
  denied: "Location off — showing the area.",
  unavailable: "Location unavailable — showing the area.",
};

const MAP_STYLE = "mapbox://styles/mapbox/streets-v12";
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() ?? "";
const DEFAULT_CENTER: [number, number] = [-97.74, 30.32];
const DEFAULT_ZOOM = 11;
const SOURCE_ID = "desk-walk-homes";

interface HomePinProps {
  active: boolean;
  homeKey: string;
  status: string;
}

// Data-driven circle color by status (mirrors `walkStatusColors`).
const statusColorExpression = (): (number | string)[] => {
  const expression: (number | string)[] = ["match", ["get", "status"] as never];
  for (const status of WALK_STATUS_ORDER) {
    expression.push(status, walkStatusColors[status]);
  }
  expression.push(walkStatusColors["not-started"]);
  return expression;
};

const toGeoJson = (
  homes: readonly WalkHome[],
  activeHomeKey: string | null
): GeoJSON.FeatureCollection<GeoJSON.Point, HomePinProps> => ({
  features: homes
    .filter((home) => home.latitude !== null && home.longitude !== null)
    .map((home) => ({
      geometry: {
        coordinates: [home.longitude as number, home.latitude as number],
        type: "Point",
      },
      properties: {
        active: home.homeKey === activeHomeKey,
        homeKey: home.homeKey,
        status: home.status,
      },
      type: "Feature",
    })),
  type: "FeatureCollection",
});

/**
 * Per-home pin map: one dot per home, colored by walk status, tap-to-open. The
 * camera fits the homes once on first load, then only repaints in place on
 * status changes (no camera jumps while working the list).
 */
export const HomeMap = ({
  activeHomeKey,
  homes,
  onOpen,
}: {
  activeHomeKey: string | null;
  homes: readonly WalkHome[];
  onOpen: (homeKey: string) => void;
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const readyRef = useRef(false);
  const fittedRef = useRef(false);
  const userPosRef = useRef<[number, number] | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const userFittedRef = useRef(false);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const [locationHint, setLocationHint] = useState<LocationHint>(null);

  const data = useMemo(
    () => toGeoJson(homes, activeHomeKey),
    [homes, activeHomeKey]
  );
  const dataRef = useRef(data);
  dataRef.current = data;

  // Drop / move the pulsing "you are here" marker. Shared by the position watch
  // and the "Zoom to me" retry so both stay in sync.
  const applyUserPosition = useCallback((lngLat: [number, number]) => {
    userPosRef.current = lngLat;
    const map = mapRef.current;
    if (!map) {
      return;
    }
    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat(lngLat);
      return;
    }
    const element = document.createElement("div");
    element.className = "desk-walk-user-dot";
    element.setAttribute("aria-hidden", "true");
    userMarkerRef.current = new mapboxgl.Marker({ element })
      .setLngLat(lngLat)
      .addTo(map);
  }, []);

  // "Zoom to zone": re-fit the roster bounds (same fit computed on mount).
  const zoomToZone = useCallback(() => {
    const map = mapRef.current;
    const bounds = boundsOfFeatures(dataRef.current.features);
    if (map && bounds) {
      map.fitBounds(bounds, { animate: true, maxZoom: 16, padding: 48 });
    }
  }, []);

  // "Zoom to me": recenter on the known position, else retry geolocation once
  // and surface the non-blocking hint on failure (permission denied / etc.).
  const zoomToMe = useCallback(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const flyTo = (lngLat: [number, number]) =>
      map.easeTo({ center: lngLat, zoom: Math.max(map.getZoom(), 16) });
    if (userPosRef.current) {
      flyTo(userPosRef.current);
      return;
    }
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setLocationHint("unavailable");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lngLat: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ];
        setLocationHint(null);
        applyUserPosition(lngLat);
        flyTo(lngLat);
      },
      (error) =>
        setLocationHint(
          error.code === error.PERMISSION_DENIED ? "denied" : "unavailable"
        ),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 12_000 }
    );
  }, [applyUserPosition]);

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
      zoom: DEFAULT_ZOOM,
    });
    mapRef.current = map;
    const observer = new ResizeObserver(() =>
      window.requestAnimationFrame(() => map.resize())
    );
    observer.observe(container);
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right"
    );

    const handleClick = (
      event: MapMouseEvent & { features?: GeoJSON.Feature[] }
    ) => {
      const homeKey = event.features?.[0]?.properties?.homeKey;
      if (typeof homeKey === "string") {
        onOpenRef.current(homeKey);
      }
    };
    const handleEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const handleLeave = () => {
      map.getCanvas().style.cursor = "";
    };

    map.on("load", () => {
      map.resize();
      map.addSource(SOURCE_ID, { data: dataRef.current, type: "geojson" });
      map.addLayer({
        id: "desk-walk-home-dot",
        paint: {
          "circle-color": statusColorExpression() as never,
          "circle-radius": [
            "case",
            ["boolean", ["get", "active"], false],
            10,
            6,
          ],
          "circle-stroke-color": [
            "case",
            ["boolean", ["get", "active"], false],
            "#0b201a",
            "#ffffff",
          ],
          "circle-stroke-width": 2,
        },
        source: SOURCE_ID,
        type: "circle",
      });
      readyRef.current = true;
      map.on("click", "desk-walk-home-dot", handleClick);
      map.on("mouseenter", "desk-walk-home-dot", handleEnter);
      map.on("mouseleave", "desk-walk-home-dot", handleLeave);
    });

    return () => {
      readyRef.current = false;
      fittedRef.current = false;
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Repaint on data change; fit to the homes exactly once.
  useEffect(() => {
    const map = mapRef.current;
    if (!(map && readyRef.current && map.isStyleLoaded())) {
      return;
    }
    (map.getSource(SOURCE_ID) as GeoJSONSource | undefined)?.setData(data);
    if (fittedRef.current || data.features.length === 0) {
      return;
    }
    const bounds = new mapboxgl.LngLatBounds();
    for (const feature of data.features) {
      bounds.extend(feature.geometry.coordinates as [number, number]);
    }
    map.fitBounds(bounds, { animate: false, maxZoom: 16, padding: 48 });
    fittedRef.current = true;
  }, [data]);

  // Live "you are here": watch position, drop a pulsing marker, and — once — pull
  // the camera to include the canvasser if they're near the zone. Every failure
  // mode (denied / unavailable / timeout / insecure context) resolves to a
  // subtle hint and leaves the roster-bounds fit untouched.
  useEffect(() => {
    if (!MAPBOX_TOKEN) {
      return;
    }
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setLocationHint("unavailable");
      return;
    }

    const handlePosition = (position: GeolocationPosition) => {
      setLocationHint(null);
      const lngLat: [number, number] = [
        position.coords.longitude,
        position.coords.latitude,
      ];
      applyUserPosition(lngLat);
      const map = mapRef.current;
      if (!map || userFittedRef.current) {
        return;
      }
      const bounds = boundsOfFeatures(dataRef.current.features);
      if (!bounds) {
        return;
      }
      userFittedRef.current = true;
      if (isNearBounds(lngLat, bounds)) {
        bounds.extend(lngLat);
        map.fitBounds(bounds, { animate: true, maxZoom: 16, padding: 56 });
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      setLocationHint(
        error.code === error.PERMISSION_DENIED ? "denied" : "unavailable"
      );
    };

    const watchId = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 12_000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
    };
  }, [applyUserPosition]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="desk-area-map desk-area-map--fallback">
        <span>Map needs VITE_MAPBOX_ACCESS_TOKEN.</span>
      </div>
    );
  }

  return (
    <div className="desk-walk-map">
      <div className="desk-walk-map__canvas" ref={containerRef} />
      <div className="desk-walk-map-controls">
        <button
          aria-label="Zoom to my location"
          className="desk-walk-map-control"
          onClick={zoomToMe}
          title="Zoom to me"
          type="button"
        >
          <Position aria-hidden height={20} width={20} />
        </button>
        <button
          aria-label="Zoom to the zone"
          className="desk-walk-map-control"
          onClick={zoomToZone}
          title="Zoom to zone"
          type="button"
        >
          <Expand aria-hidden height={20} width={20} />
        </button>
      </div>
      {locationHint ? (
        <p className="desk-walk-map__hint" role="status">
          {LOCATION_HINT_TEXT[locationHint]}
        </p>
      ) : null}
    </div>
  );
};
