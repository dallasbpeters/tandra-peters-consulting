/**
 * Toolbar — view-switcher tabs for the RoofInspection diagram.
 *
 * PARKED: currently not rendered in Home.tsx.
 *
 * The tabs ("Cutaway view", "At the eave", "At a penetration") become
 * genuinely useful once the diagram is replaced with a 3D asset:
 *   1. Export the roof model from Blender/CAD as glTF.
 *   2. Replace <Diagram> with a Three.js <Canvas> (e.g. @react-three/fiber).
 *   3. Map each View id to an OrbitControls target position + camera zoom.
 *   4. Uncomment <RoofInspection.Toolbar /> in Home.tsx.
 *
 * Until then, `activeViewId` from context is wired but unused.
 */
import React from "react";
import { mix, theme } from "../../theme";
import { useRoofInspection } from "./context";

type ToolbarProps = {
  hint?: string;
};

const hairline = mix(theme.colors.everglade, 18);
const mutedText = mix(theme.colors.everglade, 50);

export const Toolbar: React.FC<ToolbarProps> = ({
  hint = "Hover or tap a number to learn more.",
}) => {
  const { views, activeViewId, setActiveViewId } = useRoofInspection();

  const wrapperStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "2rem",
    paddingBottom: "1.25rem",
    borderBottom: `1px solid ${hairline}`,
  };

  const tabGroupStyle: React.CSSProperties = {
    display: "flex",
    gap: 0,
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
  };

  const getTabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: "0.5rem 0.875rem",
    background: isActive ? theme.colors.black : "transparent",
    color: isActive ? theme.colors.paper : mutedText,
    border: "1px solid transparent",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "inherit",
    fontWeight: "inherit",
    letterSpacing: "inherit",
    textTransform: "inherit",
    transition: "color 180ms ease, background 180ms ease",
  });

  const hintStyle: React.CSSProperties = {
    fontFamily: theme.fonts.headlineAlt,
    fontStyle: "italic",
    fontSize: "1rem",
    color: mutedText,
    margin: 0,
  };

  return (
    <div style={wrapperStyle} role="toolbar" aria-label="Diagram view options">
      <div style={tabGroupStyle} role="tablist">
        {views.map((view) => {
          const isActive = activeViewId === view.id;
          return (
            <button
              key={view.id}
              role="tab"
              aria-selected={isActive}
              style={getTabStyle(isActive)}
              onClick={() => setActiveViewId(view.id)}
            >
              {view.label}
            </button>
          );
        })}
      </div>
      <p style={hintStyle}>{hint}</p>
    </div>
  );
};
