import { motion } from "motion/react";

import { theme } from "../../theme";

interface EstimatorProgressBarProps {
  onResults: boolean;
  step: number;
  totalSteps: number;
}

export const EstimatorProgressBar = ({
  step,
  totalSteps,
  onResults,
}: EstimatorProgressBarProps) => {
  if (step < 0 || onResults || totalSteps === 0) {
    return null;
  }

  const progressPct = (Math.min(step + 1, totalSteps) / totalSteps) * 100;

  return (
    <div
      aria-valuemax={totalSteps}
      aria-valuemin={0}
      aria-valuenow={Math.min(step + 1, totalSteps)}
      role="progressbar"
      style={{
        height: 6,
        backgroundColor: theme.colors.paperDark,
        position: "relative",
      }}
    >
      <motion.div
        animate={{ width: `${progressPct}%` }}
        style={{ height: "100%", backgroundColor: theme.colors.accent }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      />
    </div>
  );
};
