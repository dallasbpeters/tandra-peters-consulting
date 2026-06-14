export type Direction = "top" | "right" | "bottom" | "left";

export type Chapter = {
  id: string;
  num: string;
  label: string;
  position: { top: string; left: string };
  direction: Direction;
  callout: {
    title?: string;
    body?: string;
    watchFor?: string;
  };
  position3d?: string;
  normal3d?: string;
};

export type View = {
  id: string;
  label: string;
  cameraOrbit: string;
  cameraTarget: string;
  fieldOfView: string;
  interpolationDecay?: string;
};
