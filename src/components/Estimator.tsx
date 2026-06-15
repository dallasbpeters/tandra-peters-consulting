import WaInput from "@awesome.me/webawesome/dist/react/input/index.js";
import "mapbox-gl/dist/mapbox-gl.css";
import { usePostHog } from "@posthog/react";
import "@awesome.me/webawesome/dist/styles/themes/default.css";
import { ArrowLeft, ArrowRight, Check, RefreshDouble, Search, Send } from "iconoir-react";
import mapboxgl from "mapbox-gl";
import { AnimatePresence, motion } from "motion/react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChromaFlow, Shader } from "shaders/react";

import type { EstimatorPageContent, EstimatorQuestion } from "../types";

import { useIsMobile } from "../hooks/isMobile";
import { useNearViewport } from "../hooks/useNearViewport";
import {
  computeEstimate,
  formatRange,
  summarizeSelections,
  type EstimatorSelections,
} from "../lib/estimator";
import {
  lookupProperty,
  type PropertyLookupResult,
  type PropertyLookupStatus,
} from "../lib/propertyLookup";
import { layoutClass } from "../styles/layoutClasses";
import { mix, theme } from "../theme";
import "../styles/estimator.css";

const MAP_STYLE = "mapbox://styles/dallasbpeters/cmpp12ft3003f01s8fw2fdari";
const TX_CENTER: [number, number] = [-99.5, 31.0];
const TX_ZOOM = 5.8;

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

type EstimatorProps = {
  content: EstimatorPageContent;
  sectionId?: string;
};

/** Match a story count to one of the question's option keys. */
const resolveStoryOptionKey = (
  storyCount: number | null,
  options: EstimatorQuestion["options"],
): string | null => {
  if (!storyCount) return null;
  const hints: [number, string[]][] = [
    [1, ["one story", "1 story", "single", "ranch", "bungalow"]],
    [2, ["two stor", "2 stor", "colonial"]],
    [3, ["three", "3+", "tall narrow"]],
  ];
  const match = hints
    .slice()
    .reverse()
    .find(([n]) => storyCount >= n);
  if (!match) return null;
  const [, keywords] = match;
  const opt = options.find((o) =>
    keywords.some((kw) => (o.label + " " + (o.description ?? "")).toLowerCase().includes(kw)),
  );
  return opt ? (opt._key ?? opt.label) : null;
};

