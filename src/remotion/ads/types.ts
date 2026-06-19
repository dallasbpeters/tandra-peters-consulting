export type Direction = "top" | "right" | "bottom" | "left";

export interface Chapter {
  callout: {
    title?: string;
    body?: string;
    watchFor?: string;
  };
  direction: Direction;
  id: string;
  label: string;
  normal3d?: string;
  num: string;
  position: { top: string; left: string };
  position3d?: string;
}

export interface View {
  cameraOrbit: string;
  cameraTarget: string;
  fieldOfView: string;
  id: string;
  interpolationDecay?: string;
  label: string;
}
