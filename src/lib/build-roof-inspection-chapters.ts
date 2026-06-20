import type { Chapter } from "../components/RoofInspection";
import { CHAPTERS } from "../components/RoofInspection";
import { parseHotspotCoords } from "../components/RoofInspection/hotspot-coords";
import type { RoofInspectionHotspotData } from "../types";

const _ROMAN = [
  "i",
  "ii",
  "iii",
  "iv",
  "v",
  "vi",
  "vii",
  "viii",
  "ix",
  "x",
  "xi",
  "xii",
];

const CHAPTERS_BY_LABEL = new Map(
  CHAPTERS.map((chapter) => [chapter.label, chapter])
);

/** Map Sanity hotspots into RoofInspection chapters, merging camera presets from CHAPTERS. */
export const buildRoofInspectionChapters = (
  hotspots?: RoofInspectionHotspotData[]
): Chapter[] => {
  if (!hotspots?.length) {
    return CHAPTERS;
  }

  return hotspots.map((hotspot, index): Chapter => {
    const { position3d, normal3d } = parseHotspotCoords(hotspot);
    const fallback = CHAPTERS_BY_LABEL.get(hotspot.label);

    return {
      callout: {
        body: hotspot.calloutBody,
        title: hotspot.calloutTitle,
        watchFor: hotspot.watchFor,
      },
      direction: hotspot.direction,
      id: String(index + 1),
      label: hotspot.label,
      num: _ROMAN[index] ?? String(index + 1),
      position: fallback?.position ?? { left: "0%", top: "0%" },
      ...(fallback?.focusOrbit ? { focusOrbit: fallback.focusOrbit } : {}),
      normal3d,
      position3d,
      sanityKey: hotspot._key,
    };
  });
};
