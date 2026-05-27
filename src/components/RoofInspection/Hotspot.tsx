import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { mix, theme } from "../../theme";
import { useIsMobile } from "../../hooks/isMobile";
import { useRoofInspection } from "./context";
import type { Chapter, Direction } from "./types";

type HotspotProps = {
  /** The inspection chapter this dot represents. */
  chapter: Chapter;
};

const CALLOUT_W_PX = 272; // 17rem @ 16px base
const GAP = 12; // px gap between dot edge and card edge
const MARGIN = 12; // minimum distance from viewport edge
const CLOSE_DELAY = 180; // ms grace period so mouse can travel dot → card

/**
 * Module-level close timer shared across **all** `Hotspot` instances.
 *
 * @remarks
 * A per-instance `useRef` timer cannot be cancelled from a different
 * component instance. Moving the mouse from dot A to dot B would leave A's
 * timer running, causing it to fire `setActiveChapterId(null)` 180 ms later
 * and close B's freshly opened callout. A module-level variable ensures any
 * instance's `clearSharedClose` cancels whichever timer is currently pending.
 */
let _closeTimer: ReturnType<typeof setTimeout> | null = null;
const clearSharedClose = () => {
  if (_closeTimer) {
    clearTimeout(_closeTimer);
    _closeTimer = null;
  }
};

type ScreenRect = { top: number; left: number; width: number; height: number };

/**
 * Computes `position: fixed` `top`/`left` coordinates for the callout card
 * based on the hotspot dot's viewport rect and the preferred open direction.
 *
 * @param dot - Bounding rect of the slotted wrapper div (the element
 *   `<model-viewer>` positions with CSS transforms).
 * @param direction - Which side of the dot the card should open toward.
 * @param cardH - Measured height of the rendered card, or `0` on the first
 *   pass (triggers a 240 px estimate so layout isn't deferred).
 * @returns Viewport-relative `top` / `left` values clamped to `MARGIN` px
 *   inset from every viewport edge.
 */
const getCardPos = (
  dot: ScreenRect,
  direction: Direction,
  cardH: number,
): { top: number; left: number } => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const estH = cardH || 240;
  let top = 0;
  let left = 0;

  switch (direction) {
    case "top":
      top = dot.top - GAP - estH;
      left = dot.left + dot.width / 2 - CALLOUT_W_PX / 2;
      break;
    case "bottom":
      top = dot.top + dot.height + GAP;
      left = dot.left + dot.width / 2 - CALLOUT_W_PX / 2;
      break;
    case "right":
      top = dot.top + dot.height / 2 - estH / 2;
      left = dot.left + dot.width + GAP;
      break;
    case "left":
      top = dot.top + dot.height / 2 - estH / 2;
      left = dot.left - GAP - CALLOUT_W_PX;
      break;
  }

  left = Math.max(MARGIN, Math.min(left, vw - CALLOUT_W_PX - MARGIN));
  top = Math.max(MARGIN, Math.min(top, vh - estH - MARGIN));

  return { top, left };
};

/**
 * Renders a single numbered inspection hotspot on the 3D roof model.
 *
 * @remarks
 * **3D slot mechanism** — The component registers itself as a named slot
 * (`slot="hotspot-{id}"`) inside `<model-viewer>`. model-viewer projects it
 * onto the 3D surface described by `chapter.position3d` / `chapter.normal3d`
 * and automatically hides the dot when that surface faces away from camera.
 *
 * **Callout portal** — The callout card (`<aside>`) is rendered via
 * `createPortal` into `document.body` so it escapes every `overflow`,
 * `contain`, and stacking-context constraint imposed by `<model-viewer>`'s
 * shadow DOM. Position is computed from the dot's `getBoundingClientRect`
 * and updated on scroll/resize.
 *
 * **Hover grace period** — `mouseLeave` on the dot starts a 180 ms timer
 * before closing. If the mouse enters the card before the timer fires the
 * card stays open, allowing the user to read and interact with the content.
 * The timer is module-level so switching between dots never races.
 *
 * Returns `null` (renders nothing) when `chapter.position3d` is absent,
 * allowing chapters to be created in Sanity before 3D coordinates exist.
 */
