import { Canvas } from "./canvas";
import { Diagram } from "./diagram";
import { Hotspot } from "./hotspot";
import { Rail } from "./rail";
import { RoofInspectionRoot } from "./roof-inspection-root";
import { Toolbar } from "./toolbar";

/**
 * Compound component — sub-components are attached as static properties so
 * consumers import only `RoofInspection` and access parts via dot notation.
 */
export const RoofInspection = Object.assign(RoofInspectionRoot, {
  Canvas,
  Diagram,
  Hotspot,
  Rail,
  Toolbar,
});
