import type { CalculateMetadataFunction } from "remotion";

import type { CustomCompositionProps } from "./composition/customSchema";

export const calculateMetadata: CalculateMetadataFunction<CustomCompositionProps> = ({ props }) => {
  const total = (props.scenes ?? []).reduce((sum, s) => sum + (s.durationInFrames ?? 180), 0);
  return { durationInFrames: Math.max(total, 30) };
};
