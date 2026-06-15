/**
 * Sanity copy for TandraIntro renders.
 * Kept under api/ so the Vercel function bundle does not import from src/.
 */
import { hashTandraIntroContent } from "./tandra-intro-content-hash.js";

const SANITY_PROJECT_ID = "7irm699i";
const SANITY_DATASET = "production";
const SANITY_API_VERSION = "2026-05-29";

const INTRO_QUERY = `{
  "home": *[_id in ["homePage", "drafts.homePage"] && defined(tandraIntroVideo)] | order(_updatedAt desc)[0]{
    _id,
    "intro": tandraIntroVideo{
      showCaptions,
      storm,
      straightAnswers,
      inspection,
      managed,
      proof,
      closing,
      renderContentHash,
      renderArtifactHash,
      renderedVideoUrl,
      "thumbnailUrl": thumbnail.asset->url
    }
  }
}`;

export type TandraIntroContent = {
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
  closing: {
    kicker: string;
    line1: string;
    line2: string;
    cta: string;
  };
};

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
    items: ["Claim guidance", "Paperwork review", "Birdcreek crews", "Final walkthrough"],
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

const mergeScene = <T extends Record<string, unknown>>(fallback: T, incoming: unknown): T =>
  isRecord(incoming) ? ({ ...fallback, ...incoming } as T) : fallback;

export const mergeTandraIntroContent = (incoming: unknown): TandraIntroContent => {
  if (!isRecord(incoming)) {
    return defaultTandraIntroContent;
  }

  const managed = mergeScene(defaultTandraIntroContent.managed, incoming.managed);
  const proof = mergeScene(defaultTandraIntroContent.proof, incoming.proof);

  return {
    storm: mergeScene(defaultTandraIntroContent.storm, incoming.storm),
    straightAnswers: mergeScene(
      defaultTandraIntroContent.straightAnswers,
      incoming.straightAnswers,
    ),
    inspection: mergeScene(defaultTandraIntroContent.inspection, incoming.inspection),
    managed: {
      ...managed,
      items: stringItems(
        isRecord(incoming.managed) ? incoming.managed.items : undefined,
        defaultTandraIntroContent.managed.items,
      ),
    },
    proof: {
      ...proof,
      items: stringItems(
        isRecord(incoming.proof) ? incoming.proof.items : undefined,
        defaultTandraIntroContent.proof.items,
      ),
    },
    closing: mergeScene(defaultTandraIntroContent.closing, incoming.closing),
  };
};

export type FetchTandraIntroResult = {
  showCaptions: boolean;
  content: TandraIntroContent;
  contentHash: string;
  renderContentHash?: string;
  renderArtifactHash?: string;
  renderedVideoUrl?: string;
  thumbnailUrl?: string;
  source: "sanity-draft-or-published" | "sanity-published" | "fallback";
  documentId?: string;
};

const readSanityToken = (): string | undefined =>
  process.env.SANITY_API_READ_TOKEN?.trim() ||
  process.env.VITE_SANITY_API_READ_TOKEN?.trim() ||
  undefined;

export const fetchTandraIntroContent = async (): Promise<FetchTandraIntroResult> => {
  const token = readSanityToken();
  const host = token
    ? `https://${SANITY_PROJECT_ID}.api.sanity.io`
    : `https://${SANITY_PROJECT_ID}.apicdn.sanity.io`;
  const url = `${host}/v${SANITY_API_VERSION}/data/query/${SANITY_DATASET}?query=${encodeURIComponent(INTRO_QUERY)}`;

  try {
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!response.ok) {
      console.warn(
        `[render-tandra-intro] Sanity fetch failed (${response.status}); using default video copy.`,
      );
      return {
        showCaptions: false,
        content: defaultTandraIntroContent,
        contentHash: hashTandraIntroContent(defaultTandraIntroContent),
        source: "fallback",
      };
    }

    const payload = (await response.json()) as {
      result?: {
        home?: {
          _id?: string;
          intro?: Record<string, unknown> | null;
        } | null;
      } | null;
    };

    const result = payload.result?.home?.intro;

    if (!result) {
      console.warn(
        "[render-tandra-intro] No homepage tandraIntroVideo content; using default video copy.",
      );
      return {
        showCaptions: false,
        content: defaultTandraIntroContent,
        contentHash: hashTandraIntroContent(defaultTandraIntroContent),
        source: "fallback",
      };
    }

    const documentId =
      typeof payload.result?.home?._id === "string" ? payload.result.home._id : undefined;

    const content = mergeTandraIntroContent(result);
    const renderContentHash =
      typeof result.renderContentHash === "string" ? result.renderContentHash : undefined;
    const renderArtifactHash =
      typeof result.renderArtifactHash === "string" ? result.renderArtifactHash : undefined;
    const renderedVideoUrl =
      typeof result.renderedVideoUrl === "string" && result.renderedVideoUrl.trim()
        ? result.renderedVideoUrl.trim()
        : undefined;
    const thumbnailUrl =
      typeof result.thumbnailUrl === "string" && result.thumbnailUrl.trim()
        ? result.thumbnailUrl.trim()
        : undefined;

    return {
      showCaptions: typeof result.showCaptions === "boolean" ? result.showCaptions : false,
      content,
      contentHash: hashTandraIntroContent(content),
      renderContentHash,
      renderArtifactHash,
      renderedVideoUrl,
      thumbnailUrl,
      source: token ? "sanity-draft-or-published" : "sanity-published",
      documentId,
    };
  } catch (error) {
    console.warn(`[render-tandra-intro] Sanity fetch failed; using default video copy. ${error}`);
    return {
      showCaptions: false,
      content: defaultTandraIntroContent,
      contentHash: hashTandraIntroContent(defaultTandraIntroContent),
      source: "fallback",
    };
  }
};
