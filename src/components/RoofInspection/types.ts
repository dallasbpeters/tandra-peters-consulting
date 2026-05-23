export type CalloutContent = {
  title: string;
  body: string;
  watchFor: string;
};

export type Direction = "top" | "right" | "left" | "bottom";

export type Chapter = {
  id: string;
  /** Roman numeral label shown in the rail and on the hotspot dot. */
  num: string;
  /** Short chapter title shown in the left rail nav. */
  label: string;
  /** Percentage-based position over a 2D diagram image. */
  position: { top: string; left: string };
  /** Which side of the hotspot callout card opens toward. */
  direction: Direction;
  callout: CalloutContent;
  /**
   * model-viewer `data-position` value — world-space XYZ with "m" suffix.
   * When present, Hotspot renders as a model-viewer slot element instead of
   * a CSS-positioned overlay. e.g. "-0.84m 3.96m -0.20m"
   */
  position3d?: string;
  /**
   * model-viewer `data-normal` value — surface normal at the hotspot point.
   * Used by model-viewer to hide hotspots facing away from camera.
   */
  normal3d?: string;
  /**
   * model-viewer `camera-orbit` value to use when this chapter is focused via
   * the rail nav — rotates the camera to show the hotspot face-on.
   * Falls back to the currently active view's orbit if omitted.
   */
  focusOrbit?: string;
};

export type View = {
  id: string;
  label: string;
  /** model-viewer camera-orbit value e.g. "0deg 70deg auto" */
  cameraOrbit?: string;
  /** model-viewer camera-target value e.g. "0m 0m 0m" */
  cameraTarget?: string;
  /** model-viewer field-of-view value e.g. "30deg" or "auto" */
  fieldOfView?: string;
  /** model-viewer interpolation-decay value e.g. "0.5" */
  interpolationDecay?: string;
};

export type RoofInspectionContextValue = {
  chapters: Chapter[];
  views: View[];
  activeChapterId: string | null;
  setActiveChapterId: (id: string | null) => void;
  activeViewId: string;
  setActiveViewId: (id: string) => void;
};
