/**
 * Camera-preset tab strip for the 3D roof model.
 *
 * @remarks
 * Renders one `role="tab"` button per `View` in context. Clicking a tab calls
 * `setActiveViewId`, which `Diagram.tsx` watches to imperatively update
 * `<model-viewer>`'s `cameraOrbit`, `cameraTarget`, and `fieldOfView`.
 *
 * Currently not rendered in `Home.tsx` (the component is defined and wired but
 * the `<RoofInspection.Toolbar />` line in the page is commented out). Restore
 * it to surface view-switching controls to users.
 */
import React from "react";
import { mix, theme } from "../../theme";
import { useCameraContext } from "./context";
import { motion } from "motion/react";

type ToolbarProps = {
  /** Instructional copy shown to the right of the tabs. */
  hint?: string;
};

const hairline = mix(theme.colors.everglade, 18);
const mutedText = mix(theme.colors.everglade, 50);

/**
 * Renders the camera-preset tab strip.
 * Tab labels and IDs come from `VIEWS` (passed to the `RoofInspection` root).
 */
export const Toolbar: React.FC<ToolbarProps> = ({
  hint = "Hover or tap a number to learn more.",
}) => {
  const { views, activeViewId, setActiveViewId } = useCameraContext();

  const wrapperStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat( auto-fit, minmax(250px, 1fr) )",
    alignItems: "baseline",
    gap: "2rem",
    paddingBottom: "1.25rem",
    borderBottom: `1px solid ${hairline}`,
  };

  const tabGroupStyle: React.CSSProperties = {
    display: "flex",
    gap: 4,
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
  };

  const tabStyle: React.CSSProperties = {
    padding: "0.5rem 0.875rem",
    border: "1px solid transparent",
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
    fontSize: "inherit",
    fontWeight: "inherit",
    letterSpacing: "inherit",
    textTransform: "inherit",
  };

  const hintStyle: React.CSSProperties = {
    fontFamily: theme.fonts.headlineAlt,
    fontStyle: "italic",
    fontSize: "1rem",
    color: mutedText,
    margin: 0,
    textAlign: "right",
  };

  const variants = {
    initial: { scale: 1, backgroundColor: "transparent", color: mutedText },
    active: { scale: 1, backgroundColor: theme.colors.black, color: theme.colors.paper },
    hover: { scale: 1.05, backgroundColor: theme.colors.black, color: theme.colors.white },
    tap: { scale: 0.95 },
  };

  return (
    <div style={wrapperStyle} role="toolbar" aria-label="Diagram view options">
      <div style={tabGroupStyle} role="tablist">
        {views.map((view) => {
          const isActive = activeViewId === view.id;
          return (
                 <motion.button
                   key={view.id}
                   role="tab"
                   aria-selected={isActive}
                   style={tabStyle}
                   onTap={() => setActiveViewId(view.id)}
                   variants={variants}
                   initial="initial"
                   animate={isActive ? "active" : "initial"}
                   whileHover="hover"
                   whileTap="tap"
                   transition={{ duration: 0.18, ease: "easeOut" }}
                 >
              {view.label}
            </motion.button>
          );
        })}
      </div>
      <p style={hintStyle}>{hint}</p>
    </div>
  );
};
