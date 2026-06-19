import type { Chapter, View } from "./types";

export const CHAPTERS: Chapter[] = [
  {
    id: "1",
    num: "1.",
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
    num: "2.",
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
    num: "3.",
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
    num: "4.",
    label: "Decking",
    position: { top: "55%", left: "60%" },
    direction: "left",
    callout: {
      title: "Decking",
      body: "Plywood or OSB nailed to the rafters. You only see it during a tear-off — and that's the moment to check for soft boards. A soft board telegraphs right through the new roof within a year.",
      watchFor:
        'A contract that includes decking replacement at cost per sheet, not a vague "as needed" line that turns into a surprise.',
    },
  },
  {
    id: "5",
    num: "5.",
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
    num: "6.",
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
    num: "7.",
    label: "Soffit & fascia",
    position: { top: "82%", left: "88%" },
    direction: "left",
    callout: {
      title: "Soffit & fascia",
      body: "The boards you see from the driveway — fascia in front, soffit underneath. Soffit vents are how cool air enters the attic; without them the ridge vent has nothing to pull through.",
      watchFor:
        "Painted-over soffit vents, wasp nests at the corners, or wood that gives under a fingernail.",
    },
    position3d: "-1.1556999860331416m 3.789993817368646m -1.7539746932512665m",
    normal3d: "-1m -2.44547375624058e-27m 1.1102230246251565e-16m",
  },
];

export const VIEWS: View[] = [
  {
    id: "cutaway",
    label: "Cutaway view",
    cameraOrbit: "-115deg 45deg auto",
    cameraTarget: "auto",
    fieldOfView: "auto",
  },
  {
    id: "eave",
    label: "At the eave",
    cameraOrbit: "0deg 45deg 80deg",
    cameraTarget: "auto auto auto",
    fieldOfView: "86.88deg",
  },
  {
    id: "penetration",
    label: "At a penetration",
    cameraOrbit: "0deg 10deg 55%",
    cameraTarget: ".7m auto .1m",
    fieldOfView: "0deg",
    interpolationDecay: "0.5",
  },
];
