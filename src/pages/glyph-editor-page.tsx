/**
 * Glyph Editor — adjust individual handfont SVGs and save them back to file.
 *
 * Layout:
 *   ┌─────────────────────────────────────────────────────┐
 *   │  Header (char badge · Reset · Save)                  │
 *   ├─────────────────────────────────────────────────────┤
 *   │  Word preview strip  [  Hello World  ]              │
 *   │  (type a word, click any letter to select it)        │
 *   ├──────────┬──────────────────────────┬───────────────┤
 *   │ Char grid│  Single-glyph preview    │ Controls      │
 *   └──────────┴──────────────────────────┴───────────────┘
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  HandfontLetter,
  glyphWidth as computeGlyphWidth,
} from "../remotion/whiteboard/components/handfont-letter";
import { parseGlyph } from "../remotion/whiteboard/handfont-parse";
import type { ParsedGlyph } from "../remotion/whiteboard/handfont-parse";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const ALL_CHARS = [...UPPER, ...LOWER];
const PREVIEW_H = 200; // single-glyph editor preview height
const WORD_H = 96; // word-strip glyph height
const WORD_GAP = 8; // px between glyphs in the word strip

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GlyphSettings {
  vbX: number;
  vbY: number;
  vbW: number;
  vbH: number;
  strokeWidth: number;
  tx: number;
  ty: number;
  scale: number;
}

// ---------------------------------------------------------------------------
// SVG helpers
// ---------------------------------------------------------------------------

function extractSettings(svgText: string): GlyphSettings {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  const svgEl = doc.querySelector("svg");

  const vbParts = (svgEl?.getAttribute("viewBox") ?? "0 0 100 100")
    .split(/[\s,]+/)
    .map(Number);

  const styleText = svgEl?.querySelector("style")?.textContent ?? "";
  const swMatch = /stroke-width\s*:\s*([\d.]+)px/.exec(styleText);

  return {
    vbX: vbParts[0] ?? 0,
    vbY: vbParts[1] ?? 0,
    vbW: vbParts[2] ?? 100,
    vbH: vbParts[3] ?? 100,
    strokeWidth: swMatch ? Number.parseFloat(swMatch[1]) : 19,
    tx: 0,
    ty: 0,
    scale: 1,
  };
}

function buildSaveableSvg(rawSvg: string, s: GlyphSettings): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawSvg, "image/svg+xml");
  const svgEl = doc.querySelector("svg");
  if (!svgEl) {
    return rawSvg;
  }

  svgEl.setAttribute("viewBox", `${s.vbX} ${s.vbY} ${s.vbW} ${s.vbH}`);

  const styleEl = svgEl.querySelector("style");
  if (styleEl?.textContent) {
    styleEl.textContent = styleEl.textContent.replace(
      /stroke-width\s*:\s*[\d.]+px/,
      `stroke-width: ${s.strokeWidth}px`
    );
  }

  if (s.tx !== 0 || s.ty !== 0 || s.scale !== 1) {
    const rootG = svgEl.querySelector(":scope > g");
    if (rootG) {
      rootG.setAttribute(
        "transform",
        `translate(${s.tx},${s.ty}) scale(${s.scale})`
      );
    }
  } else {
    svgEl.querySelector(":scope > g")?.removeAttribute("transform");
  }

  return new XMLSerializer().serializeToString(doc);
}

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

async function fetchGlyph(
  char: string
): Promise<{ rawSvg: string; glyph: ParsedGlyph } | null> {
  const sub = char >= "A" && char <= "Z" ? "upper" : "lower";
  try {
    const r = await fetch(`/whiteboard/handfont/${sub}/${char}.svg`);
    if (!r.ok) {
      return null;
    }
    const rawSvg = await r.text();
    const glyph = parseGlyph(rawSvg);
    if (!glyph) {
      return null;
    }
    return { rawSvg, glyph };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Word-strip layout
// ---------------------------------------------------------------------------

interface WordToken {
  char: string;
  x: number;
  width: number;
  glyph: ParsedGlyph | null;
  isSpace: boolean;
}

function layoutWord(
  text: string,
  cache: Map<string, ParsedGlyph>,
  height: number,
  gap: number
): WordToken[] {
  const tokens: WordToken[] = [];
  let x = 0;
  for (const char of text) {
    if (char === " ") {
      const w = height * 0.35;
      tokens.push({ char, x, width: w, glyph: null, isSpace: true });
      x += w;
      continue;
    }
    const glyph = cache.get(char) ?? null;
    const w = glyph ? computeGlyphWidth(glyph, height) : height * 0.5;
    tokens.push({ char, x, width: w, glyph, isSpace: false });
    x += w + gap;
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface NumInputProps {
  label: string;
  value: number;
  step?: number;
  onChange: (v: number) => void;
}

const NumInput = ({ label, value, step = 1, onChange }: NumInputProps) => {
  // Draft string so partial inputs (empty field, trailing dot) don't wipe the
  // glyph. onChange fires immediately for every valid number → live preview.
  const [draft, setDraft] = useState(String(value));
  const prevValue = useRef(value);
  if (prevValue.current !== value) {
    prevValue.current = value;
    setDraft(String(value));
  }

  const handleChange = (raw: string) => {
    setDraft(raw);
    const n = Number.parseFloat(raw);
    if (!Number.isNaN(n)) {
      onChange(n);
    }
  };

  const revert = () => {
    if (Number.isNaN(Number.parseFloat(draft))) {
      setDraft(String(value));
    }
  };

  return (
    <label
      style={{
        color: "#aaa",
        display: "flex",
        flexDirection: "column",
        fontSize: 11,
        gap: 3,
      }}
    >
      {label}
      <input
        step={step}
        style={{
          background: "#2a2a2a",
          border: "1px solid #444",
          borderRadius: 4,
          color: "#fff",
          fontSize: 13,
          padding: "4px 8px",
          width: "100%",
        }}
        type="number"
        value={draft}
        onBlur={revert}
        onChange={(e) => handleChange(e.target.value)}
      />
    </label>
  );
};

const Section = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div
    style={{
      borderBottom: "1px solid #222",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      padding: "14px 16px",
    }}
  >
    <p
      style={{
        color: "#666",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.1em",
        margin: "0 0 4px",
        textTransform: "uppercase",
      }}
    >
      {label}
    </p>
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export const GlyphEditorPage = () => {
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);

  const [selectedChar, setSelectedChar] = useState("A");
  const [rawSvg, setRawSvg] = useState<string | null>(null);
  const [baseGlyph, setBaseGlyph] = useState<ParsedGlyph | null>(null);
  const [settings, setSettings] = useState<GlyphSettings>({
    vbX: 0,
    vbY: 0,
    vbW: 100,
    vbH: 100,
    strokeWidth: 19,
    tx: 0,
    ty: 0,
    scale: 1,
  });
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "done" | "error"
  >("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [glyphExists, setGlyphExists] = useState(true);

  // Word preview state
  const [wordText, setWordText] = useState("Hello World");
  const [glyphCache, setGlyphCache] = useState<Map<string, ParsedGlyph>>(
    new Map()
  );

  // ── Keyboard navigation ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT") {
        return;
      }
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") {
        return;
      }
      setSelectedChar((cur) => {
        const idx = ALL_CHARS.indexOf(cur);
        if (idx === -1) {
          return cur;
        }
        const next =
          e.key === "ArrowRight"
            ? ALL_CHARS[(idx + 1) % ALL_CHARS.length]
            : ALL_CHARS[(idx - 1 + ALL_CHARS.length) % ALL_CHARS.length];
        return next ?? cur;
      });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Load selected glyph ───────────────────────────────────────────────────
  useEffect(() => {
    setRawSvg(null);
    setBaseGlyph(null);
    setStatus("idle");

    fetchGlyph(selectedChar).then((result) => {
      if (!result) {
        setGlyphExists(false);
        return;
      }
      setGlyphExists(true);
      setRawSvg(result.rawSvg);
      setSettings(extractSettings(result.rawSvg));
      setBaseGlyph(result.glyph);
      // Seed the word cache with this glyph too
      setGlyphCache((prev) => new Map([...prev, [selectedChar, result.glyph]]));
    });
  }, [selectedChar]);

  // ── Load word glyphs (any chars not yet cached) ───────────────────────────
  useEffect(() => {
    const needed = [
      ...new Set(
        [...wordText].filter((c) => ALL_CHARS.includes(c) && !glyphCache.has(c))
      ),
    ];
    if (needed.length === 0) {
      return;
    }

    for (const c of needed) {
      fetchGlyph(c).then((result) => {
        if (result) {
          setGlyphCache((prev) => new Map([...prev, [c, result.glyph]]));
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordText]);

  // ── Derived display glyph ─────────────────────────────────────────────────
  const displayGlyph = useMemo<ParsedGlyph | null>(() => {
    if (!baseGlyph) {
      return null;
    }
    return {
      ...baseGlyph,
      viewBox: `${settings.vbX} ${settings.vbY} ${settings.vbW} ${settings.vbH}`,
      vw: settings.vbW,
      vh: settings.vbH,
      strokePaths: baseGlyph.strokePaths.map((sp) => ({
        ...sp,
        strokeWidth: settings.strokeWidth,
      })),
    };
  }, [baseGlyph, settings]);

  // ── Word strip layout ─────────────────────────────────────────────────────
  const wordTokens = useMemo(
    () => layoutWord(wordText, glyphCache, WORD_H, WORD_GAP),
    [wordText, glyphCache]
  );
  const wordTotalW =
    wordTokens.length > 0
      ? (wordTokens.at(-1)?.x ?? 0) + (wordTokens.at(-1)?.width ?? 0)
      : 0;

  // ── Animation loop ────────────────────────────────────────────────────────
  const stopAnim = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    startRef.current = null;
  }, []);

  useEffect(() => {
    if (!playing) {
      stopAnim();
      return;
    }
    const CYCLE = 2200;
    const tick = (t: number) => {
      if (!startRef.current) {
        startRef.current = t;
      }
      setProgress(((t - startRef.current) % CYCLE) / CYCLE);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return stopAnim;
  }, [playing, stopAnim]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!rawSvg || !baseGlyph) {
      return;
    }
    setStatus("saving");
    const svg = buildSaveableSvg(rawSvg, settings);
    try {
      const res = await fetch("/api/glyph-editor/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ char: selectedChar, svg }),
      });
      const data = (await res.json()) as { ok: boolean };
      if (data.ok) {
        setRawSvg(svg);
        const saved = parseGlyph(svg);
        if (saved) {
          setBaseGlyph(saved);
          // Update word cache so the strip reflects the saved state immediately
          setGlyphCache((prev) => new Map([...prev, [selectedChar, saved]]));
        }
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }, [rawSvg, baseGlyph, settings, selectedChar]);

  const handleReset = useCallback(() => {
    if (!rawSvg) {
      return;
    }
    setSettings(extractSettings(rawSvg));
  }, [rawSvg]);

  const handleUploadFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".svg")) {
        return;
      }
      setUploadStatus("uploading");
      const svg = await file.text();
      const glyph = parseGlyph(svg);
      if (!glyph) {
        setUploadStatus("error");
        setTimeout(() => setUploadStatus("idle"), 3000);
        return;
      }
      try {
        const res = await fetch("/api/glyph-editor/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ char: selectedChar, svg }),
        });
        const data = (await res.json()) as { ok: boolean };
        if (data.ok) {
          setRawSvg(svg);
          setSettings(extractSettings(svg));
          setBaseGlyph(glyph);
          setGlyphExists(true);
          setGlyphCache((prev) => new Map([...prev, [selectedChar, glyph]]));
          setUploadStatus("done");
          setTimeout(() => setUploadStatus("idle"), 2500);
        } else {
          setUploadStatus("error");
          setTimeout(() => setUploadStatus("idle"), 3000);
        }
      } catch {
        setUploadStatus("error");
        setTimeout(() => setUploadStatus("idle"), 3000);
      }
    },
    [selectedChar]
  );

  // ── Layout ────────────────────────────────────────────────────────────────
  const previewW = displayGlyph
    ? computeGlyphWidth(displayGlyph, PREVIEW_H)
    : PREVIEW_H;
  const canvasW = Math.max(previewW + 80, 280);
  const canvasH = PREVIEW_H + 60;
  const glyphX = (canvasW - previewW) / 2;

  const setS = useCallback(
    <K extends keyof GlyphSettings>(key: K, val: GlyphSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: val }));
    },
    []
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        background: "#111",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, -apple-system, sans-serif",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          alignItems: "center",
          background: "#1a1a1a",
          borderBottom: "1px solid #2a2a2a",
          display: "flex",
          flexShrink: 0,
          gap: 12,
          padding: "10px 20px",
        }}
      >
        <span style={{ color: "#aaa", fontSize: 13 }}>Glyph Editor</span>
        <span
          style={{
            background: "#222",
            border: "1px solid #333",
            borderRadius: 4,
            color: "#fff",
            fontFamily: "monospace",
            fontSize: 18,
            padding: "2px 10px",
          }}
        >
          {selectedChar}
        </span>
        {baseGlyph && (
          <span style={{ color: "#555", fontSize: 11 }}>
            {baseGlyph.strokePaths.length} stroke
            {baseGlyph.strokePaths.length === 1 ? "" : "s"} · vw{" "}
            {baseGlyph.vw.toFixed(1)} vh {baseGlyph.vh.toFixed(1)}
          </span>
        )}
        <div style={{ flex: 1 }} />
        {/* Hidden file input for SVG upload */}
        <input
          ref={fileInputRef}
          accept=".svg,image/svg+xml"
          style={{ display: "none" }}
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleUploadFile(file);
            }
            // Reset so the same file can be re-uploaded
            e.target.value = "";
          }}
        />
        <button
          disabled={uploadStatus === "uploading"}
          style={{
            background:
              uploadStatus === "done"
                ? "#166534"
                : uploadStatus === "error"
                  ? "#7f1d1d"
                  : "#1d4ed8",
            border: "none",
            borderRadius: 4,
            color: "#fff",
            cursor: uploadStatus === "uploading" ? "wait" : "pointer",
            fontSize: 12,
            fontWeight: 700,
            opacity: uploadStatus === "uploading" ? 0.6 : 1,
            padding: "5px 12px",
          }}
          title={`Replace glyph "${selectedChar}" with a new SVG file`}
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          {uploadStatus === "uploading"
            ? "Uploading…"
            : uploadStatus === "done"
              ? "✓ Uploaded"
              : uploadStatus === "error"
                ? "Bad SVG"
                : "↑ Upload SVG"}
        </button>
        <button
          style={{
            background: "#2a2a2a",
            border: "1px solid #444",
            borderRadius: 4,
            color: "#ccc",
            cursor: "pointer",
            fontSize: 12,
            padding: "5px 12px",
          }}
          type="button"
          onClick={handleReset}
        >
          Reset
        </button>
        <button
          disabled={status === "saving" || !displayGlyph}
          style={{
            background:
              status === "saved"
                ? "#2a4a2a"
                : status === "error"
                  ? "#4a2a2a"
                  : "#252",
            border: `1px solid ${status === "saved" ? "#4a8" : "#4a4"}`,
            borderRadius: 4,
            color: status === "saved" ? "#8f8" : "#9f9",
            cursor:
              status === "saving" || !displayGlyph ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 600,
            opacity: status === "saving" || !displayGlyph ? 0.6 : 1,
            padding: "5px 16px",
          }}
          type="button"
          onClick={handleSave}
        >
          {status === "saving"
            ? "Saving…"
            : status === "saved"
              ? "✓ Saved"
              : status === "error"
                ? "Error!"
                : "Save to file"}
        </button>
      </div>

      {/* ── Word preview strip ── */}
      <div
        style={{
          background: "#f5f0e8",
          borderBottom: "3px solid #2a2a2a",
          flexShrink: 0,
          padding: "0 20px",
        }}
      >
        {/* Word input */}
        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: 12,
            paddingTop: 10,
            paddingBottom: 6,
          }}
        >
          <label
            style={{
              color: "#666",
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Word preview
          </label>
          <input
            placeholder="type a word…"
            style={{
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: 4,
              color: "#333",
              fontSize: 14,
              padding: "4px 10px",
              width: 260,
            }}
            type="text"
            value={wordText}
            onChange={(e) => setWordText(e.target.value)}
          />
          <span style={{ color: "#aaa", fontSize: 11 }}>
            Click a letter to edit it
          </span>
        </div>

        {/* Glyph row */}
        <div style={{ overflowX: "auto", paddingBottom: 12 }}>
          <svg
            aria-label={`Word preview: ${wordText}`}
            height={WORD_H + 8}
            style={{ display: "block", minWidth: wordTotalW + 20 }}
            viewBox={`-10 0 ${wordTotalW + 20} ${WORD_H + 8}`}
            width={wordTotalW + 20}
          >
            {/* Baseline */}
            <line
              stroke="#d8d0c0"
              strokeWidth={1}
              x1={-10}
              x2={wordTotalW + 20}
              y1={WORD_H}
              y2={WORD_H}
            />

            {wordTokens.map((tok) => {
              if (tok.isSpace || !tok.glyph) {
                // Missing glyph placeholder
                return tok.isSpace ? null : (
                  <rect
                    key={`${tok.char}-${tok.x}`}
                    fill="none"
                    height={WORD_H}
                    rx={3}
                    stroke="#e0d0b0"
                    strokeDasharray="4 3"
                    strokeWidth={1}
                    width={tok.width}
                    x={tok.x}
                    y={0}
                  />
                );
              }

              const isSelected = tok.char === selectedChar;

              return (
                <g key={`${tok.char}-${tok.x}`}>
                  {/* Selection highlight */}
                  {isSelected && (
                    <rect
                      fill="#4a8a4a22"
                      height={WORD_H + 4}
                      rx={3}
                      stroke="#6c6"
                      strokeWidth={1.5}
                      width={tok.width + 6}
                      x={tok.x - 3}
                      y={-2}
                    />
                  )}

                  {/* The glyph — use displayGlyph for selected char, cached for others */}
                  <HandfontLetter
                    color={isSelected ? "#1c5c1c" : "#2a2a2a"}
                    glyph={
                      isSelected && displayGlyph ? displayGlyph : tok.glyph
                    }
                    height={WORD_H}
                    progress={progress}
                    x={tok.x}
                    y={0}
                  />

                  {/* Invisible click target */}
                  <rect
                    fill="transparent"
                    height={WORD_H + 8}
                    style={{ cursor: "pointer" }}
                    width={tok.width + WORD_GAP}
                    x={tok.x}
                    y={0}
                    onClick={() => setSelectedChar(tok.char)}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* ── Bottom: char picker | editor | controls ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Char picker */}
        <div
          style={{
            background: "#161616",
            borderRight: "1px solid #2a2a2a",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            overflowY: "auto",
            padding: 12,
            width: 180,
          }}
        >
          <p
            style={{
              color: "#666",
              fontSize: 10,
              letterSpacing: "0.08em",
              margin: "0 0 4px",
              textTransform: "uppercase",
            }}
          >
            Uppercase
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {[...UPPER].map((c) => (
              <button
                key={c}
                style={{
                  background: selectedChar === c ? "#363" : "#222",
                  border: `1px solid ${selectedChar === c ? "#4a4" : "#333"}`,
                  borderRadius: 4,
                  color: selectedChar === c ? "#9f9" : "#ccc",
                  cursor: "pointer",
                  fontFamily: "monospace",
                  fontSize: 12,
                  fontWeight: 600,
                  height: 28,
                  lineHeight: 1,
                  padding: 0,
                  width: 28,
                }}
                type="button"
                onClick={() => setSelectedChar(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <p
            style={{
              color: "#666",
              fontSize: 10,
              letterSpacing: "0.08em",
              margin: "8px 0 4px",
              textTransform: "uppercase",
            }}
          >
            Lowercase
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {[...LOWER].map((c) => (
              <button
                key={c}
                style={{
                  background: selectedChar === c ? "#363" : "#222",
                  border: `1px solid ${selectedChar === c ? "#4a4" : "#333"}`,
                  borderRadius: 4,
                  color: selectedChar === c ? "#9f9" : "#ccc",
                  cursor: "pointer",
                  fontFamily: "monospace",
                  fontSize: 12,
                  height: 28,
                  lineHeight: 1,
                  padding: 0,
                  width: 28,
                }}
                type="button"
                onClick={() => setSelectedChar(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div
            style={{
              borderTop: "1px solid #222",
              marginTop: "auto",
              paddingTop: 12,
            }}
          >
            <p style={{ color: "#444", fontSize: 10, margin: 0 }}>
              ← → navigate (no input focused)
            </p>
          </div>
        </div>

        {/* Single-glyph preview */}
        <div
          style={{
            alignItems: "center",
            background: "#faf6f0",
            display: "flex",
            flex: 1,
            justifyContent: "center",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {!glyphExists && (
            <div style={{ color: "#888", fontSize: 14, textAlign: "center" }}>
              <p style={{ margin: "0 0 12px" }}>
                No glyph file for &ldquo;{selectedChar}&rdquo;.
              </p>
              <button
                style={{
                  background: "#1e2a3a",
                  border: "1px solid #2a4a6a",
                  borderRadius: 6,
                  color: "#7ab",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "8px 20px",
                }}
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                ↑ Upload SVG for &ldquo;{selectedChar}&rdquo;
              </button>
            </div>
          )}

          {displayGlyph && (
            <svg
              aria-hidden="true"
              height={canvasH}
              style={{ overflow: "visible" }}
              viewBox={`0 0 ${canvasW} ${canvasH}`}
              width={canvasW}
            >
              <line
                stroke="#e0d8c8"
                strokeDasharray="6 4"
                strokeWidth={1}
                x1={0}
                x2={canvasW}
                y1={30 + PREVIEW_H}
                y2={30 + PREVIEW_H}
              />
              <line
                stroke="#f0ece4"
                strokeDasharray="3 6"
                strokeWidth={1}
                x1={0}
                x2={canvasW}
                y1={30}
                y2={30}
              />
              <g
                transform={
                  settings.tx !== 0 || settings.ty !== 0 || settings.scale !== 1
                    ? `translate(${settings.tx},${settings.ty}) scale(${settings.scale})`
                    : undefined
                }
              >
                <HandfontLetter
                  color="#1c1c1c"
                  glyph={displayGlyph}
                  height={PREVIEW_H}
                  progress={progress}
                  x={glyphX}
                  y={30}
                />
              </g>
            </svg>
          )}

          <button
            style={{
              background: "#0006",
              border: "1px solid #fff3",
              borderRadius: 20,
              bottom: 12,
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
              padding: "3px 12px",
              position: "absolute",
              right: 12,
            }}
            type="button"
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? "⏸" : "▶"}
          </button>

          {!playing && (
            <div
              style={{
                background: "#0008",
                bottom: 40,
                borderRadius: 8,
                padding: "6px 10px",
                position: "absolute",
                right: 8,
                width: 160,
              }}
            >
              <input
                max={1}
                min={0}
                step={0.001}
                style={{ accentColor: "#6c6", width: "100%" }}
                type="range"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
              />
            </div>
          )}
        </div>

        {/* Controls */}
        <div
          style={{
            background: "#1a1a1a",
            borderLeft: "1px solid #2a2a2a",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            width: 220,
          }}
        >
          <Section label="ViewBox">
            <p style={{ color: "#555", fontSize: 10, margin: "0 0 4px" }}>
              minX/minY pan · width/height zoom
            </p>
            <div
              style={{
                display: "grid",
                gap: 8,
                gridTemplateColumns: "1fr 1fr",
              }}
            >
              <NumInput
                label="min X"
                value={settings.vbX}
                onChange={(v) => setS("vbX", v)}
              />
              <NumInput
                label="min Y"
                value={settings.vbY}
                onChange={(v) => setS("vbY", v)}
              />
              <NumInput
                label="Width"
                step={0.5}
                value={settings.vbW}
                onChange={(v) => setS("vbW", v)}
              />
              <NumInput
                label="Height"
                step={0.5}
                value={settings.vbH}
                onChange={(v) => setS("vbH", v)}
              />
            </div>
          </Section>

          <Section label="Stroke">
            <NumInput
              label="Stroke width (SVG units)"
              step={0.5}
              value={settings.strokeWidth}
              onChange={(v) => setS("strokeWidth", v)}
            />
          </Section>

          <Section label="Nudge">
            <p style={{ color: "#555", fontSize: 10, margin: "0 0 4px" }}>
              Shifts clip + strokes together
            </p>
            <div
              style={{
                display: "grid",
                gap: 8,
                gridTemplateColumns: "1fr 1fr",
              }}
            >
              <NumInput
                label="Translate X"
                value={settings.tx}
                onChange={(v) => setS("tx", v)}
              />
              <NumInput
                label="Translate Y"
                value={settings.ty}
                onChange={(v) => setS("ty", v)}
              />
            </div>
            <NumInput
              label="Scale"
              step={0.01}
              value={settings.scale}
              onChange={(v) => setS("scale", v)}
            />
          </Section>

          {baseGlyph && (
            <Section label="Info">
              <p style={{ color: "#555", fontSize: 10, margin: 0 }}>
                {baseGlyph.strokePaths.length} path
                {baseGlyph.strokePaths.length === 1 ? "" : "s"}
                {" · "}aspect {(baseGlyph.vw / baseGlyph.vh).toFixed(2)}
              </p>
            </Section>
          )}

          <div style={{ flex: 1 }} />
        </div>
      </div>
    </div>
  );
};
