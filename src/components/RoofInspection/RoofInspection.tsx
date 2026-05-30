import { Canvas } from "./Canvas";
import { Diagram } from "./Diagram";
import { Hotspot } from "./Hotspot";
import { Rail } from "./Rail";
import { RoofInspectionRoot } from "./RoofInspectionRoot";
import { Toolbar } from "./Toolbar";

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
