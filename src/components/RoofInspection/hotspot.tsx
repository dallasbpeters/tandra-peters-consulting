import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useIsMobile } from "../../hooks/is-mobile";
import { mix, theme } from "../../theme";
import { useRoofInspection } from "./context";
import { syncModelViewerHotspot } from "./model-viewer-hotspot";
import type { Chapter, Direction } from "./types";

interface HotspotProps {
  /** The inspection chapter this dot represents. */
  chapter: Chapter;
}

const CALLOUT_W_PX = 272; // 17rem @ 16px base
const GAP = 12; // px gap between dot edge and card edge
const MARGIN = 12; // minimum distance from viewport edge
const CLOSE_DELAY = 180; // ms grace period so mouse can travel dot → card
const MIN_CALLOUT_H_PX = 120;

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

interface ScreenRect {
  height: number;
  left: number;
  top: number;
  width: number;
}
interface CardPos {
  left: number;
  maxHeight: number;
  top: number;
  width: number;
}

const getTopSafeInset = () => {
  const nav = document.querySelector(".site-nav-vt");
  if (!(nav instanceof HTMLElement)) {
    return MARGIN;
  }
  const navBottom = nav.getBoundingClientRect().bottom;
  return Math.max(MARGIN, Math.ceil(navBottom) + MARGIN);
};

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
  cardH: number
): CardPos => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const topInset = getTopSafeInset();
  const width = Math.min(CALLOUT_W_PX, Math.max(220, vw - MARGIN * 2));
  const estH = cardH || 240;
  const maxViewportHeight = Math.max(MIN_CALLOUT_H_PX, vh - topInset - MARGIN);
  const topAvailable = dot.top - GAP - topInset;
  const resolvedDirection: Direction =
    direction === "top" && topAvailable < 220 ? "bottom" : direction;
  let maxHeight = maxViewportHeight;
  let renderH = Math.min(estH, maxHeight);
  let top = 0;
  let left = 0;

  switch (resolvedDirection) {
    case "top": {
      maxHeight = Math.max(MIN_CALLOUT_H_PX, dot.top - GAP - topInset);
      maxHeight = Math.min(maxHeight, maxViewportHeight);
      renderH = Math.min(estH, maxHeight);
      top = dot.top - GAP - renderH;
      left = dot.left + dot.width / 2 - width / 2;
      break;
    }
    case "bottom": {
      maxHeight = Math.max(
        MIN_CALLOUT_H_PX,
        vh - (dot.top + dot.height + GAP) - MARGIN
      );
      maxHeight = Math.min(maxHeight, maxViewportHeight);
      renderH = Math.min(estH, maxHeight);
      top = dot.top + dot.height + GAP;
      left = dot.left + dot.width / 2 - width / 2;
      break;
    }
    case "right": {
      top = dot.top + dot.height / 2 - renderH / 2;
      left = dot.left + dot.width + GAP;
      break;
    }
    case "left": {
      top = dot.top + dot.height / 2 - renderH / 2;
      left = dot.left - GAP - width;
      break;
    }
    default: {
      break;
    }
  }

  left = Math.max(MARGIN, Math.min(left, vw - width - MARGIN));
  top = Math.max(topInset, Math.min(top, vh - renderH - MARGIN));

  return { left, maxHeight, top, width };
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
  const effectiveDirection: Direction = isMobile ? "top" : chapter.direction;

  // Ref to the slotted wrapper div — what model-viewer actually positions
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Ref to the rendered callout aside so we can measure its real height
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardPos, setCardPos] = useState<CardPos | null>(null);

  const scheduleClose = useCallback(() => {
    clearSharedClose();
    _closeTimer = setTimeout(() => setActiveChapterId(null), CLOSE_DELAY);
  }, [setActiveChapterId]);

  // Cancel any pending close on unmount
  useEffect(() => clearSharedClose, []);

  // Keep the callout open while the cursor travels from the dot to the card.
  // Imperative listeners avoid putting mouse handlers on the non-interactive div.
  useEffect(() => {
    const el = cardRef.current;
    if (!el) {
      return;
    }
    el.addEventListener("mouseenter", clearSharedClose);
    el.addEventListener("mouseleave", scheduleClose);
    return () => {
      el.removeEventListener("mouseenter", clearSharedClose);
      el.removeEventListener("mouseleave", scheduleClose);
    };
  }, [scheduleClose]);

  // model-viewer reads data-position only when a slotted child is added.
  // Attribute edits alone do not move dots — call updateHotspot (or remount).
  useEffect(() => {
    const el = wrapperRef.current;
    if (!(el && chapter.position3d)) {
      return;
    }

    el.dataset.position = chapter.position3d;
    if (chapter.normal3d) {
      el.dataset.normal = chapter.normal3d;
    } else {
      delete el.dataset.normal;
    }

    syncModelViewerHotspot(
      `hotspot-${chapter.id}`,
      chapter.position3d,
      chapter.normal3d
    );
  }, [chapter.id, chapter.position3d, chapter.normal3d]);

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
      if (!el) {
        return;
      }
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
    const mv = document.querySelector("#mv");

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

  if (!is3d) {
    return null;
  }

  const wrapperStyle: React.CSSProperties = {
    height: "3rem",
    position: "relative",
    width: "3rem",
  };

  const buttonStyle: React.CSSProperties = {
    background: "transparent",
    border: 0,
    cursor: "pointer",
    height: "3.5rem",
    padding: 0,
    position: "relative",
    width: "3.5rem",
  };

  const dotStyle: React.CSSProperties = {
    background: theme.colors.heroAccent,
    borderRadius: theme.radius.pill,
    boxShadow: `0 0 0 5px ${mix(theme.colors.heroAccent, 25)}`,
    inset: "0.75rem",
    position: "absolute",
    transform: isOpen ? "scale(1.25)" : "scale(1)",
    transition: "transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1)",
  };

  const numStyle: React.CSSProperties = {
    color: theme.colors.black,
    fontFamily: theme.fonts.body,
    fontSize: "1.5rem",
    fontWeight: 600,
    pointerEvents: "none",
    position: "relative",
    userSelect: "none",
    zIndex: 1,
  };

  // Card is only mounted when isOpen — no DOM at (0,0) between interactions.
  // It renders off-screen (visibility:hidden) for the first rAF while we
  // measure the dot position, then snaps to the correct coords.
  const cardStyle: React.CSSProperties = {
    background: theme.colors.black,
    color: theme.colors.paper,
    left: cardPos?.left ?? -9999,
    maxHeight: `${cardPos?.maxHeight ?? window.innerHeight - MARGIN * 2}px`,
    overflowY: "auto",
    padding: `${theme.spacing.stackPad} ${theme.spacing.insetXl} ${theme.spacing.insetXl}`,
    position: "fixed",
    top: cardPos?.top ?? -9999,
    // Hide until we have a measured position so there's no flash at -9999
    visibility: cardPos ? "visible" : "hidden",

    width: `${cardPos?.width ?? CALLOUT_W_PX}px`,
    zIndex: 9999,
  };

  const cardNumStyle: React.CSSProperties = {
    color: theme.colors.heroAccent,
    fontFamily: theme.fonts.headlineAlt,
    fontSize: "1rem",
    fontStyle: "italic",
    margin: `0 0 ${theme.spacing.tight}`,
  };

  const cardTitleStyle: React.CSSProperties = {
    color: theme.colors.paper,
    fontFamily: theme.fonts.headlineAlt,
    fontSize: "1.575rem",
    fontWeight: 400,
    lineHeight: 1.1,
    margin: `0 0 ${theme.spacing.compact}`,
  };

  const cardBodyStyle: React.CSSProperties = {
    color: mix(theme.colors.paper, 80),
    fontSize: "1.025rem",
    lineHeight: 1.6,
    margin: `0 0 ${theme.spacing.md}`,
  };

  const cardWatchLabelStyle: React.CSSProperties = {
    color: theme.colors.heroAccent,
    display: "block",
    fontSize: "0.825rem",
    fontWeight: 700,
    letterSpacing: "0.22em",
    margin: `${theme.spacing.cozy} 0 ${theme.spacing.nudge}`,
    textTransform: "uppercase",
  };

  const cardWatchStyle: React.CSSProperties = {
    color: mix(theme.colors.paper, 65),
    fontSize: "0.9rem",
    lineHeight: 1.55,
    margin: 0,
  };

  const slotProps = {
    "data-normal": chapter.normal3d ?? "",
    "data-position": chapter.position3d,
    "data-visibility-attribute": "visible",
    slot: `hotspot-${chapter.id}`,
  };

  return (
    <>
      <div ref={wrapperRef} style={wrapperStyle} {...slotProps}>
        <button
          aria-expanded={isOpen}
          aria-label={`${chapter.label} — point ${chapter.id}`}
          className="layout-flex-center"
          onClick={handleClick}
          onMouseEnter={handleDotEnter}
          onMouseLeave={handleDotLeave}
          style={buttonStyle}
          type="button"
        >
          <span aria-hidden="true" style={dotStyle} />
          <span style={numStyle}>{chapter.id}</span>
        </button>
      </div>

      {/* Portal — only mounted while open; useEffect on cardRef attaches
          mouseenter/mouseleave so the card stays open while the cursor travels
          from the dot to the card (see imperative effect above). */}
      {isOpen &&
        createPortal(
          <div
            aria-label={chapter.callout.title}
            className="stage__hotspot-callout"
            ref={cardRef}
            role="dialog"
            style={cardStyle}
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
          </div>,
          document.body
        )}
    </>
  );
};
