/**
 * /handfont-preview — live preview of every hand-drawn SVG glyph.
 *
 * Animation technique: CSS transitions + getTotalLength() + forced layout reflow.
 *
 * Key learnings (from debugging Tests A–E):
 *  - CSS @keyframes:         FAIL inside SVG clip-path compositing groups
 *  - Web Animations API:     FAIL inside SVG clip-path compositing groups
 *  - setInterval/rAF + direct style change: FAIL (no repaint for composited layers)
 *  - CSS `transition` property + JS style change: WORKS ✓
 *    (transitions are compositor-handled; the browser commits the initial
 *     state because we force a layout reflow with getBoundingClientRect()
 *     BEFORE setting the transition + end value)
 *  - `getTotalLength()` required for accurate dasharray/dashoffset values;
 *    a large constant (99999) causes the initial hidden state to never be
 *    committed correctly in some browser optimisation paths.
 *
 * The Remotion component (handfont-letter.tsx) uses a different approach:
 * per-frame JSX prop setting, which works in headless Chrome static renders.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { loadGlyph } from "../remotion/whiteboard/handfont-parse";
import type { ParsedGlyph } from "../remotion/whiteboard/handfont-parse";

const CAP_HEIGHT = 88;
const X_HEIGHT = 56;
const DEFAULT_DURATION_S = 1.4;

const UPPER = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
const LOWER = [..."abcdefghijklmnopqrstuvwxyz"];

// ---------------------------------------------------------------------------
// SVG builder — produces a minimal SVG string from ParsedGlyph data.
// No embedded <style>, no CSS class selectors. Stroke paths are plain <path>
// elements with stroke-related attributes; animation is applied imperatively.
// ---------------------------------------------------------------------------

function buildGlyphSvg(
  glyph: ParsedGlyph,
  displayH: number,
  color: string,
  clipId: string
): string {
  const w = (glyph.vw / glyph.vh) * displayH;

  const pathEls = glyph.strokePaths
    .map(
      ({ d, strokeWidth }) =>
        `<path class="sp" d="${d}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`
    )
    .join("\n    ");

  return `<svg viewBox="${glyph.viewBox}" width="${w}" height="${displayH}" overflow="visible" aria-hidden="true">
  <defs>
    <clipPath id="${clipId}">
      <path d="${glyph.clipPathD}"/>
    </clipPath>
  </defs>
  <g clip-path="url(#${clipId})">
    ${pathEls}
  </g>
</svg>`;
}

// ---------------------------------------------------------------------------
// GlyphCard — CSS transition animation driven imperatively after mount
// ---------------------------------------------------------------------------

interface GlyphCardProps {
  letter: string;
  isUpper: boolean;
  replay: number;
  durationS: number;
}

const GlyphCard = ({ letter, isUpper, replay, durationS }: GlyphCardProps) => {
  const rawId = useId();
  // Stable, unique clip-path ID scoped to this card instance.
  const clipId = `hfp${rawId.replaceAll(":", "")}`;

  const [glyph, setGlyph] = useState<ParsedGlyph | null>(null);
  const [missing, setMissing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load glyph once (cached after first fetch)
  useEffect(() => {
    setMissing(false);
    loadGlyph(letter).then((g) => {
      if (g) {
        setGlyph(g);
      } else {
        setMissing(true);
      }
    });
  }, [letter]);

  // CSS transition animation — same pattern as RMLogoDrawOn:
  //   1. Set initial hidden state (dashoffset = pathLength)
  //   2. Force layout reflow with getBoundingClientRect()
  //   3. Set CSS transition + end state (dashoffset = 0)
  //
  // biome-ignore lint/correctness/useExhaustiveDependencies: replay is an intentional re-trigger
  useEffect(() => {
    if (!glyph || !containerRef.current) {
      return;
    }
    const svg = containerRef.current.querySelector("svg");
    if (!svg) {
      return;
    }

    const paths = [...svg.querySelectorAll("path.sp")] as SVGPathElement[];
    if (!paths.length) {
      return;
    }

    const n = paths.length;
    const lengths: number[] = [];

    // Step 1 — measure and hide
    for (const p of paths) {
      let len = 0;
      try {
        len = p.getTotalLength() ?? 0;
      } catch {
        len = 0;
      }
      lengths.push(Number.isFinite(len) && len > 0 ? len : 0);

      if (!len) {
        continue;
      }
      // Batch all three into one cssText write to avoid repeated layout hits.
      p.style.cssText += `;transition:none;stroke-dasharray:${len};stroke-dashoffset:${len}`;
    }

    // Step 2 — force layout flush so initial hidden state is committed
    svg.getBoundingClientRect();

    // Step 3 — reveal each path in sequence via CSS transition
    const perPathDur = durationS / Math.max(n, 1);
    for (let i = 0; i < paths.length; i++) {
      if (!lengths[i]) {
        continue;
      }
      // Batch the transition + dashoffset change into one cssText write.
      paths[i].style.cssText +=
        `;transition:stroke-dashoffset ${perPathDur}s linear ${i * perPathDur}s;stroke-dashoffset:0`;
    }
  }, [glyph, replay, durationS]);

  const displayH = isUpper ? CAP_HEIGHT : X_HEIGHT;
  const displayW = glyph ? Math.ceil((glyph.vw / glyph.vh) * displayH) : 0;
  const cardW = Math.max(64, displayW + 16);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        padding: "8px 6px",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        background: "#fafafa",
        width: cardW,
      }}
    >
      <div
        style={{
          width: cardW - 12,
          height: CAP_HEIGHT + 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {missing && <span style={{ color: "#d1d5db", fontSize: 22 }}>—</span>}
        {!missing && !glyph && (
          <span style={{ color: "#e5e7eb", fontSize: 11 }}>…</span>
        )}
        {!missing && glyph && (
          <div
            ref={containerRef}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: controlled SVG markup built from ParsedGlyph data extracted from own public/ font files
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: buildGlyphSvg(glyph, displayH, "#1c1c1c", clipId),
            }}
          />
        )}
      </div>
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 10,
          color: missing ? "#d1d5db" : "#9ca3af",
        }}
      >
        {letter}
      </span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

const Section = ({
  title,
  letters,
  isUpper,
  replay,
  durationS,
}: {
  title: string;
  letters: string[];
  isUpper: boolean;
  replay: number;
  durationS: number;
}) => (
  <section>
    <h2
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: "#6b7280",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginBottom: 10,
        marginTop: 0,
      }}
    >
      {title}
    </h2>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {letters.map((l) => (
        <GlyphCard
          key={l}
          durationS={durationS}
          isUpper={isUpper}
          letter={l}
          replay={replay}
        />
      ))}
    </div>
  </section>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export const HandfontPreviewPage = () => {
  const [replay, setReplay] = useState(0);
  const [durationS, setDurationS] = useState(DEFAULT_DURATION_S);
  const [autoPlay, setAutoPlay] = useState(false);

  const handleReplay = useCallback(() => setReplay((n) => n + 1), []);

  useEffect(() => {
    if (!autoPlay) {
      return;
    }
    const id = window.setInterval(
      () => setReplay((n) => n + 1),
      (durationS + 0.8) * 1000
    );
    return () => window.clearInterval(id);
  }, [autoPlay, durationS]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        padding: "28px 24px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 28,
          flexWrap: "wrap",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: "12px 16px",
        }}
      >
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
            Handfont Preview
          </h1>
          <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>
            CSS transitions +{" "}
            <code
              style={{
                fontSize: 11,
                background: "#f3f4f6",
                padding: "1px 4px",
                borderRadius: 3,
              }}
            >
              getTotalLength()
            </code>{" "}
            + layout reflow
            {" · "}no CSS animations, no Web Animations API
          </p>
        </div>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <label
            style={{
              fontSize: 12,
              color: "#6b7280",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Duration
            <input
              max={5}
              min={0.3}
              step={0.1}
              style={{ width: 90, accentColor: "#111827" }}
              type="range"
              value={durationS}
              onChange={(e) => setDurationS(Number(e.target.value))}
            />
            <span style={{ width: 30, fontSize: 12 }}>
              {durationS.toFixed(1)}s
            </span>
          </label>

          <label
            style={{
              fontSize: 12,
              color: "#6b7280",
              display: "flex",
              alignItems: "center",
              gap: 5,
              cursor: "pointer",
            }}
          >
            <input
              checked={autoPlay}
              type="checkbox"
              onChange={(e) => setAutoPlay(e.target.checked)}
            />
            Loop
          </label>

          <button
            style={{
              padding: "6px 18px",
              background: "#111827",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
            type="button"
            onClick={handleReplay}
          >
            ▶ Replay
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <Section
          isUpper
          durationS={durationS}
          letters={UPPER}
          replay={replay}
          title={`Uppercase (${CAP_HEIGHT}px)`}
        />
        <Section
          isUpper={false}
          durationS={durationS}
          letters={LOWER}
          replay={replay}
          title={`Lowercase (${X_HEIGHT}px)`}
        />
      </div>

      <p
        style={{
          marginTop: 28,
          fontSize: 11,
          color: "#d1d5db",
          textAlign: "center",
        }}
      >
        — = not found · run{" "}
        <code style={{ fontSize: 11 }}>pnpm handfont:setup</code> to refresh
        from <code style={{ fontSize: 11 }}>src/handfont-svgs/</code>
      </p>
    </div>
  );
};
