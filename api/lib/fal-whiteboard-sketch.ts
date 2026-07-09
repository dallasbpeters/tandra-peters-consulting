/**
 * POST /api/fal/whiteboard-sketch
 *
 * Generates a whiteboard-style line-art illustration from a text prompt using
 * fal-ai/ideogram/v3. Returns the image URL for use as a `diagram` scene
 * background in the WhiteboardVideo Remotion composition.
 *
 * Body: { prompt: string; imageSize?: string }
 * Response: { imageUrl: string; requestId: string }
 */
import { createFalClient } from "@fal-ai/client";

const WHITEBOARD_STYLE_SUFFIX =
  "whiteboard explainer illustration, hand-drawn black marker on pure white background, " +
  "clean line art, simple educational diagram sketch, no color fill, no shading, " +
  "no text in image, professional but charming, clear and easy to understand";

const IDEOGRAM_SIZE_MAP: Record<string, string> = {
  landscape_4_3: "ASPECT_4_3",
  landscape_16_9: "ASPECT_16_9",
  portrait_4_3: "ASPECT_3_4",
  square: "ASPECT_1_1",
};

interface WhiteboardSketchBody {
  prompt?: unknown;
  imageSize?: unknown;
  seed?: unknown;
}

interface IdeogramImage {
  url?: string;
}

interface IdeogramOutput {
  images?: IdeogramImage[];
}

const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
    status,
  });

export const handler = async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-API-Key",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Origin": "*",
      },
      status: 204,
    });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const falKey = process.env.FAL_KEY?.trim();
  if (!falKey) {
    return jsonResponse({ error: "FAL_KEY is not configured." }, 500);
  }

  try {
    const body = (await request.json()) as WhiteboardSketchBody;
    const rawPrompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!rawPrompt) {
      return jsonResponse({ error: "prompt is required." }, 400);
    }

    const prompt = `${rawPrompt}, ${WHITEBOARD_STYLE_SUFFIX}`;
    const rawSize =
      typeof body.imageSize === "string" ? body.imageSize : "landscape_16_9";
    const aspectRatio = IDEOGRAM_SIZE_MAP[rawSize] ?? "ASPECT_16_9";
    const seed = typeof body.seed === "number" ? body.seed : undefined;

    const client = createFalClient({ credentials: falKey });

    const result = await client.subscribe("fal-ai/ideogram/v3" as never, {
      input: {
        aspect_ratio: aspectRatio,
        expand_prompt: true,
        negative_prompt:
          "photorealistic, photograph, color, 3D render, gradient, text, watermark, logo, busy background",
        num_images: 1,
        prompt,
        rendering_speed: "BALANCED",
        ...(seed === undefined ? {} : { seed }),
      } as never,
      logs: false,
      mode: "polling",
      pollInterval: 800,
      startTimeout: 90,
    });

    const data = result.data as IdeogramOutput;
    const imageUrl = data.images?.[0]?.url;

    if (!imageUrl) {
      return jsonResponse({ error: "FAL returned no image." }, 502);
    }

    return jsonResponse(
      {
        imageUrl,
        ok: true,
        requestId: result.requestId,
      },
      200
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
};
