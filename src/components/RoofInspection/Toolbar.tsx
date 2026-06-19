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

import { useIsMobile } from "../../hooks/isMobile";
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
    paddingBottom: theme.spacing.xl,
    borderBottom: `1px solid ${hairline}`,
    minWidth: 0,
  };

  const tabGroupStyle: React.CSSProperties = {
    gap: 4,
    rowGap: 8,
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    minWidth: 0,
    maxWidth: "100%",
  };

  const tabStyle: React.CSSProperties = {
    padding: `${theme.spacing.sm} ${theme.spacing.cozy}`,
    border: "1px solid transparent",
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
    fontSize: "inherit",
    fontWeight: "inherit",
    letterSpacing: "inherit",
    textTransform: "inherit",
    minBlockSize: 36,
    maxWidth: "100%",
    textAlign: "center",
    lineHeight: 1.25,
  };

  const hintStyle: React.CSSProperties = {
    fontFamily: theme.fonts.headlineAlt,
    fontStyle: "italic",
    fontSize: "1rem",
    color: mutedText,
    margin: 0,
    textAlign: isMobile ? "left" : "right",
    minWidth: 0,
  };

  const variants = {
    initial: { scale: 1, backgroundColor: "transparent", color: mutedText },
    active: {
      scale: 1,
      backgroundColor: theme.colors.black,
      color: theme.colors.paper,
    },
    hover: {
      scale: 1.05,
      backgroundColor: theme.colors.black,
      color: theme.colors.white,
    },
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
