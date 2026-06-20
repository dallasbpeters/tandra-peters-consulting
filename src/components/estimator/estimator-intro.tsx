import { ArrowRight } from "iconoir-react";
import { motion } from "motion/react";
import type React from "react";

import { theme } from "../../theme";
import { primaryButtonStyle } from "./styles";

interface EstimatorIntroProps {
  content: {
    startButtonLabel?: string;
    totalSteps: number;
  };
  direction: number;
  onStart: () => void;
  slideVariants: React.ComponentProps<typeof motion.div>["variants"];
}

export const EstimatorIntro = ({
  content,
  onStart,
  direction,
  slideVariants,
}: EstimatorIntroProps) => (
  <motion.div
    animate="center"
    custom={direction}
    exit="exit"
    initial="enter"
    key="intro"
    transition={{ duration: 0.3 }}
    variants={slideVariants}
  >
    <h2 style={cardHeadingStyle}>Ready for a ballpark?</h2>
    <p style={helpStyle}>
      {content.totalSteps} quick question{content.totalSteps === 1 ? "" : "s"},
      about a minute.
      {" You'll see an honest price range at the end - no obligation."}
    </p>

    <button onClick={onStart} style={primaryButtonStyle} type="button">
      <span>{content.startButtonLabel ?? "Estimate my roof"}</span>
      <ArrowRight height={18} width={18} />
    </button>
  </motion.div>
);

const cardHeadingStyle: React.CSSProperties = {
  color: theme.colors.everglade,
  fontFamily: theme.fonts.headline,
  fontSize: "clamp(1.6rem, 4vw, 2.25rem)",
  fontWeight: 800,
  lineHeight: 1.15,
  margin: 0,
};

const helpStyle: React.CSSProperties = {
  color: theme.colors.everglade,
  fontSize: "1rem",
  lineHeight: 1.6,
  margin: "0.5rem 0 0",
};
