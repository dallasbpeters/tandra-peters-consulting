import WaInput from "@awesome.me/webawesome/dist/react/input/index.js";
import { AddressAutofill } from "@mapbox/search-js-react";

import "@awesome.me/webawesome/dist/styles/themes/default.css";
import { usePostHog } from "@posthog/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  RefreshDouble,
  Search,
  Send,
} from "iconoir-react";
import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import { useMemo, useState } from "react";
import type { EstimatorSelections } from "../../lib/estimator";
import {
  computeEstimate,
  formatRange,
  summarizeSelections,
} from "../../lib/estimator";
import { layoutClass } from "../../styles/layoutClasses";
import { mix, theme } from "../../theme";
import type { EstimatorPageContent } from "../../types";
import { EstimatorMapBackground } from "./EstimatorMapBackground";
import { optionIllustrationFor } from "./optionIllustrations";
import {
  estimatorCardLayoutClass,
  estimatorCardStyle,
  estimatorEmailRowClass,
  estimatorFooterClass,
  estimatorOptionArtStyle,
  estimatorOptionClass,
  estimatorOptionStyle,
  estimatorOptionsClass,
  eyebrow,
  foundStatus,
  foundStatusClass,
  introCardStyle,
} from "./styles";

const trackGaEstimator = (payload: Record<string, unknown>) => {
  if (typeof window === "undefined") {
    return;
  }
  const { gtag } = window as Window & {
    gtag?: (...args: unknown[]) => void;
  };
  if (typeof gtag !== "function") {
    return;
  }
  gtag("event", "estimator", payload);
};

/** Relative path so production stays same-origin; Vite proxies `/api` in dev. */
export const ESTIMATE_API_PATH = "/api/estimate";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

type SendStatus = "idle" | "sending" | "sent" | "error";
type AddressLookupStatus = "idle" | "loading" | "found" | "error";

interface EstimatorProps {
  content: EstimatorPageContent;
  sectionId?: string;
}

