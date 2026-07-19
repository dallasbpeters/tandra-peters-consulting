import { Microphone, MicrophoneWarning, RefreshDouble } from "iconoir-react";

import { useDictation } from "../../hooks/use-dictation";
import { PromptInputButton } from "../ai-elements/prompt-input";
import { AudioWave } from "./audio-wave";

/**
 * DictationButton — an AI Elements icon button that records a voice clip and
 * fills a field with the transcript. Renders nothing when the browser can't
 * record audio, so it degrades to plain typing.
 */
interface DictationButtonProps {
  /** Google ID token forwarded to the auth-gated /api/transcribe route. */
  idToken: string;
  /** Accessible name describing what will be dictated (e.g. "report title"). */
  label: string;
  /** Slot to render the icon in. */
  slot?: "start" | "end";
  /** Called with the recognized text once transcription completes. */
  onTranscript: (text: string) => void;
}

const ICON_SIZE = 16;

/** Filled rounded stop square (Iconoir's Square is stroke-only). */
const StopIcon = () => (
  <svg
    aria-hidden="true"
    fill="currentColor"
    focusable="false"
    height={ICON_SIZE}
    viewBox="0 0 24 24"
    width={ICON_SIZE}
  >
    <rect height="12" rx="2.5" width="12" x="6" y="6" />
  </svg>
);

export const DictationButton = ({
  slot,
  idToken,
  label,
  onTranscript,
}: DictationButtonProps) => {
  const { analyser, error, status, supported, toggle } = useDictation({
    idToken,
    onTranscript,
  });

  if (!supported) {
    return null;
  }

  const recording = status === "recording";
  const transcribing = status === "transcribing";

  const content = (() => {
    if (recording) {
      return (
        <>
          <AudioWave analyser={analyser} />
          <StopIcon />
        </>
      );
    }
    if (transcribing) {
      return (
        <RefreshDouble
          className="report-dictation-spin"
          height={ICON_SIZE}
          width={ICON_SIZE}
        />
      );
    }
    if (status === "error") {
      return <MicrophoneWarning height={ICON_SIZE} width={ICON_SIZE} />;
    }
    return <Microphone height={ICON_SIZE} width={ICON_SIZE} />;
  })();

  const title = (() => {
    if (error) {
      return error;
    }
    if (transcribing) {
      return "Transcribing…";
    }
    if (recording) {
      return "Stop and transcribe";
    }
    return `Dictate ${label}`;
  })();

  return (
    <PromptInputButton
      aria-label={recording ? `Stop dictating ${label}` : `Dictate ${label}`}
      aria-pressed={recording}
      className={`report-dictation${
        recording ? " report-dictation--recording" : ""
      }`}
      disabled={transcribing}
      onClick={toggle}
      size={recording ? "full" : "md"}
      slot={slot}
      title={title}
      variant="ghost"
    >
      {content}
    </PromptInputButton>
  );
};
