import {
  SANITY_API_VERSION,
  SANITY_DATASET,
  SANITY_PROJECT_ID,
} from "../sanity/projectDetails";
import {
  defaultTandraIntroContent,
  type TandraIntroContent,
} from "./tandraIntroContent";

const INTRO_QUERY = `*[_id in ["tandraIntroVideo", "drafts.tandraIntroVideo"]] | order(_updatedAt desc)[0]{
  _id,
  storm,
  straightAnswers,
  inspection,
  managed,
  proof,
  closing
}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const stringItems = (value: unknown, fallback: string[]): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : fallback;

const mergeScene = <T extends Record<string, unknown>>(
  fallback: T,
  incoming: unknown,
): T =>
  isRecord(incoming) ? ({ ...fallback, ...incoming } as T) : fallback;

export const mergeTandraIntroContent = (
  incoming: unknown,
): TandraIntroContent => {
  if (!isRecord(incoming)) {
    return defaultTandraIntroContent;
  }

  const managed = mergeScene(
    defaultTandraIntroContent.managed,
    incoming.managed,
  );
  const proof = mergeScene(defaultTandraIntroContent.proof, incoming.proof);

  return {
    storm: mergeScene(defaultTandraIntroContent.storm, incoming.storm),
    straightAnswers: mergeScene(
      defaultTandraIntroContent.straightAnswers,
      incoming.straightAnswers,
    ),
    inspection: mergeScene(
      defaultTandraIntroContent.inspection,
      incoming.inspection,
    ),
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

  return undefined;
};

export type FetchTandraIntroResult = {
  content: TandraIntroContent;
  source: "sanity-draft-or-published" | "sanity-published" | "fallback";
  documentId?: string;
};

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
        `[video] Sanity fetch failed (${response.status}); using default video copy.`,
      );
      return { content: defaultTandraIntroContent, source: "fallback" };
    }

    const payload = (await response.json()) as {
      result?: Record<string, unknown> | null;
    };

    if (!payload.result) {
      console.warn(
        "[video] No tandraIntroVideo document found; using default video copy.",
      );
      return { content: defaultTandraIntroContent, source: "fallback" };
    }

    const documentId =
      typeof payload.result._id === "string" ? payload.result._id : undefined;

    return {
      content: mergeTandraIntroContent(payload.result),
      source: token ? "sanity-draft-or-published" : "sanity-published",
      documentId,
    };
  } catch (error) {
    console.warn(
      `[video] Sanity fetch failed; using default video copy. ${error}`,
    );
    return { content: defaultTandraIntroContent, source: "fallback" };
  }
};
