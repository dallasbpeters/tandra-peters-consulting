import { ArrowLeft } from "iconoir-react";
import { motion } from "motion/react";
import type React from "react";

import type { EstimatorSelections } from "../../lib/estimator";
import { mix, theme } from "../../theme";
import type { EstimatorQuestion as EstimatorQuestionType } from "../../types";
import { optionIllustrationFor } from "./option-illustrations";
import {
  estimatorOptionArtStyle,
  estimatorOptionClass,
  estimatorOptionStyle,
  estimatorOptionsClass,
  ghostButtonStyle,
} from "./styles";

interface EstimatorQuestionProps {
  direction: number;
  onBack: () => void;
  onSelect: (questionKey: string, optionKey: string) => void;
  question: EstimatorQuestionType;
  selections: EstimatorSelections;
  showBack: boolean;
  slideVariants: React.ComponentProps<typeof motion.div>["variants"];
  step: number;
  totalSteps: number;
}

export const EstimatorQuestion = ({
  question,
  step,
  totalSteps,
  selections,
  onSelect,
  onBack,
  direction,
  slideVariants,
  showBack,
}: EstimatorQuestionProps) => {
  const questionKey = question._key ?? question.prompt;
  const selected = selections[questionKey];

  return (
    <motion.div
      animate="center"
      custom={direction}
      exit="exit"
      initial="enter"
      key={`q-${questionKey}`}
      transition={{ duration: 0.3 }}
      variants={slideVariants}
    >
      <p style={stepLabelStyle}>
        Question {step + 1} of {totalSteps}
      </p>
      <h2 style={headingStyle}>{question.prompt}</h2>
      {question.helpText ? <p style={helpStyle}>{question.helpText}</p> : null}

      <div
        className={estimatorOptionsClass}
        style={
          {
            "--min-column-size": "16rem",
            marginTop: theme.spacing.xxl,
          } as React.CSSProperties
        }
      >
        {question.options.map((option) => {
          const optionKey = option._key ?? option.label;
          const isSelected = selected === optionKey;
          const illustration =
            option.illustration ??
            optionIllustrationFor(question.prompt, option.label);
          return (
            <button
              aria-pressed={isSelected}
              className={estimatorOptionClass}
              key={optionKey}
              onClick={() => onSelect(questionKey, optionKey)}
              style={{
                ...estimatorOptionStyle,
                backgroundColor: isSelected
                  ? mix(theme.colors.accent, 8)
                  : theme.colors.paper,
                borderColor: isSelected
                  ? theme.colors.accent
                  : theme.colors.paperDark,
                boxShadow: isSelected
                  ? `0 8px 20px ${mix(theme.colors.accent, 18)}`
                  : "none",
              }}
              type="button"
            >
              {illustration ? (
                // biome-ignore lint/correctness/useImageSize: dynamic size controlled by CSS
                <img
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  src={illustration}
                  style={estimatorOptionArtStyle}
                />
              ) : null}
              <span style={optionLabelStyle}>{option.label}</span>
              {option.description ? (
                <span style={optionDescStyle}>{option.description}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {showBack && (
        <div style={{ marginTop: theme.spacing.xxl }}>
          <button onClick={onBack} style={ghostButtonStyle} type="button">
            <ArrowLeft height={16} width={16} />
            <span>Back</span>
          </button>
        </div>
      )}
    </motion.div>
  );
};

const stepLabelStyle: React.CSSProperties = {
  color: mix(theme.colors.everglade, 55),
  fontSize: "0.7rem",
  fontWeight: 800,
  letterSpacing: "0.16em",
  margin: `0 0 ${theme.spacing.sm}`,
  textTransform: "uppercase",
};

const headingStyle: React.CSSProperties = {
  color: theme.colors.everglade,
  fontFamily: theme.fonts.headline,
  fontSize: "clamp(1.6rem, 4vw, 2.25rem)",
  fontWeight: 800,
  lineHeight: 1.15,
  margin: 0,
};

const helpStyle: React.CSSProperties = {
  color: mix(theme.colors.everglade, 70),
  fontSize: "1rem",
  lineHeight: 1.6,
  margin: `${theme.spacing.sm} 0 0`,
};

const optionLabelStyle: React.CSSProperties = {
  color: theme.colors.everglade,
  fontFamily: theme.fonts.headline,
  fontSize: "1.05rem",
  fontWeight: 700,
};

const optionDescStyle: React.CSSProperties = {
  color: mix(theme.colors.everglade, 65),
  fontSize: "0.85rem",
};
