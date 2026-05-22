import React, { useEffect, useRef, useState } from "react";
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

const calloutW = "17rem";

/** Returns inline style to position the callout card for each direction. */
const getCalloutPositionStyle = (
  direction: Direction,
  isOpen: boolean,
): React.CSSProperties => {
  const gap = "0.75rem";
  const closedShift = "8px";
  const openShift = "0px";

  const base: React.CSSProperties = {
    position: "absolute",
    zIndex: 10,
    width: calloutW,
    pointerEvents: isOpen ? "auto" : "none",
    opacity: isOpen ? 1 : 0,
    transition: "opacity 220ms ease, transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1)",
  };

  switch (direction) {
    case "top":
      return {
        ...base,
        bottom: `calc(100% + ${gap})`,
        left: "50%",
        transform: isOpen
          ? "translate(-50%, 0)"
          : `translate(-50%, ${closedShift})`,
      };
    case "bottom":
      return {
        ...base,
        top: `calc(100% + ${gap})`,
        left: "50%",
        transform: isOpen
          ? "translate(-50%, 0)"
          : `translate(-50%, -${closedShift})`,
      };
    case "right":
      return {
        ...base,
        top: "50%",
        left: `calc(100% + ${gap})`,
        transform: isOpen
          ? "translateY(-50%)"
          : `translateY(calc(-50% + ${closedShift}))`,
      };
    case "left":
      return {
        ...base,
        top: "50%",
        right: `calc(100% + ${gap})`,
        transform: isOpen
          ? "translateY(-50%)"
          : `translateY(calc(-50% + ${closedShift}))`,
      };
  }
};

export const Hotspot: React.FC<HotspotProps> = ({ chapter }) => {
  const { activeChapterId, setActiveChapterId } = useRoofInspection();
  const isOpen = activeChapterId === chapter.id;
  const isMobile = useIsMobile();
  const effectiveDirection: Direction = isMobile ? "bottom" : chapter.direction;

  // Edge-detection: measure the card's natural viewport position when it
  // opens, then nudge it back on-screen if any edge is violated.
  const calloutRef = useRef<HTMLElement>(null);
  const [nudge, setNudge] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    // Reset nudge immediately so the card renders at its natural position.
    setNudge({ x: 0, y: 0 });

    if (!isOpen) return;

    // Measure after the browser has painted the natural position.
    const raf = requestAnimationFrame(() => {
      const el = calloutRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const MARGIN = 12;

      let x = 0;
      let y = 0;

      if (rect.right > vw - MARGIN) x = vw - MARGIN - rect.right;
      else if (rect.left < MARGIN) x = MARGIN - rect.left;

      if (rect.top < MARGIN) y = MARGIN - rect.top;
      else if (rect.bottom > vh - MARGIN) y = vh - MARGIN - rect.bottom;

      if (x !== 0 || y !== 0) setNudge({ x, y });
    });

    return () => cancelAnimationFrame(raf);
  }, [isOpen]);

  const handleClick = () =>
    setActiveChapterId(isOpen ? null : chapter.id);

  const handleMouseEnter = () => setActiveChapterId(chapter.id);
  const handleMouseLeave = () => setActiveChapterId(null);

  const wrapperStyle: React.CSSProperties = {
    position: "absolute",
    top: chapter.position.top,
    left: chapter.position.left,
    // Centre the 2.25rem button on the coordinate point
    marginTop: "-1.125rem",
    marginLeft: "-1.125rem",
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

  // Callout card — direction is forced to "bottom" on mobile.
  // The `translate` CSS property composites on top of `transform` so the
  // open/close animation is unaffected while the nudge corrects edge overflow.
  const cardStyle: React.CSSProperties = {
    ...getCalloutPositionStyle(effectiveDirection, isOpen),
    background: theme.colors.black,
    color: theme.colors.paper,
    padding: "1.125rem 1.375rem 1.375rem",
    ...(nudge.x !== 0 || nudge.y !== 0
      ? { translate: `${nudge.x}px ${nudge.y}px` }
      : {}),
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

  return (
    <div style={wrapperStyle}>
      <button
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

      <aside
        ref={calloutRef}
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
      </aside>
    </div>
  );
};