export const Hotspot: React.FC<HotspotProps> = ({ chapter }) => {
  // ── All hooks must come before any conditional return ──────────────────────
  const { activeChapterId, setActiveChapterId } = useRoofInspection();
  const isOpen = activeChapterId === chapter.id;
  const isMobile = useIsMobile(700);
  const effectiveDirection: Direction = isMobile ? "bottom" : chapter.direction;

  // Ref to the slotted wrapper div — what model-viewer actually positions
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Ref to the rendered callout aside so we can measure its real height
  const cardRef = useRef<HTMLElement>(null);
  const [cardPos, setCardPos] = useState<{ top: number; left: number } | null>(
    null,
  );

  const scheduleClose = () => {
    clearSharedClose();
    _closeTimer = setTimeout(() => setActiveChapterId(null), CLOSE_DELAY);
  };

  // Cancel any pending close on unmount
  useEffect(() => clearSharedClose, []);

  const is3d = Boolean(chapter.position3d);

  // Measure dot position → compute card placement.
  // Runs once on open, then tracks scroll, resize, AND camera-change so the
  // card follows the dot during model-viewer's camera animation.
  useEffect(() => {
    if (!isOpen) {
      setCardPos(null);
      return;
    }

    const measure = () => {
      const el = wrapperRef.current;
      if (!el) return;
      const dot = el.getBoundingClientRect();
      // Use the card's real height if already rendered, otherwise 0 (getCardPos will use estimate)
      const cardH = cardRef.current?.getBoundingClientRect().height ?? 0;
      setCardPos(getCardPos(dot, effectiveDirection, cardH));
    };

    // Two passes: first rAF gets initial position; second rAF re-measures after
    // the card has painted so we can use its real height for fine-tuning.
    let raf2: number;
    const raf1 = requestAnimationFrame(() => {
      measure();
      raf2 = requestAnimationFrame(measure);
    });

    // model-viewer fires "camera-change" on every frame of a camera animation.
    // Listening here means the callout re-anchors to the dot continuously while
    // the camera pans/rotates (e.g. after a rail click also sets focusChapterId).
    const mv = document.getElementById("mv");

    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    mv?.addEventListener("camera-change", measure);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      mv?.removeEventListener("camera-change", measure);
    };
  }, [isOpen, effectiveDirection]);

  const handleClick = () => setActiveChapterId(isOpen ? null : chapter.id);
  const handleDotEnter = () => {
    clearSharedClose();
    setActiveChapterId(chapter.id);
  };
  const handleDotLeave = scheduleClose;
  const handleCardEnter = clearSharedClose;
  const handleCardLeave = scheduleClose;

  if (!is3d) return null;

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

  // Card is only mounted when isOpen — no DOM at (0,0) between interactions.
  // It renders off-screen (visibility:hidden) for the first rAF while we
  // measure the dot position, then snaps to the correct coords.
  const cardStyle: React.CSSProperties = {
    position: "fixed",
    top: cardPos?.top ?? -9999,
    left: cardPos?.left ?? -9999,
    width: `${CALLOUT_W_PX}px`,
    background: theme.colors.black,
    color: theme.colors.paper,
    padding: "1.125rem 1.375rem 1.375rem",
    zIndex: 9999,
    // Hide until we have a measured position so there's no flash at -9999
    visibility: cardPos ? "visible" : "hidden",
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

  const slotProps = {
    slot: `hotspot-${chapter.id}`,
    "data-position": chapter.position3d,
    "data-normal": chapter.normal3d ?? "",
    "data-visibility-attribute": "visible",
  };

  return (
    <>
      <div ref={wrapperRef} style={wrapperStyle} {...slotProps}>
        <button
          style={buttonStyle}
          aria-label={`${chapter.label} — point ${chapter.id}`}
          aria-expanded={isOpen}
          onClick={handleClick}
          onMouseEnter={handleDotEnter}
          onMouseLeave={handleDotLeave}
        >
          <span style={dotStyle} aria-hidden="true" />
          <span style={numStyle}>{chapter.id}</span>
        </button>
      </div>

      {/* Portal — only mounted while open; card's own handlers keep it alive
          while the mouse travels from the dot into the card. */}
      {isOpen &&
        createPortal(
          <aside
            ref={cardRef}
            style={cardStyle}
            className="stage__hotspot-callout"
            role="dialog"
            aria-label={chapter.callout.title}
            onMouseEnter={handleCardEnter}
            onMouseLeave={handleCardLeave}
          >
            <p style={cardNumStyle}>{chapter.id}.</p>
            <h3 style={cardTitleStyle}>{chapter.callout.title}</h3>
            <p style={cardBodyStyle}>{chapter.callout.body}</p>
            {chapter.callout.watchFor && (
              <>
                <span style={cardWatchLabelStyle}>What to watch for</span>
                <p style={cardWatchStyle}>{chapter.callout.watchFor}</p>
              </>
            )}
          </aside>,
          document.body,
        )}
    </>
  );
};
