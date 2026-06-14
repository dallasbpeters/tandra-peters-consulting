import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useColorSchemeValue } from "sanity";

import type { EditorField, EditorSection } from "../../src/remotion/ads/editSchemas";

import {
  CUSTOM_SLOTS_DEFAULTS,
  HELPING_TEXAS_DEFAULTS,
  ROOF_SCENE_DEFAULTS,
  ROOF_VALUE_DEFAULTS,
  STORM_SPOT_DEFAULTS,
} from "../../src/remotion/ads/adDefaults";
import { SCHEMAS, getProp, setProp } from "../../src/remotion/ads/editSchemas";

/**
 * "Videos" Studio tool: preview, edit, and render Remotion compositions.
 *
 * Preview: embeds the SPA's `/remotion-preview?id=<id>` route in an iframe.
 * Edit: right panel shows editable fields for the selected composition;
 *       changes are sent to the preview via postMessage for live feedback.
 * Render: POSTs to `/api/render-tandra-intro` with `{ compositionId }`.
 *
 * Configure the SPA origin with SANITY_STUDIO_PREVIEW_URL (defaults to localhost:3001).
 */

type CompositionMeta = {
  id: string;
  label: string;
  description: string;
  orientation: "landscape" | "portrait";
  cms: boolean;
};

