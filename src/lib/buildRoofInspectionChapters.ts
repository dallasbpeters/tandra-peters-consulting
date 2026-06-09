import type { RoofInspectionHotspotData } from "../types";

import { CHAPTERS, type Chapter } from "../components/RoofInspection";
import { parseHotspotCoords } from "../components/RoofInspection/hotspotCoords";

const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"];

const CHAPTERS_BY_LABEL = new Map(CHAPTERS.map((chapter) => [chapter.label, chapter]));

/** Map Sanity hotspots into RoofInspection chapters, merging camera presets from CHAPTERS. */
export const buildRoofInspectionChapters = (hotspots?: RoofInspectionHotspotData[]): Chapter[] => {
  if (!hotspots?.length) {
    return CHAPTERS;
  }

  return hotspots.map((hotspot, index): Chapter => {
    const { position3d, normal3d } = parseHotspotCoords(hotspot);
    const fallback = CHAPTERS_BY_LABEL.get(hotspot.label);

    return {
      id: String(index + 1),
      num: ROMAN[index] ?? String(index + 1),
      label: hotspot.label,
      position: fallback?.position ?? { top: "0%", left: "0%" },
      direction: hotspot.direction,
      callout: {
        title: hotspot.calloutTitle,
        body: hotspot.calloutBody,
        watchFor: hotspot.watchFor,
      },
      ...(fallback?.focusOrbit ? { focusOrbit: fallback.focusOrbit } : {}),
      position3d,
      normal3d,
      sanityKey: hotspot._key,
    };
  });
};
