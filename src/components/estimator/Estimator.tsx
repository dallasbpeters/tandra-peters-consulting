import WaInput from "@awesome.me/webawesome/dist/react/input/index.js";
import { AddressAutofill } from "@mapbox/search-js-react";
import "@awesome.me/webawesome/dist/styles/themes/default.css";
import { usePostHog } from "@posthog/react";
import { ArrowLeft, ArrowRight, Check, RefreshDouble, Search, Send } from "iconoir-react";
import { AnimatePresence, motion } from "motion/react";
import React, { useMemo, useState } from "react";

import type { EstimatorPageContent } from "../../types";

import {
  computeEstimate,
  formatRange,
  summarizeSelections,
  type EstimatorSelections,
} from "../../lib/estimator";
import { layoutClass } from "../../styles/layoutClasses";
import { mix, theme } from "../../theme";
import { EstimatorMapBackground } from "./EstimatorMapBackground";
import { optionIllustrationFor } from "./optionIllustrations";
import {
  estimatorCardLayoutStyle,
  estimatorCardStyle,
  estimatorEmailRowStyle,
  estimatorFooterStyle,
  estimatorIntroLayoutStyle,
  estimatorOptionArtStyle,
  estimatorOptionStyle,
  estimatorOptionsStyle,
  introCardStyle,
} from "./styles";

const trackGaEstimator = (payload: Record<string, unknown>) => {
  if (typeof window === "undefined") return;
  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== "function") return;
  gtag("event", "estimator", payload);
};

/** Relative path so production stays same-origin; Vite proxies `/api` in dev. */
export const ESTIMATE_API_PATH = "/api/estimate";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SendStatus = "idle" | "sending" | "sent" | "error";
type AddressLookupStatus = "idle" | "loading" | "found" | "error";

type EstimatorProps = {
  content: EstimatorPageContent;
  sectionId?: string;
};

