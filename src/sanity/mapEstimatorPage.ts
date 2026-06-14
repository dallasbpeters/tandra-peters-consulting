import { stegaClean } from "@sanity/client/stega";

import type { EstimatorOption, EstimatorPageContent, EstimatorQuestion } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EstimatorPageDoc = Record<string, any> | null | undefined;

const cleanString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = stegaClean(value).trim();
  return trimmed || undefined;
};

const cleanNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const mapOption = (raw: Record<string, unknown>): EstimatorOption | null => {
  const label = cleanString(raw.label);
  if (!label) return null;
  const option: EstimatorOption = { label };
  if (typeof raw._key === "string") option._key = raw._key;
  const description = cleanString(raw.description);
  if (description) option.description = description;
  const sqft = cleanNumber(raw.sqftMidpoint);
  if (sqft != null) option.sqftMidpoint = sqft;
  const perSqft = cleanNumber(raw.pricePerSqftAdd);
  if (perSqft != null) option.pricePerSqftAdd = perSqft;
  const flat = cleanNumber(raw.flatAdd);
  if (flat != null) option.flatAdd = flat;
  return option;
};

const mapQuestion = (raw: Record<string, unknown>): EstimatorQuestion | null => {
  const prompt = cleanString(raw.prompt);
  if (!prompt) return null;
  const options = Array.isArray(raw.options)
    ? raw.options
        .map((o) => mapOption(o as Record<string, unknown>))
        .filter((o): o is EstimatorOption => o != null)
    : [];
  if (options.length === 0) return null;
  const question: EstimatorQuestion = { prompt, options };
  if (typeof raw._key === "string") question._key = raw._key;
  const helpText = cleanString(raw.helpText);
  if (helpText) question.helpText = helpText;
  if (raw.drivesSquareFootage === true) question.drivesSquareFootage = true;
  return question;
};

export const mapEstimatorPageContent = (data: EstimatorPageDoc): EstimatorPageContent => {
  if (!data) return {};

  const out: EstimatorPageContent = {};

  const assignString = (key: keyof EstimatorPageContent, value: unknown) => {
    const cleaned = cleanString(value);
    if (cleaned) (out[key] as string) = cleaned;
  };

  assignString("eyebrow", data.eyebrow);
  assignString("title", data.title);
  assignString("description", data.description);
  assignString("startButtonLabel", data.startButtonLabel);
  assignString("resultHeading", data.resultHeading);
  assignString("disclaimer", data.disclaimer);
  assignString("currency", data.currency);
  assignString("seoTitle", data.seoTitle);
  assignString("seoDescription", data.seoDescription);
  assignString("bannerEyebrow", data.bannerEyebrow);
  assignString("bannerHeadline", data.bannerHeadline);
  assignString("bannerCtaLabel", data.bannerCtaLabel);

  const baseFee = cleanNumber(data.baseFee);
  if (baseFee != null) out.baseFee = baseFee;
  const baseRatePerSqft = cleanNumber(data.baseRatePerSqft);
  if (baseRatePerSqft != null) out.baseRatePerSqft = baseRatePerSqft;
  const rangeSpreadPercent = cleanNumber(data.rangeSpreadPercent);
  if (rangeSpreadPercent != null) out.rangeSpreadPercent = rangeSpreadPercent;

  if (Array.isArray(data.questions) && data.questions.length > 0) {
    const questions = data.questions
      .map((q: Record<string, unknown>) => mapQuestion(q))
      .filter((q): q is EstimatorQuestion => q != null);
    if (questions.length > 0) out.questions = questions;
  }

  return out;
};
