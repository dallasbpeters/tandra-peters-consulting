/**
 * Serves POST /api/transcribe during `vite` dev so the Photo Report dictation
 * button works locally without running `vercel dev`. Mirrors api/transcribe.ts
 * (direct Groq Whisper upload). Requires GROQ_API_KEY in repo-root
 * `.env.local`. Auth is skipped in dev — the production route stays gated.
 */
import type { ServerResponse } from "node:http";

import type { Plugin } from "vite";

import { readRequestBody } from "./request-body";

const PATH = "/api/transcribe";
const GROQ_TRANSCRIPTION_MODEL = "whisper-large-v3-turbo";
const GROQ_TRANSCRIPTION_URL =
  "https://api.groq.com/openai/v1/audio/transcriptions";

// Below this the clip is effectively empty (e.g. the iOS Simulator captures no
// mic audio).
const MIN_AUDIO_BYTES = 512;

// Groq infers the format from the file extension, so label the upload with the
// recorder's real container. (iOS `audio/mp4` byte-sniffing is unreliable.)
const MIME_EXTENSIONS: Record<string, string> = {
  "audio/aac": "m4a",
  "audio/flac": "flac",
  "audio/m4a": "m4a",
  "audio/mp3": "mp3",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/webm": "webm",
  "audio/x-m4a": "m4a",
  "audio/x-wav": "wav",
};

const baseMediaType = (value: string): string =>
  value.split(";")[0]?.trim().toLowerCase() || "audio/webm";

const extensionForMediaType = (value: string): string =>
  MIME_EXTENSIONS[baseMediaType(value)] ?? "webm";

const parseAudioInput = (
  value: string
): { base64: string; mediaType: string | null } => {
  if (value.startsWith("data:")) {
    const comma = value.indexOf(",");
    if (comma !== -1) {
      const header = value.slice("data:".length, comma);
      return {
        base64: value.slice(comma + 1),
        mediaType: header.split(";")[0] || null,
      };
    }
  }
  return { base64: value, mediaType: null };
};

const setCors = (res: ServerResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

const pathnameOnly = (url: string | undefined): string =>
  (url ?? "").split("?")[0] ?? "";

const json = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

export const viteTranscribeApi = (env: Record<string, string>): Plugin => ({
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (pathnameOnly(req.url) !== PATH) {
        next();
        return;
      }

      setCors(res);

      if (req.method === "OPTIONS") {
        res.statusCode = 204;
        res.end();
        return;
      }

      if (req.method !== "POST") {
        json(res, 405, { error: "Method not allowed" });
        return;
      }

      const groqKey = env.GROQ_API_KEY;
      if (!groqKey) {
        json(res, 500, { error: "GROQ_API_KEY not set" });
        return;
      }

      try {
        const raw = await readRequestBody(req);
        const body = JSON.parse(raw.toString()) as {
          audioBase64?: string;
          mimeType?: string;
        };
        const { base64, mediaType: dataUrlMediaType } = parseAudioInput(
          typeof body.audioBase64 === "string" ? body.audioBase64 : ""
        );
        if (!base64) {
          json(res, 400, { error: "Missing audio." });
          return;
        }

        const mediaType = baseMediaType(
          body.mimeType || dataUrlMediaType || "audio/webm"
        );
        const audio = Buffer.from(base64, "base64");
        if (audio.byteLength < MIN_AUDIO_BYTES) {
          json(res, 422, {
            error:
              "No audio was captured. Check your microphone and speak while recording.",
          });
          return;
        }

        const form = new FormData();
        form.append("model", GROQ_TRANSCRIPTION_MODEL);
        form.append(
          "file",
          new Blob([audio], { type: mediaType }),
          `audio.${extensionForMediaType(mediaType)}`
        );

        const groqResponse = await fetch(GROQ_TRANSCRIPTION_URL, {
          body: form,
          headers: { Authorization: `Bearer ${groqKey}` },
          method: "POST",
        });
        const data = (await groqResponse.json().catch(() => ({}))) as {
          error?: { message?: string };
          text?: string;
        };
        if (!groqResponse.ok) {
          throw new Error(data.error?.message || "Transcription failed.");
        }

        json(res, 200, { text: (data.text ?? "").trim() });
      } catch (error) {
        console.error("[vite-transcribe-api]", error);
        json(res, 500, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  },
  name: "vite-transcribe-api",
});
