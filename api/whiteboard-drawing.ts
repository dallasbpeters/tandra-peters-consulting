/**
 * POST /api/whiteboard/drawing
 *
 * Body: { prompt: string, sceneHint?: string }
 * Response: { viewBox: string, paths: string[] }
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

import { generateDrawing } from "./lib/whiteboard-drawing-gen.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { prompt, sceneHint } = req.body as {
    prompt?: string;
    sceneHint?: string;
  };

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  try {
    const drawing = await generateDrawing(prompt.trim(), sceneHint?.trim());
    res.status(200).json(drawing);
  } catch (error) {
    console.error("[whiteboard-drawing] handler error:", error);
    res.status(500).json({ error: "Drawing generation failed" });
  }
}
