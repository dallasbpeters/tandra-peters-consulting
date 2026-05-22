import React, { useState } from "react";
import { RoofInspectionContext } from "./context";
import { Canvas } from "./Canvas";
import { Diagram } from "./Diagram";
import { Hotspot } from "./Hotspot";
import { Rail } from "./Rail";
import { Toolbar } from "./Toolbar";
import type { Chapter, View } from "./types";

type RoofInspectionProps = {
  chapters: Chapter[];
  views: View[];
  /** The view tab that is selected on first render. Defaults to the first view. */
  defaultViewId?: string;
  children: React.ReactNode;
};

/**
 * Root component. Owns all interaction state and provides it to every
 * sub-component via context.
 *
 * ```tsx
 * <RoofInspection chapters={CHAPTERS} views={VIEWS}>
 *   <RoofInspection.Rail title={…} lede={…} />
 *   <RoofInspection.Canvas>
 *     <RoofInspection.Toolbar />
 *     <RoofInspection.Diagram src="/roof-sidecut.svg">
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
  const [activeViewId, setActiveViewId] = useState<string>(
    defaultViewId ?? views[0]?.id ?? "",
  );

  return (
    <RoofInspectionContext.Provider
      value={{
        chapters,
        views,
        activeChapterId,
        setActiveChapterId,
        activeViewId,
        setActiveViewId,
      }}
    >
      <div className="ri-stage">{children}</div>
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
