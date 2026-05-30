import React, { useMemo, useState } from "react";
import { CameraContext, RoofInspectionContext } from "./context";
import type { Chapter, View } from "./types";

export type RoofInspectionProps = {
  /** Inspection checkpoint data, typically `CHAPTERS` from `data.ts` or mapped from Sanity. */
  chapters: Chapter[];
  /** Camera presets for the toolbar tabs, typically `VIEWS` from `data.ts`. */
  views: View[];
  /** ID of the view selected on first render. Defaults to `views[0].id`. */
  defaultViewId?: string;
  /**
   * Compound sub-components: `Rail`, `Canvas`, `Toolbar`, `Diagram`, `Hotspot`.
   * Consumed through dot notation: `<RoofInspection.Rail />`.
   */
  children: React.ReactNode;
};

/**
 * Root component of the compound `RoofInspection` feature.
 */
export const RoofInspectionRoot: React.FC<RoofInspectionProps> = ({
  chapters,
  views,
  defaultViewId,
  children,
}) => {
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [focusChapterId, setFocusChapterId] = useState<string | null>(null);
  const [activeViewId, setActiveViewId] = useState<string>(
    defaultViewId ?? views[0]?.id ?? "",
  );

  const chapterValue = useMemo(
    () => ({ chapters, activeChapterId, setActiveChapterId }),
    [chapters, activeChapterId],
  );

  const cameraValue = useMemo(
    () => ({
      chapters,
      views,
      activeViewId,
      setActiveViewId,
      focusChapterId,
      setFocusChapterId,
    }),
    [chapters, views, activeViewId, focusChapterId],
  );

  return (
    <RoofInspectionContext.Provider value={chapterValue}>
      <CameraContext.Provider value={cameraValue}>
        <div className="stage content-section content-section--padded">
          {children}
        </div>
      </CameraContext.Provider>
    </RoofInspectionContext.Provider>
  );
};
