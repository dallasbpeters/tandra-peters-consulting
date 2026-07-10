import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useColorSchemeValue } from "sanity";

import { WHITEBOARD_EXPLAINER_DEFAULTS } from "../../api/lib/ad-composition-defaults";
import {
  CUSTOM_SLOTS_DEFAULTS,
  HELPING_TEXAS_DEFAULTS,
  ROOF_SCENE_DEFAULTS,
  ROOF_VALUE_DEFAULTS,
  STORM_SPOT_DEFAULTS,
} from "../../src/remotion/ads/ad-defaults";
import type {
  EditorField,
  EditorSection as EditorSectionSchema,
} from "../../src/remotion/ads/edit-schemas";
import { getProp, SCHEMAS, setProp } from "../../src/remotion/ads/edit-schemas";
import type { TandraIntroContent } from "../../src/remotion/tandra-intro-content";
import { defaultTandraIntroContent } from "../../src/remotion/tandra-intro-content";
import { useStudioClient } from "../hooks/useStudioClient";

// ── helpers (inline to avoid pulling fetchTandraIntroContent which uses import.meta.env) ──

const mergeScene = <T extends Record<string, unknown>>(
  fallback: T,
  incoming: unknown
): T =>
  incoming && typeof incoming === "object" && !Array.isArray(incoming)
    ? ({ ...fallback, ...incoming } as T)
    : fallback;

const stringItems = (value: unknown, fallback: string[]): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : fallback;

const mergeIntroContent = (
  raw: Record<string, unknown>,
  defaults: typeof defaultTandraIntroContent
): TandraIntroContent => {
  const managed = mergeScene(defaults.managed, raw.managed);
  const proof = mergeScene(defaults.proof, raw.proof);
  return {
    closing: mergeScene(defaults.closing, raw.closing),
    inspection: mergeScene(defaults.inspection, raw.inspection),
    managed: {
      ...managed,
      items: stringItems(
        (raw.managed as Record<string, unknown> | undefined)?.items,
        defaults.managed.items
      ),
    },
    proof: {
      ...proof,
      items: stringItems(
        (raw.proof as Record<string, unknown> | undefined)?.items,
        defaults.proof.items
      ),
    },
    storm: mergeScene(defaults.storm, raw.storm),
    straightAnswers: mergeScene(defaults.straightAnswers, raw.straightAnswers),
  };
};

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

interface CompositionMeta {
  cms: boolean;
  description: string;
  id: string;
  label: string;
  orientation: "landscape" | "portrait";
}

const COMPOSITIONS: CompositionMeta[] = [
  {
    cms: false,
    description:
      "16:9 · animated whiteboard explainer with ElevenLabs voiceover.",
    id: "whiteboard-explainer",
    label: "Whiteboard explainer",
    orientation: "landscape",
  },
  {
    cms: true,
    description: "30s · 16:9 · plays on the home page hero. Copy from Sanity.",
    id: "tandra-intro",
    label: "Homepage intro",
    orientation: "landscape",
  },
  {
    cms: false,
    description: "29s · 4:5 · storm damage / insurance claim CTA.",
    id: "TandraStormSpot",
    label: "Storm spot ad",
    orientation: "portrait",
  },
  {
    cms: false,
    description: "42s · 4:5 · roof investment / free inspection CTA.",
    id: "TandraRoofValue",
    label: "Roof value ad",
    orientation: "portrait",
  },
  {
    cms: false,
    description: "4:5 · animated 3D roof walkthrough (heavier preview).",
    id: "roof-scene",
    label: "3D roof inspection",
    orientation: "portrait",
  },
  {
    cms: false,
    description: "4:5 · multi-scene reel with helping-homeowners intro.",
    id: "HelpingTexasHomeowners",
    label: "Helping Texas homeowners",
    orientation: "portrait",
  },
];

const trimTrailingSlash = (value: string): string => value.replace(/\/$/, "");

