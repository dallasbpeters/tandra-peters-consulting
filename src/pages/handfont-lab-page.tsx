/**
 * Handfont Lab — interactive typography sandbox.
 *
 * Fixes vs. previous version:
 *  - Per-letter timing instead of fixed total duration (was way too fast)
 *  - Hand tracking uses direct SVG-attribute math instead of getScreenCTM()
 *    (getScreenCTM returns wrong coords when SVG is CSS-scaled)
 *  - Preview canvas width is dynamic; container scrolls horizontally
 *  - Hand position update uses useLayoutEffect with stable deps (no render loop)
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  HandfontLetter,
  glyphWidth as computeGlyphWidth,
} from "../remotion/whiteboard/components/handfont-letter";
import { loadGlyphs } from "../remotion/whiteboard/handfont-parse";
import type { ParsedGlyph } from "../remotion/whiteboard/handfont-parse";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CANVAS_H = 320;
const BASELINE_Y = 230;
const GAP_RATIO = 0.06;
const SPACE_RATIO = 0.35;
const SIDE_PAD = 60; // padding on each side of the word

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

interface LayoutToken {
  char: string;
  glyph: ParsedGlyph | null;
  x: number;
  y: number;
  height: number;
  width: number;
  letterIdx: number;
}

function layoutText(
  text: string,
  glyphs: Map<string, ParsedGlyph | null>,
  fontSize: number,
  capsScale: number,
  letterSpacing: number
): LayoutToken[] {
  const tokens: LayoutToken[] = [];
  const gap = fontSize * (GAP_RATIO + letterSpacing);
  let cursorX = 0;
  let li = 0;

  for (const char of text) {
    const isUpper = char >= "A" && char <= "Z";
    const isLower = char >= "a" && char <= "z";
    const isLetter = isUpper || isLower;

    if (char === " ") {
      cursorX += fontSize * SPACE_RATIO + gap;
      continue;
    }

    const g = glyphs.get(char) ?? null;
    const h = isUpper ? fontSize * capsScale : fontSize;
    const w = g ? computeGlyphWidth(g, h) : fontSize * (isLetter ? 0.55 : 0.4);

    tokens.push({
      char,
      glyph: g,
      x: cursorX,
      y: BASELINE_Y - h,
      height: h,
      width: w,
      letterIdx: isLetter && g ? li++ : -1,
    });

    cursorX += w + gap;
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Hand tracking — direct SVG attribute math (avoids getScreenCTM scaling bug)
//
// Each HandfontLetter renders a nested <svg x={token.x} y={token.y}
// viewBox={glyph.viewBox} width={glyphW} height={glyphH}>.
// We find that nested SVG, read its x/y/height attrs and viewBox,
// then transform the path point to the outer SVG's coordinate space.
// ---------------------------------------------------------------------------

interface HandPos {
  x: number;
  y: number;
}

function resolveHandPos(
  containerSvg: SVGSVGElement,
  globalProgress: number,
  letterCount: number,
  translateX: number // offsetX of the letters group
): HandPos | null {
  if (letterCount === 0) {
    return null;
  }

  const frac = 1 / letterCount;
  const activeIdx = Math.min(
    Math.floor(globalProgress / frac),
    letterCount - 1
  );
  const lo = activeIdx * frac;
  const hi = lo + frac;
  const localP = Math.max(0, Math.min(1, (globalProgress - lo) / (hi - lo)));

  const groups =
    containerSvg.querySelectorAll<SVGGElement>("[data-letter-idx]");
  const group = [...groups].find(
    (el) => el.dataset.letterIdx === String(activeIdx)
  );
  if (!group) {
    return null;
  }

  // The HandfontLetter renders a nested <svg> — find it
  const nestedSvg = group.querySelector<SVGSVGElement>("svg");
  if (!nestedSvg) {
    return null;
  }

  // Stroke paths live inside the nested svg (not in <defs>)
  const paths = nestedSvg.querySelectorAll<SVGPathElement>("path[pathLength]");
  if (!paths.length) {
    return null;
  }

  const n = paths.length;
  let activePath = paths[n - 1];
  let pathP = 1;

  for (let i = 0; i < n; i++) {
    const plo = i / n;
    const phi = (i + 1) / n;
    if (localP >= plo && localP <= phi) {
      activePath = paths[i];
      pathP = phi > plo ? (localP - plo) / (phi - plo) : 1;
      break;
    }
  }

  try {
    const totalLen = activePath.getTotalLength();
    if (totalLen === 0) {
      return null;
    }

    // Point in the path's viewBox coordinate space
    const rawPt = activePath.getPointAtLength(pathP * totalLen);

    // Read the nested SVG's geometry directly from SVG attributes
    const svgX = nestedSvg.x.baseVal.value; // token.x, in parent-g space
    const svgY = nestedSvg.y.baseVal.value; // token.y
    const svgH = nestedSvg.height.baseVal.value; // rendered height (outer SVG units)
    const vb = nestedSvg.viewBox.baseVal; // glyph viewBox rect

    if (vb.height === 0) {
      return null;
    }

    // Uniform scale: viewBox units → outer SVG units
    const scale = svgH / vb.height;

    return {
      x: translateX + svgX + (rawPt.x - vb.x) * scale,
      y: svgY + (rawPt.y - vb.y) * scale,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Slider
// ---------------------------------------------------------------------------

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}
const Slider = ({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: SliderProps) => (
  <label
    style={{
      color: "#aaa",
      display: "flex",
      flexDirection: "column",
      fontSize: 12,
      gap: 4,
    }}
  >
    <span style={{ display: "flex", justifyContent: "space-between" }}>
      <span>{label}</span>
      <span style={{ color: "#fff", fontVariantNumeric: "tabular-nums" }}>
        {format ? format(value) : value}
      </span>
    </span>
    <input
      max={max}
      min={min}
      step={step}
      style={{ accentColor: "#6c6", width: "100%" }}
      type="range"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  </label>
);

// ---------------------------------------------------------------------------
// Hand SVG — tip at (0,0), rest of hand above/right
// ---------------------------------------------------------------------------
const HandMarkerSvg = ({
  x,
  y,
  size = 48,
}: {
  x: number;
  y: number;
  size?: number;
}) => {
  const s = size;
  return (
    <g style={{ pointerEvents: "none" }} transform={`translate(${x},${y})`}>
      {/* Marker tip dot */}
      <circle cx={0} cy={0} fill="#222" r={3} />
      {/* Marker body */}
      <rect
        fill="#2a2a2a"
        height={s * 0.52}
        rx={s * 0.03}
        stroke="#111"
        strokeWidth={1}
        width={s * 0.12}
        x={-s * 0.06}
        y={-s * 0.58}
      />
      <rect
        fill="#666"
        height={s * 0.06}
        width={s * 0.12}
        x={-s * 0.06}
        y={-s * 0.2}
      />
      {/* Hand */}
      <ellipse
        cx={s * 0.28}
        cy={-s * 0.04}
        fill="#F2C492"
        rx={s * 0.26}
        ry={s * 0.19}
        stroke="#D4955A"
        strokeWidth={1}
      />
      <ellipse
        cx={s * 0.04}
        cy={-s * 0.28}
        fill="#F2C492"
        rx={s * 0.065}
        ry={s * 0.14}
        stroke="#D4955A"
        strokeWidth={1}
      />
      <ellipse
        cx={s * 0.18}
        cy={-s * 0.3}
        fill="#F2C492"
        rx={s * 0.065}
        ry={s * 0.13}
        stroke="#D4955A"
        strokeWidth={1}
      />
    </g>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export const HandfontLabPage = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);

  const [text, setText] = useState("Hello Tandra");
  const [fontSize, setFontSize] = useState(100);
  const [capsScale, setCapsScale] = useState(1.3);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [msPerLetter, setMsPerLetter] = useState(500); // ms each letter takes to draw
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showHand, setShowHand] = useState(true);
  const [glyphs, setGlyphs] = useState<Map<string, ParsedGlyph | null> | null>(
    null
  );
  const [handPos, setHandPos] = useState<HandPos | null>(null);

  // ── Load glyphs ───────────────────────────────────────────────────────────
  useEffect(() => {
    setGlyphs(null);
    loadGlyphs(text).then(setGlyphs);
  }, [text]);

  // ── Layout ────────────────────────────────────────────────────────────────
  const tokens = glyphs
    ? layoutText(text, glyphs, fontSize, capsScale, letterSpacing)
    : [];

  const letterCount = tokens.filter((t) => t.letterIdx >= 0).length;
  const lastToken = tokens.at(-1);
  const textW = lastToken ? lastToken.x + lastToken.width : 0;
  const canvasW = Math.max(600, textW + SIDE_PAD * 2);
  const offsetX = SIDE_PAD; // letters always start at SIDE_PAD (no centering — keeps scroll intuitive)

  const fractionPerLetter = letterCount > 0 ? 1 / letterCount : 1;
  const totalDuration = msPerLetter * Math.max(1, letterCount);

  // ── Hand position (runs after each render that changes progress) ──────────
  useLayoutEffect(() => {
    if (!showHand || !svgRef.current || letterCount === 0) {
      setHandPos(null);
      return;
    }
    const pos = resolveHandPos(svgRef.current, progress, letterCount, offsetX);
    // Only update if the position meaningfully changed (avoids extra renders)
    setHandPos((prev) => {
      if (!pos) {
        return null;
      }
      if (
        prev &&
        Math.abs(prev.x - pos.x) < 0.5 &&
        Math.abs(prev.y - pos.y) < 0.5
      ) {
        return prev;
      }
      return pos;
    });
  }, [progress, showHand, letterCount, offsetX]);

  // ── Animation loop ────────────────────────────────────────────────────────
  const stopAnim = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    startTimeRef.current = null;
  }, []);

  const startAnim = useCallback(() => {
    stopAnim();
    const duration = totalDuration;
    const tick = (t: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = t;
      }
      const p = Math.min((t - startTimeRef.current) / duration, 1);
      setProgress(p);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setPlaying(false);
        startTimeRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [totalDuration, stopAnim]);

  useEffect(() => {
    if (playing) {
      startAnim();
    } else {
      stopAnim();
    }
    return stopAnim;
  }, [playing, startAnim, stopAnim]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        background: "#111",
        color: "#fff",
        fontFamily: "system-ui, -apple-system, sans-serif",
        minHeight: "100vh",
        padding: 32,
      }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 24px" }}>
        Handfont Lab
      </h1>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 32 }}>
        {/* ── Controls ── */}
        <div
          style={{
            background: "#1a1a1a",
            borderRadius: 8,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            minWidth: 260,
            padding: 20,
          }}
        >
          <label
            style={{
              color: "#aaa",
              display: "flex",
              flexDirection: "column",
              fontSize: 12,
              gap: 4,
            }}
          >
            Text
            <input
              style={{
                background: "#2a2a2a",
                border: "1px solid #444",
                borderRadius: 4,
                color: "#fff",
                fontSize: 15,
                padding: "6px 10px",
              }}
              type="text"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setProgress(0);
                setPlaying(false);
              }}
            />
          </label>

          <Slider
            label="Font size"
            value={fontSize}
            min={32}
            max={180}
            step={1}
            format={(v) => `${v}px`}
            onChange={(v) => {
              setFontSize(v);
              setProgress(0);
            }}
          />

          <Slider
            label="Caps scale"
            value={capsScale}
            min={1}
            max={2}
            step={0.01}
            format={(v) => `×${v.toFixed(2)}`}
            onChange={(v) => {
              setCapsScale(v);
              setProgress(0);
            }}
          />

          <Slider
            label="Letter spacing"
            value={letterSpacing}
            min={-0.1}
            max={0.5}
            step={0.01}
            format={(v) => (v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2))}
            onChange={(v) => {
              setLetterSpacing(v);
              setProgress(0);
            }}
          />

          <Slider
            label="Speed per letter"
            value={msPerLetter}
            min={100}
            max={2000}
            step={50}
            format={(v) => `${(v / 1000).toFixed(2)}s`}
            onChange={setMsPerLetter}
          />

          <p style={{ color: "#555", fontSize: 11, margin: "-8px 0 0" }}>
            Total: {(totalDuration / 1000).toFixed(1)}s for {letterCount}{" "}
            letters
          </p>

          <label
            style={{
              alignItems: "center",
              color: "#aaa",
              cursor: "pointer",
              display: "flex",
              fontSize: 12,
              gap: 8,
            }}
          >
            <input
              checked={showHand}
              type="checkbox"
              onChange={(e) => setShowHand(e.target.checked)}
            />
            Show hand cursor
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              style={{
                background: playing ? "#522" : "#252",
                border: "none",
                borderRadius: 4,
                color: "#fff",
                cursor: "pointer",
                flex: 1,
                fontSize: 13,
                padding: "8px 12px",
              }}
              type="button"
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? "⏸ Pause" : "▶ Play"}
            </button>
            <button
              style={{
                background: "#2a2a2a",
                border: "1px solid #444",
                borderRadius: 4,
                color: "#fff",
                cursor: "pointer",
                fontSize: 13,
                padding: "8px 12px",
              }}
              type="button"
              onClick={() => {
                setProgress(0);
                startTimeRef.current = null;
                setPlaying(true);
              }}
            >
              ↺
            </button>
          </div>

          <Slider
            label="Scrub"
            value={progress}
            min={0}
            max={1}
            step={0.001}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => {
              setProgress(v);
              setPlaying(false);
            }}
          />

          {handPos && (
            <p style={{ color: "#555", fontSize: 11, margin: 0 }}>
              Tip · x {Math.round(handPos.x)} y {Math.round(handPos.y)}
            </p>
          )}
        </div>

        {/* ── Preview canvas (scrollable) ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Horizontal scroll wrapper */}
          <div
            style={{
              background: "#faf6f0",
              borderRadius: 8,
              overflowX: "auto",
              overflowY: "hidden",
            }}
          >
            <svg
              ref={svgRef}
              aria-label="Handfont preview"
              height={CANVAS_H}
              // Fixed width in SVG units = fixed CSS pixel size (1:1 mapping).
              // This makes coordinate transforms for hand tracking trivial.
              style={{ display: "block" }}
              viewBox={`0 0 ${canvasW} ${CANVAS_H}`}
              width={canvasW}
            >
              {/* Baseline */}
              <line
                stroke="#e0d8c8"
                strokeDasharray="6 4"
                strokeWidth={1}
                x1={0}
                x2={canvasW}
                y1={BASELINE_Y}
                y2={BASELINE_Y}
              />
              {/* Cap height */}
              <line
                stroke="#eee8e0"
                strokeDasharray="4 6"
                strokeWidth={1}
                x1={0}
                x2={canvasW}
                y1={BASELINE_Y - fontSize * capsScale}
                y2={BASELINE_Y - fontSize * capsScale}
              />

              {/* Letters group — translateX so hand coords match */}
              <g transform={`translate(${offsetX},0)`}>
                {tokens.map((token, idx) => {
                  if (token.letterIdx < 0 || !token.glyph) {
                    return null;
                  }

                  const li = token.letterIdx;
                  const lLo = li * fractionPerLetter;
                  const lHi = lLo + fractionPerLetter;
                  const localP = Math.max(
                    0,
                    Math.min(1, (progress - lLo) / (lHi - lLo))
                  );

                  return (
                    <g key={`${token.char}-${idx}`} data-letter-idx={li}>
                      <HandfontLetter
                        color="#1c1c1c"
                        glyph={token.glyph}
                        height={token.height}
                        progress={localP}
                        x={token.x}
                        y={token.y}
                      />
                    </g>
                  );
                })}
              </g>

              {/* Hand cursor — placed in outer SVG coords returned by resolveHandPos */}
              {showHand && handPos && (
                <HandMarkerSvg x={handPos.x} y={handPos.y} />
              )}
            </svg>
          </div>

          {!glyphs && (
            <p style={{ color: "#666", fontSize: 12, marginTop: 8 }}>
              Loading glyphs…
            </p>
          )}
          {glyphs && letterCount === 0 && text.trim() && (
            <p style={{ color: "#f88", fontSize: 12, marginTop: 8 }}>
              No glyphs loaded — run{" "}
              <code
                style={{
                  background: "#222",
                  borderRadius: 3,
                  padding: "1px 4px",
                }}
              >
                pnpm handfont:setup
              </code>{" "}
              first.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
