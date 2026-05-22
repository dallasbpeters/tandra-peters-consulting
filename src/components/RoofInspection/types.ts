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
  /** Percentage-based position over the diagram image. */
  position: { top: string; left: string };
  /** Which side of the hotspot the callout card opens toward. */
  direction: Direction;
  callout: CalloutContent;
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
};

export type RoofInspectionContextValue = {
  chapters: Chapter[];
  views: View[];
  activeChapterId: string | null;
  setActiveChapterId: (id: string | null) => void;
  activeViewId: string;
  setActiveViewId: (id: string) => void;
};