// biome-ignore-start lint/complexity/noExcessiveCognitiveComplexity: estimator flow contains a single orchestrator component with many conditional render branches
export const Estimator: React.FC<EstimatorProps> = ({
  content,
  sectionId = "estimator",
}) => {
  const posthog = usePostHog();
  const questions = content.questions ?? [];
  const currency = content.currency ?? "$";

  // -1 = intro; 0..n-1 = questions; n = results
  const [step, setStep] = useState(-1);
  const [direction, setDirection] = useState(1);
  const [selections, setSelections] = useState<EstimatorSelections>({});

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [sendStatus, setSendStatus] = useState<SendStatus>("idle");
  const [sendError, setSendError] = useState<string | null>(null);

  // Property address map focus
  const [address, setAddress] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [lookupStatus, setLookupStatus] = useState<AddressLookupStatus>("idle");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [propertyCoords, setPropertyCoords] = useState<[number, number] | null>(
    null
  );

  // Mapbox
  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() ?? "";

  const setMapboxAddress = (
    formattedAddress: string,
    coords: [number, number] | null,
    source: "mapbox-autofill" | "mapbox-geocoding"
  ) => {
    setAddress(formattedAddress);
    setSelectedAddress(formattedAddress);
    setLookupError(null);
    if (coords) {
      setPropertyCoords(coords);
      setLookupStatus("found");
      posthog?.capture("estimator_property_mapped", { source });
    }
  };

  /** Forward-geocode manually typed addresses with Mapbox so the map can zoom there. */
  const geocodeForMap = async (formattedAddress: string) => {
    if (!mapboxToken) {
      setLookupStatus("error");
      setLookupError("Map lookup needs a Mapbox token.");
      return;
    }
    setLookupStatus("loading");
    setLookupError(null);
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(formattedAddress)}.json?access_token=${mapboxToken}&limit=1&country=US&types=address`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Could not check that address on the map.");
      }
      const data = (await res.json()) as {
        features?: {
          center?: [number, number];
          place_name?: string;
          text?: string;
        }[];
      };
      const feature = data.features?.[0];
      if (!feature?.center) {
        throw new Error("I could not find that address on the map.");
      }
      const formatted = feature.place_name || formattedAddress;
      setMapboxAddress(formatted, feature.center, "mapbox-geocoding");
    } catch (error) {
      setLookupStatus("error");
      setLookupError(
        error instanceof Error
          ? error.message
          : "Could not check that address on the map."
      );
    }
  };

  const visibleQuestions = questions;

  const totalSteps = visibleQuestions.length;
  const onResults = step >= totalSteps;

  const estimate = useMemo(
    () => (onResults ? computeEstimate(content, selections) : null),
    [onResults, content, selections]
  );
  const summary = useMemo(
    () => (onResults ? summarizeSelections(content, selections) : []),
    [onResults, content, selections]
  );

  const goTo = (next: number, dir: number) => {
    setDirection(dir);
    setStep(next);
  };

  const handleLookup = async () => {
    const trimmed = address.trim();
    if (!trimmed) {
      return;
    }
    await geocodeForMap(trimmed);
  };

  const start = () => {
    posthog?.capture("estimator_started", {
      addressProvided: lookupStatus === "found",
    });
    goTo(0, 1);
  };

  const selectOption = (questionKey: string, optionKey: string) => {
    setSelections((prev) => ({ ...prev, [questionKey]: optionKey }));
    window.setTimeout(() => goTo(Math.min(step + 1, totalSteps), 1), 160);
  };

  const restart = () => {
    setSelections({});
    setFullName("");
    setEmail("");
    setSendStatus("idle");
    setSendError(null);
    setAddress("");
    setSelectedAddress(null);
    setPropertyCoords(null);
    setLookupStatus("idle");
    setLookupError(null);
    goTo(-1, -1);
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estimate) {
      return;
    }
    if (!fullName.trim()) {
      setSendError("Please enter your name.");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setSendError("Please enter a valid email.");
      return;
    }
    setSendStatus("sending");
    setSendError(null);
    try {
      const res = await fetch(ESTIMATE_API_PATH, {
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          lowEstimate: estimate.low,
          highEstimate: estimate.high,
          rangeDisplay: formatRange(estimate, currency),
          squareFootage: estimate.sqft,
          propertyAddress: selectedAddress ?? (address.trim() || null),
          answers: summary,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!(res.ok && data.ok)) {
        throw new Error(data.error || "Could not send the estimate.");
      }
      setSendStatus("sent");
      posthog?.identify(email.trim(), {
        email: email.trim(),
        name: fullName.trim(),
      });
      posthog?.capture("estimator_emailed", {
        range: formatRange(estimate, currency),
      });
      trackGaEstimator({
        action: "emailed",
        range: formatRange(estimate, currency),
      });
    } catch (error) {
      setSendStatus("error");
      setSendError(
        error instanceof Error ? error.message : "Could not send the estimate."
      );
      posthog?.captureException(error);
      trackGaEstimator({
        action: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const progressPct =
    totalSteps > 0 ? (Math.min(step + 1, totalSteps) / totalSteps) * 100 : 0;

  const headingStyle: React.CSSProperties = {
    color: theme.colors.white,
    fontFamily: theme.fonts.headline,
    fontSize: "clamp(1.6rem, 4vw, 2.25rem)",
    fontWeight: 800,
    lineHeight: 1.15,
    margin: 0,
  };
  const cardHeadingStyle: React.CSSProperties = {
    color: theme.colors.black,
    fontFamily: theme.fonts.headline,
    fontSize: "clamp(1.6rem, 4vw, 2.25rem)",
    fontWeight: 800,
    lineHeight: 1.15,
    marginBlockEnd: theme.spacing.md,
  };
  const cardTextStyle: React.CSSProperties = {
    color: theme.colors.black,
    fontFamily: theme.fonts.headline,
    fontSize: "1.2rem",
    fontWeight: 800,
    lineHeight: 1.15,
    margin: 0,
  };

  const helpStyle: React.CSSProperties = {
    color: mix(theme.colors.white, 70),
    fontSize: "1rem",
    lineHeight: 1.6,
    margin: `${theme.spacing.sm} 0 0`,
  };

  const slideVariants = {
    center: { opacity: 1, x: 0 },
    enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
    exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
  };

  const addressLabelStyle: React.CSSProperties = {
    color: theme.colors.everglade,
    display: "block",
    fontFamily: theme.fonts.body,
    fontSize: "var(--wa-form-control-label-font-size, 1rem)",
    marginBottom: "0.5rem",
  };

  const primaryButtonStyle: React.CSSProperties = {
    alignItems: "center",
    backgroundColor: theme.colors.everglade,
    border: "none",
    borderRadius: theme.radius.medium,
    color: theme.colors.white,
    cursor: "pointer",
    display: "inline-flex",
    fontFamily: theme.fonts.headline,
    fontSize: "0.875rem",
    fontWeight: 900,
    gap: theme.spacing.md,
    letterSpacing: "0.08em",
    marginTop: theme.spacing.xl,
    padding: `${theme.spacing.lg} ${theme.spacing.xxl}`,
    textTransform: "uppercase",
  };

  const ghostButtonStyle: React.CSSProperties = {
    alignItems: "center",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: theme.radius.medium,
    color: mix(theme.colors.everglade, 80),
    cursor: "pointer",
    display: "inline-flex",
    fontFamily: theme.fonts.headline,
    fontSize: "0.875rem",
    fontWeight: 700,
    gap: theme.spacing.sm,
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
  };

  const addressInputStyle: React.CSSProperties = {
    backgroundColor: "var(--wa-form-control-background-color, #fff)",
    border:
      "var(--wa-form-control-border-width, 1px) var(--wa-form-control-border-style, solid) var(--wa-form-control-border-color)",
    borderRadius: "var(--wa-border-radius-m, 0.5rem)",
    boxSizing: "border-box",
    color: theme.colors.everglade,
    fontFamily: theme.fonts.body,
    fontSize: "var(--wa-form-control-value-font-size, 1rem)",
    height: "var(--wa-form-control-height, 2.625rem)",
    outline: "none",
    padding: "0 var(--wa-form-control-padding-inline, 1rem)",
    width: "100%",
  };

  return (
    <section
      aria-labelledby={`${sectionId}-heading`}
      className={layoutClass.sectionPadded}
      id={sectionId}
      style={{
        backgroundColor: theme.colors.paper,
        placeItems: "center",
        position: "relative",
      }}
    >
      <div className={layoutClass.containerFull}>
        <div
          style={{
            marginBlock: theme.spacing.xxxxl,
            maxWidth: "80vw",
            paddingInline: theme.spacing.xxxxxl,
          }}
        >
          {content.eyebrow ? (
            <span style={eyebrow}>{content.eyebrow}</span>
          ) : null}
          <h1
            id={`${sectionId}-heading`}
            style={{ ...headingStyle, fontSize: "clamp(2rem, 6vw, 3rem)" }}
          >
            {content.title ?? "What might my roof cost?"}
          </h1>
          {content.description ? (
            <p style={helpStyle}>{content.description}</p>
          ) : null}
        </div>
        {/* Intro: 2-col with map panel. Questions/results: single card. */}
        <div
          className={estimatorCardLayoutClass}
          style={{ minBlockSize: "50vh", paddingInline: theme.spacing.xxxxxl }}
        >
          <div
            data-estimator-card
            style={step === -1 ? introCardStyle : estimatorCardStyle}
          >
            {/* Progress bar (hidden on intro + results) */}
            {step >= 0 && !onResults ? (
              <progress
                max={totalSteps}
                style={{
                  backgroundColor: theme.colors.paperDark,
                  height: 6,
                  position: "relative",
                }}
                value={Math.min(step + 1, totalSteps)}
              >
                <motion.div
                  animate={{ width: `${progressPct}%` }}
                  style={{
                    backgroundColor: theme.colors.accent,
                    height: "100%",
                  }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                />
              </progress>
            ) : null}

            <div style={{ padding: "clamp(1.5rem, 4vw, 2.75rem)" }}>
              <AnimatePresence custom={direction} initial={false} mode="wait">
                {/* INTRO */}
                {step === -1 ? (
                  <motion.div
                    animate="center"
                    custom={direction}
                    exit="exit"
                    initial="enter"
                    key="intro"
                    transition={{ duration: 0.3 }}
                    variants={slideVariants}
                  >
                    <p style={cardTextStyle}>
                      {totalSteps} quick question{totalSteps === 1 ? "" : "s"},
                      about a minute.
                      {
                        " You'll see an honest price range at the end—no obligation."
                      }
                    </p>

                    {/* Address lookup */}
                    <div style={{ marginTop: theme.spacing.xxl }}>
                      <div className="wa-cluster wa-gap-2xs wa-align-items-end">
                        <div style={{ flex: "1 1 220px" }}>
                          <label
                            htmlFor="contact-property-address"
                            style={addressLabelStyle}
                          >
                            Property Address{" "}
                            <span
                              style={{
                                color: mix(theme.colors.everglade, 45),
                                fontWeight: 400,
                              }}
                            >
                              (optional)
                            </span>
                          </label>
                          {mapboxToken ? (
                            <AddressAutofill
                              accessToken={mapboxToken}
                              onRetrieve={(res) => {
                                const feature = res?.features?.[0] as unknown as
                                  | {
                                      geometry?: { coordinates?: unknown };
                                      properties?: {
                                        full_address?: string;
                                        place_name?: string;
                                        name?: string;
                                      };
                                    }
                                  | undefined;
                                const props = feature?.properties;
                                const full =
                                  props?.full_address || props?.place_name;
                                const rawCoords =
                                  feature?.geometry?.coordinates;
                                const coords =
                                  Array.isArray(rawCoords) &&
                                  typeof rawCoords[0] === "number" &&
                                  typeof rawCoords[1] === "number"
                                    ? ([rawCoords[0], rawCoords[1]] as [
                                        number,
                                        number,
                                      ])
                                    : null;
                                if (full) {
                                  setMapboxAddress(
                                    full,
                                    coords,
                                    "mapbox-autofill"
                                  );
                                }
                              }}
                              options={{ country: "US", language: "en" }}
                            >
                              <input
                                className="contact-address-input"
                                id="contact-property-address"
                                maxLength={500}
                                name="property-address"
                                onChange={(ev) => setAddress(ev.target.value)}
                                placeholder="123 Main St, Austin, TX"
                                style={addressInputStyle}
                                type="text"
                                value={address}
                              />
                            </AddressAutofill>
                          ) : (
                            <input
                              className="contact-address-input"
                              id="contact-property-address"
                              maxLength={500}
                              name="property-address"
                              onChange={(ev) => setAddress(ev.target.value)}
                              placeholder="123 Main St, Austin, TX"
                              style={addressInputStyle}
                              type="text"
                              value={address}
                            />
                          )}
                        </div>
                        <button
                          disabled={
                            !address.trim() || lookupStatus === "loading"
                          }
                          onClick={() => {
                            handleLookup();
                          }}
                          style={{
                            ...ghostButtonStyle,
                            border: `1px solid ${theme.colors.paperDark}`,
                            cursor:
                              !address.trim() || lookupStatus === "loading"
                                ? "default"
                                : "pointer",
                            flexShrink: 0,
                            height: "2.75rem",
                            opacity:
                              !address.trim() || lookupStatus === "loading"
                                ? 0.5
                                : 1,
                          }}
                          type="button"
                        >
                          <Search height={15} width={15} />
                          <span>
                            {lookupStatus === "loading"
                              ? "Finding…"
                              : "Find on map"}
                          </span>
                        </button>
                      </div>

                      {lookupStatus === "found" && selectedAddress ? (
                        <div className={foundStatusClass} style={foundStatus}>
                          <Check
                            height={15}
                            style={{
                              color: theme.colors.accent,
                              flexShrink: 0,
                              marginTop: "0.15rem",
                            }}
                            width={15}
                          />
                          <div>
                            <strong style={{ display: "block" }}>
                              {selectedAddress}
                            </strong>
                            <span
                              style={{ color: mix(theme.colors.everglade, 60) }}
                            >
                              Map centered. I’ll still ask for roof size so the
                              range stays honest.
                            </span>
                          </div>
                        </div>
                      ) : null}

                      {lookupStatus === "error" && lookupError ? (
                        <p
                          role="alert"
                          style={{
                            color: theme.colors.danger,
                            fontSize: "0.85rem",
                            marginTop: theme.spacing.sm,
                          }}
                        >
                          {lookupError} You can still answer the questions
                          manually.
                        </p>
                      ) : null}
                    </div>

                    <button
                      onClick={start}
                      style={primaryButtonStyle}
                      type="button"
                    >
                      <span>
                        {content.startButtonLabel ?? "Estimate my roof"}
                      </span>
                      <ArrowRight height={18} width={18} />
                    </button>
                  </motion.div>
                ) : null}

                {/* QUESTIONS */}
                {step >= 0 && !onResults
                  ? (() => {
                      const question = visibleQuestions[step];
                      if (!question) {
                        return null;
                      }
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
                          <p
                            style={{
                              color: mix(theme.colors.everglade, 55),
                              fontSize: "0.7rem",
                              fontWeight: 800,
                              letterSpacing: "0.16em",
                              margin: `0 0 ${theme.spacing.sm}`,
                              textTransform: "uppercase",
                            }}
                          >
                            Question {step + 1} of {totalSteps}
                          </p>
                          <h2 style={cardHeadingStyle}>{question.prompt}</h2>
                          {question.helpText ? (
                            <p style={cardTextStyle}>{question.helpText}</p>
                          ) : null}

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
                                optionIllustrationFor(
                                  question.prompt,
                                  option.label
                                );
                              return (
                                <button
                                  aria-pressed={isSelected}
                                  className={estimatorOptionClass}
                                  key={optionKey}
                                  onClick={() =>
                                    selectOption(questionKey, optionKey)
                                  }
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
                                  <span
                                    style={{
                                      color: theme.colors.everglade,
                                      fontFamily: theme.fonts.headline,
                                      fontSize: "1.05rem",
                                      fontWeight: 700,
                                    }}
                                  >
                                    {option.label}
                                  </span>
                                  {option.description ? (
                                    <span
                                      style={{
                                        color: mix(theme.colors.everglade, 65),
                                        fontSize: "0.85rem",
                                      }}
                                    >
                                      {option.description}
                                    </span>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>

                          {step >= 0 ? (
                            <div style={{ marginTop: theme.spacing.xxl }}>
                              <button
                                onClick={() => goTo(step - 1, -1)}
                                style={ghostButtonStyle}
                                type="button"
                              >
                                <ArrowLeft height={16} width={16} />
                                <span>Back</span>
                              </button>
                            </div>
                          ) : null}
                        </motion.div>
                      );
                    })()
                  : null}

                {/* RESULTS */}
                {onResults ? (
                  <motion.div
                    animate="center"
                    custom={direction}
                    exit="exit"
                    initial="enter"
                    key="results"
                    transition={{ duration: 0.3 }}
                    variants={slideVariants}
                  >
                    {estimate ? (
                      <>
                        <p
                          style={{
                            ...helpStyle,
                            color: theme.colors.accent,
                            fontWeight: 700,
                            margin: 0,
                          }}
                        >
                          {content.resultHeading ??
                            "Here's roughly what you'll spend"}
                        </p>
                        <p
                          style={{
                            color: theme.colors.everglade,
                            fontFamily: theme.fonts.headline,
                            fontSize: "clamp(2.25rem, 8vw, 3.75rem)",
                            fontWeight: 900,
                            lineHeight: 1.05,
                            margin: `${theme.spacing.sm} 0 ${theme.spacing.lg}`,
                          }}
                        >
                          {formatRange(estimate, currency)}
                        </p>

                        <ul
                          className="wa-stack wa-gap-3xs"
                          style={{
                            listStyle: "none",
                            margin: `0 0 ${theme.spacing.xl}`,
                            padding: 0,
                          }}
                        >
                          {summary.map((row) => (
                            <li
                              className="wa-split"
                              key={row.prompt}
                              style={{
                                borderBottom: `1px solid ${theme.colors.paperDark}`,
                                color: mix(theme.colors.everglade, 75),
                                fontSize: "0.95rem",
                                gap: theme.spacing.lg,
                                marginInlineStart: 0,
                                padding: `${theme.spacing.sm} 0`,
                              }}
                            >
                              <span>{row.prompt}</span>
                              <span
                                style={{
                                  color: theme.colors.everglade,
                                  fontWeight: 700,
                                  textAlign: "right",
                                }}
                              >
                                {row.answer}
                              </span>
                            </li>
                          ))}
                        </ul>

                        {content.disclaimer ? (
                          <p
                            style={{
                              backgroundColor: mix(theme.colors.accent, 6),
                              borderInlineStart: `4px solid ${theme.colors.accent}`,
                              borderRadius: theme.radius.medium,
                              color: mix(theme.colors.everglade, 60),
                              fontSize: "0.85rem",
                              lineHeight: 1.6,
                              margin: `0 0 ${theme.spacing.xxl}`,
                              padding: theme.spacing.lg,
                            }}
                          >
                            {content.disclaimer}
                          </p>
                        ) : null}

                        {/* EMAIL ME */}
                        {sendStatus === "sent" ? (
                          <div
                            className="wa-cluster wa-gap-xs"
                            style={{
                              backgroundColor: mix(theme.colors.accent, 8),
                              borderRadius: theme.radius.medium,
                              color: theme.colors.accent,
                              fontWeight: 700,
                              padding: theme.spacing.lg,
                            }}
                          >
                            <Check height={22} width={22} />
                            <span>
                              Sent! Check your inbox for your estimate.
                            </span>
                          </div>
                        ) : (
                          <form onSubmit={handleEmail}>
                            <p
                              style={{
                                color: theme.colors.everglade,
                                fontFamily: theme.fonts.headline,
                                fontSize: "1.1rem",
                                fontWeight: 700,
                                margin: `0 0 ${theme.spacing.md}`,
                              }}
                            >
                              Email me this estimate
                            </p>
                            <div
                              className={estimatorEmailRowClass}
                              style={
                                {
                                  "--min-column-size": "14rem",
                                  marginBottom: theme.spacing.md,
                                } as React.CSSProperties
                              }
                            >
                              <WaInput
                                label="Your name"
                                onChange={(e) =>
                                  setFullName(
                                    (e.target as unknown as { value: string })
                                      .value
                                  )
                                }
                                required
                                value={fullName}
                              />
                              <WaInput
                                label="Email"
                                onChange={(e) =>
                                  setEmail(
                                    (e.target as unknown as { value: string })
                                      .value
                                  )
                                }
                                required
                                type="email"
                                value={email}
                              />
                            </div>
                            {sendError ? (
                              <p
                                role="alert"
                                style={{
                                  color: theme.colors.danger,
                                  fontSize: "0.875rem",
                                  margin: `0 0 ${theme.spacing.md}`,
                                }}
                              >
                                {sendError}
                              </p>
                            ) : null}
                            <div className={estimatorFooterClass}>
                              <button
                                disabled={sendStatus === "sending"}
                                style={{
                                  ...primaryButtonStyle,
                                  cursor:
                                    sendStatus === "sending"
                                      ? "wait"
                                      : "pointer",
                                  opacity: sendStatus === "sending" ? 0.75 : 1,
                                }}
                                type="submit"
                              >
                                <span>
                                  {sendStatus === "sending"
                                    ? "Sending…"
                                    : "Email me the estimate"}
                                </span>
                                <Send height={18} width={18} />
                              </button>
                              <button
                                onClick={restart}
                                style={ghostButtonStyle}
                                type="button"
                              >
                                <RefreshDouble height={16} width={16} />
                                <span>Start over</span>
                              </button>
                            </div>
                          </form>
                        )}
                      </>
                    ) : (
                      <>
                        <h2 style={headingStyle}>Almost there</h2>
                        <p style={helpStyle}>
                          I need your home size to estimate a range. Jump back
                          and pick a size to see your ballpark.
                        </p>
                        <button
                          onClick={() => goTo(0, -1)}
                          style={primaryButtonStyle}
                          type="button"
                        >
                          <ArrowLeft height={18} width={18} />
                          <span>Back to questions</span>
                        </button>
                      </>
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <EstimatorMapBackground
        active
        mapboxToken={mapboxToken}
        propertyCoords={propertyCoords}
      />
    </section>
  );
};
// biome-ignore-end lint/complexity/noExcessiveCognitiveComplexity: estimator flow contains a single orchestrator component with many conditional render branches
