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

export const defaultTandraIntroContent: TandraIntroContent = {
  closing: {
    cta: "Call or text 512-968-3965",
    kicker: "Tandra Peters · Austin roofing consultant",
    line1: "Your roof,",
    line2: "handled right.",
  },
  inspection: {
    body: "You get the real condition of your roof, what matters now, and what can wait.",
    kicker: "On your roof",
    line1: "Inspect.",
    line2: "Document.",
    line3: "Explain.",
  },
  managed: {
    items: [
      "Claim guidance",
      "Paperwork review",
      "Birdcreek crews",
      "Final walkthrough",
    ],
    kicker: "What homeowners need",
    line1: "EXPERIENCE AND PROFESSIONALISM",
    line2: "HIGH-QUALITY MATERIALS",
    line3: "Exceptional Customer Service",
  },
  proof: {
    items: ["Roof assessments", "Insurance help", "Project oversight"],
    kicker: "Built for Austin-area homeowners",
    line1: "Local roof know-how.",
    line2: "Backed by Birdcreek.",
  },
  storm: {
    body: "Hail, heat, wind, and insurance paperwork can turn one bad storm into weeks of second-guessing.",
    kicker: "Austin homeowners",
    line1: "Texas roofs",
    line2: "take a beating.",
  },
  straightAnswers: {
    kicker: "Why Tandra?",
    line1: "Straight",
    line2: "answers.",
    line3: "No pressure.",
    quote: "If your roof just needs a repair, I'll tell you that.",
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
    closing: mergeScene(defaultTandraIntroContent.closing, incoming.closing),
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
    storm: mergeScene(defaultTandraIntroContent.storm, incoming.storm),
    straightAnswers: mergeScene(
      defaultTandraIntroContent.straightAnswers,
      incoming.straightAnswers
    ),
  };
};

export interface FetchTandraIntroResult {
  content: TandraIntroContent;
  contentHash: string;
  documentId?: string;
  renderArtifactHash?: string;
  renderContentHash?: string;
  renderedVideoUrl?: string;
  showCaptions: boolean;
  source: "sanity-draft-or-published" | "sanity-published" | "fallback";
  thumbnailUrl?: string;
}

const readSanityToken = (): string | undefined =>
  process.env.SANITY_API_READ_TOKEN?.trim() ||
  process.env.VITE_SANITY_API_READ_TOKEN?.trim() ||
  undefined;

export const fetchTandraIntroContent =
  async (): Promise<FetchTandraIntroResult> => {
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
          `[render-tandra-intro] Sanity fetch failed (${response.status}); using default video copy.`
        );
        return {
          content: defaultTandraIntroContent,
          contentHash: hashTandraIntroContent(defaultTandraIntroContent),
          showCaptions: false,
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
          "[render-tandra-intro] No homepage tandraIntroVideo content; using default video copy."
        );
        return {
          content: defaultTandraIntroContent,
          contentHash: hashTandraIntroContent(defaultTandraIntroContent),
          showCaptions: false,
          source: "fallback",
        };
      }

      const documentId =
        typeof payload.result?.home?._id === "string"
          ? payload.result.home._id
          : undefined;

      const content = mergeTandraIntroContent(result);
      const renderContentHash =
        typeof result.renderContentHash === "string"
          ? result.renderContentHash
          : undefined;
      const renderArtifactHash =
        typeof result.renderArtifactHash === "string"
          ? result.renderArtifactHash
          : undefined;
      const renderedVideoUrl =
        typeof result.renderedVideoUrl === "string" &&
        result.renderedVideoUrl.trim()
          ? result.renderedVideoUrl.trim()
          : undefined;
      const thumbnailUrl =
        typeof result.thumbnailUrl === "string" && result.thumbnailUrl.trim()
          ? result.thumbnailUrl.trim()
          : undefined;

      return {
        content,
        contentHash: hashTandraIntroContent(content),
        documentId,
        renderArtifactHash,
        renderContentHash,
        renderedVideoUrl,
        showCaptions:
          typeof result.showCaptions === "boolean"
            ? result.showCaptions
            : false,
        source: token ? "sanity-draft-or-published" : "sanity-published",
        thumbnailUrl,
      };
    } catch (error) {
      console.warn(
        `[render-tandra-intro] Sanity fetch failed; using default video copy. ${error}`
      );
      return {
        content: defaultTandraIntroContent,
        contentHash: hashTandraIntroContent(defaultTandraIntroContent),
        showCaptions: false,
        source: "fallback",
      };
    }
  };
