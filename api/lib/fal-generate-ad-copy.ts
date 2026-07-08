import { createFalClient } from "@fal-ai/client";

import { isAllowedGoogleUser, parseGoogleIdToken } from "./google-auth.js";

const FAL_ENDPOINT = "openrouter/router";
const DEFAULT_MODEL = "google/gemini-2.5-flash";
const MAX_FIELD_LENGTH = 1200;
const MAX_VARIANTS = 3;

const SYSTEM_PROMPT = `You are a senior direct-response copywriter for Tandra Peters, a roofing consultant serving Central Texas homeowners.

Write honest, specific advertising copy in Tandra's first-person voice. Use plain roofer vocabulary, warm authority, and concrete homeowner situations. Spell Birdcreek exactly as one word with a lowercase c. Never refer to Tandra in the third person.

Treat every output as a hypothesis for a controlled A/B test, not as proven high-performing copy. The testing methodology is informed by the Upworthy Research Archive: generate materially different variants and measure them against the same audience. Do not imitate clickbait, news headlines, or claims from that archive.

Rules:
- Use only facts supplied in the brief or current creative.
- Never invent discounts, certifications, customer counts, response times, insurance outcomes, warranties, or performance statistics.
- Do not promise claim approval, a free roof, guaranteed savings, or guaranteed results.
- Make each variant a genuinely different angle: immediate homeowner problem, trustworthy process/proof, and local or seasonal relevance.
- Keep eyebrow at 40 characters or fewer, headline at 72 characters or fewer, body at 180 characters or fewer, and CTA at 28 characters or fewer.
- Return only valid JSON. No markdown fences or commentary.

Return this exact shape:
{"variants":[{"id":"problem","angle":"Problem aware","eyebrow":"...","headline":"...","body":"...","cta":"...","hypothesis":"One sentence describing what this variant tests."},{"id":"process","angle":"Trust and process","eyebrow":"...","headline":"...","body":"...","cta":"...","hypothesis":"..."},{"id":"local","angle":"Local relevance","eyebrow":"...","headline":"...","body":"...","cta":"...","hypothesis":"..."}]}`;

interface FalAdCopyBody {
  audience?: unknown;
  brief?: unknown;
  campaignGoal?: unknown;
  currentCopy?: unknown;
  platform?: unknown;
  tone?: unknown;
}

interface FalTextOutput {
  error?: string;
  output?: string;
  usage?: {
    cost?: number;
  };
}

export interface AdCopyVariant {
  angle: string;
  body: string;
  cta: string;
  eyebrow: string;
  headline: string;
  hypothesis: string;
  id: string;
}

const jsonResponse = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    headers: {
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
    status,
  });

const parseBearerToken = (header: string | null): string | null => {
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length).trim() || null;
};

const sanitizeInput = (value: unknown): string =>
  typeof value === "string" ? value.trim().slice(0, MAX_FIELD_LENGTH) : "";

const sanitizeOutput = (value: unknown, maxLength: number): string =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const extractJson = (output: string): unknown => {
  const firstBrace = output.indexOf("{");
  const lastBrace = output.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("Fal returned ad copy without a JSON object.");
  }
  return JSON.parse(output.slice(firstBrace, lastBrace + 1)) as unknown;
};

const normalizeVariants = (value: unknown): AdCopyVariant[] => {
  if (!(value && typeof value === "object" && "variants" in value)) {
    throw new Error("Fal returned an invalid ad-copy payload.");
  }

  const { variants } = value as { variants?: unknown };
  if (!Array.isArray(variants)) {
    throw new TypeError("Fal returned an invalid variants list.");
  }

  const normalized = variants.slice(0, MAX_VARIANTS).map((variant, index) => {
    if (!(variant && typeof variant === "object")) {
      throw new Error("Fal returned an invalid ad-copy variant.");
    }
    const record = variant as Record<string, unknown>;
    const normalizedVariant: AdCopyVariant = {
      angle: sanitizeOutput(record.angle, 60),
      body: sanitizeOutput(record.body, 180),
      cta: sanitizeOutput(record.cta, 28),
      eyebrow: sanitizeOutput(record.eyebrow, 40),
      headline: sanitizeOutput(record.headline, 72),
      hypothesis: sanitizeOutput(record.hypothesis, 220),
      id: sanitizeOutput(record.id, 40) || `variant-${index + 1}`,
    };
    if (
      !(
        normalizedVariant.angle &&
        normalizedVariant.body &&
        normalizedVariant.cta &&
        normalizedVariant.eyebrow &&
        normalizedVariant.headline &&
        normalizedVariant.hypothesis
      )
    ) {
      throw new Error("Fal returned an incomplete ad-copy variant.");
    }
    return normalizedVariant;
  });

  if (normalized.length !== MAX_VARIANTS) {
    throw new Error(`Fal returned ${normalized.length} variants; expected 3.`);
  }
  return normalized;
};

const buildPrompt = (body: FalAdCopyBody): string => {
  const campaignGoal = sanitizeInput(body.campaignGoal);
  const audience = sanitizeInput(body.audience);
  const brief = sanitizeInput(body.brief);
  const platform = sanitizeInput(body.platform);
  const tone = sanitizeInput(body.tone);
  const currentCopy = sanitizeInput(body.currentCopy);

  return `Create three advertising copy variants from this brief.

Campaign goal: ${campaignGoal || "Book a roof inspection"}
Audience: ${audience || "Central Texas homeowners who need clear roofing guidance"}
Platform: ${platform || "Social ad"}
Tone emphasis: ${tone || "Warm, direct, trustworthy"}
Offer, proof, constraints, or situation: ${brief || "No additional claims supplied"}

Current canvas copy for context only; improve it rather than paraphrasing all of it:
${currentCopy || "No current copy supplied"}`;
};

export const handler = async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") {
    return jsonResponse({}, 204);
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const bearer = parseBearerToken(request.headers.get("authorization"));
  if (!bearer) {
    return jsonResponse({ error: "Missing Google authorization token." }, 401);
  }
  const user = parseGoogleIdToken(bearer);
  if (!(user && isAllowedGoogleUser(user))) {
    return jsonResponse(
      { error: "Google account is not authorized for ad copy generation." },
      403
    );
  }

  const falKey = process.env.FAL_KEY?.trim();
  if (!falKey) {
    return jsonResponse(
      { error: "Fal API is not configured. Set FAL_KEY." },
      500
    );
  }

  try {
    const body = (await request.json()) as FalAdCopyBody;
    const client = createFalClient({ credentials: falKey });
    const model = process.env.FAL_AD_COPY_MODEL?.trim() || DEFAULT_MODEL;
    const result = await client.subscribe(FAL_ENDPOINT as never, {
      input: {
        max_tokens: 1400,
        model,
        prompt: buildPrompt(body),
        system_prompt: SYSTEM_PROMPT,
        temperature: 0.8,
      } as never,
      logs: false,
      mode: "polling",
      pollInterval: 500,
      startTimeout: 60,
    });
    const data = result.data as FalTextOutput;
    if (data.error) {
      throw new Error(data.error);
    }
    if (!data.output) {
      throw new Error("Fal returned no ad copy.");
    }

    return jsonResponse(
      {
        model,
        requestId: result.requestId,
        source: {
          name: "Upworthy Research Archive",
          scope:
            "Headline preference prior; validate roofing performance with first-party A/B tests.",
          url: "https://upworthy.natematias.com/about-the-archive.html",
        },
        usage: data.usage,
        variants: normalizeVariants(extractJson(data.output)),
      },
      200
    );
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected Fal ad-copy error.",
      },
      500
    );
  }
};
