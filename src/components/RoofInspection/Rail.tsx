import React from "react";
import { mix, theme } from "../../theme";
import { useCameraContext, useRoofInspection } from "./context";

type RailProps = {
  /** Small label above the headline, e.g. `"Tandra Peters · Roof Basics"`. */
  kicker?: string;
  /** Section headline — accepts a React node so callers can use emphasis markup. */
  title: React.ReactNode;
  /** One-sentence introduction shown beneath the title. */
  lede: string;
};

const hairline = mix(theme.colors.paper, 14);
const mutedText = mix(theme.colors.everglade, 50);

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
 * Sticky positioning and max-height overflow are handled by the `.ri-rail`
 * CSS class (defined in `site-layout.css`), which is disabled on mobile
 * (`width ≤ 700px`) via a media query.
 */
export const Rail: React.FC<RailProps> = ({
  kicker = "Tandra Peters · Roof Basics",
  title,
  lede,
}) => {
  const { chapters, activeChapterId, setActiveChapterId } = useRoofInspection();
  const { setFocusChapterId } = useCameraContext();

  // Sticky / max-height are handled by .ri-rail in site-layout.css,
  // which also disables sticky on mobile via @media (width <= 700px).
  const railStyle: React.CSSProperties = {};

  const kickerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.875rem",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: theme.colors.heroAccent,
    marginBottom: "1.5rem",
  };

  const kickerRuleStyle: React.CSSProperties = {
    width: "1.75rem",
    height: "1px",
    background: theme.colors.heroAccent,
    opacity: 0.7,
    flexShrink: 0,
  };

  const titleStyle: React.CSSProperties = {
    fontFamily: theme.fonts.headlineAlt,
    fontWeight: 400,
    fontSize: "clamp(2.25rem, 4vw, 3rem)",
    lineHeight: 0.95,
    letterSpacing: "-0.01em",
    margin: "0 0 2rem",
    color: theme.colors.everglade,
  };

  const ledeStyle: React.CSSProperties = {
    fontSize: "0.95rem",
    lineHeight: 1.6,
    color: theme.colors.evergladeLight,
    maxWidth: "24ch",
    margin: "0 0 2.5rem",
  };

  const listStyle: React.CSSProperties = {
    listStyle: "none",
    padding: 0,
    margin: 0,
    borderTop: `1px solid ${theme.palette.paper[100]}`,
  };

  const getChapterButtonStyle = (isActive: boolean): React.CSSProperties => ({
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    padding: "0.875rem .5rem",
    borderBottom: `1px solid ${theme.palette.paper[100]}`,
    borderTop: 0,
    borderLeft: 0,
    borderRight: 0,
    cursor: "pointer",
    display: "grid",
    gridTemplateColumns: "1.75rem 1fr",
    alignItems: "center",
    color: isActive ? theme.colors.everglade : mutedText,
    background: "none",
    textAlign: "left",
    width: "100%",
    fontFamily: "inherit",
    transition: "color 180ms ease",
    minHeight: "3rem",
  });

  const numStyle: React.CSSProperties = {
    fontFamily: theme.fonts.headlineAlt,
    fontStyle: "italic",
    fontSize: "1.05rem",
    fontWeight: 700,
    letterSpacing: 0,
    textTransform: "none",
    color: theme.palette.purple[500],
  };

  return (
    <aside style={railStyle} className="ri-rail">
      {/* ri-rail-header and ri-rail-nav become direct flex children of
          .ri-stage on mobile via `display: contents` on the aside */}
      <div className="ri-rail-header">
        <div style={kickerStyle}>
          <span style={kickerRuleStyle} aria-hidden="true" />
          <span>{kicker}</span>
        </div>

        <h2 style={titleStyle}>{title}</h2>
        <p style={ledeStyle}>{lede}</p>
      </div>

      <div className="ri-rail-nav">
        <ol style={listStyle} role="list">
          {chapters.map((chapter) => {
            const isActive = activeChapterId === chapter.id;
            return (
              <li key={chapter.id}>
                <button
                  style={getChapterButtonStyle(isActive)}
                  data-active={isActive}
                  onClick={() => {
                    const next = isActive ? null : chapter.id;
                    setActiveChapterId(next);
                    if (next) setFocusChapterId(next);
                  }}
                  aria-pressed={isActive}
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
