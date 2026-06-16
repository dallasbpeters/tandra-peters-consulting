import { ArrowRight } from "iconoir-react";
import { motion } from "motion/react";
import React from "react";

import { theme } from "../../theme";
import { primaryButtonStyle } from "./styles";

interface EstimatorIntroProps {
  content: {
    startButtonLabel?: string;
    totalSteps: number;
  };
  onStart: () => void;
  direction: number;
  slideVariants: React.ComponentProps<typeof motion.div>["variants"];
}

export const EstimatorIntro = ({
  content,
  onStart,
  direction,
  slideVariants,
}: EstimatorIntroProps) => (
  <motion.div
    key="intro"
    custom={direction}
    variants={slideVariants}
    initial="enter"
    animate="center"
    exit="exit"
    transition={{ duration: 0.3 }}
  >
    <h2 style={cardHeadingStyle}>Ready for a ballpark?</h2>
    <p style={helpStyle}>
      {content.totalSteps} quick question{content.totalSteps === 1 ? "" : "s"}, about a minute.
      {" You'll see an honest price range at the end - no obligation."}
    </p>

    <button type="button" onClick={onStart} style={primaryButtonStyle}>
      <span>{content.startButtonLabel ?? "Estimate my roof"}</span>
      <ArrowRight width={18} height={18} />
    </button>
  </motion.div>
);

const cardHeadingStyle: React.CSSProperties = {
  fontSize: "clamp(1.6rem, 4vw, 2.25rem)",
  lineHeight: 1.15,
  fontFamily: theme.fonts.headline,
  fontWeight: 800,
  color: theme.colors.everglade,
  margin: 0,
};

const helpStyle: React.CSSProperties = {
  color: theme.colors.everglade,
  fontSize: "1rem",
  lineHeight: 1.6,
  margin: "0.5rem 0 0",
};
