export const normalizeOptionText = (value: string): string =>
  value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, " ")
    .trim();

export const optionIllustrationFor = (
  questionPrompt: string,
  optionLabel: string
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inherently complex logic
): string | undefined => {
  const prompt = normalizeOptionText(questionPrompt);
  const label = normalizeOptionText(optionLabel);
  const isVisualRoofQuestion =
    prompt.includes("complex") ||
    prompt.includes("steep") ||
    prompt.includes("pitch") ||
    prompt.includes("kind of roof") ||
    prompt.includes("roof are you considering");

  if (isVisualRoofQuestion && label.includes("not sure")) {
    return "/estimator/roof-option-not-sure.svg";
  }

  if (prompt.includes("complex")) {
    if (label.includes("simple")) {
      return "/estimator/roof-complexity-simple.svg";
    }
    if (label.includes("average")) {
      return "/estimator/roof-complexity-average.svg";
    }
    if (label.includes("complex")) {
      return "/estimator/roof-complexity-complex.svg";
    }
  }

  if (prompt.includes("steep") || prompt.includes("pitch")) {
    if (label.includes("low") || label.includes("walkable")) {
      return "/estimator/roof-pitch-low.svg";
    }
    if (label.includes("average")) {
      return "/estimator/roof-pitch-average.svg";
    }
    if (label.includes("steep")) {
      return "/estimator/roof-pitch-steep.svg";
    }
  }

  if (
    prompt.includes("kind of roof") ||
    prompt.includes("roof are you considering")
  ) {
    if (label.includes("asphalt")) {
      return "/estimator/roof-material-asphalt.svg";
    }
    if (label.includes("architectural") || label.includes("premium")) {
      return "/estimator/roof-material-premium.svg";
    }
    if (label.includes("metal")) {
      return "/estimator/roof-material-metal.svg";
    }
  }

  return;
};
