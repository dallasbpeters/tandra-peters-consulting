/**
 * POST /api/fal/whiteboard-video
 *
 * Generates a short whiteboard-style animated video clip using WAN 2.1
 * text-to-video with the trained tandra_wb LoRA.
 *
 * The generated clip can be inserted as a <Video> element inside a Remotion
 * whiteboard scene for richer "AI-drawn" visual moments.
 *
 * Body:
 *   prompt        — describe the whiteboard content to draw
 *   width?        — 1280 (default)
 *   height?       — 720 (default)
 *   seed?         — for reproducibility
 *
 * Env:
 *   FAL_KEY                    — required
 *   FAL_WHITEBOARD_LORA_URL    — your trained LoRA weights URL
 *                                Falls back to base WAN 2.1 style if not set.
 *
 * Response: { videoUrl: string, requestId: string, usingLora: boolean, ok: true }
 */
import { createFalClient } from "@fal-ai/client";

const FAL_ENDPOINT = "fal-ai/wan/t2v";
const TRIGGER = "tandra_wb";
const STYLE_SUFFIX =
  "whiteboard animation video, hand draws on off-white paper with black marker, " +
  "clean line art, kinetic typography, smooth drawing animation";

const jsonResponse = (body: unknown, status = 200) =>
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
    return jsonResponse({ error: "Method not allowed", ok: false }, 405);
  }

  const falKey = process.env.FAL_KEY?.trim();
  if (!falKey) {
    return jsonResponse(
      { error: "FAL_KEY is not configured.", ok: false },
      500
    );
  }

  let body: { prompt?: string; width?: number; height?: number; seed?: number };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body.", ok: false }, 400);
  }

  const { prompt, width = 1280, height = 720, seed } = body;

  if (!prompt?.trim()) {
    return jsonResponse({ error: "prompt is required.", ok: false }, 400);
  }

  const loraUrl = process.env.FAL_WHITEBOARD_LORA_URL?.trim();
  const fullPrompt = loraUrl
    ? `${TRIGGER}, ${prompt.trim()}, ${STYLE_SUFFIX}`
    : `whiteboard animation explainer video, ${prompt.trim()}, ${STYLE_SUFFIX}`;

  try {
    const client = createFalClient({ credentials: falKey });

    const input: Record<string, unknown> = {
      fps: 16,
      guidance_scale: 7.5,
      height,
      num_frames: 81,
      num_inference_steps: 30,
      prompt: fullPrompt,
      width,
      ...(seed == null ? {} : { seed }),
      ...(loraUrl ? { loras: [{ path: loraUrl, scale: 1 }] } : {}),
    };

    const result = await (
      client.subscribe as unknown as (
        endpoint: string,
        opts: Record<string, unknown>
      ) => Promise<{
        data: { video?: { url: string }; request_id?: string };
        requestId?: string;
      }>
    )(FAL_ENDPOINT, {
      input,
      logs: false,
      mode: "polling",
      pollInterval: 3000,
    });

    const { data } = result;
    const videoUrl = data?.video?.url;

    if (!videoUrl) {
      return jsonResponse(
        { data, error: "WAN 2.1 returned no video URL.", ok: false },
        500
      );
    }

    return jsonResponse({
      ok: true,
      prompt: fullPrompt,
      requestId: result.requestId ?? data.request_id,
      usingLora: Boolean(loraUrl),
      videoUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message, ok: false }, 500);
  }
};
