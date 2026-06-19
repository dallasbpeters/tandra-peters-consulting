export interface TandraIntroContent {
  closing: {
    kicker: string;
    line1: string;
    line2: string;
    cta: string;
  };
  inspection: {
    kicker: string;
    line1: string;
    line2: string;
    line3: string;
    body: string;
  };
  managed: {
    kicker: string;
    line1: string;
    line2: string;
    line3: string;
    items: string[];
  };
  proof: {
    kicker: string;
    line1: string;
    line2: string;
    items: string[];
  };
  storm: {
    kicker: string;
    line1: string;
    line2: string;
    body: string;
  };
  straightAnswers: {
    kicker: string;
    line1: string;
    line2: string;
    line3: string;
    quote: string;
  };
}

export interface TandraIntroProps extends Record<string, unknown> {
  content: TandraIntroContent;
  showCaptions?: boolean;
}

export const defaultTandraIntroContent: TandraIntroContent = {
  storm: {
    kicker: "Austin homeowners",
    line1: "Texas roofs",
    line2: "take a beating.",
    body: "Hail, heat, wind, and insurance paperwork can turn one bad storm into weeks of second-guessing.",
  },
  straightAnswers: {
    kicker: "Why Tandra?",
    line1: "Straight",
    line2: "answers.",
    line3: "No pressure.",
    quote: "If your roof just needs a repair, I'll tell you that.",
  },
  inspection: {
    kicker: "On your roof",
    line1: "Inspect.",
    line2: "Document.",
    line3: "Explain.",
    body: "You get the real condition of your roof, what matters now, and what can wait.",
  },
  managed: {
    kicker: "What homeowners need",
    line1: "EXPERIENCE AND PROFESSIONALISM",
    line2: "HIGH-QUALITY MATERIALS",
    line3: "Exceptional Customer Service",
    items: [
      "Claim guidance",
      "Paperwork review",
      "Birdcreek crews",
      "Final walkthrough",
    ],
  },
  proof: {
    kicker: "Built for Austin-area homeowners",
    line1: "Local roof know-how.",
    line2: "Backed by Birdcreek.",
    items: ["Roof assessments", "Insurance help", "Project oversight"],
  },
  closing: {
    kicker: "Tandra Peters · Austin roofing consultant",
    line1: "Your roof,",
    line2: "handled right.",
    cta: "Call or text 512-968-3965",
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const stringItems = (value: unknown, fallback: string[]): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : fallback;

const mergeScene = <T extends Record<string, unknown>>(
  fallback: T,
  incoming: unknown
): T => (isRecord(incoming) ? ({ ...fallback, ...incoming } as T) : fallback);

export const mergeTandraIntroContent = (
  incoming: unknown
): TandraIntroContent => {
  if (!isRecord(incoming)) {
    return defaultTandraIntroContent;
  }

  const managed = mergeScene(
    defaultTandraIntroContent.managed,
    incoming.managed
  );
  const proof = mergeScene(defaultTandraIntroContent.proof, incoming.proof);

  return {
    storm: mergeScene(defaultTandraIntroContent.storm, incoming.storm),
    straightAnswers: mergeScene(
      defaultTandraIntroContent.straightAnswers,
      incoming.straightAnswers
    ),
    inspection: mergeScene(
      defaultTandraIntroContent.inspection,
      incoming.inspection
    ),
    managed: {
      ...managed,
      items: stringItems(
        isRecord(incoming.managed) ? incoming.managed.items : undefined,
        defaultTandraIntroContent.managed.items
      ),
    },
    proof: {
      ...proof,
      items: stringItems(
        isRecord(incoming.proof) ? incoming.proof.items : undefined,
        defaultTandraIntroContent.proof.items
      ),
    },
    closing: mergeScene(defaultTandraIntroContent.closing, incoming.closing),
  };
};

export const TANDRA_INTRO_FPS = 30;
export const TANDRA_INTRO_DURATION_IN_FRAMES = 900;

/**
 * Single source of truth for caption timing. These windows mirror the visual
 * `useScene(from, duration)` calls in TandraIntro.tsx. Scenes overlap by ~30
 * frames during the cross-fade; caption windows below stop a few frames before
 * the next scene's text reads so only one caption is on screen at a time.
 *
 * Both the in-composition <Captions> layer AND the sidecar WebVTT track derive
 * from `getCaptionCues()` so on-screen text, burned-in captions, and the VTT
 * can never drift apart. Edits to the copy flow into all three automatically.
 */
const SCENE_CAPTION_WINDOWS = [
  { scene: "storm", from: 6, to: 150 },
  { scene: "straightAnswers", from: 156, to: 300 },
  { scene: "inspection", from: 306, to: 450 },
  { scene: "managed", from: 456, to: 630 },
  { scene: "proof", from: 636, to: 750 },
  { scene: "closing", from: 756, to: 898 },
] as const;

export interface CaptionCue {
  /** Inclusive start frame. */
  fromFrame: number;
  /** Readable caption text (already collapsed to a single string). */
  text: string;
  /** Exclusive end frame. */
  toFrame: number;
}

const collapse = (value: string): string => value.replace(/\s+/g, " ").trim();

const sceneCaptionText = (c: TandraIntroContent, scene: string): string => {
  switch (scene) {
    case "storm":
      return collapse(`${c.storm.line1} ${c.storm.line2} — ${c.storm.body}`);
    case "straightAnswers":
      return collapse(
        `${c.straightAnswers.line1} ${c.straightAnswers.line2} ${c.straightAnswers.line3} “${c.straightAnswers.quote}”`
      );
    case "inspection":
      return collapse(
        `${c.inspection.line1} ${c.inspection.line2} ${c.inspection.line3} — ${c.inspection.body}`
      );
    case "managed":
      return collapse(
        `${c.managed.line1} ${c.managed.line2} ${c.managed.line3}: ${c.managed.items.join(", ")}`
      );
    case "proof":
      return collapse(
        `${c.proof.line1} ${c.proof.line2} ${c.proof.items.join(", ")}`
      );
    case "closing":
      return collapse(
        `${c.closing.line1} ${c.closing.line2} — ${c.closing.cta}`
      );
    default:
      return "";
  }
};

/** Ordered, non-overlapping caption cues derived from the live content. */
export const getCaptionCues = (c: TandraIntroContent): CaptionCue[] =>
  SCENE_CAPTION_WINDOWS.map(({ scene, from, to }) => ({
    fromFrame: from,
    toFrame: to,
    text: sceneCaptionText(c, scene),
  })).filter((cue) => cue.text.length > 0);

export const captionAtTime = (
  cues: CaptionCue[],
  timeSeconds: number,
  fps = TANDRA_INTRO_FPS
): string => {
  const frame = Math.floor(timeSeconds * fps);
  return captionAtFrame(cues, frame);
};

/** Caption text active at a given frame, or "" when none. */
export const captionAtFrame = (cues: CaptionCue[], frame: number): string => {
  const active = cues.find(
    (cue) => frame >= cue.fromFrame && frame < cue.toFrame
  );
  return active ? active.text : "";
};

/** Frame → "MM:SS.mmm" timestamp for WebVTT. */
const vttTime = (frame: number, fps = TANDRA_INTRO_FPS): string => {
  const totalMs = Math.round((frame / fps) * 1000);
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const sec = totalSec % 60;
  const min = Math.floor(totalSec / 60);
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
};

/**
 * Build a WebVTT string from live Sanity intro-video content. Derives from the
 * same `getCaptionCues()` source as the on-screen captions, so the sidecar
 * track can never drift from what the video shows (30fps, 900 total frames).
 */
export const generateVttFromContent = (c: TandraIntroContent): string => {
  const cues = getCaptionCues(c)
    .map(
      (cue, i) =>
        `${i + 1}\n${vttTime(cue.fromFrame)} --> ${vttTime(cue.toFrame)}\n${cue.text}`
    )
    .join("\n\n");

  return `WEBVTT\n\n${cues}\n`;
};
