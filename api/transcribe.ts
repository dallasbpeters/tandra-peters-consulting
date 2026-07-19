/**
 * POST /api/transcribe — speech-to-text for the Photo Report editor.
 *
 * Accepts a short voice clip and returns the transcript so Tandra can dictate
 * field values on-site instead of typing. Transcription runs on Groq Whisper
 * via the AI SDK.
 *
 * Expected body: { audioBase64: string } (may be a data: URL)
 * Returns: { text: string }
 *
 * Google-auth gated (bearer ID token), mirroring /api/reports. Serverless
 * handlers must not import from src/ — shared logic lives in api/lib/.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { isAllowedGoogleUser, parseGoogleIdToken } from "./lib/google-auth.js";

// whisper-large-v3-turbo is the fastest Groq transcription model — ideal for
// short, interactive dictation clips.
const GROQ_TRANSCRIPTION_MODEL = "whisper-large-v3-turbo";
const GROQ_TRANSCRIPTION_URL =
  "https://api.groq.com/openai/v1/audio/transcriptions";

// Guard against oversized uploads (Vercel caps request bodies ~4.5MB). Base64
// inflates ~33%, so ~3.3MB of encoded audio ≈ ~2.5MB raw — plenty for a clip.
const MAX_AUDIO_BASE64_BYTES = 3_300_000;

// Below this the clip is effectively empty (e.g. the iOS Simulator captures no
// mic audio). Reject it before wasting a Groq round-trip.
const MIN_AUDIO_BYTES = 512;

// Groq infers the format from the file extension, so we must label the upload
// with the recorder's real container. (Byte-signature sniffing mis-detects iOS
// `audio/mp4`, whose `ftyp` box sits at offset 4, not 0, and falls back to wav.)
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

const parseBearerToken = (header: string | undefined): string | null => {
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length).trim() || null;
};

const applyCors = (res: VercelResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

const parseBody = (req: VercelRequest): Record<string, unknown> => {
  const raw = req.body;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (raw && typeof raw === "object") {
    return raw as Record<string, unknown>;
  }
  return {};
};

/** Splits a `data:<mediaType>;base64,<data>` URL into its parts. Falls back to
    treating the whole string as raw base64 with an unknown media type. */
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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  applyCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const bearer = parseBearerToken(req.headers.authorization);
  const user = bearer ? parseGoogleIdToken(bearer) : null;
  if (!(user && isAllowedGoogleUser(user))) {
    res.status(403).json({ error: "Google account is not authorized." });
    return;
  }

  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (!groqKey) {
    res.status(500).json({ error: "GROQ_API_KEY is not set." });
    return;
  }

  const body = parseBody(req);
  const rawInput = typeof body.audioBase64 === "string" ? body.audioBase64 : "";
  const { base64, mediaType: dataUrlMediaType } = parseAudioInput(rawInput);
  if (!base64) {
    res.status(400).json({ error: "Missing audio." });
    return;
  }
  if (base64.length > MAX_AUDIO_BASE64_BYTES) {
    res
      .status(413)
      .json({ error: "Audio clip is too long. Keep it under a minute." });
    return;
  }

  const mediaType = baseMediaType(
    (typeof body.mimeType === "string" && body.mimeType) ||
      dataUrlMediaType ||
      "audio/webm"
  );
  const audio = Buffer.from(base64, "base64");
  if (audio.byteLength < MIN_AUDIO_BYTES) {
    res.status(422).json({
      error:
        "No audio was captured. Check your microphone and speak while recording.",
    });
    return;
  }

  try {
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

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ text: (data.text ?? "").trim() });
  } catch (error) {
    console.error("[api/transcribe]", error);
    res.status(502).json({
      error:
        error instanceof Error
          ? error.message
          : "Transcription failed. Please try again.",
    });
  }
}
