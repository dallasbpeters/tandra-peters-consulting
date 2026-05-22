import React from "react";
import { mix, theme } from "../../theme";
import { useRoofInspection } from "./context";

type RailProps = {
  kicker?: string;
  title: React.ReactNode;
  lede: string;
};

const hairline = mix(theme.colors.paper, 14);
const mutedText = mix(theme.colors.everglade, 50);

export const Rail: React.FC<RailProps> = ({
  kicker = "Tandra Peters · Roof Basics",
  title,
  lede,
}) => {
  const { chapters, activeChapterId, setActiveChapterId } =
    useRoofInspection();

  const railStyle: React.CSSProperties = {
    position: "sticky",
    top: "3rem",
    alignSelf: "start",
    maxHeight: "calc(100vh - 6rem)",
    overflowY: "auto",
  };

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
    padding: "0.875rem 0",
    borderBottom: `1px solid ${theme.palette.paper[100]}`,
    borderTop: 0,
    borderLeft: 0,
    borderRight: 0,
    cursor: "pointer",
    display: "grid",
    gridTemplateColumns: "1.75rem 1fr",
    gap: "0.75rem",
    alignItems: "center",
    color: isActive ? theme.colors.everglade : mutedText,
    background: "none",
    textAlign: "left",
    width: "100%",
    fontFamily: "inherit",
    transition: "color 180ms ease",
  });

  const numStyle: React.CSSProperties = {
    fontFamily: theme.fonts.headlineAlt,
    fontStyle: "italic",
    fontSize: "1.05rem",
    fontWeight: 400,
    letterSpacing: 0,
    textTransform: "none",
    color: theme.colors.heroAccent,
  };

  return (
    <aside style={railStyle}>
      <div style={kickerStyle}>
        <span style={kickerRuleStyle} aria-hidden="true" />
        <span>{kicker}</span>
      </div>

      <h2 style={titleStyle}>{title}</h2>
      <p style={ledeStyle}>{lede}</p>

      <ol style={listStyle} role="list">
        {chapters.map((chapter) => {
          const isActive = activeChapterId === chapter.id;
          return (
            <li key={chapter.id}>
              <button
                style={getChapterButtonStyle(isActive)}
                data-active={isActive}
                onClick={() =>
                  setActiveChapterId(isActive ? null : chapter.id)
                }
                aria-pressed={isActive}
              >
                <span style={numStyle}>{chapter.id}</span>
                <span>{chapter.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
};
