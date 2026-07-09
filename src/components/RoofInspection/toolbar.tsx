import { motion } from "motion/react";
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
import type React from "react";

import { useIsMobile } from "../../hooks/is-mobile";
import { mix, theme } from "../../theme";
import { useCameraContext } from "./context";

interface ToolbarProps {
  /** Instructional copy shown to the right of the tabs. */
  hint?: string;
}

const hairline = mix(theme.colors.everglade, 18);
const mutedText = theme.palette.everglade["700"];

/**
 * Renders the camera-preset tab strip.
 * Tab labels and IDs come from `VIEWS` (passed to the `RoofInspection` root).
 */
export const Toolbar: React.FC<ToolbarProps> = ({
  hint = "Hover or tap a number to learn more.",
}) => {
  const isMobile = useIsMobile();
  const { views, activeViewId, setActiveViewId } = useCameraContext();

  const wrapperStyle: React.CSSProperties = {
    borderBottom: `1px solid ${hairline}`,
    minWidth: 0,
    paddingBottom: theme.spacing.xl,
  };

  const tabGroupStyle: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: 700,
    gap: 4,
    letterSpacing: "0.2em",
    maxWidth: "100%",
    minWidth: 0,
    rowGap: 8,
    textTransform: "uppercase",
  };

  const tabStyle: React.CSSProperties = {
    border: "1px solid transparent",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: "inherit",
    fontWeight: "inherit",
    letterSpacing: "inherit",
    lineHeight: 1.25,
    maxWidth: "100%",
    minBlockSize: 36,
    padding: `${theme.spacing.sm} ${theme.spacing.cozy}`,
    textAlign: "center",
    textTransform: "inherit",
    whiteSpace: "nowrap",
  };

  const hintStyle: React.CSSProperties = {
    color: mutedText,
    fontFamily: theme.fonts.headlineAlt,
    fontSize: "1rem",
    fontStyle: "italic",
    margin: 0,
    minWidth: 0,
    textAlign: isMobile ? "left" : "right",
  };

  const variants = {
    active: {
      backgroundColor: theme.colors.black,
      color: theme.colors.paper,
      scale: 1,
    },
    hover: {
      backgroundColor: theme.colors.black,
      color: theme.colors.white,
      scale: 1.05,
    },
    initial: { backgroundColor: "rgba(0,0,0,0)", color: mutedText, scale: 1 },
    tap: { scale: 0.95 },
  };

  return (
    <div
      aria-label="Diagram view options"
      className="roof-toolbar wa-gap-2xl"
      role="toolbar"
      style={wrapperStyle}
    >
      <div className="roof-tab-group" role="tablist" style={tabGroupStyle}>
        {views.map((view) => {
          const isActive = activeViewId === view.id;
          return (
            <motion.button
              animate={isActive ? "active" : "initial"}
              aria-selected={isActive}
              initial="initial"
              key={view.id}
              onTap={() => setActiveViewId(view.id)}
              role="tab"
              style={tabStyle}
              transition={{ duration: 0.18, ease: "easeOut" }}
              variants={variants}
              whileHover="hover"
              whileTap="tap"
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
