import React from "react";
import { mix, theme } from "../../theme";

type CanvasProps = {
  /**
   * Optional italic caption rendered above the diagram with a hairline
   * separator. Preserves the toolbar's orientating text when the tab
   * row itself is parked.
   */
  hint?: string;
  children: React.ReactNode;
};

/**
 * Right-hand column of the RoofInspection layout.
 * Holds an optional hint caption + the Diagram (and Toolbar when active).
 */
export const Canvas: React.FC<CanvasProps> = ({ hint, children }) => {
  const canvasStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  };

  const hintRowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "flex-end",
    paddingBottom: "1rem",
    borderBottom: `1px solid ${mix(theme.colors.everglade, 18)}`,
  };

  const hintTextStyle: React.CSSProperties = {
    fontFamily: theme.fonts.headlineAlt,
    fontStyle: "italic",
    fontSize: "0.95rem",
    color: mix(theme.colors.everglade, 55),
    margin: 0,
  };

  return (
    <section style={canvasStyle} className="stage__canvas">
      {hint && (
        <div style={hintRowStyle}>
          <p style={hintTextStyle}>{hint}</p>
        </div>
      )}
      {children}
    </section>
  );
};