export const Estimator: React.FC<EstimatorProps> = ({ content, sectionId = "estimator" }) => {
  const posthog = usePostHog();
  const isMobile = useIsMobile();
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

  // Property address lookup
  const [address, setAddress] = useState("");
  const [propertyData, setPropertyData] = useState<PropertyLookupResult | null>(null);
  const [lookupStatus, setLookupStatus] = useState<PropertyLookupStatus>("idle");
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Mapbox
  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() ?? "";
  const sectionRef = useRef<HTMLElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [propertyCoords, setPropertyCoords] = useState<[number, number] | null>(null);
  const isNearViewport = useNearViewport(sectionRef, "300px 0px");

  // Init map when on intro + near viewport
  useEffect(() => {
    if (step !== -1 || !isNearViewport) return;
    const container = mapContainerRef.current;
    if (!container || !mapboxToken || mapRef.current) return;

    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
      container,
      style: MAP_STYLE,
      center: TX_CENTER,
      zoom: TX_ZOOM,
      attributionControl: false,
      scrollZoom: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    map.once("style.load", () => {
      try {
        map.setTerrain(null);
        map.setConfigProperty("basemap", "lightPreset", "dusk");
        map.setConfigProperty("basemap", "show3dObjects", false);
      } catch {
        /* non-Standard basemap — skip */
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [step, isNearViewport, mapboxToken]);

  // Fly to property when geocoords are known
  useEffect(() => {
    const map = mapRef.current;
    if (!propertyCoords || !map) return;

    map.flyTo({ center: propertyCoords, zoom: 15.5, duration: 2000, essential: true });

    if (markerRef.current) {
      markerRef.current.setLngLat(propertyCoords);
    } else {
      const el = document.createElement("div");
      Object.assign(el.style, {
        width: "14px",
        height: "14px",
        borderRadius: "50%",
        background: "#945bea",
        border: "3px solid #ffffff",
        boxShadow: "0 2px 14px rgba(0,0,0,0.65)",
      });
      markerRef.current = new mapboxgl.Marker({ element: el }).setLngLat(propertyCoords).addTo(map);
    }
  }, [propertyCoords]);

  /** Forward-geocode the formatted address so we can fly the map there. */
  const geocodeForMap = async (formattedAddress: string) => {
    if (!mapboxToken) return;
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(formattedAddress)}.json?access_token=${mapboxToken}&limit=1&country=US&types=address`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = (await res.json()) as {
        features?: Array<{ center?: [number, number] }>;
      };
      const center = data.features?.[0]?.center;
      if (center) setPropertyCoords(center);
    } catch {
      /* non-fatal — map just stays on Texas */
    }
  };

  // The home-size question drives sq footage; skip it when we have real property data.
  const sqftQuestionIndex = questions.findIndex((q) => q.drivesSquareFootage);
  const visibleQuestions = useMemo(
    () =>
      propertyData && sqftQuestionIndex >= 0
        ? questions.filter((_, i) => i !== sqftQuestionIndex)
        : questions,
    [questions, propertyData, sqftQuestionIndex],
  );

  const totalSteps = visibleQuestions.length;
  const onResults = step >= totalSteps;

  // When property data is available, pass real total living area as sqft override.
  // The stories multiplier question still runs to convert living area → footprint.
  const estimateOverrides = useMemo(
    () => (propertyData?.totalAreaSqft ? { sqft: propertyData.totalAreaSqft } : undefined),
    [propertyData],
  );

  const estimate = useMemo(
    () => (onResults ? computeEstimate(content, selections, estimateOverrides) : null),
    [onResults, content, selections, estimateOverrides],
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
    setLookupStatus("loading");
    setLookupError(null);
    try {
      const result = await lookupProperty(trimmed);
      setPropertyData(result);
      setLookupStatus("found");
      void geocodeForMap(result.formattedAddress);
      posthog?.capture("estimator_property_lookup", {
        stories: result.stories,
        sqft: result.totalAreaSqft,
      });
    } catch (err) {
      setLookupStatus("error");
      setLookupError(err instanceof Error ? err.message : "Could not look up that address.");
    }
  };

  const start = () => {
    posthog?.capture("estimator_started", { addressProvided: lookupStatus === "found" });

    // Pre-select the stories answer when we know it from property data.
    if (propertyData) {
      const storiesQ = questions.find(
        (q) =>
          q.multipliesSquareFootage &&
          q.options.some((o) =>
            (o.label + " " + (o.description ?? "")).toLowerCase().includes("stor"),
          ),
      );
      if (storiesQ) {
        const key = resolveStoryOptionKey(propertyData.stories, storiesQ.options);
        if (key) {
          const qKey = storiesQ._key ?? storiesQ.prompt;
          setSelections((prev) => ({ ...prev, [qKey]: key }));
        }
      }
    }

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
    setPropertyData(null);
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
          propertyAddress: propertyData?.formattedAddress ?? null,
          answers: summary,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not send the estimate.");
      setSendStatus("sent");
      posthog?.identify(email.trim(), { name: fullName.trim(), email: email.trim() });
      posthog?.capture("estimator_emailed", { range: formatRange(estimate, currency) });
      trackGaEstimator({ action: "emailed", range: formatRange(estimate, currency) });
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
    color: theme.colors.everglade,
    margin: 0,
  };

  const helpStyle: React.CSSProperties = {
    color: mix(theme.colors.everglade, 70),
    fontSize: "1rem",
    lineHeight: 1.6,
    margin: `${theme.spacing.sm} 0 0`,
  };

  const slideVariants = {
    enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
  };

  return (
    <section
      ref={sectionRef}
      id={sectionId}
      className={layoutClass.sectionPadded}
      style={{ backgroundColor: theme.colors.paper }}
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
        <div className={step === -1 ? "estimator-intro-layout" : ""}>
          <div className="estimator-card">
            {/* Progress bar (hidden on intro + results) */}
            {step >= 0 && !onResults ? (
              <div
                style={{ height: 6, backgroundColor: theme.colors.paperDark, position: "relative" }}
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
                    <h2 style={headingStyle}>Ready for a ballpark?</h2>
                    <p style={helpStyle}>
                      {totalSteps} quick question{totalSteps === 1 ? "" : "s"}, about a minute.
                      {" You'll see an honest price range at the end—no obligation."}
                    </p>

                    {/* Address lookup */}
                    <div style={{ marginTop: theme.spacing.xxl }}>
                      <p
                        style={{
                          fontFamily: theme.fonts.headline,
                          fontWeight: 700,
                          fontSize: "0.9rem",
                          color: theme.colors.everglade,
                          margin: `0 0 ${theme.spacing.xs}`,
                        }}
                      >
                        Want a more accurate estimate?
                      </p>
                      <p
                        style={{
                          fontSize: "0.85rem",
                          color: mix(theme.colors.everglade, 60),
                          margin: `0 0 ${theme.spacing.md}`,
                          lineHeight: 1.5,
                        }}
                      >
                        Enter your address to pull real building data — no guessing on square
                        footage.
                      </p>
                      <div
                        style={{
                          display: "flex",
                          gap: theme.spacing.sm,
                          alignItems: "flex-end",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ flex: "1 1 220px" }}>
                          <WaInput
                            label="Property address (optional)"
                            value={address}
                            onInput={(e) =>
                              setAddress((e.target as unknown as { value: string }).value)
                            }
                            onKeyDown={(e: React.KeyboardEvent) => {
                              if (e.key === "Enter") void handleLookup();
                            }}
                            autocomplete="street-address"
                          />
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
                          <span>{lookupStatus === "loading" ? "Looking up…" : "Look up"}</span>
                        </button>
                      </div>

                      {/* Lookup result chip */}
                      {lookupStatus === "found" && propertyData ? (
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
                            <strong style={{ display: "block" }}>
                              {propertyData.formattedAddress}
                            </strong>
                            <span style={{ color: mix(theme.colors.everglade, 60) }}>
                              {[
                                propertyData.totalAreaSqft
                                  ? `${propertyData.totalAreaSqft.toLocaleString()} sq ft`
                                  : null,
                                propertyData.stories ? `${propertyData.stories}-story` : null,
                                propertyData.yearBuilt ? `built ${propertyData.yearBuilt}` : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
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

                    <button
                      type="button"
                      onClick={start}
                      className="estimator-cta"
                      style={primaryButtonStyle}
                    >
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
                          <h2 style={headingStyle}>{question.prompt}</h2>
                          {question.helpText ? <p style={helpStyle}>{question.helpText}</p> : null}

                          <div
                            className="estimator-options"
                            style={{ marginTop: theme.spacing.xxl }}
                          >
                            {question.options.map((option) => {
                              const optionKey = option._key ?? option.label;
                              const isSelected = selected === optionKey;
                              return (
                                <button
                                  type="button"
                                  key={optionKey}
                                  className="estimator-option"
                                  onClick={() => selectOption(questionKey, optionKey)}
                                  aria-pressed={isSelected}
                                  style={{
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
                          {/* Property data row when it drove the calculation */}
                          {propertyData?.totalAreaSqft ? (
                            <li
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
                              <span>Square footage</span>
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: theme.colors.everglade,
                                  textAlign: "right",
                                }}
                              >
                                {propertyData.totalAreaSqft.toLocaleString()} sq ft
                                <span
                                  style={{
                                    display: "block",
                                    fontWeight: 400,
                                    fontSize: "0.78rem",
                                    color: mix(theme.colors.everglade, 50),
                                  }}
                                >
                                  from property records
                                </span>
                              </span>
                            </li>
                          ) : null}
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
                            <div
                              className="estimator-email-row"
                              style={{ marginBottom: theme.spacing.md }}
                            >
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
                            <div className="estimator-footer">
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

          {/* Map panel — only visible on intro step */}
          {step === -1 ? (
            <div
              className="estimator-map-panel"
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 0,
                borderRadius: theme.radius.large,
                overflow: "hidden",
                minHeight: isMobile ? "220px" : "480px",
                backgroundColor: theme.palette.everglade["950"],
                border: `1px solid ${mix(theme.colors.white, 8)}`,
              }}
            >
              {/* Mapbox canvas */}
              <div
                ref={mapContainerRef}
                style={{ position: "absolute", inset: 0 }}
                aria-hidden="true"
              />

              {/* No-token fallback */}
              {!mapboxToken ? (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.8rem",
                    color: mix(theme.colors.white, 40),
                    padding: theme.spacing.xxl,
                    textAlign: "center",
                  }}
                >
                  Add <code>VITE_MAPBOX_ACCESS_TOKEN</code> to .env.local to load the map.
                </div>
              ) : null}

              {/* ChromaFlow purple tint — matches service area map */}
              <Shader
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  zIndex: 1,
                  mixBlendMode: "multiply",
                }}
              >
                <ChromaFlow
                  id="mapChromaFlow"
                  baseColor="#7449d6"
                  blendMode="multiply"
                  downColor="#7935b5"
                  intensity={1}
                  momentum={19}
                  radius={2.5}
                  rightColor="#8a5ae8"
                  transform={{ offsetX: 0.01 }}
                  upColor="#9a6cf0"
                />
              </Shader>

              {/* Property found label */}
              {lookupStatus === "found" && propertyData ? (
                <div
                  style={{
                    position: "absolute",
                    bottom: theme.spacing.lg,
                    left: theme.spacing.lg,
                    right: theme.spacing.lg,
                    zIndex: 5,
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    backgroundColor: "rgba(8, 24, 16, 0.82)",
                    borderRadius: theme.radius.medium,
                    backdropFilter: "blur(6px)",
                    color: theme.colors.white,
                    fontSize: "0.8rem",
                    lineHeight: 1.4,
                    pointerEvents: "none",
                  }}
                >
                  <strong style={{ display: "block", marginBottom: "0.1rem" }}>
                    {propertyData.formattedAddress}
                  </strong>
                  <span style={{ color: mix(theme.colors.white, 70) }}>
                    {[
                      propertyData.totalAreaSqft
                        ? `${propertyData.totalAreaSqft.toLocaleString()} sq ft`
                        : null,
                      propertyData.stories ? `${propertyData.stories}-story` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

const primaryButtonStyle: React.CSSProperties = {
  backgroundColor: theme.colors.everglade,
  color: theme.colors.white,
  padding: `${theme.spacing.lg} ${theme.spacing.xxl}`,
  fontFamily: theme.fonts.headline,
  fontWeight: 900,
  textTransform: "uppercase",
  borderRadius: theme.radius.large,
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
  borderRadius: theme.radius.large,
  display: "inline-flex",
  alignItems: "center",
  gap: theme.spacing.sm,
  border: "none",
  cursor: "pointer",
};
