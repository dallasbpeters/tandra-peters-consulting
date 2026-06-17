import type { EstimatorOption, EstimatorPageContent, EstimatorQuestion } from "../types";

/**
 * Estimator pricing + content defaults.
 *
 * The output is ALWAYS a range ("here's roughly what you'll spend"), never a
 * single number, because a real quote varies with materials, pitch, access, and
 * deck condition once the crew is up there.
 */

export const ESTIMATOR_DEFAULT_SEO = {
  title: "Roof Cost Estimator | Tandra Peters",
  description:
    "Get a rough ballpark for your roof in about a minute. Answer a few quick questions and I'll show you an honest price range—no obligation.",
} as const;

const q = (
  prompt: string,
  options: EstimatorOption[],
  extra: Partial<EstimatorQuestion> = {},
): EstimatorQuestion => ({ prompt, options, ...extra });

/** Sensible starter config so the page is never empty before Tandra edits it. */
export const ESTIMATOR_DEFAULTS: EstimatorPageContent = {
  eyebrow: "Ballpark Pricing",
  title: "What might my roof cost?",
  description:
    "Answer a few quick questions and I'll show you a rough price range. It's just a starting point—your real number comes after I actually see the roof.",
  startButtonLabel: "Estimate my roof",
  resultHeading: "Here's roughly what you'll spend",
  disclaimer:
    "This is a rough ballpark only. Every roof is different—your real quote depends on materials, pitch, access, and the condition of the deck once we get up there.",
  baseFee: 1500,
  baseRatePerSqft: 7.5,
  rangeSpreadPercent: 20,
  currency: "$",
  bannerEyebrow: "Ballpark Pricing · 60 Seconds",
  bannerHeadline: "Estimate Your Roof",
  bannerCtaLabel: "Start estimate",
  questions: [
    q(
      "What's your roof's footprint?",
      [
        { label: "Under 1,000 sq ft", sqftMidpoint: 800 },
        { label: "1,000 – 1,500 sq ft", sqftMidpoint: 1250 },
        { label: "1,500 – 2,000 sq ft", sqftMidpoint: 1750 },
        { label: "2,000 – 2,500 sq ft", sqftMidpoint: 2250 },
        { label: "2,500 – 3,000 sq ft", sqftMidpoint: 2750 },
        { label: "3,000 – 4,000 sq ft", sqftMidpoint: 3500 },
        { label: "Over 4,000 sq ft", sqftMidpoint: 4500 },
      ],
      {
        helpText:
          "Roofers measure in 'squares' (1 square = 100 sq ft of actual roof surface). Your roof surface is larger than your floor area — pitch and overhangs add 10–50%+. If unsure, pick closest to your home's total living area as a starting point.",
        drivesSquareFootage: true,
      },
    ),
    q(
      "How many stories?",
      [
        {
          label: "One story",
          description: "Ranch, bungalow, single level",
          pricePerSqftAdd: 0,
        },
        {
          label: "Two stories",
          description: "Colonial, two-level home",
          pricePerSqftAdd: 1.25,
        },
        {
          label: "Three+ stories",
          description: "Tall narrow home",
          pricePerSqftAdd: 2.5,
        },
        { label: "Not sure", pricePerSqftAdd: 0.5 },
      ],
      {
        helpText:
          "Multi-story homes have less roof area per sq ft of living space, but steeper access.",
      },
    ),
    q(
      "How complex is your roof?",
      [
        {
          label: "Simple",
          description: "Basic gable or hip, few penetrations",
          pricePerSqftAdd: 0,
        },
        {
          label: "Average",
          description: "A few gables, dormers, or a porch",
          pricePerSqftAdd: 1.5,
        },
        {
          label: "Complex",
          description: "Many gables, dormers, porches, valleys",
          pricePerSqftAdd: 3.5,
        },
        { label: "Not sure", pricePerSqftAdd: 1.5 },
      ],
      {
        helpText: "More gables, dormers, and porches = more roof surface area and labor.",
      },
    ),
    q(
      "How steep is your roof?",
      [
        {
          label: "Low / walkable",
          description: "Flat to 4/12 — easy to walk",
          pricePerSqftAdd: 0,
        },
        {
          label: "Average pitch",
          description: "5/12 to 8/12 — standard",
          pricePerSqftAdd: 1.5,
        },
        {
          label: "Steep",
          description: "9/12 to 12/12+ — needs extra safety",
          pricePerSqftAdd: 4.0,
        },
        { label: "Not sure", pricePerSqftAdd: 1.0 },
      ],
      {
        helpText: "Steeper roofs cost more to work on safely.",
      },
    ),
    q("What kind of roof are you considering?", [
      {
        label: "Asphalt shingles",
        description: "3-tab, budget-friendly",
        pricePerSqftAdd: 0,
      },
      {
        label: "Architectural / premium shingles",
        description: "Laminated, thicker, longer-lasting — most common replacement",
        pricePerSqftAdd: 1.5,
      },
      {
        label: "Metal roofing",
        description: "Standing seam or exposed-fastener, very durable",
        pricePerSqftAdd: 9.0,
      },
      {
        label: "Not sure yet",
        description: "I'll help you decide",
        pricePerSqftAdd: 1.5,
      },
    ]),
    q("Are you working through an insurance claim?", [
      {
        label: "Yes—storm or hail damage",
        description: "I can help with the claim",
        flatAdd: 0,
      },
      { label: "No—paying out of pocket", flatAdd: 0 },
      { label: "Not sure yet", flatAdd: 0 },
    ]),
  ],
};

