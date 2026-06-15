import { Player } from "@remotion/player";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { fetchTandraIntroContent } from "../remotion/fetchTandraIntroContent";
import { COMPOSITIONS, getComposition, type CompositionEntry } from "../remotion/registry";

/**
 * Standalone, chrome-less preview of any Remotion composition, driven by a
 * `?id=<CompositionId>` query param. Renders the live `@remotion/player` so
 * editors can scrub and play in-browser.
 *
 * This route is embedded in an <iframe> by the Sanity Studio "Videos" tool
 * (see studio-tandra-peters/components/RemotionVideoTool.tsx) and is also
 * directly viewable at /remotion-preview?id=TandraStormSpot.
 *
 * For `TandraIntro` the live Sanity `homePage.tandraIntroVideo` copy is merged
 * into the input props (drafts included when VITE_SANITY_API_READ_TOKEN is set),
 * so the preview matches what a render would produce.
 */
const CONTROL_BAR_HEIGHT = 0;

const wrapStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#0b0b09",
  padding: 16,
  boxSizing: "border-box",
};

const messageStyle: React.CSSProperties = {
  color: "#d5f6e9",
  fontFamily: "system-ui, sans-serif",
  fontSize: 15,
  textAlign: "center",
  lineHeight: 1.5,
  maxWidth: 420,
};

export const RemotionPreviewPage = () => {
  const [searchParams] = useSearchParams();
  const requestedId = searchParams.get("id") ?? "TandraIntro";
  const entry: CompositionEntry | undefined = getComposition(requestedId);

  // Live Sanity copy for CMS-backed compositions (TandraIntro only, today).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [liveProps, setLiveProps] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(Boolean(entry?.sanityField));

  // Edited props received from Studio tool via postMessage.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editedProps, setEditedProps] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (entry?.sanityField === "tandraIntroVideo") {
      setLoading(true);
      fetchTandraIntroContent()
        .then((result) => {
          if (!cancelled) {
            setLiveProps({ showCaptions: result.showCaptions, content: result.content });
          }
        })
        .catch(() => {
          if (!cancelled) setLiveProps(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    } else {
      setLiveProps(null);
      setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [entry?.id, entry?.sanityField]);

  // Listen for live prop edits from the Studio Videos tool.
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "remotion:updateProps") {
        setEditedProps(event.data.props);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const inputProps = useMemo(() => {
    // For CMS-backed compositions, merge Studio edits on top of live Sanity content
    // so fields not touched in the editor still reflect the published copy.
    if (entry?.sanityField && editedProps && liveProps) {
      return { ...liveProps, ...editedProps };
    }
    return editedProps ?? liveProps ?? entry?.defaultProps ?? {};
  }, [editedProps, liveProps, entry?.defaultProps, entry?.sanityField]);

  const playerStyle = useMemo<React.CSSProperties>(() => {
    if (!entry) return {};
    const isPortrait = entry.height > entry.width;
    return {
      aspectRatio: entry.aspectRatio,
      ...(isPortrait
        ? {
            height: `calc(100vh - 32px - ${CONTROL_BAR_HEIGHT}px)`,
            width: "auto",
            maxWidth: "100%",
          }
        : { width: "min(100%, calc(100vh * 16 / 9))", height: "auto" }),
      boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
      borderRadius: 8,
      overflow: "hidden",
    };
  }, [entry]);

  if (!entry) {
    return (
      <div style={wrapStyle}>
        <p style={messageStyle}>
          Unknown composition <code>{requestedId}</code>.
          <br />
          Available: {COMPOSITIONS.map((c) => c.id).join(", ")}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={wrapStyle}>
        <p style={messageStyle}>Loading {entry.label}…</p>
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      <Player
        key={entry.id}
        component={entry.component}
        durationInFrames={entry.durationInFrames}
        compositionWidth={entry.width}
        compositionHeight={entry.height}
        fps={entry.fps}
        inputProps={inputProps}
        controls
        loop
        acknowledgeRemotionLicense
        style={playerStyle}
      />
    </div>
  );
};

export default RemotionPreviewPage;
