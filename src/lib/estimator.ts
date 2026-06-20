import type {
  EstimatorOption,
  EstimatorPageContent,
  EstimatorQuestion,
} from "../types";

/**
 * Estimator pricing + content defaults.
 *
 * The output is ALWAYS a range ("here's roughly what you'll spend"), never a
 * single number, because a real quote varies with materials, pitch, access, and
 * deck condition once the crew is up there.
 */

export const ESTIMATOR_DEFAULT_SEO = {
  description:
    "Get a rough ballpark for your roof in about a minute. Answer a few quick questions and I'll show you an honest price range—no obligation.",
  title: "Roof Cost Estimator | Tandra Peters",
} as const;

const q = (
  prompt: string,
  options: EstimatorOption[],
  extra: Partial<EstimatorQuestion> = {}
): EstimatorQuestion => ({ options, prompt, ...extra });

/** Sensible starter config so the page is never empty before Tandra edits it. */
export const ESTIMATOR_DEFAULTS: EstimatorPageContent = {
  bannerCtaLabel: "Start estimate",
  bannerEyebrow: "Ballpark Pricing · 60 Seconds",
  bannerHeadline: "Estimate Your Roof",
  baseFee: 1500,
  baseRatePerSqft: 7.5,
  currency: "$",
  description:
    "Answer a few quick questions and I'll show you a rough price range. It's just a starting point—your real number comes after I actually see the roof.",
  disclaimer:
    "This is a rough ballpark only. Every roof is different—your real quote depends on materials, pitch, access, and the condition of the deck once we get up there.",
  eyebrow: "Ballpark Pricing",
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
        drivesSquareFootage: true,
        helpText:
          "Roofers measure in 'squares' (1 square = 100 sq ft of actual roof surface). Your roof surface is larger than your floor area — pitch and overhangs add 10–50%+. If unsure, pick closest to your home's total living area as a starting point.",
      }
    ),
    q(
      "How many stories?",
      [
        {
          description: "Ranch, bungalow, single level",
          label: "One story",
          pricePerSqftAdd: 0,
        },
        {
          description: "Colonial, two-level home",
          label: "Two stories",
          pricePerSqftAdd: 1.25,
        },
        {
          description: "Tall narrow home",
          label: "Three+ stories",
          pricePerSqftAdd: 2.5,
        },
        { label: "Not sure", pricePerSqftAdd: 0.5 },
      ],
      {
        helpText:
          "Multi-story homes have less roof area per sq ft of living space, but steeper access.",
      }
    ),
    q(
      "How complex is your roof?",
      [
        {
          description: "Basic gable or hip, few penetrations",
          label: "Simple",
          pricePerSqftAdd: 0,
        },
        {
          description: "A few gables, dormers, or a porch",
          label: "Average",
          pricePerSqftAdd: 1.5,
        },
        {
          description: "Many gables, dormers, porches, valleys",
          label: "Complex",
          pricePerSqftAdd: 3.5,
        },
        { label: "Not sure", pricePerSqftAdd: 1.5 },
      ],
      {
        helpText:
          "More gables, dormers, and porches = more roof surface area and labor.",
      }
    ),
    q(
      "How steep is your roof?",
      [
        {
          description: "Flat to 4/12 — easy to walk",
          label: "Low / walkable",
          pricePerSqftAdd: 0,
        },
        {
          description: "5/12 to 8/12 — standard",
          label: "Average pitch",
          pricePerSqftAdd: 1.5,
        },
        {
          description: "9/12 to 12/12+ — needs extra safety",
          label: "Steep",
          pricePerSqftAdd: 4,
        },
        { label: "Not sure", pricePerSqftAdd: 1 },
      ],
      {
        helpText: "Steeper roofs cost more to work on safely.",
      }
    ),
    q("What kind of roof are you considering?", [
      {
        description: "3-tab, budget-friendly",
        label: "Asphalt shingles",
        pricePerSqftAdd: 0,
      },
      {
        description:
          "Laminated, thicker, longer-lasting — most common replacement",
        label: "Architectural / premium shingles",
        pricePerSqftAdd: 1.5,
      },
      {
        description: "Standing seam or exposed-fastener, very durable",
        label: "Metal roofing",
        pricePerSqftAdd: 9,
      },
      {
        description: "I'll help you decide",
        label: "Not sure yet",
        pricePerSqftAdd: 1.5,
      },
    ]),
    q("Are you working through an insurance claim?", [
      {
        description: "I can help with the claim",
        flatAdd: 0,
        label: "Yes—storm or hail damage",
      },
      { flatAdd: 0, label: "No—paying out of pocket" },
      { flatAdd: 0, label: "Not sure yet" },
    ]),
  ],
  rangeSpreadPercent: 20,
  resultHeading: "Here's roughly what you'll spend",
  startButtonLabel: "Estimate my roof",
  title: "What might my roof cost?",
};