const COMPOSITIONS: CompositionMeta[] = [
  {
    id: "TandraIntro",
    label: "Homepage intro",
    description: "30s · 16:9 · plays on the home page hero. Copy from Sanity.",
    orientation: "landscape",
    cms: true,
  },
  {
    id: "TandraStormSpot",
    label: "Storm spot ad",
    description: "29s · 4:5 · storm damage / insurance claim CTA.",
    orientation: "portrait",
    cms: false,
  },
  {
    id: "TandraRoofValue",
    label: "Roof value ad",
    description: "42s · 4:5 · roof investment / free inspection CTA.",
    orientation: "portrait",
    cms: false,
  },
  {
    id: "RoofScene",
    label: "3D roof inspection",
    description: "4:5 · animated 3D roof walkthrough (heavier preview).",
    orientation: "portrait",
    cms: false,
  },
  {
    id: "HelpingTexasHomeowners",
    label: "Helping Texas homeowners",
    description: "4:5 · multi-scene reel with helping-homeowners intro.",
    orientation: "portrait",
    cms: false,
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DEFAULT_PROPS: Record<string, any> = {
  TandraRoofValue: ROOF_VALUE_DEFAULTS,
  TandraStormSpot: STORM_SPOT_DEFAULTS,
  RoofScene: ROOF_SCENE_DEFAULTS,
  CustomSlots: CUSTOM_SLOTS_DEFAULTS,
  HelpingTexasHomeowners: HELPING_TEXAS_DEFAULTS,
};

const PREVIEW_BASE =
  process.env.SANITY_STUDIO_PREVIEW_URL?.replace(/\/$/, "") || "http://localhost:3001";
const RENDER_BASE = process.env.SANITY_STUDIO_RENDER_API_URL?.replace(/\/$/, "") || PREVIEW_BASE;

type RenderState =
  | { status: "idle" }
  | { status: "rendering" }
  | { status: "done"; url: string; skipped?: boolean }
  | { status: "error"; message: string };

export function RemotionVideoTool() {
  const scheme = useColorSchemeValue();
  const isDark = scheme === "dark";
  const [activeId, setActiveId] = useState<string>(COMPOSITIONS[0].id);
  const [render, setRender] = useState<RenderState>({ status: "idle" });
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const active = useMemo(
    () => COMPOSITIONS.find((c) => c.id === activeId) ?? COMPOSITIONS[0],
    [activeId],
  );

  const previewUrl = `${PREVIEW_BASE}/remotion-preview?id=${encodeURIComponent(active.id)}`;

  // ── Editor form state ─────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formProps, setFormProps] = useState<Record<string, any>>(() =>
    DEFAULT_PROPS[activeId] ? { ...DEFAULT_PROPS[activeId] } : {},
  );

  useEffect(() => {
    setFormProps(DEFAULT_PROPS[activeId] ? { ...DEFAULT_PROPS[activeId] } : {});
  }, [activeId]);

  const schema = SCHEMAS[activeId] ?? [];

  // Send updated props to the preview iframe whenever formProps changes.
  useEffect(() => {
    const timer = setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "remotion:updateProps", props: formProps },
        "*",
      );
    }, 100);
    return () => clearTimeout(timer);
  }, [formProps]);

  const onFieldChange = useCallback((key: string, value: unknown) => {
    setFormProps((prev) => setProp(prev, key, value));
  }, []);

  const onRender = useCallback(async () => {
    setRender({ status: "rendering" });
    try {
      const response = await fetch(`${RENDER_BASE}/api/render-tandra-intro?force=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compositionId: active.id }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        url?: string;
        skipped?: boolean;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || `Render failed (HTTP ${response.status}).`);
      }
      if (payload.skipped) {
        setRender({ status: "done", url: payload.url ?? "", skipped: true });
      } else if (payload.url) {
        setRender({ status: "done", url: payload.url });
      } else {
        throw new Error("Render finished but no video URL was returned.");
      }
    } catch (error) {
      setRender({
        status: "error",
        message: error instanceof Error ? error.message : "Unexpected render error.",
      });
    }
  }, [active.id]);

  const colors = isDark
    ? {
        bg: "#101112",
        panel: "#16181a",
        border: "#1f2123",
        text: "#e4e8e6",
        subtle: "#aab2ad",
        activeBg: "#10533a",
        activeText: "#d5f6e9",
        inputBg: "#0f1110",
        inputBorder: "#2a2f2c",
      }
    : {
        bg: "#f3f5f4",
        panel: "#ffffff",
        border: "#e4e8e6",
        text: "#1a241f",
        subtle: "#5b6b62",
        activeBg: "#0a2a1d",
        activeText: "#d5f6e9",
        inputBg: "#ffffff",
        inputBorder: "#d4d8d4",
      };

  return (
    <div style={{ display: "flex", height: "100%", background: colors.bg, color: colors.text }}>
      {/* Sidebar: composition picker */}
      <aside
        style={{
          width: 220,
          flex: "0 0 220px",
          borderRight: `1px solid ${colors.border}`,
          padding: "1rem",
          overflowY: "auto",
          boxSizing: "border-box",
        }}
      >
        <h2
          style={{
            fontSize: "0.8125rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: colors.subtle,
            margin: "0 0 0.75rem",
          }}
        >
          Compositions
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {COMPOSITIONS.map((c) => {
            const isActive = c.id === active.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setActiveId(c.id);
                  setRender({ status: "idle" });
                }}
                style={{
                  textAlign: "left",
                  cursor: "pointer",
                  borderRadius: 8,
                  border: `1px solid ${isActive ? "transparent" : colors.border}`,
                  background: isActive ? colors.activeBg : colors.panel,
                  color: isActive ? colors.activeText : colors.text,
                  padding: "0.625rem 0.75rem",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontWeight: 600,
                    fontSize: "0.875rem",
                  }}
                >
                  {c.label}
                  {c.cms ? (
                    <span
                      style={{
                        fontSize: "0.625rem",
                        padding: "1px 6px",
                        borderRadius: 999,
                        background: isActive ? "rgba(255,255,255,0.18)" : colors.border,
                        color: isActive ? colors.activeText : colors.subtle,
                      }}
                    >
                      CMS
                    </span>
                  ) : null}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: isActive ? colors.activeText : colors.subtle,
                    marginTop: 2,
                    lineHeight: 1.4,
                  }}
                >
                  {c.description}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Preview area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "0.75rem 1rem",
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <div style={{ fontSize: "0.8125rem", color: colors.subtle, lineHeight: 1.5 }}>
            <strong style={{ color: colors.text }}>{active.label}</strong> —{" "}
            {active.cms
              ? "Shows Sanity copy (edit the Home page video fields and refresh)."
              : "Edit copy in the right panel — changes update live via message channel."}{" "}
            Preview origin: <code>{PREVIEW_BASE}</code>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "0 0 auto" }}>
            <RenderStatus state={render} colors={colors} />
            <button
              type="button"
              onClick={onRender}
              disabled={render.status === "rendering"}
              style={{
                cursor: render.status === "rendering" ? "wait" : "pointer",
                borderRadius: 8,
                border: "none",
                background: "#10533a",
                color: "#d5f6e9",
                fontWeight: 700,
                fontSize: "0.8125rem",
                padding: "0.5rem 1rem",
                opacity: render.status === "rendering" ? 0.7 : 1,
              }}
            >
              {render.status === "rendering" ? "Rendering…" : "Render MP4"}
            </button>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            justifyContent: "center",
            background: isDark ? "#0b0b09" : "#22251f",
          }}
        >
          <iframe
            ref={iframeRef}
            key={active.id}
            title={`${active.label} preview`}
            src={previewUrl}
            style={{
              border: "none",
              width: "100%",
              height: "100%",
              display: "block",
            }}
          />
        </div>
      </div>

      {/* Editor panel — right side */}
      {schema.length > 0 && (
        <aside
          style={{
            width: 320,
            flex: "0 0 320px",
            borderLeft: `1px solid ${colors.border}`,
            padding: "1rem",
            overflowY: "auto",
            boxSizing: "border-box",
            background: colors.panel,
          }}
        >
          <h2
            style={{
              fontSize: "0.8125rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: colors.subtle,
              margin: "0 0 0.75rem",
            }}
          >
            Edit copy
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {schema.map((section) => (
              <EditorSection
                key={section.key}
                section={section}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                props={formProps as any}
                onChange={onFieldChange}
                colors={colors}
              />
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}

// ── Editor section ─────────────────────────────────────────────────────────────

function EditorSection({
  section,
  props,
  onChange,
  colors,
}: {
  section: EditorSection;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: Record<string, any>;
  onChange: (key: string, value: unknown) => void;
  colors: Record<string, string>;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        style={{
          width: "100%",
          textAlign: "left",
          cursor: "pointer",
          border: "none",
          background: colors.bg,
          color: colors.text,
          padding: "0.5rem 0.75rem",
          fontWeight: 600,
          fontSize: "0.8125rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {section.label}
        <span style={{ color: colors.subtle, fontSize: "0.75rem" }}>{collapsed ? "▸" : "▾"}</span>
      </button>
      {!collapsed && (
        <div
          style={{ padding: "0.5rem 0.75rem", display: "flex", flexDirection: "column", gap: 10 }}
        >
          {section.fields.map((field) => (
            <EditorFieldRow
              key={field.key}
              field={field}
              value={getProp(props, field.key)}
              onChange={(v) => onChange(field.key, v)}
              colors={colors}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Field row ──────────────────────────────────────────────────────────────────

function EditorFieldRow({
  field,
  value,
  onChange,
  colors,
}: {
  field: EditorField;
  value: unknown;
  onChange: (value: unknown) => void;
  colors: Record<string, string>;
}) {
  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    border: `1px solid ${colors.inputBorder}`,
    borderRadius: 6,
    background: colors.inputBg,
    color: colors.text,
    fontSize: "0.8125rem",
    padding: "0.375rem 0.5rem",
    fontFamily: "inherit",
    lineHeight: 1.4,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: colors.subtle,
    marginBottom: 4,
    display: "block",
  };

  switch (field.type) {
    case "text":
      return (
        <div>
          <label style={labelStyle}>{field.label}</label>
          <input
            type="text"
            style={inputStyle}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );

    case "textarea":
      return (
        <div>
          <label style={labelStyle}>{field.label}</label>
          <textarea
            style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );

    case "boolean":
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            id={`field-${field.key}`}
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            style={{ accentColor: "#10533a", width: 16, height: 16, cursor: "pointer" }}
          />
          <label
            htmlFor={`field-${field.key}`}
            style={{ ...labelStyle, marginBottom: 0, cursor: "pointer" }}
          >
            {field.label}
          </label>
        </div>
      );

    case "select":
      return (
        <div>
          <label style={labelStyle}>{field.label}</label>
          <select
            style={inputStyle}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
          >
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );

    case "number":
      return (
        <div>
          <label style={labelStyle}>{field.label}</label>
          <input
            type="number"
            style={inputStyle}
            value={typeof value === "number" ? value : 0}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </div>
      );

    default:
      return null;
  }
}

// ── Render status ──────────────────────────────────────────────────────────────

function RenderStatus({
  state,
  colors,
}: {
  state: RenderState;
  colors: { subtle: string; text: string };
}) {
  if (state.status === "idle") return null;
  if (state.status === "rendering") {
    return (
      <span style={{ fontSize: "0.75rem", color: colors.subtle }}>
        Rendering in a Vercel Sandbox — this can take a minute…
      </span>
    );
  }
  if (state.status === "error") {
    return (
      <span style={{ fontSize: "0.75rem", color: "#f3a61e", maxWidth: 360 }}>{state.message}</span>
    );
  }
  if (state.skipped) {
    return (
      <span style={{ fontSize: "0.75rem", color: colors.subtle }}>
        Already up to date — no re-render needed.
      </span>
    );
  }
  return (
    <a
      href={state.url}
      target="_blank"
      rel="noreferrer"
      style={{ fontSize: "0.75rem", color: "#69a758", fontWeight: 600 }}
    >
      Done — open MP4 ↗
    </a>
  );
}

export default RemotionVideoTool;
