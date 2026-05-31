type GeminiSeriesErrorDetail = {
  index?: number;
  variation?: string;
  error?: string;
};

type GeminiErrorBody = {
  error?: string;
  details?: GeminiSeriesErrorDetail[];
};

const parseNestedGeminiMessage = (raw: string): string | null => {
  try {
    const parsed = JSON.parse(raw) as {
      error?: { message?: string };
    };
    if (typeof parsed.error?.message === "string" && parsed.error.message.trim()) {
      return parsed.error.message.trim();
    }
  } catch {
    /* raw error string is not JSON */
  }

  return null;
};

const isImageFreeTierBlocked = (message: string): boolean =>
  message.includes("free_tier") &&
  message.includes("limit: 0") &&
  message.includes("image");

const explainImageQuotaError = (message: string): string => {
  if (!isImageFreeTierBlocked(message)) {
    return message;
  }

  return [
    message,
    "Your AI Studio spend cap is not the blocker — text models work on this API key, but image models are routed to free-tier quota (limit 0).",
    "Try creating a new API key after Cloud Billing is linked to the GCP project (console.cloud.google.com), then check ai.dev/rate-limit for image model tier.",
    "If text models work but every image model still fails, this matches a known Google platform issue affecting image generation.",
  ].join(" ");
};

const rewriteErrorBody = (body: GeminiErrorBody): GeminiErrorBody => {
  const nestedFromDetails = body.details
    ?.map((detail) =>
      detail.error != null ? parseNestedGeminiMessage(detail.error) : null,
    )
    .find((message): message is string => message != null);

  const nestedFromTopLevel =
    typeof body.error === "string" ? parseNestedGeminiMessage(body.error) : null;

  const message = nestedFromDetails ?? nestedFromTopLevel ?? body.error;
  if (typeof message !== "string" || !message.trim()) {
    return body;
  }

  return {
    ...body,
    error: explainImageQuotaError(message),
  };
};

/**
 * The serverless plugin collapses per-image failures into "All image generations failed"
 * while keeping the real Gemini message in `details`. Promote the first detail so Studio
 * shows quota/model errors instead of the generic wrapper text.
 */
export const enrichGeminiErrorResponse = async (
  webRes: Response,
): Promise<Response> => {
  if (webRes.ok) {
    return webRes;
  }

  try {
    const body = (await webRes.clone().json()) as GeminiErrorBody;
    const shouldRewrite =
      body.error === "All image generations failed" ||
      (typeof body.error === "string" &&
        (parseNestedGeminiMessage(body.error) != null ||
          isImageFreeTierBlocked(body.error)));

    if (!shouldRewrite) {
      return webRes;
    }

    const headers = new Headers(webRes.headers);
    return new Response(JSON.stringify(rewriteErrorBody(body)), {
      status: webRes.status,
      headers,
    });
  } catch {
    /* non-JSON error body */
  }

  return webRes;
};
