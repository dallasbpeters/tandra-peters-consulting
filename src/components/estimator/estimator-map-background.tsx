import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
import type React from "react";
import { useEffect, useRef } from "react";
import { ChromaFlow, Shader } from "shaders/react";

import { useIsMobile } from "../../hooks/is-mobile";
import { useNearViewport } from "../../hooks/use-near-viewport";
import { mix, theme } from "../../theme";

const MAP_STYLE = "mapbox://styles/dallasbpeters/cmpp12ft3003f01s8fw2fdari";
const TX_CENTER: [number, number] = [-99.5, 31];
const TX_ZOOM = 5.8;

interface EstimatorMapBackgroundProps {
  active: boolean;
  mapboxToken: string;
  propertyCoords: [number, number] | null;
}

const propertyFocusOffset = (map: mapboxgl.Map): [number, number] => {
  const width = map.getContainer().clientWidth;
  if (width < 900) {
    return [0, 0];
  }
  return [Math.min(width * 0.24, 360), 0];
};

const focusMapOnCoords = (
  map: mapboxgl.Map,
  markerRef: React.RefObject<mapboxgl.Marker | null>,
  propertyCoords: [number, number]
) => {
  map.flyTo({
    center: propertyCoords,
    duration: 2000,
    essential: true,
    offset: propertyFocusOffset(map),
    zoom: 17.5,
  });

  if (markerRef.current) {
    markerRef.current.setLngLat(propertyCoords);
    return;
  }

  const el = document.createElement("div");
  Object.assign(el.style, {
    animation: "scale-pulse 1.5s ease-out infinite",
    background: "#945bea",
    border: "3px solid #ffffff",
    borderRadius: "50%",
    boxShadow: "0 2px 14px rgba(0,0,0,0.65)",
    height: "14px",
    width: "14px",
  });
  Object.assign(el.classList.add, "estimator-map-marker");
  markerRef.current = new mapboxgl.Marker({ element: el })
    .setLngLat(propertyCoords)
    .addTo(map);
};

export const EstimatorMapBackground = ({
  active,
  mapboxToken,
  propertyCoords,
}: EstimatorMapBackgroundProps) => {
  const isMobile = useIsMobile(1326);
  const panelRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const isNearViewport = useNearViewport(panelRef, "300px 0px");

  useEffect(() => {
    if (!active) {
      return;
    }
    const panel = panelRef.current;
    const container = mapContainerRef.current;
    if (!(panel && container)) {
      return;
    }

    let animationFrame: number | null = null;
    const resizeMap = () => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null;
        mapRef.current?.resize();
      });
    };

    resizeMap();

    const observer = new ResizeObserver(resizeMap);
    observer.observe(panel);
    observer.observe(container);

    return () => {
      observer.disconnect();
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [active]);

  useEffect(() => {
    if (!(active && isNearViewport)) {
      return;
    }
    const container = mapContainerRef.current;
    if (!(container && mapboxToken) || mapRef.current) {
      return;
    }

    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
      attributionControl: false,
      bearing: -10,
      center: TX_CENTER,
      container,
      pitch: 45,
      scrollZoom: true,
      style: MAP_STYLE,
      zoom: TX_ZOOM,
    });

    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right"
    );
    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right"
    );

    map.once("style.load", () => {
      try {
        map.setTerrain(null);
        map.setConfigProperty("basemap", "lightPreset", "dusk");
        map.setConfigProperty("basemap", "show3dObjects", true);
      } catch {
        /* non-Standard basemap - skip */
      }

      if (propertyCoords) {
        focusMapOnCoords(map, markerRef, propertyCoords);
      }
    });

    mapRef.current = map;
    window.requestAnimationFrame(() => map.resize());

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [active, isNearViewport, mapboxToken, propertyCoords]);

  useEffect(() => {
    const map = mapRef.current;
    if (!(propertyCoords && map)) {
      return;
    }
    focusMapOnCoords(map, markerRef, propertyCoords);
  }, [propertyCoords]);

  const estimatorPanelStyle: React.CSSProperties = {
    backgroundColor: theme.palette.everglade["950"],
    border: `1px solid ${mix(theme.colors.white, 8)}`,
    borderRadius: theme.radius.large,
    inset: 24,
    minHeight: isMobile ? "220px" : "480px",
    overflow: "hidden",
    position: "absolute",
    zIndex: 0,
  };

  return (
    <div
      className="estimator-map-panel"
      ref={panelRef}
      style={estimatorPanelStyle}
    >
      <div
        aria-hidden="true"
        ref={mapContainerRef}
        style={{ inset: 0, position: "absolute" }}
      />
      <style>{`
        .mapboxgl-ctrl-top-right {
          top: 1rem;
          right: 1rem;
        }`}</style>

      <Shader style={{ inset: 0, position: "absolute", zIndex: 10 }}>
        <ChromaFlow
          baseColor="#7449d6"
          blendMode="difference"
          downColor="#7935b5"
          id="mapChromaFlow"
          intensity={1}
          momentum={19}
          radius={1.5}
          rightColor="#8a5ae8"
          transform={{ offsetX: 0.01 }}
          upColor="#9a6cf0"
        />
      </Shader>
    </div>
  );
};
