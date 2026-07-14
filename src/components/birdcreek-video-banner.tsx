import { motion, useInView, Variants } from "motion/react";
import { useRef } from "react";

import { useIsMobile } from "../hooks/is-mobile";
import { theme } from "../theme";

interface BirdcreekVideoBannerProps {
  title?: string;
  vimeoUrl?: string;
  videoUrl?: string;
  posterUrl?: string;
}

type ResolvedSource =
  | { kind: "file"; src: string }
  | { kind: "iframe"; src: string };

// Turn whatever URL was entered in Sanity (a direct media file, a Vimeo link,
// or a YouTube link) into something the banner can actually play. Native
// <video> only handles direct file URLs; Vimeo/YouTube page links need an
// iframe embed.
const resolveSource = (raw?: string): ResolvedSource | null => {
  const url = raw?.trim();
  if (!url) {
    return null;
  }

  if (/\.(mp4|webm|ogg|ogv|mov|m4v)(\?.*)?$/i.test(url)) {
    return { kind: "file", src: url };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // Not a parseable URL — fall back to treating it as a direct file src.
    return { kind: "file", src: url };
  }

  const host = parsed.hostname.replace(/^www\./, "");

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const segments = parsed.pathname.split("/").filter(Boolean);
    const idIndex = segments.findIndex((segment) => /^\d+$/.test(segment));
    if (idIndex !== -1) {
      const id = segments[idIndex];
      // Unlisted Vimeo videos carry a privacy hash either as the next path
      // segment (vimeo.com/ID/HASH) or as ?h=HASH on the player URL.
      const hash = segments[idIndex + 1] ?? parsed.searchParams.get("h");
      const query = hash ? `?h=${hash}` : "";
      return {
        kind: "iframe",
        src: `https://player.vimeo.com/video/${id}${query}`,
      };
    }
  }

  if (host === "youtube.com" || host === "m.youtube.com") {
    const videoId = parsed.searchParams.get("v");
    if (videoId) {
      return {
        kind: "iframe",
        src: `https://www.youtube.com/embed/${videoId}`,
      };
    }
    const segments = parsed.pathname.split("/").filter(Boolean);
    if ((segments[0] === "embed" || segments[0] === "shorts") && segments[1]) {
      return {
        kind: "iframe",
        src: `https://www.youtube.com/embed/${segments[1]}`,
      };
    }
  }

  if (host === "youtu.be") {
    const videoId = parsed.pathname.split("/").find(Boolean);
    if (videoId) {
      return {
        kind: "iframe",
        src: `https://www.youtube.com/embed/${videoId}`,
      };
    }
  }

  return { kind: "file", src: url };
};

export const BirdcreekVideoBanner = ({
  videoUrl,
  vimeoUrl,
  posterUrl,
  title,
}: BirdcreekVideoBannerProps) => {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isInView = useInView(sectionRef, { amount: 0.45, once: true });
  const isMobile = useIsMobile(1100);
  // Drive the entrance with useInView (not whileInView): on first render inView is
  // false so `initial` paints, then the observer flips it true on the next tick and
  // Motion actually tweens — reliable even when the banner is in view on load
  // (whileInView can snap straight to the end state before `initial` paints).

  const source = resolveSource(videoUrl ?? vimeoUrl);

  const containerStyle: React.CSSProperties = {
    background: theme.colors.everglade,
    display: "grid",
    gap: theme.spacing.xxxxl,
    overflow: "hidden",
    padding: `${theme.spacing.xxxxl}`,
    placeContent: "center",
    placeItems: "stretch",
    position: "relative",
  };

  const titleStyle: React.CSSProperties = {
    color: theme.colors.paper,
    fontSize: "clamp(1.5rem, 3vw, 2.5rem)",
    fontWeight: 700,
    lineHeight: 1.2,
    margin: 0,
    textAlign: "center",
  };

  const videoVariants: Variants = {
    offscreen: {
      opacity: 0,
      scale: 0.92,
      y: 56,
    },
    onscreen: {
      opacity: 1,
      scale: 1,
      transition: {
        bounce: 0.25,
        duration: 0.95,
        type: "spring",
      },
      y: 0,
    },
  };

  return (
    <div
      ref={sectionRef}
      style={{
        ...containerStyle,
        padding: isMobile ? `${theme.spacing.xxxxl}` : containerStyle.padding,
      }}
    >
      {typeof title === "string" && title.trim() ? (
        <h2 style={titleStyle}>{title}</h2>
      ) : null}
      {source?.kind === "iframe" ? (
        <motion.iframe
          allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
          allowFullScreen
          animate={isInView ? "onscreen" : "offscreen"}
          className="featured-video__video"
          initial="offscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          src={source.src}
          style={{ border: 0 }}
          title={title?.trim() || "Birdcreek video"}
          variants={videoVariants}
        />
      ) : null}
      {source?.kind === "file" ? (
        // Captions are burned into the rendered MP4 by the Remotion
        // composition (see TandraIntro <Captions>), so no sidecar
        // <track> is needed here.
        <motion.video
          animate={isInView ? "onscreen" : "offscreen"}
          className="featured-video__video"
          controls
          initial="offscreen"
          playsInline
          poster={posterUrl || undefined}
          preload="metadata"
          ref={videoRef}
          src={source.src}
          variants={videoVariants}
        />
      ) : null}
    </div>
  );
};
