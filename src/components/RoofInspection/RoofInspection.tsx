import React, { useMemo, useState } from "react";
import { CameraContext, RoofInspectionContext } from "./context";
import { Canvas } from "./Canvas";
import { Diagram } from "./Diagram";
import { Hotspot } from "./Hotspot";
import { Rail } from "./Rail";
import { Toolbar } from "./Toolbar";
import type { Chapter, View } from "./types";

type RoofInspectionProps = {
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
 *
 * @remarks
 * Owns all shared interaction state and exposes it to sub-components through
 * `RoofInspectionContext`:
 *
 * | State | Description |
 * |-------|-------------|
 * | `activeChapterId` | Which chapter's callout is open (hover or click) |
 * | `focusChapterId`  | Which chapter last received a deliberate click — drives camera movement only |
 * | `activeViewId`    | Which toolbar preset tab is selected |
 *
 * Wraps children in a `.ri-stage` div whose flex layout is defined in
 * `site-layout.css` (two-column on desktop, stacked on mobile).
 *
 * @example
 * ```tsx
 * <RoofInspection chapters={CHAPTERS} views={VIEWS}>
 *   <RoofInspection.Rail title={<>What I<br/>look for</>} lede="…" />
 *   <RoofInspection.Canvas>
 *     <RoofInspection.Toolbar />
 *     <RoofInspection.Diagram src="/roof.glb">
 *       {CHAPTERS.map(c => <RoofInspection.Hotspot key={c.id} chapter={c} />)}
 *     </RoofInspection.Diagram>
 *   </RoofInspection.Canvas>
 * </RoofInspection>
 * ```
 */
const RoofInspectionRoot: React.FC<RoofInspectionProps> = ({
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

  // Chapter-selection context — changes on every hover/click.
  // Only Hotspot and Rail subscribe to this.
  const chapterValue = useMemo(
    () => ({ chapters, activeChapterId, setActiveChapterId }),
    [chapters, activeChapterId],
  );

  // Camera context — only changes on rail clicks (focusChapterId) or toolbar
  // clicks (activeViewId). Stable reference during hover, so Diagram never
  // re-renders when the user hovers a hotspot dot.
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
        <div className="ri-stage">{children}</div>
      </CameraContext.Provider>
    </RoofInspectionContext.Provider>
  );
};

/**
 * Compound component — sub-components are attached as static properties so
 * consumers import only `RoofInspection` and access parts via dot notation.
 */
export const RoofInspection = Object.assign(RoofInspectionRoot, {
  Rail,
  Canvas,
  Toolbar,
  Diagram,
  Hotspot,
});
