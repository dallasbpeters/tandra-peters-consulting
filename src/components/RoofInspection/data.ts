import type { Chapter, View } from "./types";

/**
 * The seven points Tandra checks on every residential roof inspection.
 * Positions are percentages over the `roof-sidecut.svg` diagram, cropped
 * to `object-position: 30% 30%` inside a 16:9 container.
 */
export const CHAPTERS: Chapter[] = [
  {
    id: "1",
    num: "i",
    label: "Ridge & ridge vent",
    position: { top: "14%", left: "25%" },
    direction: "right",
    callout: {
      title: "Ridge cap & vent",
      body: "The peak. Caps are heavier than field shingles — wind hits hardest here and the ridge is the last line of defence. The slot underneath is the ridge vent: that's how your attic breathes out in summer.",
      watchFor:
        "Lifted or buckling caps after a windstorm. A vent that was painted shut during the last re-roof.",
    },
  },
  {
    id: "2",
    num: "ii",
    label: "Field shingles",
    position: { top: "28%", left: "52%" },
    direction: "top",
    callout: {
      title: "Field shingles",
      body: "The main course. Most Texas roofs are architectural asphalt — heavier than three-tab, rated 110+ mph when nailed correctly. What you're looking at is the granular surface that takes the UV hit every summer.",
      watchFor:
        "Bare patches where granules washed into the gutters. Sun age, not always storm damage.",
    },
  },
  {
    id: "3",
    num: "iii",
    label: "Underlayment",
    position: { top: "38%", left: "70%" },
    direction: "right",
    callout: {
      title: "Underlayment",
      body: "The layer between shingles and decking — only visible at the cut face or during a tear-off. Synthetic beats old #15 felt: tougher, lighter, won't shred if wind catches it mid-install.",
      watchFor:
        "Whether your installer is using the manufacturer's matched underlayment system. Mix brands and the warranty thins fast.",
    },
  },
  {
    id: "4",
    num: "iv",
    label: "Decking",
    position: { top: "55%", left: "60%" },
    direction: "left",
    callout: {
      title: "Decking",
      body: "Plywood or OSB nailed to the rafters. You only see it during a tear-off — and that's the moment to check for soft boards. A soft board telegraphs right through the new roof within a year.",
      watchFor:
        "A contract that includes decking replacement at cost per sheet, not a vague \"as needed\" line that turns into a surprise.",
    },
  },
  {
    id: "5",
    num: "v",
    label: "Step flashing",
    position: { top: "22%", left: "12%" },
    direction: "right",
    callout: {
      title: "Step flashing",
      body: "Bent metal pieces tucked under each shingle course where the slope meets a vertical wall. Half the leaks I see start here — because someone saved twenty minutes during install.",
      watchFor:
        "One continuous L-strip pretending to be step flashing. That's a leak waiting for the first hard sideways rain.",
    },
  },
  {
    id: "6",
    num: "vi",
    label: "Drip edge",
    position: { top: "72%", left: "78%" },
    direction: "top",
    callout: {
      title: "Drip edge",
      body: "The L-shaped metal that runs along the eave and rakes, kicking water away from the fascia into the gutter. Code in Texas. Skipped on more cheap re-roofs than I'd like to count.",
      watchFor:
        "Stain lines on the fascia board below — water's been running where it shouldn't.",
    },
  },
  {
    id: "7",
    num: "vii",
    label: "Soffit & fascia",
    position: { top: "82%", left: "88%" },
    direction: "left",
    callout: {
      title: "Soffit & fascia",
      body: "The boards you see from the driveway — fascia in front, soffit underneath. Soffit vents are how cool air enters the attic; without them the ridge vent has nothing to pull through.",
      watchFor:
        "Painted-over soffit vents, wasp nests at the corners, or wood that gives under a fingernail.",
    },
  },
];

/**
 * Camera positions for the interactive 3D roof model.
 *
 * model-viewer camera-orbit format: "{azimuthal}deg {polar}deg {radius}"
 *   azimuthal = rotation around vertical Y-axis  (0 = front)
 *   polar     = angle from top                   (0 = directly above, 90 = side-on)
 *   radius    = distance from target             ("auto" fits the whole model)
 *
 * Tweak these values once the model is loaded in the browser — the toolbar
 * transitions are animated so test by clicking tabs, not refreshing.
 */
export const VIEWS: View[] = [
  {
    id: "cutaway",
    label: "Cutaway view",
    cameraOrbit: "0deg 65deg auto",
    cameraTarget: "0m 0m 0m",
    fieldOfView: "auto",
  },
  {
    id: "eave",
    label: "At the eave",
    cameraOrbit: "-10deg 88deg 55%",
    cameraTarget: "0m -0.4m 0m",
    fieldOfView: "22deg",
  },
  {
    id: "penetration",
    label: "At a penetration",
    cameraOrbit: "160deg 45deg 50%",
    cameraTarget: "0m 0.4m 0m",
    fieldOfView: "20deg",
  },
];