const getBrowserOrigin = (): string | undefined => {
  if (typeof window === "undefined" || window.location.origin === "null") {
    return;
  }
  return trimTrailingSlash(window.location.origin);
};

const isLocalOrigin = (value: string | undefined): boolean =>
  Boolean(
    value?.startsWith("http://localhost") ||
    value?.startsWith("http://127.0.0.1")
  );

const resolvePreviewBase = (): string => {
  const configured = process.env.SANITY_STUDIO_PREVIEW_URL
    ? trimTrailingSlash(process.env.SANITY_STUDIO_PREVIEW_URL)
    : undefined;
  const browserOrigin = getBrowserOrigin();

  if (process.env.NODE_ENV === "production" && isLocalOrigin(configured)) {
    return browserOrigin ?? "https://www.tandra.me";
  }

  return (
    configured ??
    browserOrigin ??
    (process.env.NODE_ENV === "production"
      ? "https://www.tandra.me"
      : "http://localhost:3001")
  );
};

const PREVIEW_BASE = resolvePreviewBase();
const RENDER_BASE = process.env.SANITY_STUDIO_RENDER_API_URL
  ? trimTrailingSlash(process.env.SANITY_STUDIO_RENDER_API_URL)
  : PREVIEW_BASE;
const RENDER_SECRET =
  process.env.SANITY_STUDIO_RENDER_VIDEO_SECRET?.trim() || "";

const DEFAULT_PROPS: Record<string, any> = {
  CustomSlots: CUSTOM_SLOTS_DEFAULTS,
  HelpingTexasHomeowners: HELPING_TEXAS_DEFAULTS,
  TandraRoofValue: ROOF_VALUE_DEFAULTS,
  TandraStormSpot: STORM_SPOT_DEFAULTS,
  "roof-scene": ROOF_SCENE_DEFAULTS,
  "tandra-intro": { content: defaultTandraIntroContent, showCaptions: false },
  "whiteboard-explainer": {
    ...WHITEBOARD_EXPLAINER_DEFAULTS,
    voiceId: process.env.SANITY_STUDIO_ELEVENLABS_TANDRA_VOICE_ID?.trim() || "",
  },
};

const isStructuredRoofSceneDoc = (
  doc: Record<string, unknown> | null | undefined
): boolean =>
  Boolean(
    doc &&
    (Array.isArray(doc.chapters) ||
      typeof doc.showCallouts === "boolean" ||
      typeof doc.showProgress === "boolean" ||
      typeof doc.fov === "number" ||
      typeof doc.introSecs === "number" ||
      doc.cta ||
      doc.badges)
  );

const COMPOSITION_TO_SCHEMA: Record<string, string> = {
  CustomSlots: "customSlotsSettings",
  HelpingTexasHomeowners: "helpingTexasHomeownersSettings",
  TandraRoofValue: "roofValueSettings",
  TandraStormSpot: "stormSpotSettings",
  "roof-scene": "roofSceneSettings",
  "tandra-intro": "tandraIntroSettings",
  "whiteboard-explainer": "whiteboardExplainerSettings",
};

const COMPOSITION_TO_EDITOR_SCHEMA: Record<string, string> = {
  "roof-scene": "RoofScene",
  "tandra-intro": "TandraIntro",
};

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved" }
  | { status: "error"; message: string };

type RenderState =
  | { status: "idle" }
  | { status: "rendering" }
  | { status: "done"; url: string; skipped?: boolean }
  | { status: "error"; message: string };

type VoiceoverState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "done"; sceneCount: number }
  | { status: "error"; message: string };

type DrawingState =
  | { status: "idle" }
  | { status: "generating"; sceneIdx: number }
  | { status: "done"; sceneIdx: number }
  | { status: "error"; message: string };

