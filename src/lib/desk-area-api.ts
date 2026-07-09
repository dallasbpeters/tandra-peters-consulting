import type { DeskAreaIntelResponse } from "./desk-types";

export const parseDeskAreaIntelResponse = async (
  response: Response
): Promise<DeskAreaIntelResponse> => {
  try {
    return (await response.json()) as DeskAreaIntelResponse;
  } catch {
    return {
      counties: [],
      error: response.ok ? undefined : "Area intel returned an empty response.",
      generatedAt: new Date().toISOString(),
      ok: response.ok,
      release: "Unavailable",
      rentcastReady: false,
      source: "Unavailable",
      targets: [],
    };
  }
};
