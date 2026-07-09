/**
 * TandraVoiceAgent — a floating voice chat widget powered by ElevenLabs
 * Conversational AI. Opens a real-time WebSocket voice session with
 * Tandra's cloned voice answering roofing questions.
 *
 * Usage:
 *   <TandraVoiceAgent />
 *
 * The component is self-contained: it fetches the signed WebSocket URL
 * from /api/elevenlabs-agent?action=signed-url, then connects the
 * ElevenLabs `useConversation` hook.
 */
import { useConversation } from "@elevenlabs/react";
import { useCallback, useState } from "react";

import { useIsMobile } from "../hooks/is-mobile";

type AgentStatus = "idle" | "connecting" | "speaking" | "listening" | "error";

const STATUS_LABEL: Record<AgentStatus, string> = {
  connecting: "Connecting…",
  error: "Something went wrong",
  idle: "Talk to Tandra",
  listening: "Listening…",
  speaking: "Tandra is speaking…",
};

const STATUS_COLOR: Record<AgentStatus, string> = {
  connecting: "var(--color-accent, #1D4ED8)",
  error: "#DC2626",
  idle: "var(--color-accent, #1D4ED8)",
  listening: "#059669",
  speaking: "#7C3AED",
};

export const TandraVoiceAgent = () => {
  const isMobile = useIsMobile(768);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const [open, setOpen] = useState(false);

  const conversation = useConversation({
    onConnect: () => setAgentStatus("listening"),
    onDisconnect: () => {
      setAgentStatus("idle");
      setOpen(false);
    },
    onError: () => setAgentStatus("error"),
    onMessage: ({ source }) => {
      setAgentStatus(source === "ai" ? "speaking" : "listening");
    },
  });

  const fetchSignedUrl = useCallback(async (): Promise<string> => {
    const res = await fetch("/api/elevenlabs-agent?action=signed-url", {
      method: "POST",
    });
    if (!res.ok) {
      throw new Error("Failed to get signed URL from /api/elevenlabs-agent");
    }
    const data = (await res.json()) as { signedUrl: string };
    return data.signedUrl;
  }, []);

  const handleStart = useCallback(async () => {
    setAgentStatus("connecting");
    setOpen(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const signedUrl = await fetchSignedUrl();
      await conversation.startSession({ signedUrl });
    } catch {
      setAgentStatus("error");
    }
  }, [conversation, fetchSignedUrl]);

  const handleStop = useCallback(async () => {
    await conversation.endSession();
    setAgentStatus("idle");
    setOpen(false);
  }, [conversation]);

  const isActive = open || agentStatus === "connecting";

  return (
    <div
      aria-live="polite"
      style={{
        bottom: isMobile ? 20 : 32,
        position: "fixed",
        right: isMobile ? 16 : 32,
        zIndex: 9999,
      }}
    >
      {/* Expanded panel */}
      {isActive && (
        <div
          style={{
            backgroundColor: "#fff",
            border: "1.5px solid #e5e7eb",
            borderRadius: 20,
            bottom: 76,
            boxShadow:
              "0 8px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)",
            padding: "20px 24px 18px",
            position: "absolute",
            right: 0,
            width: 300,
          }}
        >
          {/* Header */}
          <div
            style={{
              alignItems: "center",
              display: "flex",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                alignItems: "center",
                background: "linear-gradient(135deg, #1D4ED8, #3B82F6)",
                borderRadius: "50%",
                color: "#fff",
                display: "flex",
                flexShrink: 0,
                fontSize: 20,
                height: 44,
                justifyContent: "center",
                width: 44,
              }}
              aria-hidden="true"
            >
              T
            </div>
            <div>
              <div style={{ color: "#111827", fontSize: 15, fontWeight: 600 }}>
                Tandra Peters
              </div>
              <div style={{ color: "#6B7280", fontSize: 12 }}>
                Birdcreek Roofing Consultant
              </div>
            </div>
          </div>

          {/* Waveform / status indicator */}
          <div
            style={{
              alignItems: "center",
              borderRadius: 12,
              display: "flex",
              gap: 4,
              justifyContent: "center",
              marginBottom: 16,
              padding: "14px 0",
            }}
          >
            {agentStatus === "connecting" && (
              <span style={{ color: "#6B7280", fontSize: 13 }}>
                Connecting…
              </span>
            )}
            {(agentStatus === "speaking" || agentStatus === "listening") && (
              <WaveformBars
                active={agentStatus === "speaking"}
                color={STATUS_COLOR[agentStatus]}
              />
            )}
            {agentStatus === "error" && (
              <span style={{ color: "#DC2626", fontSize: 13 }}>
                Couldn&apos;t connect. Try again.
              </span>
            )}
          </div>

          {/* Status label */}
          <div
            style={{
              color: STATUS_COLOR[agentStatus],
              fontSize: 12,
              fontWeight: 500,
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            {STATUS_LABEL[agentStatus]}
          </div>

          {/* End button */}
          <button
            onClick={handleStop}
            style={{
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 10,
              color: "#DC2626",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              padding: "8px 16px",
              width: "100%",
            }}
            type="button"
          >
            End conversation
          </button>
        </div>
      )}

      {/* FAB trigger */}
      <button
        aria-label={
          isActive
            ? "End voice conversation with Tandra"
            : "Talk to Tandra — voice chat"
        }
        onClick={isActive ? handleStop : handleStart}
        style={{
          alignItems: "center",
          background: isActive
            ? "linear-gradient(135deg, #7C3AED, #4F46E5)"
            : "linear-gradient(135deg, #1D4ED8, #2563EB)",
          border: "none",
          borderRadius: "50%",
          boxShadow: isActive
            ? "0 0 0 6px rgba(124,58,237,0.2), 0 4px 20px rgba(79,70,229,0.4)"
            : "0 4px 20px rgba(29,78,216,0.4)",
          color: "#fff",
          cursor: "pointer",
          display: "flex",
          height: 60,
          justifyContent: "center",
          transition: "all 0.2s",
          width: 60,
        }}
        type="button"
      >
        {isActive ? <StopIcon /> : <MicIcon />}
      </button>
    </div>
  );
};

// ─── Icons ─────────────────────────────────────────────────────────────────────

const MicIcon = () => (
  <svg
    aria-hidden="true"
    fill="none"
    height="26"
    viewBox="0 0 24 24"
    width="26"
  >
    <path
      d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
      fill="currentColor"
    />
    <path
      d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="2"
    />
  </svg>
);

const StopIcon = () => (
  <svg
    aria-hidden="true"
    fill="currentColor"
    height="22"
    viewBox="0 0 24 24"
    width="22"
  >
    <rect height="12" rx="2" width="12" x="6" y="6" />
  </svg>
);

// ─── Animated waveform ─────────────────────────────────────────────────────────

interface WaveformBarsProps {
  active: boolean;
  color: string;
}

const BAR_COUNT = 5;
const BAR_HEIGHTS = [16, 28, 40, 28, 16];

const WaveformBars = ({ active, color }: WaveformBarsProps) => (
  <div style={{ alignItems: "center", display: "flex", gap: 4, height: 48 }}>
    {Array.from({ length: BAR_COUNT }, (_, i) => (
      <div
        key={i}
        style={{
          animation: active
            ? `wb-bounce 0.8s ease-in-out ${i * 0.1}s infinite alternate`
            : "none",
          background: color,
          borderRadius: 4,
          height: active ? BAR_HEIGHTS[i] : 8,
          opacity: active ? 1 : 0.35,
          transition: "opacity 0.15s",
          width: 6,
        }}
      />
    ))}
    <style>{`
      @keyframes wb-bounce {
        from { transform: scaleY(0.4); }
        to   { transform: scaleY(1.2); }
      }
    `}</style>
  </div>
);
