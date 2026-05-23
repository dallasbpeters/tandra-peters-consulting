import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { mix, theme } from "../../theme";
import { useRoofInspection } from "./context";
import type { Chapter, Direction } from "./types";

const useIsMobile = (): boolean => {
  const query = "(max-width: 700px)";
  const [matches, setMatches] = useState<boolean>(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return matches;
};

type HotspotProps = {
  chapter: Chapter;
};

const CALLOUT_W_PX = 272; // 17rem @ 16px base
const GAP = 12; // px between button and card edge
const MARGIN = 12; // minimum distance from viewport edge

type ScreenRect = { top: number; left: number; width: number; height: number };

/**
 * Compute the card's top/left in viewport coordinates based on the button's
 * bounding rect and the desired direction. Nudges back on-screen if any edge
 * would be violated.
 */
const getCardPos = (
  btn: ScreenRect,
  direction: Direction,
): { top: number; left: number } => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let top = 0;
  let left = 0;

  switch (direction) {
    case "top":
      top = btn.top - GAP; // card bottom sits at btn top − gap; finalised below
      left = btn.left + btn.width / 2 - CALLOUT_W_PX / 2;
      break;
    case "bottom":
      top = btn.top + btn.height + GAP;
      left = btn.left + btn.width / 2 - CALLOUT_W_PX / 2;
      break;
    case "right":
      top = btn.top + btn.height / 2; // vertical centre; finalised below
      left = btn.left + btn.width + GAP;
      break;
    case "left":
      top = btn.top + btn.height / 2;
      left = btn.left - GAP - CALLOUT_W_PX;
      break;
  }

  // Clamp horizontal
  left = Math.max(MARGIN, Math.min(left, vw - CALLOUT_W_PX - MARGIN));

  // For top/bottom the card height is unknown; use a generous estimate (220px)
  const estH = 220;
  if (direction === "top") top = top - estH; // card bottom = btn.top − gap → top = that − height
  if (direction === "right" || direction === "left") top = top - estH / 2;

  top = Math.max(MARGIN, Math.min(top, vh - estH - MARGIN));

  return { top, left };
};

