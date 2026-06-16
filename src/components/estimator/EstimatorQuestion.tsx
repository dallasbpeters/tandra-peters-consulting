import { ArrowLeft } from "iconoir-react";
import { motion } from "motion/react";
import React from "react";

import type { EstimatorSelections } from "../../lib/estimator";

import { mix, theme } from "../../theme";
import { EstimatorQuestion as EstimatorQuestionType } from "../../types";
import { optionIllustrationFor } from "./optionIllustrations";
import {
  estimatorOptionArtStyle,
  estimatorOptionStyle,
  estimatorOptionsStyle,
  ghostButtonStyle,
} from "./styles";

interface EstimatorQuestionProps {
  question: EstimatorQuestionType;
  step: number;
  totalSteps: number;
  selections: EstimatorSelections;
  onSelect: (questionKey: string, optionKey: string) => void;
  onBack: () => void;
  direction: number;
  slideVariants: React.ComponentProps<typeof motion.div>["variants"];
  showBack: boolean;
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
      key={`q-${questionKey}`}
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3 }}
    >
      <p style={stepLabelStyle}>
        Question {step + 1} of {totalSteps}
      </p>
      <h2 style={headingStyle}>{question.prompt}</h2>
      {question.helpText ? <p style={helpStyle}>{question.helpText}</p> : null}

      <div style={{ ...estimatorOptionsStyle, marginTop: theme.spacing.xxl }}>
        {question.options.map((option) => {
          const optionKey = option._key ?? option.label;
          const isSelected = selected === optionKey;
          const illustration =
            option.illustration ?? optionIllustrationFor(question.prompt, option.label);
          return (
            <button
              type="button"
              key={optionKey}
              onClick={() => onSelect(questionKey, optionKey)}
              aria-pressed={isSelected}
              style={{
                ...estimatorOptionStyle,
                borderColor: isSelected ? theme.colors.accent : theme.colors.paperDark,
                backgroundColor: isSelected ? mix(theme.colors.accent, 8) : theme.colors.paper,
                boxShadow: isSelected ? `0 8px 20px ${mix(theme.colors.accent, 18)}` : "none",
              }}
            >
              {illustration ? (
                <img
                  src={illustration}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
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
          <button type="button" onClick={onBack} style={ghostButtonStyle}>
            <ArrowLeft width={16} height={16} />
            <span>Back</span>
          </button>
        </div>
      )}
    </motion.div>
  );
};

const stepLabelStyle: React.CSSProperties = {
  textTransform: "uppercase",
  letterSpacing: "0.16em",
  fontSize: "0.7rem",
  fontWeight: 800,
  color: mix(theme.colors.everglade, 55),
  margin: `0 0 ${theme.spacing.sm}`,
};

const headingStyle: React.CSSProperties = {
  fontSize: "clamp(1.6rem, 4vw, 2.25rem)",
  lineHeight: 1.15,
  fontFamily: theme.fonts.headline,
  fontWeight: 800,
  color: theme.colors.everglade,
  margin: 0,
};

const helpStyle: React.CSSProperties = {
  color: mix(theme.colors.everglade, 70),
  fontSize: "1rem",
  lineHeight: 1.6,
  margin: `${theme.spacing.sm} 0 0`,
};

const optionLabelStyle: React.CSSProperties = {
  fontFamily: theme.fonts.headline,
  fontWeight: 700,
  fontSize: "1.05rem",
  color: theme.colors.everglade,
};

const optionDescStyle: React.CSSProperties = {
  fontSize: "0.85rem",
  color: mix(theme.colors.everglade, 65),
};
