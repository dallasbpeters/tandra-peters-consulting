import type { Chapter, View } from "./types";

export const CHAPTERS: Chapter[] = [
  {
    callout: {
      body: "The peak. Caps are heavier than field shingles — wind hits hardest here and the ridge is the last line of defence. The slot underneath is the ridge vent: that's how your attic breathes out in summer.",
      title: "Ridge cap & vent",
      watchFor:
        "Lifted or buckling caps after a windstorm. A vent that was painted shut during the last re-roof.",
    },
    direction: "right",
    id: "1",
    label: "Ridge & ridge vent",
    num: "1.",
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
    id: "2",
    label: "Field shingles",
    num: "2.",
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
    id: "3",
    label: "Underlayment",
    num: "3.",
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
    id: "4",
    label: "Decking",
    num: "4.",
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
    id: "5",
    label: "Step flashing",
    num: "5.",
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
    id: "6",
    label: "Drip edge",
    num: "6.",
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
    id: "7",
    label: "Soffit & fascia",
    normal3d: "-1m -2.44547375624058e-27m 1.1102230246251565e-16m",
    num: "7.",
    position: { left: "88%", top: "82%" },
    position3d: "-1.1556999860331416m 3.789993817368646m -1.7539746932512665m",
  },
];

export const VIEWS: View[] = [
  {
    cameraOrbit: "-115deg 45deg auto",
    cameraTarget: "auto",
    fieldOfView: "auto",
    id: "cutaway",
    label: "Cutaway view",
  },
  {
    cameraOrbit: "0deg 45deg 80deg",
    cameraTarget: "auto auto auto",
    fieldOfView: "86.88deg",
    id: "eave",
    label: "At the eave",
  },
  {
    cameraOrbit: "0deg 10deg 55%",
    cameraTarget: ".7m auto .1m",
    fieldOfView: "0deg",
    id: "penetration",
    interpolationDecay: "0.5",
    label: "At a penetration",
  },
];
