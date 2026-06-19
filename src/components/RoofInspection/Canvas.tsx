import type React from "react";

import { mix, theme } from "../../theme";

interface CanvasProps {
  children: React.ReactNode;
  /**
   * Optional italic caption rendered above the diagram with a hairline
   * separator. Preserves the toolbar's orientating text when the tab
   * row itself is parked.
   */
  hint?: string;
}

/**
 * Right-hand column of the RoofInspection layout.
 * Holds an optional hint caption + the Diagram (and Toolbar when active).
 */
export const Canvas: React.FC<CanvasProps> = ({ hint, children }) => {
  const hintRowStyle: React.CSSProperties = {
    paddingBottom: theme.spacing.lg,
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
    <section className="wa-stack wa-gap-m stage__canvas">
      {hint && (
        <div className="layout-flex-end" style={hintRowStyle}>
          <p style={hintTextStyle}>{hint}</p>
        </div>
      )}
      {children}
    </section>
  );
};
