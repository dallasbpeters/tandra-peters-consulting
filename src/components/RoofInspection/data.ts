import type { Chapter, View } from "./types";

/**
 * The seven inspection checkpoints Tandra covers on every residential roof.
 *
 * @remarks
 * **3D positioning** — `position3d` and `normal3d` values were hand-placed in
 * the model-viewer inspector by clicking "Add Hotspot" on `roof.glb`, then
 * copied into Sanity and fetched at runtime via GROQ. Only chapter 7
 * (Soffit & fascia) currently has hard-coded fallback values here; the rest
 * are populated exclusively from Sanity.
 *
 * **`focusOrbit`** — Each chapter includes a tailored `camera-orbit` string so
 * clicking its rail button rotates to a view that makes the component easy to
 * identify. Format: `"{azimuthal}deg {polar}deg {radius}"`.
 *   - azimuthal (0°–360°): rotation around the vertical Y-axis, 0 = front
 *   - polar (0°–90°): elevation from above; 0 = bird's-eye, 90 = side-on
 *   - radius: distance from target; `"auto"` fits the visible model bounds
 *
 * **`position`** — Legacy percentage coords for the retired 2D SVG overlay.
 * Kept to avoid a Sanity schema breaking change, but never rendered.
 */
export const CHAPTERS: Chapter[] = [
  {
    callout: {
      body: "The peak. Caps are heavier than field shingles — wind hits hardest here and the ridge is the last line of defence. The slot underneath is the ridge vent: that's how your attic breathes out in summer.",
      title: "Ridge cap & vent",
      watchFor:
        "Lifted or buckling caps after a windstorm. A vent that was painted shut during the last re-roof.",
    },

    direction: "right",
    // Normal mostly UP → camera elevated, looking down at the ridge peak
    focusOrbit: "-155deg 42deg auto",
    id: "1",
    label: "Ridge & ridge vent",
    num: "i",
    position: { left: "25%", top: "14%" },
  },
  {
    callout: {
      body: "The main course. Most Texas roofs are architectural asphalt — heavier than three-tab, rated 110+ mph when nailed correctly. What you're looking at is the granular surface that takes the UV hit every summer.",
      title: "Field shingles",
      watchFor:
        "Bare patches where granules washed into the gutters. Sun age, not always storm damage.",
    },

    direction: "top",
    // Normal mostly UP → front-quarter view from slightly above
    focusOrbit: "-155deg 55deg auto",
    id: "2",
    label: "Field shingles",
    num: "ii",
    position: { left: "52%", top: "28%" },
  },
  {
    callout: {
      body: "The layer between shingles and decking — only visible at the cut face or during a tear-off. Synthetic beats old #15 felt: tougher, lighter, won't shred if wind catches it mid-install.",
      title: "Underlayment",
      watchFor:
        "Whether your installer is using the manufacturer's matched underlayment system. Mix brands and the warranty thins fast.",
    },

    direction: "right",
    // Normal -Z (faces the cut face outward) → camera from the front/right looking in
    focusOrbit: "-200deg 62deg auto",
    id: "3",
    label: "Underlayment",
    num: "iii",
    position: { left: "70%", top: "38%" },
  },
  {
    callout: {
      body: "Plywood or OSB nailed to the rafters. You only see it during a tear-off — and that's the moment to check for soft boards. A soft board telegraphs right through the new roof within a year.",
      title: "Decking",
      watchFor:
        'A contract that includes decking replacement at cost per sheet, not a vague "as needed" line that turns into a surprise.',
    },

    direction: "left",
    // Normal UP-left → camera from front-left, looking down at the deck layer
    focusOrbit: "-200deg 60deg auto",
    id: "4",
    label: "Decking",
    num: "iv",
    position: { left: "60%", top: "55%" },
  },
  {
    callout: {
      body: "Bent metal pieces tucked under each shingle course where the slope meets a vertical wall. Half the leaks I see start here — because someone saved twenty minutes during install.",
      title: "Step flashing",
      watchFor:
        "One continuous L-strip pretending to be step flashing. That's a leak waiting for the first hard sideways rain.",
    },

    direction: "right",
    // Normal UP-left → camera from the far-right side showing the wall junction
    focusOrbit: "-40deg 58deg auto",
    id: "5",
    label: "Step flashing",
    num: "v",
    position: { left: "12%", top: "22%" },
  },
  {
    callout: {
      body: "The L-shaped metal that runs along the eave and rakes, kicking water away from the fascia into the gutter. Code in Texas. Skipped on more cheap re-roofs than I'd like to count.",
      title: "Drip edge",
      watchFor:
        "Stain lines on the fascia board below — water's been running where it shouldn't.",
    },

    direction: "top",
    // Normal -X (faces left/outward from eave) → camera from the right side looking at the eave
    focusOrbit: "80deg 82deg auto",
    id: "6",
    label: "Drip edge",
    num: "vi",
    position: { left: "78%", top: "72%" },
  },
  {
    callout: {
      body: "The boards you see from the driveway — fascia in front, soffit underneath. Soffit vents are how cool air enters the attic; without them the ridge vent has nothing to pull through.",
      title: "Soffit & fascia",
      watchFor:
        "Painted-over soffit vents, wasp nests at the corners, or wood that gives under a fingernail.",
    },
    direction: "left",
    // Normal exactly -X → camera from the right side, nearly horizontal
    focusOrbit: "90deg 88deg auto",
    id: "7",
    label: "Soffit & fascia",
    normal3d: "-1m 0m 0m",

    num: "vii",
    position: { left: "88%", top: "82%" },
    position3d: "2.786666m 3.137488m -4.41213m",
  },
];

/**
 * Camera presets for the `Toolbar` tab strip.
 *
 * @remarks
 * All values are forwarded verbatim to `<model-viewer>` attributes via the
 * imperative `useEffect` in `Diagram.tsx`. Transitions between presets are
 * smoothly animated by model-viewer's built-in interpolation.
 *
 * **Tuning tip** — Open the app in a browser, open DevTools Console, then run:
 * ```js
 * document.querySelector('model-viewer').getCameraOrbit()
 * ```
 * to read the current orbit after manually dragging the model into position.
 * Copy those values back here and into Sanity.
 *
 * `model-viewer` orbit format: `"{azimuthal}deg {polar}deg {radius}"`
 * - azimuthal: 0° = front, increases counter-clockwise when viewed from above
 * - polar: 0° = directly above, 90° = side-on
 * - radius: metres, percentage of bounding-sphere diameter, or `"auto"`
 */
export const VIEWS: View[] = [
  {
    // Front-quarter view, slightly elevated — shows the full roof cross-section
    cameraOrbit: "-115deg 40deg 5.9m",
    cameraTarget: "auto",
    fieldOfView: "auto",

    id: "cutaway",
    label: "Cutaway view",
  },
  {
    // Low angle looking along the eave edge — drip edge, soffit, fascia in frame
    cameraOrbit: "0deg 45deg 80deg",
    cameraTarget: "auto auto auto",
    fieldOfView: "86.88deg",

    id: "eave",
    label: "At the eave",
  },
  {
    // Close field pipe boot on the upper field — target/orbit tuned for the
    // re-exported roof.glb (world origin shifted ~+3.94m X, -0.65m Y, -2.66m Z
    // vs the original SimLab export). Previous target was `.7m auto .1m`.
    cameraOrbit: "0deg 10deg 55%",
    cameraTarget: "4.82m 3.89m -2.89m",
    fieldOfView: "auto",

    id: "penetration",
    label: "At a penetration",
  },
];
