import type React from "react";

import { theme } from "../../theme";
import { useCameraContext, useRoofInspection } from "./context";

interface RailProps {
  /** Small label above the headline, e.g. `"Tandra Peters · Roof Basics"`. */
  kicker?: string;
  /** One-sentence introduction shown beneath the title. */
  lede: string;
  /** Section headline — accepts a React node so callers can use emphasis markup. */
  title: React.ReactNode;
}

const mutedText = theme.palette.everglade["700"];

/**
 * Left-hand sticky navigation panel for the roof inspection section.
 *
 * @remarks
 * Renders a numbered chapter list where each button has two responsibilities:
 * 1. Sets `activeChapterId` — toggles the hotspot callout visibility on/off.
 * 2. Sets `focusChapterId` — signals `Diagram` to rotate the camera toward
 *    the selected chapter's world-space position.
 *
 * This intentional separation (versus a single shared state) means hover
 * events on the `Hotspot` dots open callouts without moving the camera;
 * only deliberate rail clicks drive camera movement.
 *
 * Sticky positioning and max-height overflow are handled by the `.stage__rail`
 * CSS class (defined in `site-layout.css`), which is disabled on mobile
 * (`width ≤ 700px`) via a media query.
 */
export const Rail: React.FC<RailProps> = ({ kicker, title, lede }) => {
  const { chapters, activeChapterId, setActiveChapterId } = useRoofInspection();
  const { setFocusChapterId } = useCameraContext();

  // Sticky / max-height are handled by .stage__rail in site-layout.css,
  // which also disables sticky on mobile via @media (width <= 700px).

  const kickerStyle: React.CSSProperties = {
    color: theme.palette.purple["600"],
    fontSize: "11px",
    fontWeight: 700,
    gap: theme.spacing.cozy,
    letterSpacing: "0.22em",
    marginBottom: theme.spacing.xxl,
    textTransform: "uppercase",
  };

  const kickerRuleStyle: React.CSSProperties = {
    background: theme.palette.purple["600"],
    flexShrink: 0,
    height: "1px",
    opacity: 0.7,
    width: "1.75rem",
  };

  const titleStyle: React.CSSProperties = {
    color: theme.colors.everglade,
    fontFamily: theme.fonts.headlineAlt,
    fontSize: "clamp(2.25rem, 4vw, 3rem)",
    fontWeight: 400,
    letterSpacing: "-0.01em",
    lineHeight: 0.95,
    margin: `0 0 ${theme.spacing.xxxxl}`,
  };

  const ledeStyle: React.CSSProperties = {
    color: theme.colors.evergladeLight,
    fontSize: "0.95rem",
    lineHeight: 1.6,
    margin: `0 0 ${theme.spacing.xxxxxxl}`,
    maxWidth: "24ch",
  };

  const listStyle: React.CSSProperties = {
    borderTop: `1px solid ${theme.palette.paper[100]}`,
    listStyle: "none",
    margin: 0,
    padding: 0,
  };

  const listItemStyle: React.CSSProperties = {
    marginInlineStart: 0,
  };

  const getChapterButtonStyle = (isActive: boolean): React.CSSProperties => ({
    background: "none",
    borderBottom: `1px solid ${theme.palette.paper[100]}`,
    borderLeft: 0,
    borderRight: 0,
    borderTop: 0,
    color: isActive ? theme.colors.everglade : mutedText,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.18em",
    minHeight: "3rem",
    padding: `${theme.spacing.cozy} ${theme.spacing.sm}`,
    textAlign: "left",
    textTransform: "uppercase",
    transition: "color 180ms ease",
    width: "100%",
  });

  const numStyle: React.CSSProperties = {
    color: theme.palette.purple["700"],
    fontFamily: theme.fonts.headlineAlt,
    fontSize: "1.05rem",
    fontStyle: "italic",
    fontWeight: 700,
    letterSpacing: 0,
    textTransform: "none",
  };

  return (
    <aside className="stage__rail">
      {/* stage__rail-header and stage__rail-nav become direct flex children of
          .stage on mobile via `display: contents` on the aside */}
      <div className="stage__rail-header">
        {kicker ? (
          <div className="wa-cluster" style={kickerStyle}>
            <span aria-hidden="true" style={kickerRuleStyle} />
            <span>{kicker}</span>
          </div>
        ) : null}

        <h2 style={titleStyle}>{title}</h2>
        <p style={ledeStyle}>{lede}</p>
      </div>

      <div className="stage__rail-nav">
        <ol style={listStyle}>
          {chapters.map((chapter) => {
            const isActive = activeChapterId === chapter.id;
            return (
              <li key={chapter.id} style={listItemStyle}>
                <button
                  aria-pressed={isActive}
                  className="layout-chapter-btn"
                  data-active={isActive}
                  onClick={() => {
                    const next = isActive ? null : chapter.id;
                    setActiveChapterId(next);
                    if (next) {
                      setFocusChapterId(next);
                    }
                  }}
                  style={getChapterButtonStyle(isActive)}
                  type="button"
                >
                  <span style={numStyle}>{chapter.id}</span>
                  <span>{chapter.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
};
