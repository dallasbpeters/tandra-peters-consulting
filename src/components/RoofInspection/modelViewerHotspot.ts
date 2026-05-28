/** model-viewer registers hotspot slots once; imperative update moves them live. */
export type ModelViewerWithHotspots = HTMLElement & {
  updateHotspot?: (config: {
    name: string;
    position?: string;
    normal?: string;
    surface?: string;
  }) => void;
};

export const getModelViewer = (): ModelViewerWithHotspots | null =>
  document.getElementById("mv") as ModelViewerWithHotspots | null;

export const syncModelViewerHotspot = (
  slotName: string,
  position3d: string,
  normal3d?: string,
): void => {
  const mv = getModelViewer();
  if (!mv?.updateHotspot) {
    return;
  }

  mv.updateHotspot({
    name: slotName,
    position: position3d,
    ...(normal3d ? { normal: normal3d } : {}),
  });
};