export type EstimatorSelections = Record<string, string>;

export type EstimatorRange = {
  low: number;
  high: number;
  /** Midpoint subtotal before the range spread is applied. */
  subtotal: number;
  /** Square footage used for the calculation, if a size question was answered. */
  sqft?: number;
};

const findOption = (question: EstimatorQuestion, key: string): EstimatorOption | undefined =>
  question.options.find((o) => (o._key ?? o.label) === key);

export type ComputeEstimateOverrides = {
  /**
   * When an address lookup succeeds, pass the property's total living area
   * here. It replaces the `drivesSquareFootage` question's sqftMidpoint so the
   * calculation uses real data instead of a bucket selection.
   */
  sqft?: number;
  /**
   * Keys of questions whose multipliers/adders should be skipped in the
   * calculation (e.g. the home-size question when sqft is overridden).
   */
  skipQuestionKeys?: Set<string>;
};

/**
 * Compute the estimate range from the answered selections. Returns null until
 * the square-footage question has been answered (or an override sqft is
 * provided). The spread guarantees a low/high band, never a single figure.
 */
export const computeEstimate = (
  content: EstimatorPageContent,
  selections: EstimatorSelections,
  overrides?: ComputeEstimateOverrides,
): EstimatorRange | null => {
  const questions = content.questions ?? [];
  if (questions.length === 0) return null;

  let sqft: number | undefined = overrides?.sqft;
  let ratePerSqft = content.baseRatePerSqft ?? 0;
  let flatTotal = content.baseFee ?? 0;

  for (const question of questions) {
    const key = question._key ?? question.prompt;
    if (overrides?.skipQuestionKeys?.has(key)) continue;
    const selectedKey = selections[key];
    if (!selectedKey) continue;
    const option = findOption(question, selectedKey);
    if (!option) continue;

    // Only use sqftMidpoint from the question if no override was provided.
    if (
      !overrides?.sqft &&
      question.drivesSquareFootage &&
      typeof option.sqftMidpoint === "number"
    ) {
      sqft = option.sqftMidpoint;
    }
    if (
      question.multipliesSquareFootage &&
      typeof option.sqftMultiplier === "number" &&
      sqft != null
    ) {
      sqft *= option.sqftMultiplier;
    }
    if (typeof option.pricePerSqftAdd === "number") ratePerSqft += option.pricePerSqftAdd;
    if (typeof option.flatAdd === "number") flatTotal += option.flatAdd;
  }

  if (sqft == null) return null;

  const subtotal = Math.max(0, sqft * ratePerSqft + flatTotal);
  const spread = Math.min(Math.max(content.rangeSpreadPercent ?? 15, 0), 60) / 100;
  const low = subtotal * (1 - spread);
  const high = subtotal * (1 + spread);

  return { low, high, subtotal, sqft };
};

/** Round to a tidy figure so the range reads like a ballpark, not a precise bid. */
const roundToNice = (value: number): number => {
  if (value <= 0) return 0;
  if (value < 1000) return Math.round(value / 50) * 50;
  if (value < 10000) return Math.round(value / 100) * 100;
  return Math.round(value / 500) * 500;
};

export const formatMoney = (value: number, currency = "$"): string =>
  `${currency}${roundToNice(value).toLocaleString("en-US")}`;

export const formatRange = (range: EstimatorRange, currency = "$"): string =>
  `${formatMoney(range.low, currency)} – ${formatMoney(range.high, currency)}`;

/** Human-readable list of the visitor's answers, for the summary + email. */
export const summarizeSelections = (
  content: EstimatorPageContent,
  selections: EstimatorSelections,
): { prompt: string; answer: string }[] => {
  const rows: { prompt: string; answer: string }[] = [];
  for (const question of content.questions ?? []) {
    const key = question._key ?? question.prompt;
    const selectedKey = selections[key];
    if (!selectedKey) continue;
    const option = findOption(question, selectedKey);
    if (!option) continue;
    rows.push({ prompt: question.prompt, answer: option.label });
  }
  return rows;
};
