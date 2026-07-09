import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
/**
 * Core ElevenLabs TTS utility.
 *
 * Converts a narration script to MP3 audio via ElevenLabs `eleven_v3` model,
 * then uploads the result to Vercel Blob.
 *
 * Returns:
 *   audioUrl       — Vercel Blob public URL (pass to Remotion <Audio src={…}>)
 *   audioDurationMs — estimated audio duration (word count heuristic; accurate
 *                     durations need the audio file parsed with a decoder)
 *
 * Env vars:
 *   ELEVENLABS_API_KEY         — required
 *   ELEVENLABS_DEFAULT_VOICE_ID — fallback voice when none is specified
 *   BLOB_READ_WRITE_TOKEN      — required for Vercel Blob uploads
 */
import { put } from "@vercel/blob";

export interface VoiceoverResult {
  audioUrl: string;
  audioDurationMs: number;
  characterCount: number;
  voiceId: string;
}

const DEFAULT_MODEL = "eleven_v3";
// Approx words-per-minute for ElevenLabs natural speech (comfortable narration pace)
const WORDS_PER_MINUTE = 140;

/** Rough audio duration estimate from word count (ms). */
const estimateDurationMs = (text: string): number => {
  const words = text.trim().split(/\s+/).length;
  return Math.round((words / WORDS_PER_MINUTE) * 60 * 1000);
};

export const generateVoiceover = async ({
  script,
  voiceId,
  sceneIndex,
  compositionId = "whiteboard-explainer",
  stability = 0.5,
  similarityBoost = 0.8,
  speed = 0.95,
}: {
  script: string;
  voiceId: string;
  sceneIndex: number;
  compositionId?: string;
  stability?: number;
  similarityBoost?: number;
  speed?: number;
}): Promise<VoiceoverResult> => {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not configured.");
  }

  const client = new ElevenLabsClient({ apiKey });

  // Generate audio as a stream and collect into a Buffer
  const audioStream = await client.textToSpeech.convert(voiceId, {
    modelId: DEFAULT_MODEL,
    outputFormat: "mp3_44100_128",
    text: script,
    voiceSettings: {
      similarityBoost,
      speed,
      stability,
      style: 0.3,
    },
  });

  // Collect stream chunks into a single Buffer
  const chunks: Buffer[] = [];
  for await (const chunk of audioStream as unknown as AsyncIterable<unknown>) {
    if (Buffer.isBuffer(chunk)) {
      chunks.push(chunk);
    } else if (chunk instanceof Uint8Array) {
      chunks.push(Buffer.from(chunk));
    } else if (chunk instanceof ArrayBuffer) {
      chunks.push(Buffer.from(chunk));
    }
  }
  const audioBuffer = Buffer.concat(chunks);

  // Upload to Vercel Blob
  const slug = `whiteboard/${compositionId}/scene-${sceneIndex}-${Date.now()}.mp3`;
  const blob = await put(slug, audioBuffer, {
    access: "public",
    contentType: "audio/mpeg",
  });

  return {
    audioDurationMs: estimateDurationMs(script),
    audioUrl: blob.url,
    characterCount: script.length,
    voiceId,
  };
};
