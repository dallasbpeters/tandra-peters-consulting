import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useDictation — records a short voice clip with MediaRecorder and posts it to
 * `/api/transcribe` (Groq Whisper) so a field can be filled by speaking.
 *
 * The caller supplies the Google ID token (for the auth-gated route) and an
 * `onTranscript` callback that receives the recognized text.
 */
export type DictationStatus = "idle" | "recording" | "transcribing" | "error";

/** Appends dictated text to a field, adding a separating space when needed. */
export const appendDictation = (current: string, addition: string): string => {
  const trimmed = current.trimEnd();
  return trimmed ? `${trimmed} ${addition}` : addition;
};

interface UseDictationOptions {
  idToken: string;
  onTranscript: (text: string) => void;
}

interface UseDictation {
  /** Live analyser node while recording, for a waveform indicator (else null). */
  analyser: AnalyserNode | null;
  error: string | null;
  status: DictationStatus;
  supported: boolean;
  toggle: () => void;
}

type AudioContextCtor = typeof AudioContext;

const getAudioContextCtor = (): AudioContextCtor | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor })
      .webkitAudioContext
  );
};

const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

const pickMimeType = (): string | undefined => {
  if (typeof MediaRecorder === "undefined") {
    return undefined;
  }
  return PREFERRED_MIME_TYPES.find((type) =>
    MediaRecorder.isTypeSupported(type)
  );
};

/** iOS/iPadOS Safari — needs special handling (secure context, no WebAudio tap). */
const isAppleWebkit = (): boolean => {
  if (typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent;
  const iOS = /iP(hone|ad|od)/.test(ua);
  const iPadOS =
    typeof document !== "undefined" &&
    /Macintosh/.test(ua) &&
    "ontouchend" in document;
  return iOS || iPadOS;
};

/** Turns a getUserMedia rejection into an actionable message. */
const microphoneErrorMessage = (error: unknown): string => {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Microphone access was blocked. Allow it for this site in your browser settings, then try again.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No microphone was found on this device.";
  }
  if (name === "NotReadableError") {
    return "The microphone is in use by another app. Close it and try again.";
  }
  return error instanceof Error && error.message
    ? error.message
    : "Couldn't access the microphone.";
};

/** Below this, the recording is effectively empty (no captured audio). */
const MIN_CLIP_BYTES = 512;

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(reader.error ?? new Error("Could not read audio."));
    reader.onloadend = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(blob);
  });

export const useDictation = ({
  idToken,
  onTranscript,
}: UseDictationOptions): UseDictation => {
  const [status, setStatus] = useState<DictationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  // Keep the latest callback without re-creating handlers each render.
  const onTranscriptRef = useRef(onTranscript);
  const idTokenRef = useRef(idToken);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    idTokenRef.current = idToken;
  }, [onTranscript, idToken]);

  const supported =
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia);

  const teardownAudio = useCallback(() => {
    setAnalyser(null);
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== "closed") {
      void context.close().catch(() => {
        // Ignore — the context may already be closing.
      });
    }
  }, []);

  const releaseStream = useCallback(() => {
    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    streamRef.current = null;
    teardownAudio();
  }, [teardownAudio]);

  useEffect(() => releaseStream, [releaseStream]);

  /** Starts a live analyser on the stream so the UI can draw a waveform. */
  const startAudioAnalysis = useCallback((stream: MediaStream) => {
    const Ctor = getAudioContextCtor();
    if (!Ctor) {
      return;
    }
    try {
      const context = new Ctor();
      const source = context.createMediaStreamSource(stream);
      const node = context.createAnalyser();
      node.fftSize = 256;
      node.smoothingTimeConstant = 0.7;
      // Intentionally not connected to the destination — analysis only, no
      // playback (which would echo the mic).
      source.connect(node);
      audioContextRef.current = context;
      setAnalyser(node);
    } catch {
      // Waveform is a nice-to-have; recording still works without it.
    }
  }, []);

  const sendClip = useCallback(async (blob: Blob, mimeType: string) => {
    setStatus("transcribing");
    try {
      const dataUrl = await blobToDataUrl(blob);
      const response = await fetch("/api/transcribe", {
        body: JSON.stringify({ audioBase64: dataUrl, mimeType }),
        headers: {
          Authorization: `Bearer ${idTokenRef.current}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        text?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "Transcription failed.");
      }
      const text = (data.text ?? "").trim();
      if (text) {
        onTranscriptRef.current(text);
      }
      setStatus("idle");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Transcription failed."
      );
      setStatus("error");
    }
  }, []);

  const start = useCallback(async () => {
    if (!supported) {
      setError("Voice input isn't supported in this browser.");
      setStatus("error");
      return;
    }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      startAudioAnalysis(stream);
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      chunksRef.current = [];
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });
      recorder.addEventListener("stop", () => {
        releaseStream();
        const clipType = recorder.mimeType || mimeType || "audio/webm";
        const clip = new Blob(chunksRef.current, { type: clipType });
        chunksRef.current = [];
        // A near-empty clip means no audio was captured (e.g. the iOS Simulator
        // has no working microphone). Surface a clear message instead of sending
        // garbage to the transcription API.
        if (clip.size < MIN_CLIP_BYTES) {
          setError(
            "No audio was captured. Check that your microphone is working and speak while recording."
          );
          setStatus("error");
          return;
        }
        void sendClip(clip, clipType);
      });
      recorder.start();
      recorderRef.current = recorder;
      setStatus("recording");
    } catch {
      releaseStream();
      setError("Microphone access was blocked.");
      setStatus("error");
    }
  }, [releaseStream, sendClip, startAudioAnalysis, supported]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    recorderRef.current = null;
  }, []);

  const toggle = useCallback(() => {
    if (status === "recording") {
      stop();
      return;
    }
    if (status !== "transcribing") {
      void start();
    }
  }, [start, status, stop]);

  return { analyser, error, status, supported, toggle };
};
