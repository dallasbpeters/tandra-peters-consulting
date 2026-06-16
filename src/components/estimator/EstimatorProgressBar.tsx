import { motion } from "motion/react";

import { theme } from "../../theme";

interface EstimatorProgressBarProps {
  step: number;
  totalSteps: number;
  onResults: boolean;
}

export const EstimatorProgressBar = ({
  step,
  totalSteps,
  onResults,
}: EstimatorProgressBarProps) => {
  if (step < 0 || onResults || totalSteps === 0) return null;

  const progressPct = (Math.min(step + 1, totalSteps) / totalSteps) * 100;

  return (
    <div
      style={{
        height: 6,
        backgroundColor: theme.colors.paperDark,
        position: "relative",
      }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={totalSteps}
      aria-valuenow={Math.min(step + 1, totalSteps)}
    >
      <motion.div
        animate={{ width: `${progressPct}%` }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        style={{ height: "100%", backgroundColor: theme.colors.accent }}
      />
    </div>
  );
};
