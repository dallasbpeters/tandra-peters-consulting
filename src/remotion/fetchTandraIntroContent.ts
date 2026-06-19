import {
  SANITY_API_VERSION,
  SANITY_DATASET,
  SANITY_PROJECT_ID,
} from "../sanity/projectDetails";
import {
  defaultTandraIntroContent,
  mergeTandraIntroContent,
  type TandraIntroContent,
} from "./tandraIntroContent";

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
      closing
    }
  }
}`;

const readSanityToken = (): string | undefined => {
  if (typeof process !== "undefined" && process.env) {
    const fromProcess =
      process.env.SANITY_API_READ_TOKEN?.trim() ||
      process.env.VITE_SANITY_API_READ_TOKEN?.trim();
    if (fromProcess) {
      return fromProcess;
    }
  }

  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env.VITE_SANITY_API_READ_TOKEN?.trim() || undefined;
  }

  return;
};

export interface FetchTandraIntroResult {
  content: TandraIntroContent;
  documentId?: string;
  showCaptions: boolean;
  source: "sanity-draft-or-published" | "sanity-published" | "fallback";
}

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
          `[video] Sanity fetch failed (${response.status}); using default video copy.`
        );
        return {
          showCaptions: false,
          content: defaultTandraIntroContent,
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
          "[video] No homepage tandraIntroVideo content found; using default video copy."
        );
        return {
          showCaptions: false,
          content: defaultTandraIntroContent,
          source: "fallback",
        };
      }

      const documentId =
        typeof payload.result?.home?._id === "string"
          ? payload.result.home._id
          : undefined;

      return {
        showCaptions:
          typeof result.showCaptions === "boolean"
            ? result.showCaptions
            : false,
        content: mergeTandraIntroContent(result),
        source: token ? "sanity-draft-or-published" : "sanity-published",
        documentId,
      };
    } catch (error) {
      console.warn(
        `[video] Sanity fetch failed; using default video copy. ${error}`
      );
      return {
        showCaptions: false,
        content: defaultTandraIntroContent,
        source: "fallback",
      };
    }
  };
