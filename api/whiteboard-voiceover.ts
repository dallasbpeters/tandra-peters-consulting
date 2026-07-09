/**
 * POST /api/whiteboard-voiceover
 *
 * Full voiceover generation pipeline for the WhiteboardVideo composition:
 *
 * 1. Takes the whiteboard scenes (with or without narration scripts)
 * 2. Auto-generates any missing narration scripts using Claude (Tandra's voice)
 * 3. Converts each script to MP3 via ElevenLabs TTS
 * 4. Uploads each MP3 to Vercel Blob
 * 5. Returns the updated scenes array with audioUrl + audioDurationMs filled in
 *
 * The caller patches the updated scenes back into the whiteboard composition
 * props so Remotion's <Audio> components can play them.
 *
 * Body:
 *   scenes      — WhiteboardScene[]
 *   voiceId?    — ElevenLabs voice ID (falls back to ELEVENLABS_TANDRA_VOICE_ID,
 *                then ELEVENLABS_DEFAULT_VOICE_ID)
 *   stability?  — ElevenLabs voice stability 0–1 (default 0.5)
 *   speed?      — Speaking speed 0.7–1.3 (default 0.95)
 *   dryRun?     — If true, only generate scripts (no TTS/Blob upload)
 *
 * Env:
 *   ELEVENLABS_API_KEY
 *   ELEVENLABS_TANDRA_VOICE_ID     — preferred voice (Tandra's cloned voice)
 *   ELEVENLABS_DEFAULT_VOICE_ID    — secondary fallback voice
 *   BLOB_READ_WRITE_TOKEN
 *   ANTHROPIC_API_KEY
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

import type { WhiteboardScene } from "../src/remotion/whiteboard/whiteboard-schema.js";
import { generateVoiceover } from "./lib/elevenlabs-voiceover.js";
import { generateNarrationScripts } from "./lib/whiteboard-script-gen.js";

const jsonError = (res: VercelResponse, message: string, status = 400) =>
  res.status(status).json({ error: message, ok: false });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    return jsonError(res, "Method not allowed", 405);
  }

  const {
    scenes,
    voiceId: bodyVoiceId,
    stability = 0.5,
    speed = 0.95,
    dryRun = false,
    compositionId = "whiteboard-explainer",
  } = req.body as {
    scenes?: unknown;
    voiceId?: string;
    stability?: number;
    speed?: number;
    dryRun?: boolean;
    compositionId?: string;
  };

  if (!Array.isArray(scenes) || scenes.length === 0) {
    return jsonError(res, "scenes must be a non-empty array.");
  }

  const voiceId =
    bodyVoiceId?.trim() ||
    process.env.ELEVENLABS_TANDRA_VOICE_ID?.trim() ||
    process.env.ELEVENLABS_DEFAULT_VOICE_ID?.trim();

  if (!voiceId && !dryRun) {
    return jsonError(
      res,
      "voiceId is required (or set ELEVENLABS_TANDRA_VOICE_ID env var).",
      400
    );
  }

  try {
    // Step 1: Generate any missing narration scripts via Claude
    const scenesWithScripts = await generateNarrationScripts(
      scenes as WhiteboardScene[]
    );

    if (dryRun) {
      // Return scripts only — no audio generated
      const result = scenesWithScripts.map((scene) => ({
        ...scene,
        narration: {
          ...scene.narration,
          script: scene._generatedScript || scene.narration?.script || "",
        },
        _generatedScript: undefined,
      }));
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(200).json({ ok: true, scenes: result });
    }

    // Step 2: Generate TTS for each scene in parallel (rate-limited to 3 at a time)
    const CONCURRENCY = 3;
    const updatedScenes: WhiteboardScene[] = [];

    for (let i = 0; i < scenesWithScripts.length; i += CONCURRENCY) {
      const batch = scenesWithScripts.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map(async (scene, batchIdx) => {
          const sceneIndex = i + batchIdx;
          const script = scene._generatedScript || scene.narration?.script;

          // If no script and no existing audio, skip
          if (!script) {
            return { ...scene, _generatedScript: undefined };
          }

          // If audio already generated for this scene, keep it
          if (scene.narration?.audioUrl) {
            return {
              ...scene,
              _generatedScript: undefined,
              narration: {
                ...scene.narration,
                script: scene.narration.script ?? script,
              },
            };
          }

          const result = await generateVoiceover({
            compositionId,
            sceneIndex,
            script,
            speed,
            stability,
            voiceId: voiceId as string,
          });

          return {
            ...scene,
            _generatedScript: undefined,
            narration: {
              audioDurationMs: result.audioDurationMs,
              audioUrl: result.audioUrl,
              script,
            },
          };
        })
      );

      updatedScenes.push(...batchResults);
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json({
      ok: true,
      scenes: updatedScenes,
      voiceId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ error: message, ok: false });
  }
}