export const Estimator: React.FC<EstimatorProps> = ({ content, sectionId = "estimator" }) => {
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
  const [propertyCoords, setPropertyCoords] = useState<[number, number] | null>(null);

  // Mapbox
  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() ?? "";

  const setMapboxAddress = (
    formattedAddress: string,
    coords: [number, number] | null,
    source: "mapbox-autofill" | "mapbox-geocoding",
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
      if (!res.ok) throw new Error("Could not check that address on the map.");
      const data = (await res.json()) as {
        features?: Array<{
          center?: [number, number];
          place_name?: string;
          text?: string;
        }>;
      };
      const feature = data.features?.[0];
      if (!feature?.center) {
        throw new Error("I could not find that address on the map.");
      }
      const formatted = feature.place_name || formattedAddress;
      setMapboxAddress(formatted, feature.center, "mapbox-geocoding");
    } catch (err) {
      setLookupStatus("error");
      setLookupError(
        err instanceof Error ? err.message : "Could not check that address on the map.",
      );
    }
  };

  const visibleQuestions = questions;

  const totalSteps = visibleQuestions.length;
  const onResults = step >= totalSteps;

  const estimate = useMemo(
    () => (onResults ? computeEstimate(content, selections) : null),
    [onResults, content, selections],
  );
  const summary = useMemo(
    () => (onResults ? summarizeSelections(content, selections) : []),
    [onResults, content, selections],
  );

  const goTo = (next: number, dir: number) => {
    setDirection(dir);
    setStep(next);
  };

  const handleLookup = async () => {
    const trimmed = address.trim();
    if (!trimmed) return;
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
    if (!estimate) return;
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not send the estimate.");
      setSendStatus("sent");
      posthog?.identify(email.trim(), {
        name: fullName.trim(),
        email: email.trim(),
      });
      posthog?.capture("estimator_emailed", {
        range: formatRange(estimate, currency),
      });
      trackGaEstimator({
        action: "emailed",
        range: formatRange(estimate, currency),
      });
    } catch (err) {
      setSendStatus("error");
      setSendError(err instanceof Error ? err.message : "Could not send the estimate.");
      posthog?.captureException(err);
      trackGaEstimator({
        action: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const progressPct = totalSteps > 0 ? (Math.min(step + 1, totalSteps) / totalSteps) * 100 : 0;

  const headingStyle: React.CSSProperties = {
    fontSize: "clamp(1.6rem, 4vw, 2.25rem)",
    lineHeight: 1.15,
    fontFamily: theme.fonts.headline,
    fontWeight: 800,
    color: theme.colors.white,
    margin: 0,
  };
  const cardHeadingStyle: React.CSSProperties = {
    fontSize: "clamp(1.6rem, 4vw, 2.25rem)",
    lineHeight: 1.15,
    fontFamily: theme.fonts.headline,
    fontWeight: 800,
    color: theme.colors.black,
    marginBlockEnd: theme.spacing.md,
  };
  const cardTextStyle: React.CSSProperties = {
    fontSize: "1.2rem",
    lineHeight: 1.15,
    fontFamily: theme.fonts.headline,
    fontWeight: 800,
    color: theme.colors.black,
    margin: 0,
  };

  const helpStyle: React.CSSProperties = {
    color: mix(theme.colors.white, 70),
    fontSize: "1rem",
    lineHeight: 1.6,
    margin: `${theme.spacing.sm} 0 0`,
  };

  const slideVariants = {
    enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
  };

  const addressLabelStyle: React.CSSProperties = {
    display: "block",
    fontFamily: theme.fonts.body,
    fontSize: "var(--wa-form-control-label-font-size, 1rem)",
    color: theme.colors.everglade,
    marginBottom: "0.5rem",
  };

  const primaryButtonStyle: React.CSSProperties = {
    backgroundColor: theme.colors.everglade,
    color: theme.colors.white,
    padding: `${theme.spacing.lg} ${theme.spacing.xxl}`,
    fontFamily: theme.fonts.headline,
    fontWeight: 900,
    textTransform: "uppercase",
    borderRadius: theme.radius.medium,
    letterSpacing: "0.08em",
    fontSize: "0.875rem",
    display: "inline-flex",
    alignItems: "center",
    gap: theme.spacing.md,
    border: "none",
    cursor: "pointer",
    marginTop: theme.spacing.xl,
  };

  const ghostButtonStyle: React.CSSProperties = {
    backgroundColor: "transparent",
    color: mix(theme.colors.everglade, 80),
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    fontFamily: theme.fonts.headline,
    fontWeight: 700,
    fontSize: "0.875rem",
    borderRadius: theme.radius.medium,
    display: "inline-flex",
    alignItems: "center",
    gap: theme.spacing.sm,
    border: "none",
    cursor: "pointer",
  };

  const addressInputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    fontFamily: theme.fonts.body,
    fontSize: "var(--wa-form-control-value-font-size, 1rem)",
    color: theme.colors.everglade,
    backgroundColor: "var(--wa-form-control-background-color, #fff)",
    border:
      "var(--wa-form-control-border-width, 1px) var(--wa-form-control-border-style, solid) var(--wa-form-control-border-color)",
    borderRadius: "var(--wa-border-radius-m, 0.5rem)",
    height: "var(--wa-form-control-height, 2.625rem)",
    padding: "0 var(--wa-form-control-padding-inline, 1rem)",
    outline: "none",
  };

  return (
    <section
      id={sectionId}
      className={layoutClass.sectionPadded}
      style={{ backgroundColor: theme.colors.paper, position: "relative" }}
      aria-labelledby={`${sectionId}-heading`}
    >
      <div className={layoutClass.containerFull}>
        <div style={{ marginBottom: theme.spacing.xxxxl, maxWidth: "80vw" }}>
          {content.eyebrow ? (
            <span
              style={{
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                color: theme.palette.coral["300"],
                fontSize: "0.75rem",
                marginBottom: theme.spacing.md,
                display: "block",
              }}
            >
              {content.eyebrow}
            </span>
          ) : null}
          <h1
            id={`${sectionId}-heading`}
            style={{ ...headingStyle, fontSize: "clamp(2rem, 6vw, 3rem)" }}
          >
            {content.title ?? "What might my roof cost?"}
          </h1>
          {content.description ? <p style={helpStyle}>{content.description}</p> : null}
        </div>
        {/* Intro: 2-col with map panel. Questions/results: single card. */}
        <div style={step === -1 ? estimatorIntroLayoutStyle : estimatorCardLayoutStyle}>
          <div data-estimator-card style={step === -1 ? introCardStyle : estimatorCardStyle}>
            {/* Progress bar (hidden on intro + results) */}
            {step >= 0 && !onResults ? (
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
                  style={{
                    height: "100%",
                    backgroundColor: theme.colors.accent,
                  }}
                />
              </div>
            ) : null}

            <div style={{ padding: "clamp(1.5rem, 4vw, 2.75rem)" }}>
              <AnimatePresence mode="wait" custom={direction} initial={false}>
                {/* INTRO */}
                {step === -1 ? (
                  <motion.div
                    key="intro"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3 }}
                  >
                    <h2 style={cardHeadingStyle}>Ready for a ballpark?</h2>
                    <p style={cardTextStyle}>
                      {totalSteps} quick question{totalSteps === 1 ? "" : "s"}, about a minute.
                      {" You'll see an honest price range at the end—no obligation."}
                    </p>

                    {/* Address lookup */}
                    <div style={{ marginTop: theme.spacing.xxl }}>
                      <div
                        style={{
                          display: "flex",
                          gap: theme.spacing.sm,
                          alignItems: "flex-end",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ flex: "1 1 220px" }}>
                          <label htmlFor="contact-property-address" style={addressLabelStyle}>
                            Property Address{" "}
                            <span
                              style={{
                                fontWeight: 400,
                                color: mix(theme.colors.everglade, 45),
                              }}
                            >
                              (optional)
                            </span>
                          </label>
                          {mapboxToken ? (
                            <AddressAutofill
                              accessToken={mapboxToken}
                              options={{ country: "US", language: "en" }}
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
                                const full = props?.full_address || props?.place_name;
                                const rawCoords = feature?.geometry?.coordinates;
                                const coords =
                                  Array.isArray(rawCoords) &&
                                  typeof rawCoords[0] === "number" &&
                                  typeof rawCoords[1] === "number"
                                    ? ([rawCoords[0], rawCoords[1]] as [number, number])
                                    : null;
                                if (full) {
                                  setMapboxAddress(full, coords, "mapbox-autofill");
                                }
                              }}
                            >
                              <input
                                id="contact-property-address"
                                name="property-address"
                                type="text"
                                className="contact-address-input"
                                placeholder="123 Main St, Austin, TX"
                                value={address}
                                onChange={(ev) => setAddress(ev.target.value)}
                                autoComplete="address-line1"
                                maxLength={500}
                                style={addressInputStyle}
                              />
                            </AddressAutofill>
                          ) : (
                            <input
                              id="contact-property-address"
                              name="property-address"
                              type="text"
                              className="contact-address-input"
                              placeholder="123 Main St, Austin, TX"
                              value={address}
                              onChange={(ev) => setAddress(ev.target.value)}
                              autoComplete="street-address"
                              maxLength={500}
                              style={addressInputStyle}
                            />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleLookup()}
                          disabled={!address.trim() || lookupStatus === "loading"}
                          style={{
                            ...ghostButtonStyle,
                            border: `1px solid ${theme.colors.paperDark}`,
                            flexShrink: 0,
                            height: "2.75rem",
                            opacity: !address.trim() || lookupStatus === "loading" ? 0.5 : 1,
                            cursor:
                              !address.trim() || lookupStatus === "loading" ? "default" : "pointer",
                          }}
                        >
                          <Search width={15} height={15} />
                          <span>{lookupStatus === "loading" ? "Finding…" : "Find on map"}</span>
                        </button>
                      </div>

                      {lookupStatus === "found" && selectedAddress ? (
                        <div
                          style={{
                            marginTop: theme.spacing.md,
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            backgroundColor: mix(theme.colors.accent, 8),
                            border: `1px solid ${mix(theme.colors.accent, 22)}`,
                            borderRadius: theme.radius.medium,
                            fontSize: "0.85rem",
                            color: theme.colors.everglade,
                            display: "flex",
                            gap: theme.spacing.sm,
                            alignItems: "flex-start",
                          }}
                        >
                          <Check
                            width={15}
                            height={15}
                            style={{
                              color: theme.colors.accent,
                              flexShrink: 0,
                              marginTop: "0.15rem",
                            }}
                          />
                          <div>
                            <strong style={{ display: "block" }}>{selectedAddress}</strong>
                            <span style={{ color: mix(theme.colors.everglade, 60) }}>
                              Map centered. I’ll still ask for roof size so the range stays honest.
                            </span>
                          </div>
                        </div>
                      ) : null}

                      {lookupStatus === "error" && lookupError ? (
                        <p
                          role="alert"
                          style={{
                            marginTop: theme.spacing.sm,
                            fontSize: "0.85rem",
                            color: theme.colors.danger,
                          }}
                        >
                          {lookupError} You can still answer the questions manually.
                        </p>
                      ) : null}
                    </div>

                    <button type="button" onClick={start} style={primaryButtonStyle}>
                      <span>{content.startButtonLabel ?? "Estimate my roof"}</span>
                      <ArrowRight width={18} height={18} />
                    </button>
                  </motion.div>
                ) : null}

                {/* QUESTIONS */}
                {step >= 0 && !onResults
                  ? (() => {
                      const question = visibleQuestions[step];
                      if (!question) return null;
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
                          <p
                            style={{
                              textTransform: "uppercase",
                              letterSpacing: "0.16em",
                              fontSize: "0.7rem",
                              fontWeight: 800,
                              color: mix(theme.colors.everglade, 55),
                              margin: `0 0 ${theme.spacing.sm}`,
                            }}
                          >
                            Question {step + 1} of {totalSteps}
                          </p>
                          <h2 style={cardHeadingStyle}>{question.prompt}</h2>
                          {question.helpText ? (
                            <p style={cardTextStyle}>{question.helpText}</p>
                          ) : null}

                          <div
                            style={{
                              ...estimatorOptionsStyle,
                              marginTop: theme.spacing.xxl,
                            }}
                          >
                            {question.options.map((option) => {
                              const optionKey = option._key ?? option.label;
                              const isSelected = selected === optionKey;
                              const illustration =
                                option.illustration ??
                                optionIllustrationFor(question.prompt, option.label);
                              return (
                                <button
                                  type="button"
                                  key={optionKey}
                                  onClick={() => selectOption(questionKey, optionKey)}
                                  aria-pressed={isSelected}
                                  style={{
                                    ...estimatorOptionStyle,
                                    borderColor: isSelected
                                      ? theme.colors.accent
                                      : theme.colors.paperDark,
                                    backgroundColor: isSelected
                                      ? mix(theme.colors.accent, 8)
                                      : theme.colors.paper,
                                    boxShadow: isSelected
                                      ? `0 8px 20px ${mix(theme.colors.accent, 18)}`
                                      : "none",
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
                                  <span
                                    style={{
                                      fontFamily: theme.fonts.headline,
                                      fontWeight: 700,
                                      fontSize: "1.05rem",
                                      color: theme.colors.everglade,
                                    }}
                                  >
                                    {option.label}
                                  </span>
                                  {option.description ? (
                                    <span
                                      style={{
                                        fontSize: "0.85rem",
                                        color: mix(theme.colors.everglade, 65),
                                      }}
                                    >
                                      {option.description}
                                    </span>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>

                          {step > 0 ? (
                            <div style={{ marginTop: theme.spacing.xxl }}>
                              <button
                                type="button"
                                onClick={() => goTo(step - 1, -1)}
                                style={ghostButtonStyle}
                              >
                                <ArrowLeft width={16} height={16} />
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
                    key="results"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3 }}
                  >
                    {estimate ? (
                      <>
                        <p
                          style={{
                            ...helpStyle,
                            margin: 0,
                            fontWeight: 700,
                            color: theme.colors.accent,
                          }}
                        >
                          {content.resultHeading ?? "Here's roughly what you'll spend"}
                        </p>
                        <p
                          style={{
                            fontFamily: theme.fonts.headline,
                            fontWeight: 900,
                            fontSize: "clamp(2.25rem, 8vw, 3.75rem)",
                            lineHeight: 1.05,
                            color: theme.colors.everglade,
                            margin: `${theme.spacing.sm} 0 ${theme.spacing.lg}`,
                          }}
                        >
                          {formatRange(estimate, currency)}
                        </p>

                        <ul
                          style={{
                            listStyle: "none",
                            margin: `0 0 ${theme.spacing.xl}`,
                            padding: 0,
                            display: "flex",
                            flexDirection: "column",
                            gap: theme.spacing.xs,
                          }}
                        >
                          {summary.map((row) => (
                            <li
                              key={row.prompt}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: theme.spacing.lg,
                                fontSize: "0.95rem",
                                color: mix(theme.colors.everglade, 75),
                                borderBottom: `1px solid ${theme.colors.paperDark}`,
                                padding: `${theme.spacing.sm} 0`,
                              }}
                            >
                              <span>{row.prompt}</span>
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: theme.colors.everglade,
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
                              fontSize: "0.85rem",
                              lineHeight: 1.6,
                              color: mix(theme.colors.everglade, 60),
                              backgroundColor: mix(theme.colors.accent, 6),
                              borderInlineStart: `4px solid ${theme.colors.accent}`,
                              padding: theme.spacing.lg,
                              borderRadius: theme.radius.medium,
                              margin: `0 0 ${theme.spacing.xxl}`,
                            }}
                          >
                            {content.disclaimer}
                          </p>
                        ) : null}

                        {/* EMAIL ME */}
                        {sendStatus === "sent" ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: theme.spacing.md,
                              color: theme.colors.accent,
                              fontWeight: 700,
                              padding: theme.spacing.lg,
                              backgroundColor: mix(theme.colors.accent, 8),
                              borderRadius: theme.radius.medium,
                            }}
                          >
                            <Check width={22} height={22} />
                            <span>Sent! Check your inbox for your estimate.</span>
                          </div>
                        ) : (
                          <form onSubmit={handleEmail}>
                            <p
                              style={{
                                fontFamily: theme.fonts.headline,
                                fontWeight: 700,
                                fontSize: "1.1rem",
                                color: theme.colors.everglade,
                                margin: `0 0 ${theme.spacing.md}`,
                              }}
                            >
                              Email me this estimate
                            </p>
                            <div style={estimatorEmailRowStyle}>
                              <WaInput
                                label="Your name"
                                value={fullName}
                                required
                                onInput={(e) =>
                                  setFullName((e.target as unknown as { value: string }).value)
                                }
                              />
                              <WaInput
                                label="Email"
                                type="email"
                                value={email}
                                required
                                onInput={(e) =>
                                  setEmail((e.target as unknown as { value: string }).value)
                                }
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
                            <div style={estimatorFooterStyle}>
                              <button
                                type="submit"
                                disabled={sendStatus === "sending"}
                                style={{
                                  ...primaryButtonStyle,
                                  cursor: sendStatus === "sending" ? "wait" : "pointer",
                                  opacity: sendStatus === "sending" ? 0.75 : 1,
                                }}
                              >
                                <span>
                                  {sendStatus === "sending" ? "Sending…" : "Email me the estimate"}
                                </span>
                                <Send width={18} height={18} />
                              </button>
                              <button type="button" onClick={restart} style={ghostButtonStyle}>
                                <RefreshDouble width={16} height={16} />
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
                          I need your home size to estimate a range. Jump back and pick a size to
                          see your ballpark.
                        </p>
                        <button
                          type="button"
                          onClick={() => goTo(0, -1)}
                          style={primaryButtonStyle}
                        >
                          <ArrowLeft width={18} height={18} />
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

      <EstimatorMapBackground active mapboxToken={mapboxToken} propertyCoords={propertyCoords} />
    </section>
  );
};
