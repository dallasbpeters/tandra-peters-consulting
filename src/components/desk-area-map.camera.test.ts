import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// The desk area map has ONE hard invariant: it must NEVER move the camera
// programmatically. Only the user's pan/zoom/pinch gestures may change the
// view. This regression has been reintroduced repeatedly (a fit-to-selection
// `useEffect` calling `fitBounds`/`easeTo`), so this guard scans the source and
// fails if any camera-moving Map method reappears. `resize()` is intentionally
// allowed: it matches the drawing buffer to the container and preserves
// center/zoom, so it never shifts the geographic view.
// Resolve from the repo root (vitest runs with cwd at the project root); the
// jsdom test env rewrites `import.meta.url` to an http URL, so a file-URL
// resolve is not usable here.
const MAP_SOURCE = readFileSync(
  join(process.cwd(), "src/components/desk-area-map.tsx"),
  "utf-8"
);

const FORBIDDEN_CAMERA_CALLS = [
  "flyTo",
  "easeTo",
  "jumpTo",
  "panTo",
  "panBy",
  "setCenter",
  "setZoom",
  "zoomTo",
  "zoomIn",
  "zoomOut",
  "rotateTo",
  "setBearing",
  "setPitch",
  "setPadding",
  "fitBounds",
  "fitScreenCoordinates",
] as const;

describe("desk area map camera invariant", () => {
  it.each(FORBIDDEN_CAMERA_CALLS)(
    "never calls the camera-moving method .%s()",
    (method) => {
      const pattern = new RegExp(`\\.${method}\\s*\\(`);
      expect(pattern.test(MAP_SOURCE)).toBeFalsy();
    }
  );

  it("still resizes the drawing buffer (needed for accurate click hit-testing)", () => {
    // Resize is the sanctioned no-camera operation. If it ever disappears,
    // clicks unproject against a stale buffer and land in the wrong geo spot —
    // so we assert it is still present rather than accidentally stripped.
    expect(/\.resize\s*\(/.test(MAP_SOURCE)).toBeTruthy();
  });

  it("disables doubleClickZoom and never re-enables it", () => {
    // Finishing a drawn polygon is a DOUBLE-CLICK. If doubleClickZoom is ever
    // enabled, that completing double-click zooms/recenters the camera ("jumps
    // the map to the center, out of view"). mapbox-gl-draw also re-enables
    // doubleClickZoom on every draw stop UNLESS it was already disabled when the
    // draw control was added — so it must be disabled once, for the map's whole
    // lifetime, and never enabled again.
    expect(/doubleClickZoom\.disable\s*\(/.test(MAP_SOURCE)).toBeTruthy();
    expect(/doubleClickZoom\.enable\s*\(/.test(MAP_SOURCE)).toBeFalsy();
  });
});
