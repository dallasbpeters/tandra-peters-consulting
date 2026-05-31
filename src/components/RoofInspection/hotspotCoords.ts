import { stegaClean } from "@sanity/client/stega";

import type { RoofInspectionHotspotData } from "../../types";

const toFiniteNumber = (value: unknown): number | undefined => {
  const cleaned =
    typeof value === "string" || typeof value === "number" ? stegaClean(value) : value;

  if (typeof cleaned === "number" && Number.isFinite(cleaned)) {
    return cleaned;
  }
  if (typeof cleaned === "string" && cleaned.trim()) {
    const parsed = Number(cleaned.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

/** Stable React key segment — changes when CMS coords change. */
export const hotspotCoordKey = (position3d?: string, normal3d?: string): string =>
  `${position3d ?? "no-pos"}|${normal3d ?? "no-norm"}`;

export const parseHotspotCoords = (
  hotspot: Pick<
    RoofInspectionHotspotData,
    "pos3dX" | "pos3dY" | "pos3dZ" | "norm3dX" | "norm3dY" | "norm3dZ"
  >,
): { position3d?: string; normal3d?: string } => {
  const x = toFiniteNumber(hotspot.pos3dX);
  const y = toFiniteNumber(hotspot.pos3dY);
  const z = toFiniteNumber(hotspot.pos3dZ);

  const position3d =
    x !== undefined && y !== undefined && z !== undefined ? `${x}m ${y}m ${z}m` : undefined;

  const nx = toFiniteNumber(hotspot.norm3dX);
  const ny = toFiniteNumber(hotspot.norm3dY);
  const nz = toFiniteNumber(hotspot.norm3dZ);

  const normal3d =
    nx !== undefined && ny !== undefined && nz !== undefined ? `${nx}m ${ny}m ${nz}m` : undefined;

  return { position3d, normal3d };
};