export const Hotspot: React.FC<HotspotProps> = ({ chapter }) => {
  // ── All hooks must come before any conditional return ──────────────────────
  const { activeChapterId, setActiveChapterId } = useRoofInspection();
  const isOpen = activeChapterId === chapter.id;
  const isMobile = useIsMobile();
  const effectiveDirection: Direction = isMobile ? "bottom" : chapter.direction;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [cardPos, setCardPos] = useState<{ top: number; left: number } | null>(null);

  // No 3D coords yet — skip rendering but hooks above still ran
  const is3d = Boolean(chapter.position3d);

  // When the callout opens, measure the button's viewport position and derive
  // where the card should appear. Re-measure on scroll/resize so it tracks.
  useEffect(() => {
    if (!isOpen) {
      setCardPos(null);
      return;
    }

    const measure = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      setCardPos(getCardPos(r, effectiveDirection));
    };

    // First measure after paint so model-viewer has positioned the slot element
    const raf = requestAnimationFrame(measure);
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [isOpen, effectiveDirection]);

  const handleClick = () => setActiveChapterId(isOpen ? null : chapter.id);
  const handleMouseEnter = () => setActiveChapterId(chapter.id);
  const handleMouseLeave = () => setActiveChapterId(null);

  // Chapters without 3D coords don't render — hooks above already ran safely
  if (!is3d) return null;

  // The wrapper is slotted into model-viewer — keep it minimal.
  // The callout card is rendered via a portal into document.body so it's
  // completely outside any overflow / contain clipping context.
  const wrapperStyle: React.CSSProperties = {
    position: "relative",
    width: "3rem",
    height: "3rem",
  };

  const buttonStyle: React.CSSProperties = {
    position: "relative",
    width: "3rem",
    height: "3rem",
    background: "transparent",
    border: 0,
    padding: 0,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  // Inner filled dot
  const dotStyle: React.CSSProperties = {
    position: "absolute",
    inset: "0.75rem",
    borderRadius: "50%",
    background: theme.colors.heroAccent,
    boxShadow: `0 0 0 5px ${mix(theme.colors.heroAccent, 25)}`,
    transform: isOpen ? "scale(1.25)" : "scale(1)",
    transition: "transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1)",
  };

  const numStyle: React.CSSProperties = {
    fontFamily: theme.fonts.body,
    fontSize: "1rem",
    fontWeight: 600,
    color: theme.colors.black,
    position: "relative",
    zIndex: 1,
    pointerEvents: "none",
    userSelect: "none",
  };

  // Callout card — rendered into document.body via a portal so it sits
  // completely outside any overflow / contain clipping context.
  const cardStyle: React.CSSProperties = {
    position: "fixed",
    top: cardPos?.top ?? 0,
    left: cardPos?.left ?? 0,
    width: `${CALLOUT_W_PX}px`,
    background: theme.colors.black,
    color: theme.colors.paper,
    padding: "1.125rem 1.375rem 1.375rem",
    zIndex: 9999,
    pointerEvents: isOpen ? "auto" : "none",
    opacity: isOpen && cardPos ? 1 : 0,
    transition: "opacity 220ms ease",
  };

  const cardNumStyle: React.CSSProperties = {
    fontFamily: theme.fonts.headlineAlt,
    fontStyle: "italic",
    fontSize: "0.85rem",
    color: theme.colors.heroAccent,
    margin: "0 0 0.375rem",
  };

  const cardTitleStyle: React.CSSProperties = {
    fontFamily: theme.fonts.headlineAlt,
    fontWeight: 400,
    fontSize: "1.375rem",
    lineHeight: 1.1,
    margin: "0 0 0.625rem",
    color: theme.colors.paper,
  };

  const cardBodyStyle: React.CSSProperties = {
    fontSize: "0.8125rem",
    lineHeight: 1.6,
    color: mix(theme.colors.paper, 80),
    margin: "0 0 0.75rem",
  };

  const cardWatchLabelStyle: React.CSSProperties = {
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: theme.colors.heroAccent,
    margin: "0.875rem 0 0.3rem",
    display: "block",
  };

  const cardWatchStyle: React.CSSProperties = {
    fontSize: "0.8rem",
    lineHeight: 1.55,
    color: mix(theme.colors.paper, 65),
    margin: 0,
  };

  // 3D slot props — only applied when position3d is present.
  // model-viewer reads these to project the element onto the 3D surface.
  const slotProps = is3d
    ? {
        slot: `hotspot-${chapter.id}`,
        "data-position": chapter.position3d,
        "data-normal": chapter.normal3d ?? "",
        "data-visibility-attribute": "visible",
      }
    : {};

  const callout = createPortal(
    <aside
      style={cardStyle}
      className="ri-hotspot-callout"
      role="dialog"
      aria-label={chapter.callout.title}
      aria-hidden={!isOpen}
    >
      <p style={cardNumStyle}>{chapter.id}.</p>
      <h3 style={cardTitleStyle}>{chapter.callout.title}</h3>
      <p style={cardBodyStyle}>{chapter.callout.body}</p>
      <span style={cardWatchLabelStyle}>What to watch for</span>
      <p style={cardWatchStyle}>{chapter.callout.watchFor}</p>
    </aside>,
    document.body,
  );

  return (
    <>
      <div style={wrapperStyle} {...slotProps}>
        <button
          ref={buttonRef}
          style={buttonStyle}
          aria-label={`${chapter.label} — point ${chapter.id}`}
          aria-expanded={isOpen}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <span style={dotStyle} aria-hidden="true" />
          <span style={numStyle}>{chapter.id}</span>
        </button>
      </div>
      {callout}
    </>
  );
};