export function RemotionVideoTool() {
  const scheme = useColorSchemeValue();
  const isDark = scheme === "dark";
  const client = useStudioClient({ apiVersion: "2026-05-29" });
  const [activeId, setActiveId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("remotion-video-tool:activeId");
      if (saved && COMPOSITIONS.some((c) => c.id === saved)) {
        return saved;
      }
    } catch {
      // localStorage unavailable (private browsing, sandboxed iframe)
    }
    return COMPOSITIONS[0].id;
  });
  const [render, setRender] = useState<RenderState>({ status: "idle" });
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const [voiceover, setVoiceover] = useState<VoiceoverState>({
    status: "idle",
  });
  const [drawing, setDrawing] = useState<DrawingState>({ status: "idle" });
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const active = useMemo(
    () => COMPOSITIONS.find((c) => c.id === activeId) ?? COMPOSITIONS[0],
    [activeId]
  );

  const previewUrl = `${PREVIEW_BASE}/remotion-preview?id=${encodeURIComponent(active.id)}`;

  // ── Editor form state ─────────────────────────────────────────────────

  const [formProps, setFormProps] = useState<Record<string, any>>(() =>
    DEFAULT_PROPS[activeId] ? { ...DEFAULT_PROPS[activeId] } : {}
  );

  useEffect(() => {
    // Start with defaults — will be refined below as data becomes available.
    const defaults = DEFAULT_PROPS[activeId]
      ? { ...DEFAULT_PROPS[activeId] }
      : {};
    if (activeId === "tandra-intro") {
      // Load actual copy from the home page's tandraIntroVideo field so the editor
      // shows what's currently published, then overlay any saved settings on top.
      client
        .fetch<{ tandraIntroVideo?: Record<string, unknown> } | null>(
          `*[_id == "homePage"][0]{ tandraIntroVideo }`
        )
        .then((doc) => {
          const base = doc?.tandraIntroVideo
            ? {
                content: mergeIntroContent(
                  doc.tandraIntroVideo,
                  defaultTandraIntroContent
                ),
                showCaptions:
                  typeof doc.tandraIntroVideo.showCaptions === "boolean"
                    ? doc.tandraIntroVideo.showCaptions
                    : false,
              }
            : defaults;
          // Now overlay saved settings if they exist.
          client
            .fetch<{ props?: string } | null>(
              `*[_id == "tandraIntroSettings"][0]{ props }`
            )
            .then((settingsDoc) => {
              if (settingsDoc?.props) {
                try {
                  const parsed = JSON.parse(settingsDoc.props);
                  setFormProps({ ...base, ...parsed });
                  return;
                } catch {
                  /* fall through */
                }
              }
              setFormProps(base);
            })
            .catch(() => setFormProps(base));
        })
        .catch(() => {
          setFormProps(defaults);
        });
    } else {
      const schemaName = COMPOSITION_TO_SCHEMA[activeId];
      if (!schemaName) {
        setFormProps(defaults);
        return;
      }
      if (activeId === "roof-scene") {
        client
          .fetch<Record<string, unknown> | null>(
            `*[_id == "roofSceneSettings"][0]`
          )
          .then((doc) => {
            if (doc && isStructuredRoofSceneDoc(doc)) {
              const {
                _createdAt,
                _id,
                _rev,
                _type,
                _updatedAt,
                props,
                ...structured
              } = doc;
              setFormProps({ ...defaults, ...structured });
              return;
            }
            if (typeof doc?.props === "string") {
              try {
                const parsed = JSON.parse(doc.props);
                setFormProps({ ...defaults, ...parsed });
                return;
              } catch {
                /* fall through */
              }
            }
            setFormProps(defaults);
          })
          .catch(() => setFormProps(defaults));
        return;
      }
      client
        .fetch<{ props?: string } | null>(
          `*[_id == "${schemaName}"][0]{ props }`
        )
        .then((doc) => {
          if (doc?.props) {
            try {
              const parsed = JSON.parse(doc.props);
              setFormProps({ ...defaults, ...parsed });
            } catch {
              setFormProps(defaults);
            }
          } else {
            setFormProps(defaults);
          }
        })
        .catch(() => {
          setFormProps(defaults);
        });
    }
  }, [activeId, client]);

  const editorSchemaKey = COMPOSITION_TO_EDITOR_SCHEMA[activeId] ?? activeId;
  const schema = SCHEMAS[editorSchemaKey] ?? [];

  // Send updated props to the preview iframe whenever formProps changes.
  useEffect(() => {
    const timer = setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        { props: formProps, type: "remotion:updateProps" },
        "*"
      );
    }, 100);
    return () => clearTimeout(timer);
  }, [formProps]);

  const onFieldChange = useCallback((key: string, value: unknown) => {
    setFormProps((prev) => setProp(prev, key, value));
  }, []);

  const onSave = useCallback(async () => {
    const schemaName = COMPOSITION_TO_SCHEMA[activeId];
    if (!schemaName) {
      return;
    }
    setSaveState({ status: "saving" });
    try {
      await client.createOrReplace(
        activeId === "roof-scene"
          ? {
              _id: schemaName,
              _type: schemaName,
              ...formProps,
              props: JSON.stringify(formProps),
            }
          : {
              _id: schemaName,
              _type: schemaName,
              props: JSON.stringify(formProps),
            }
      );
      setSaveState({ status: "saved" });
    } catch (error) {
      setSaveState({
        message: error instanceof Error ? error.message : "Save failed.",
        status: "error",
      });
    }
  }, [activeId, client, formProps]);

  const onRender = useCallback(async () => {
    setRender({ status: "rendering" });
    try {
      const response = await fetch(
        `${RENDER_BASE}/api/render-tandra-intro?force=true`,
        {
          body: JSON.stringify({ compositionId: active.id }),
          headers: {
            "Content-Type": "application/json",
            ...(RENDER_SECRET ? { "x-render-secret": RENDER_SECRET } : {}),
          },
          method: "POST",
        }
      );
      const payload = (await response.json().catch(() => ({}))) as {
        url?: string;
        skipped?: boolean;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(
          payload.error || `Render failed (HTTP ${response.status}).`
        );
      }
      if (payload.skipped) {
        setRender({ skipped: true, status: "done", url: payload.url ?? "" });
      } else if (payload.url) {
        setRender({ status: "done", url: payload.url });
      } else {
        throw new Error("Render finished but no video URL was returned.");
      }
    } catch (error) {
      setRender({
        message:
          error instanceof Error ? error.message : "Unexpected render error.",
        status: "error",
      });
    }
  }, [active.id]);

  const onGenerateVoiceover = useCallback(async () => {
    const scenes = (formProps as any).scenes;
    if (!Array.isArray(scenes) || scenes.length === 0) {
      setVoiceover({
        message: "No scenes found in formProps. Save first.",
        status: "error",
      });
      return;
    }
    setVoiceover({ status: "generating" });
    try {
      const voiceId = (formProps as any).voiceId?.trim() || undefined;
      const res = await fetch(`${RENDER_BASE}/api/whiteboard-voiceover`, {
        body: JSON.stringify({
          compositionId: "whiteboard-explainer",
          scenes,
          voiceId,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        scenes?: any[];
        error?: string;
      };
      if (!res.ok || !payload.ok) {
        throw new Error(
          payload.error ?? `Voiceover failed (HTTP ${res.status}).`
        );
      }
      if (Array.isArray(payload.scenes)) {
        const scenes = payload.scenes;
        setFormProps((prev: any) => ({ ...prev, scenes }));
        setVoiceover({ sceneCount: scenes.length, status: "done" });
      } else {
        throw new TypeError("No scenes returned from voiceover endpoint.");
      }
    } catch (error) {
      setVoiceover({
        message:
          error instanceof Error
            ? error.message
            : "Voiceover generation failed.",
        status: "error",
      });
    }
  }, [formProps]);

  const onGenerateDrawing = useCallback(async () => {
    const scenes = (formProps as any).scenes;
    if (!Array.isArray(scenes) || scenes.length === 0) {
      setDrawing({ message: "No scenes found. Save first.", status: "error" });
      return;
    }

    const RENDER_BASE_URL = RENDER_BASE ?? "";

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i] as {
        drawing?: { prompt?: string; paths?: string[] };
        headline?: string;
        heading?: string;
        label?: string;
      };

      const prompt =
        scene.drawing?.prompt?.trim() ||
        scene.headline?.trim() ||
        scene.heading?.trim() ||
        scene.label?.trim();

      if (!prompt) {
        continue;
      }

      setDrawing({ sceneIdx: i, status: "generating" });

      try {
        const res = await fetch(`${RENDER_BASE_URL}/api/whiteboard/drawing`, {
          body: JSON.stringify({ prompt, sceneHint: `Scene ${i + 1}` }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const data = (await res.json().catch(() => ({}))) as {
          paths?: string[];
          viewBox?: string;
          error?: string;
        };

        if (!res.ok || !data.paths) {
          console.warn(
            `[drawing] scene ${i} failed:`,
            data.error ?? `HTTP ${res.status}`
          );
          continue;
        }

        setFormProps((prev: any) => {
          const updated = [...((prev.scenes as any[]) ?? [])];
          updated[i] = {
            ...updated[i],
            drawing: {
              ...updated[i].drawing,
              paths: data.paths,
              viewBox: data.viewBox ?? "0 0 300 300",
            },
          };
          return { ...prev, scenes: updated };
        });
      } catch (error) {
        console.error(`[drawing] scene ${i} error:`, error);
      }
    }

    setDrawing({ sceneIdx: scenes.length - 1, status: "done" });
  }, [formProps]);

  const colors = isDark
    ? {
        activeBg: "#10533a",
        activeText: "#d5f6e9",
        bg: "#101112",
        border: "#1f2123",
        inputBg: "#0f1110",
        inputBorder: "#2a2f2c",
        panel: "#16181a",
        subtle: "#aab2ad",
        text: "#e4e8e6",
      }
    : {
        activeBg: "#0a2a1d",
        activeText: "#d5f6e9",
        bg: "#f3f5f4",
        border: "#e4e8e6",
        inputBg: "#ffffff",
        inputBorder: "#d4d8d4",
        panel: "#ffffff",
        subtle: "#5b6b62",
        text: "#1a241f",
      };

  return (
    <div
      style={{
        background: colors.bg,
        color: colors.text,
        display: "flex",
        height: "100%",
      }}
    >
      {/* Sidebar: composition picker */}
      <aside
        style={{
          borderRight: `1px solid ${colors.border}`,
          boxSizing: "border-box",
          flex: "0 0 220px",
          overflowY: "auto",
          padding: "1rem",
          width: 220,
        }}
      >
        <h2
          style={{
            color: colors.subtle,
            fontSize: "0.8125rem",
            letterSpacing: "0.08em",
            margin: "0 0 0.75rem",
            textTransform: "uppercase",
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
                onClick={() => {
                  setActiveId(c.id);
                  setRender({ status: "idle" });
                  try {
                    localStorage.setItem("remotion-video-tool:activeId", c.id);
                  } catch {
                    // ignore
                  }
                }}
                style={{
                  background: isActive ? colors.activeBg : colors.panel,
                  border: `1px solid ${isActive ? "transparent" : colors.border}`,
                  borderRadius: 8,
                  color: isActive ? colors.activeText : colors.text,
                  cursor: "pointer",
                  padding: "0.625rem 0.75rem",
                  textAlign: "left",
                  width: "100%",
                }}
                type="button"
              >
                <div
                  style={{
                    alignItems: "center",
                    display: "flex",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    gap: 6,
                  }}
                >
                  {c.label}
                  {c.cms ? (
                    <span
                      style={{
                        background: isActive
                          ? "rgba(255,255,255,0.18)"
                          : colors.border,
                        borderRadius: 999,
                        color: isActive ? colors.activeText : colors.subtle,
                        fontSize: "0.625rem",
                        padding: "1px 6px",
                      }}
                    >
                      CMS
                    </span>
                  ) : null}
                </div>
                <div
                  style={{
                    color: isActive ? colors.activeText : colors.subtle,
                    fontSize: "0.75rem",
                    lineHeight: 1.4,
                    marginTop: 2,
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
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <div
          style={{
            alignItems: "center",
            borderBottom: `1px solid ${colors.border}`,
            display: "flex",
            gap: 12,
            justifyContent: "space-between",
            padding: "0.75rem 1rem",
          }}
        >
          <div
            style={{
              color: colors.subtle,
              fontSize: "0.8125rem",
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: colors.text }}>{active.label}</strong> —{" "}
            {schema.length > 0
              ? "Edit copy in the right panel — changes update live via message channel."
              : "Shows Sanity copy (edit the Home page video fields in the main Studio and refresh)."}{" "}
            Preview origin: <code>{PREVIEW_BASE}</code>
          </div>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              flex: "0 0 auto",
              gap: 10,
            }}
          >
            <SaveStatus
              colors={colors}
              onDismiss={() => setSaveState({ status: "idle" })}
              state={saveState}
            />
            {schema.length > 0 && (
              <button
                disabled={saveState.status === "saving"}
                onClick={onSave}
                style={{
                  background: colors.panel,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  color: colors.text,
                  cursor: saveState.status === "saving" ? "wait" : "pointer",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  opacity: saveState.status === "saving" ? 0.7 : 1,
                  padding: "0.5rem 1rem",
                }}
                type="button"
              >
                {saveState.status === "saving" ? "Saving…" : "Save to Sanity"}
              </button>
            )}
            <RenderStatus colors={colors} state={render} />
            {activeId === "whiteboard-explainer" && (
              <>
                <VoiceoverStatus
                  colors={colors}
                  onDismiss={() => setVoiceover({ status: "idle" })}
                  state={voiceover}
                />
                <button
                  disabled={
                    voiceover.status === "generating" ||
                    render.status === "rendering"
                  }
                  onClick={onGenerateVoiceover}
                  style={{
                    background: "#1D4ED8",
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    cursor:
                      voiceover.status === "generating" ? "wait" : "pointer",
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                    opacity: voiceover.status === "generating" ? 0.7 : 1,
                    padding: "0.5rem 1rem",
                  }}
                  type="button"
                >
                  {voiceover.status === "generating"
                    ? "Generating…"
                    : "🎙 Generate Voiceover"}
                </button>
                <button
                  disabled={
                    drawing.status === "generating" ||
                    render.status === "rendering"
                  }
                  onClick={onGenerateDrawing}
                  style={{
                    background: "#6B21A8",
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    cursor:
                      drawing.status === "generating" ? "wait" : "pointer",
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                    opacity: drawing.status === "generating" ? 0.7 : 1,
                    padding: "0.5rem 1rem",
                  }}
                  type="button"
                >
                  {drawing.status === "generating"
                    ? `✏️ Drawing scene ${(drawing as { sceneIdx: number }).sceneIdx + 1}…`
                    : drawing.status === "done"
                      ? "✅ Drawings done"
                      : "✏️ Generate Drawings"}
                </button>
              </>
            )}
            <button
              disabled={render.status === "rendering"}
              onClick={onRender}
              style={{
                background: "#10533a",
                border: "none",
                borderRadius: 8,
                color: "#d5f6e9",
                cursor: render.status === "rendering" ? "wait" : "pointer",
                fontSize: "0.8125rem",
                fontWeight: 700,
                opacity: render.status === "rendering" ? 0.7 : 1,
                padding: "0.5rem 1rem",
              }}
              type="button"
            >
              {render.status === "rendering" ? "Rendering…" : "Render MP4"}
            </button>
          </div>
        </div>

        <div
          style={{
            background: isDark ? "#0b0b09" : "#22251f",
            display: "flex",
            flex: 1,
            justifyContent: "center",
            minHeight: 0,
          }}
        >
          <iframe
            key={active.id}
            ref={iframeRef}
            src={previewUrl}
            style={{
              border: "none",
              display: "block",
              height: "100%",
              width: "100%",
            }}
            title={`${active.label} preview`}
          />
        </div>
      </div>

      {/* Editor panel — right side */}
      {schema.length > 0 && (
        <aside
          style={{
            background: colors.panel,
            borderLeft: `1px solid ${colors.border}`,
            boxSizing: "border-box",
            flex: "0 0 320px",
            overflowY: "auto",
            padding: "1rem",
            width: 320,
          }}
        >
          <h2
            style={{
              color: colors.subtle,
              fontSize: "0.8125rem",
              letterSpacing: "0.08em",
              margin: "0 0 0.75rem",
              textTransform: "uppercase",
            }}
          >
            Edit copy
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {schema.map((section) => (
              <EditorSection
                colors={colors}
                key={section.key}
                onChange={onFieldChange}
                props={formProps as any}
                section={section}
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
  section: EditorSectionSchema;
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
        onClick={() => setCollapsed((v) => !v)}
        style={{
          alignItems: "center",
          background: colors.bg,
          border: "none",
          color: colors.text,
          cursor: "pointer",
          display: "flex",
          fontSize: "0.8125rem",
          fontWeight: 600,
          justifyContent: "space-between",
          padding: "0.5rem 0.75rem",
          textAlign: "left",
          width: "100%",
        }}
        type="button"
      >
        {section.label}
        <span style={{ color: colors.subtle, fontSize: "0.75rem" }}>
          {collapsed ? "▸" : "▾"}
        </span>
      </button>
      {!collapsed && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            padding: "0.5rem 0.75rem",
          }}
        >
          {section.fields.map((field) => (
            <EditorFieldRow
              colors={colors}
              field={field}
              key={field.key}
              onChange={(v) => onChange(field.key, v)}
              value={getProp(props, field.key)}
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
    background: colors.inputBg,
    border: `1px solid ${colors.inputBorder}`,
    borderRadius: 6,
    boxSizing: "border-box",
    color: colors.text,
    fontFamily: "inherit",
    fontSize: "0.8125rem",
    lineHeight: 1.4,
    padding: "0.375rem 0.5rem",
    width: "100%",
  };

  const labelStyle: React.CSSProperties = {
    color: colors.subtle,
    display: "block",
    fontSize: "0.75rem",
    fontWeight: 600,
    marginBottom: 4,
  };

  switch (field.type) {
    case "text": {
      return (
        <div>
          <label style={labelStyle}>{field.label}</label>
          <input
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            style={inputStyle}
            type="text"
            value={typeof value === "string" ? value : ""}
          />
        </div>
      );
    }

    case "color": {
      const hex = typeof value === "string" && value ? value : "#000000";
      return (
        <div>
          <label style={labelStyle}>{field.label}</label>
          <div style={{ alignItems: "center", display: "flex", gap: 8 }}>
            <input
              onChange={(e) => onChange(e.target.value)}
              style={{
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: 6,
                cursor: "pointer",
                flexShrink: 0,
                height: 32,
                padding: 2,
                width: 48,
              }}
              type="color"
              value={hex}
            />
            <input
              onChange={(e) => onChange(e.target.value)}
              style={{ ...inputStyle, fontFamily: "monospace" }}
              type="text"
              value={typeof value === "string" ? value : ""}
            />
          </div>
        </div>
      );
    }

    case "textarea": {
      return (
        <div>
          <label style={labelStyle}>{field.label}</label>
          <textarea
            onChange={(e) => onChange(e.target.value)}
            style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
            value={typeof value === "string" ? value : ""}
          />
        </div>
      );
    }

    case "boolean": {
      return (
        <div style={{ alignItems: "center", display: "flex", gap: 8 }}>
          <input
            checked={value === true}
            id={`field-${field.key}`}
            onChange={(e) => onChange(e.target.checked)}
            style={{
              accentColor: "#10533a",
              cursor: "pointer",
              height: 16,
              width: 16,
            }}
            type="checkbox"
          />
          <label
            htmlFor={`field-${field.key}`}
            style={{ ...labelStyle, cursor: "pointer", marginBottom: 0 }}
          >
            {field.label}
          </label>
        </div>
      );
    }

    case "select": {
      return (
        <div>
          <label style={labelStyle}>{field.label}</label>
          <select
            onChange={(e) => onChange(e.target.value)}
            style={inputStyle}
            value={typeof value === "string" ? value : ""}
          >
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    }

    case "number": {
      return (
        <div>
          <label style={labelStyle}>{field.label}</label>
          <input
            onChange={(e) => onChange(Number(e.target.value))}
            style={inputStyle}
            type="number"
            value={typeof value === "number" ? value : 0}
          />
        </div>
      );
    }

    default: {
      return null;
    }
  }
}

// ── Render status ──────────────────────────────────────────────────────────────

function SaveStatus({
  state,
  colors,
  onDismiss,
}: {
  state: SaveState;
  colors: { subtle: string; text: string };
  onDismiss: () => void;
}) {
  if (state.status === "idle") {
    return null;
  }
  if (state.status === "saving") {
    return (
      <span style={{ color: colors.subtle, fontSize: "0.75rem" }}>Saving…</span>
    );
  }
  if (state.status === "error") {
    return (
      <span style={{ color: "#f3a61e", fontSize: "0.75rem", maxWidth: 360 }}>
        {state.message}
      </span>
    );
  }
  return (
    <span
      onClick={onDismiss}
      style={{
        color: "#69a758",
        cursor: "pointer",
        fontSize: "0.75rem",
        fontWeight: 600,
      }}
    >
      ✓ Saved
    </span>
  );
}

function RenderStatus({
  state,
  colors,
}: {
  state: RenderState;
  colors: { subtle: string; text: string };
}) {
  if (state.status === "idle") {
    return null;
  }
  if (state.status === "rendering") {
    return (
      <span style={{ color: colors.subtle, fontSize: "0.75rem" }}>
        Rendering in a Vercel Sandbox — this can take a minute…
      </span>
    );
  }
  if (state.status === "error") {
    return (
      <span style={{ color: "#f3a61e", fontSize: "0.75rem", maxWidth: 360 }}>
        {state.message}
      </span>
    );
  }
  if (state.skipped) {
    return (
      <span style={{ color: colors.subtle, fontSize: "0.75rem" }}>
        Already up to date — no re-render needed.
      </span>
    );
  }
  return (
    <a
      href={state.url}
      rel="noreferrer"
      style={{ color: "#69a758", fontSize: "0.75rem", fontWeight: 600 }}
      target="_blank"
    >
      Done — open MP4 ↗
    </a>
  );
}

function VoiceoverStatus({
  state,
  colors,
  onDismiss,
}: {
  state: VoiceoverState;
  colors: { subtle: string; text: string };
  onDismiss: () => void;
}) {
  if (state.status === "idle") {
    return null;
  }
  if (state.status === "generating") {
    return (
      <span style={{ color: colors.subtle, fontSize: "0.75rem" }}>
        Generating narration scripts + ElevenLabs audio…
      </span>
    );
  }
  if (state.status === "error") {
    return (
      <span style={{ color: "#f3a61e", fontSize: "0.75rem", maxWidth: 360 }}>
        {state.message}
      </span>
    );
  }
  return (
    <span
      onClick={onDismiss}
      style={{
        color: "#69a758",
        cursor: "pointer",
        fontSize: "0.75rem",
        fontWeight: 600,
      }}
    >
      ✓ Voiceover added to {state.sceneCount} scene
      {state.sceneCount === 1 ? "" : "s"} — save to persist
    </span>
  );
}

export default RemotionVideoTool;
