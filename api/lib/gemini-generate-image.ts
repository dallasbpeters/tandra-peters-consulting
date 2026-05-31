/**
 * Gemini image generation for Sanity Studio (fork of sanity-plugin-gemini-ai-images-serverless
 * with a configurable model — defaults to Nano Banana 2 / gemini-3.1-flash-image).
 */
import { GoogleGenAI } from "@google/genai";

const geminiApiKey = process.env.GEMINI_API_KEY;
const expectedApiKey = process.env.GEMINI_PLUGIN_API_KEY;

/** Nano Banana 2 — Gemini 3.1 Flash Image (GA). Override with GEMINI_IMAGE_MODEL. */
const DEFAULT_IMAGE_MODEL = "gemini-3.1-flash-image";

const imageModel =
  process.env.GEMINI_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;

const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });

const verifyApiKey = (request: Request): boolean => {
  if (!expectedApiKey) {
    return true;
  }

  const providedKey = request.headers.get("x-api-key");
  return providedKey === expectedApiKey;
};

type RequestBody = {
  prompt: string;
  aspectRatio?: string;
  mode?: "generate" | "edit";
  baseImage?: string;
  series?: {
    quantity: number;
    consistencyPrompt: string;
    variations: string[];
  };
};

type ImageData = {
  imageData: string;
  mimeType: string;
};

type SeriesImageData = ImageData & {
  variation: string;
  index: number;
};

type GenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          data?: string;
          mimeType?: string;
        };
      }>;
    };
  }>;
};

const extractImage = (response: GenerateContentResponse): ImageData => {
  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) {
    throw new Error("No image generated in response");
  }

  for (const part of parts) {
    if (part.inlineData?.data) {
      return {
        imageData: part.inlineData.data,
        mimeType: part.inlineData.mimeType || "image/png",
      };
    }
  }

  throw new Error("No image generated in response");
};

const generateSingleImage = async (
  client: GoogleGenAI,
  prompt: string,
  aspectRatio?: string,
  mode?: string,
  baseImage?: string,
): Promise<ImageData> => {
  const imageConfig = aspectRatio ? { aspectRatio } : {};

  if (mode === "edit" && baseImage) {
    const response = (await client.models.generateContent({
      model: imageModel,
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/png",
                data: baseImage,
              },
            },
            { text: prompt },
          ],
        },
      ],
      config: {
        responseModalities: ["Image"],
        imageConfig,
      },
    })) as GenerateContentResponse;

    return extractImage(response);
  }

  const response = (await client.models.generateContent({
    model: imageModel,
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    config: {
      responseModalities: ["Image"],
      imageConfig,
    },
  })) as GenerateContentResponse;

  return extractImage(response);
};

export async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-API-Key",
      },
    });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!verifyApiKey(request)) {
    return jsonResponse({ error: "Invalid or missing API key" }, 401);
  }

  if (!geminiApiKey) {
    return jsonResponse({ error: "Gemini API not configured" }, 500);
  }

  try {
    const body = (await request.json()) as RequestBody;
    const { prompt, aspectRatio, mode, baseImage, series } = body;

    if (!prompt) {
      return jsonResponse({ error: "Prompt is required" }, 400);
    }

    const client = new GoogleGenAI({ apiKey: geminiApiKey });

    if (series) {
      const { quantity, consistencyPrompt, variations } = series;

      if (!variations || variations.length === 0) {
        return jsonResponse(
          { error: "Variations are required for series generation" },
          400,
        );
      }

      const parsedQuantity = Number(quantity);

      if (!Number.isFinite(parsedQuantity)) {
        return jsonResponse(
          { error: "Quantity must be a number between 2 and 10" },
          400,
        );
      }

      if (parsedQuantity < 2 || parsedQuantity > 10) {
        return jsonResponse(
          { error: "Quantity must be between 2 and 10" },
          400,
        );
      }

      const images: SeriesImageData[] = [];
      const errors: Array<{ index: number; variation: string; error: string }> =
        [];

      const cappedVariations = variations.slice(0, parsedQuantity);
      const results = await Promise.all(
        cappedVariations.map(async (variation, index) => {
          try {
            const fullPrompt = `${prompt} ${consistencyPrompt} Variation: ${variation}`;
            const result = await generateSingleImage(
              client,
              fullPrompt,
              aspectRatio,
              mode,
              baseImage,
            );
            return {
              ...result,
              variation,
              index,
            };
          } catch (error) {
            errors.push({
              index,
              variation,
              error:
                error instanceof Error ? error.message : "Generation failed",
            });
            return null;
          }
        }),
      );

      for (const result of results) {
        if (result) {
          images.push(result);
        }
      }

      if (images.length === 0) {
        return jsonResponse(
          { error: "All image generations failed", details: errors },
          500,
        );
      }

      return jsonResponse(
        {
          images,
          metadata: {
            basePrompt: prompt,
            stylePrompt: consistencyPrompt,
            generatedAt: new Date().toISOString(),
            quantity: parsedQuantity,
            successful: images.length,
            failed: errors.length,
            model: imageModel,
          },
          errors: errors.length > 0 ? errors : undefined,
        },
        200,
      );
    }

    const result = await generateSingleImage(
      client,
      prompt,
      aspectRatio,
      mode,
      baseImage,
    );

    return jsonResponse(
      {
        imageData: result.imageData,
        mimeType: result.mimeType,
        model: imageModel,
      },
      200,
    );
  } catch (error) {
    console.error("Image generation failed:", error);
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : "Image generation failed",
      },
      500,
    );
  }
}
