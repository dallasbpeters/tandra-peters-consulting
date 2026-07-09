import type { WhiteboardVideoProps } from "./whiteboard-schema";

/**
 * Default props for the WhiteboardVideo composition — a roofing explainer
 * that demonstrates the full scene palette.
 *
 * Shared between:
 *  - `root.tsx` (Remotion bundle `<Composition defaultProps>`)
 *  - `registry.tsx` (in-browser preview + Studio picker)
 */
export const WHITEBOARD_DEFAULTS: WhiteboardVideoProps = {
  accentColor: "#1D4ED8",
  backgroundColor: "#FAFAF7",
  handVideoSrc: "/whiteboard/hand-marker.webm",
  inkColor: "#1C1C1C",
  scenes: [
    {
      type: "title",
      durationInFrames: 120,
      eyebrow: "Austin Area Homeowners",
      headline: "Is your roof\nstorm damaged?",
      subtitle: "Let me help you find out — for free.",
    },
    {
      type: "bullets",
      durationInFrames: 240,
      heading: "What I do for you",
      bullets: [
        "Free roof inspection + photo report",
        "Insurance claim guidance",
        "Oversee repairs with Birdcreek crews",
      ],
      useCheckboxes: true,
    },
    {
      type: "callout",
      durationInFrames: 150,
      label: "The Reality",
      stat: "1 in 3",
      body: "Austin roofs have undocumented hail damage right now.",
      emphasis: "Yours could be one of them.",
    },
    {
      type: "diagram",
      durationInFrames: 240,
      heading: "How it works",
      steps: [
        { label: "Inspect", detail: "Free roof assessment" },
        { label: "Document", detail: "Photos + written report" },
        { label: "Navigate", detail: "Insurance + repairs handled" },
      ],
    },
    {
      type: "cta",
      durationInFrames: 150,
      headline: "Get a free\ninspection today.",
      action: "Call or text: 512-968-3965",
      byline: "Tandra Peters · Birdcreek Roofing",
      badge: "No cost · No pressure",
    },
  ],
  showHand: true,
};

/** Total duration in frames at 30fps. */
export const WHITEBOARD_DURATION_IN_FRAMES = WHITEBOARD_DEFAULTS.scenes.reduce(
  (acc, s) => acc + s.durationInFrames,
  0
);

export const WHITEBOARD_FPS = 30;