export type EstimatorSelections = Record<string, string>;

export interface EstimatorRange {
  high: number;
  low: number;
  /** Square footage used for the calculation, if a size question was answered. */
  sqft?: number;
  /** Midpoint subtotal before the range spread is applied. */
  subtotal: number;
}

const findOption = (
  question: EstimatorQuestion,
  key: string
): EstimatorOption | undefined =>
  question.options.find((o) => (o._key ?? o.label) === key);

interface AccumulatorState {
  flatTotal: number;
  ratePerSqft: number;
  sqft: number | undefined;
}

const applyQuestionOption = (
  state: AccumulatorState,
  question: EstimatorQuestion,
  option: EstimatorOption,
  overrides: ComputeEstimateOverrides | undefined
): void => {
  // Only use sqftMidpoint from the question if no override was provided.
  if (
    !overrides?.sqft &&
    question.drivesSquareFootage &&
    typeof option.sqftMidpoint === "number"
  ) {
    state.sqft = option.sqftMidpoint;
  }
  if (
    question.multipliesSquareFootage &&
    typeof option.sqftMultiplier === "number" &&
    state.sqft !== null &&
    state.sqft !== undefined
  ) {
    state.sqft *= option.sqftMultiplier;
  }
  if (typeof option.pricePerSqftAdd === "number") {
    state.ratePerSqft += option.pricePerSqftAdd;
  }
  if (typeof option.flatAdd === "number") {
    state.flatTotal += option.flatAdd;
  }
};

export interface ComputeEstimateOverrides {
  /**
   * Keys of questions whose multipliers/adders should be skipped in the
   * calculation (e.g. the home-size question when sqft is overridden).
   */
  skipQuestionKeys?: Set<string>;
  /**
   * When an address lookup succeeds, pass the property's total living area
   * here. It replaces the `drivesSquareFootage` question's sqftMidpoint so the
   * calculation uses real data instead of a bucket selection.
   */
  sqft?: number;
}

/**
 * Compute the estimate range from the answered selections. Returns null until
 * the square-footage question has been answered (or an override sqft is
 * provided). The spread guarantees a low/high band, never a single figure.
 */
export const computeEstimate = (
  content: EstimatorPageContent,
  selections: EstimatorSelections,
  overrides?: ComputeEstimateOverrides
): EstimatorRange | null => {
  const questions = content.questions ?? [];
  if (questions.length === 0) {
    return null;
  }

  const state: AccumulatorState = {
    flatTotal: content.baseFee ?? 0,
    ratePerSqft: content.baseRatePerSqft ?? 0,
    sqft: overrides?.sqft,
  };

  for (const question of questions) {
    const key = question._key ?? question.prompt;
    if (overrides?.skipQuestionKeys?.has(key)) {
      continue;
    }
    const selectedKey = selections[key];
    if (!selectedKey) {
      continue;
    }
    const option = findOption(question, selectedKey);
    if (!option) {
      continue;
    }

    applyQuestionOption(state, question, option, overrides);
  }

  if (state.sqft === null || state.sqft === undefined) {
    return null;
  }

  const subtotal = Math.max(
    0,
    state.sqft * state.ratePerSqft + state.flatTotal
  );
  const spread =
    Math.min(Math.max(content.rangeSpreadPercent ?? 15, 0), 60) / 100;
  const low = subtotal * (1 - spread);
  const high = subtotal * (1 + spread);

  return { high, low, sqft: state.sqft, subtotal };
};

/** Round to a tidy figure so the range reads like a ballpark, not a precise bid. */
const roundToNice = (value: number): number => {
  if (value <= 0) {
    return 0;
  }
  if (value < 1000) {
    return Math.round(value / 50) * 50;
  }
  if (value < 10_000) {
    return Math.round(value / 100) * 100;
  }
  return Math.round(value / 500) * 500;
};

export const formatMoney = (value: number, currency = "$"): string =>
  `${currency}${roundToNice(value).toLocaleString("en-US")}`;

export const formatRange = (range: EstimatorRange, currency = "$"): string =>
  `${formatMoney(range.low, currency)} – ${formatMoney(range.high, currency)}`;

/** Human-readable list of the visitor's answers, for the summary + email. */
export const summarizeSelections = (
  content: EstimatorPageContent,
  selections: EstimatorSelections
): { prompt: string; answer: string }[] => {
  const rows: { prompt: string; answer: string }[] = [];
  for (const question of content.questions ?? []) {
    const key = question._key ?? question.prompt;
    const selectedKey = selections[key];
    if (!selectedKey) {
      continue;
    }
    const option = findOption(question, selectedKey);
    if (!option) {
      continue;
    }
    rows.push({ answer: option.label, prompt: question.prompt });
  }
  return rows;
};
