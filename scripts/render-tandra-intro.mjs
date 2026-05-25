import { spawnSync } from "node:child_process";

const projectId = "7irm699i";
const dataset = "production";
const apiVersion = "2024-01-01";

const defaultContent = {
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
    line1: "I inspect.",
    line2: "I document.",
    line3: "I explain.",
    body: "You get the real condition of your roof, what matters now, and what can wait.",
  },
  managed: {
    kicker: "What homeowners need",
    line1: "One steady",
    line2: "point of contact",
    line3: "from first look to final walkthrough.",
    items: [
      "Insurance claim guidance",
      "Scope and paperwork review",
      "Birdcreek Roofing crews",
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
    cta: "Schedule a free consultation",
  },
};

const isRecord = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const stringItems = (value, fallback) =>
  Array.isArray(value)
    ? value.filter((item) => typeof item === "string")
    : fallback;

const mergeContent = (incoming) => {
  if (!isRecord(incoming)) {
    return defaultContent;
  }

  return {
    storm: {
      ...defaultContent.storm,
      ...(isRecord(incoming.storm) ? incoming.storm : {}),
    },
    straightAnswers: {
      ...defaultContent.straightAnswers,
      ...(isRecord(incoming.straightAnswers) ? incoming.straightAnswers : {}),
    },
    inspection: {
      ...defaultContent.inspection,
      ...(isRecord(incoming.inspection) ? incoming.inspection : {}),
    },
    managed: {
      ...defaultContent.managed,
      ...(isRecord(incoming.managed) ? incoming.managed : {}),
      items: stringItems(incoming.managed?.items, defaultContent.managed.items),
    },
    proof: {
      ...defaultContent.proof,
      ...(isRecord(incoming.proof) ? incoming.proof : {}),
      items: stringItems(incoming.proof?.items, defaultContent.proof.items),
    },
    closing: {
      ...defaultContent.closing,
      ...(isRecord(incoming.closing) ? incoming.closing : {}),
    },
  };
};

const fetchContent = async () => {
  const query = encodeURIComponent(`
    *[_id == "tandraIntroVideo"][0]{
      storm,
      straightAnswers,
      inspection,
      managed,
      proof,
      closing
    }
  `);
  const url = `https://${projectId}.apicdn.sanity.io/v${apiVersion}/data/query/${dataset}?query=${query}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(
        `[video] Sanity fetch failed (${response.status}); using default video copy.`,
      );
      return defaultContent;
    }

    const payload = await response.json();
    if (!payload.result) {
      console.warn(
        "[video] No tandraIntroVideo document found; using default video copy.",
      );
    }
    return mergeContent(payload.result);
  } catch (error) {
    console.warn(
      `[video] Sanity fetch failed; using default video copy. ${error}`,
    );
    return defaultContent;
  }
};

const mode = process.argv[2] ?? "render";
const command =
  mode === "studio"
    ? ["studio", "src/remotion/index.ts"]
    : mode === "still"
      ? [
          "still",
          "src/remotion/index.ts",
          "TandraIntro",
          "out/tandra-intro-still.png",
          "--frame=450",
          "--scale=0.5",
        ]
      : [
          "render",
          "src/remotion/index.ts",
          "TandraIntro",
          "out/tandra-intro.mp4",
        ];

const content = await fetchContent();
const result = spawnSync(
  "pnpm",
  ["exec", "remotion", ...command, "--props", JSON.stringify({ content })],
  {
    stdio: "inherit",
  },
);

process.exit(result.status ?? 1);
