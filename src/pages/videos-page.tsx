import { WarningTriangle } from "iconoir-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SitePageChrome } from "../components/site-page-chrome";
import { useGoogleDashboardAuth } from "../context/dashboard-auth-context";
import { usePageMetadata } from "../hooks/use-page-metadata";
import type {
  EditorField,
  EditorSection as EditorSectionSchema,
} from "../remotion/ads/edit-schemas";
import { getProp, SCHEMAS, setProp } from "../remotion/ads/edit-schemas";
import { fetchTandraIntroContent } from "../remotion/fetch-tandra-intro-content";
import type { CompositionEntry, CompositionId } from "../remotion/registry";
import { COMPOSITIONS, getComposition } from "../remotion/registry";
import { layoutClass } from "../styles/layout-classes";

import "../styles/videos.css";

type AuthValue = ReturnType<typeof useGoogleDashboardAuth>;

type RenderState =
  | { status: "idle" }
  | { status: "rendering" }
  | { status: "done"; url: string; skipped?: boolean }
  | { status: "error"; message: string };

/** Composition ids whose editor form maps to a differently-named schema. */
const COMPOSITION_TO_EDITOR_SCHEMA: Record<string, string> = {
  "roof-scene": "RoofScene",
  "tandra-intro": "TandraIntro",
};

const seedPropsFor = (entry: CompositionEntry): Record<string, unknown> => ({
  ...entry.defaultProps,
});

const editorSchemaFor = (id: string): EditorSectionSchema[] => {
  const key = COMPOSITION_TO_EDITOR_SCHEMA[id] ?? id;
  return SCHEMAS[key] ?? [];
};

const VideosStudio = () => {
  const [activeId, setActiveId] = useState<CompositionId>(COMPOSITIONS[0].id);
  const [formProps, setFormProps] = useState<Record<string, unknown>>(() =>
    seedPropsFor(COMPOSITIONS[0])
  );
  const [dirty, setDirty] = useState(false);
  const [renderState, setRenderState] = useState<RenderState>({
    status: "idle",
  });

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const dirtyRef = useRef(dirty);
  const formPropsRef = useRef(formProps);
  dirtyRef.current = dirty;
  formPropsRef.current = formProps;

  const active = useMemo(
    () => getComposition(activeId) ?? COMPOSITIONS[0],
    [activeId]
  );
  const schema = useMemo(() => editorSchemaFor(activeId), [activeId]);
  const previewUrl = `/remotion-preview?id=${encodeURIComponent(activeId)}`;

  // Seed the editor with the composition's defaults (published Sanity copy for
  // the CMS-backed homepage intro) whenever the active composition changes.
  useEffect(() => {
    let cancelled = false;
    const entry = getComposition(activeId) ?? COMPOSITIONS[0];
    setDirty(false);
    setRenderState({ status: "idle" });
    setFormProps(seedPropsFor(entry));

    if (entry.sanityField === "tandraIntroVideo") {
      fetchTandraIntroContent()
        .then((result) => {
          if (!cancelled) {
            setFormProps({
              content: result.content,
              showCaptions: result.showCaptions,
            });
          }
        })
        .catch(() => {
          /* keep registry defaults on failure */
        });
    }

    return () => {
      cancelled = true;
    };
  }, [activeId]);

  // Push edited props to the preview iframe (debounced) once the user edits.
  useEffect(() => {
    if (!dirty) {
      return;
    }
    const timer = setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        { props: formProps, type: "remotion:updateProps" },
        "*"
      );
    }, 120);
    return () => clearTimeout(timer);
  }, [formProps, dirty]);

  const handleIframeLoad = useCallback(() => {
    if (dirtyRef.current) {
      iframeRef.current?.contentWindow?.postMessage(
        { props: formPropsRef.current, type: "remotion:updateProps" },
        "*"
      );
    }
  }, []);

  const handleFieldChange = useCallback((key: string, value: unknown) => {
    setDirty(true);
    setFormProps((prev) => setProp(prev, key, value));
  }, []);

  const handleReset = useCallback(() => {
    const entry = getComposition(activeId) ?? COMPOSITIONS[0];
    setFormProps(seedPropsFor(entry));
    setDirty(true);
  }, [activeId]);

  const handleRender = useCallback(async () => {
    setRenderState({ status: "rendering" });
    try {
      const response = await fetch("/api/render-tandra-intro?force=true", {
        body: JSON.stringify({ compositionId: activeId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        url?: string;
        skipped?: boolean;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(
          payload.error ?? `Render failed (HTTP ${response.status}).`
        );
      }
      if (payload.skipped) {
        setRenderState({
          skipped: true,
          status: "done",
          url: payload.url ?? "",
        });
        return;
      }
      if (payload.url) {
        setRenderState({ status: "done", url: payload.url });
        return;
      }
      throw new Error("Render finished but no video URL was returned.");
    } catch (error) {
      setRenderState({
        message:
          error instanceof Error ? error.message : "Unexpected render error.",
        status: "error",
      });
    }
  }, [activeId]);

  const isRendering = renderState.status === "rendering";

  return (
    <div className="videos-tool">
      <aside className="videos-sidebar">
        <h2 className="videos-eyebrow">Compositions</h2>
        <div className="videos-comp-list">
          {COMPOSITIONS.map((entry) => (
            <button
              className={
                entry.id === activeId
                  ? "videos-comp-btn is-active"
                  : "videos-comp-btn"
              }
              key={entry.id}
              onClick={() => setActiveId(entry.id)}
              type="button"
            >
              <span className="videos-comp-btn__title">
                {entry.label}
                {entry.sanityField ? (
                  <span className="videos-badge">CMS</span>
                ) : null}
              </span>
              <span className="videos-comp-btn__desc">{entry.description}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="videos-preview">
        <div className="videos-toolbar">
          <p className="videos-toolbar__note">
            <strong>{active.label}</strong>
            {schema.length > 0
              ? " — edit copy in the right panel to preview changes live."
              : " — preview only."}
          </p>
          <div className="videos-toolbar__actions">
            <RenderStatus state={renderState} />
            {schema.length > 0 ? (
              <button
                className="videos-btn videos-btn--ghost"
                disabled={!dirty || isRendering}
                onClick={handleReset}
                type="button"
              >
                Reset edits
              </button>
            ) : null}
            <button
              className="videos-btn videos-btn--primary"
              disabled={isRendering}
              onClick={handleRender}
              type="button"
            >
              {isRendering ? "Rendering…" : "Render MP4"}
            </button>
          </div>
        </div>
        <div className="videos-frame-wrap">
          <iframe
            className="videos-frame"
            key={activeId}
            onLoad={handleIframeLoad}
            ref={iframeRef}
            src={previewUrl}
            title={`${active.label} preview`}
          />
        </div>
      </section>

      {schema.length > 0 ? (
        <aside className="videos-editor">
          <h2 className="videos-eyebrow">Edit copy</h2>
          <div className="videos-editor__sections">
            {schema.map((section) => (
              <EditorSection
                key={section.key}
                onChange={handleFieldChange}
                props={formProps}
                section={section}
              />
            ))}
          </div>
        </aside>
      ) : null}
    </div>
  );
};

const RenderStatus = ({ state }: { state: RenderState }) => {
  if (state.status === "idle") {
    return null;
  }
  if (state.status === "rendering") {
    return (
      <span className="videos-status">
        Rendering in a Vercel Sandbox — this can take a minute…
      </span>
    );
  }
  if (state.status === "error") {
    return (
      <span className="videos-status videos-status--error">
        {state.message}
      </span>
    );
  }
  if (state.skipped) {
    return (
      <span className="videos-status">
        Already up to date — no re-render needed.
      </span>
    );
  }
  return (
    <a
      className="videos-status videos-status--link"
      href={state.url}
      rel="noopener noreferrer"
      target="_blank"
    >
      Done — open MP4
    </a>
  );
};

const EditorSection = ({
  section,
  props,
  onChange,
}: {
  section: EditorSectionSchema;
  props: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) => {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="videos-section">
      <button
        aria-expanded={!collapsed}
        className="videos-section__head"
        onClick={() => setCollapsed((value) => !value)}
        type="button"
      >
        {section.label}
        <span aria-hidden className="videos-section__chevron">
          {collapsed ? "+" : "–"}
        </span>
      </button>
      {collapsed ? null : (
        <div className="videos-section__fields">
          {section.fields.map((field) => (
            <EditorFieldRow
              field={field}
              key={field.key}
              onChange={(value) => onChange(field.key, value)}
              value={getProp(props, field.key)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const EditorFieldRow = ({
  field,
  value,
  onChange,
}: {
  field: EditorField;
  value: unknown;
  onChange: (value: unknown) => void;
}) => {
  const fieldId = `videos-field-${field.key}`;

  if (field.type === "boolean") {
    return (
      <div className="videos-field videos-field--check">
        <input
          checked={value === true}
          id={fieldId}
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
        <label htmlFor={fieldId}>{field.label}</label>
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="videos-field">
        <label htmlFor={fieldId}>{field.label}</label>
        <textarea
          id={fieldId}
          onChange={(event) => onChange(event.target.value)}
          value={typeof value === "string" ? value : ""}
        />
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div className="videos-field">
        <label htmlFor={fieldId}>{field.label}</label>
        <select
          id={fieldId}
          onChange={(event) => onChange(event.target.value)}
          value={typeof value === "string" ? value : ""}
        >
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div className="videos-field">
        <label htmlFor={fieldId}>{field.label}</label>
        <input
          id={fieldId}
          onChange={(event) => onChange(Number(event.target.value))}
          type="number"
          value={typeof value === "number" ? value : 0}
        />
      </div>
    );
  }

  return (
    <div className="videos-field">
      <label htmlFor={fieldId}>{field.label}</label>
      <input
        id={fieldId}
        onChange={(event) => onChange(event.target.value)}
        type="text"
        value={typeof value === "string" ? value : ""}
      />
    </div>
  );
};

const AuthPanel = ({ auth }: { auth: AuthValue }) => (
  <section className="videos-auth">
    <WarningTriangle aria-hidden height={22} width={22} />
    <div>
      <h1>Sign in to Videos</h1>
      <p>Preview, edit, and render Tandra&apos;s marketing videos.</p>
      {auth.clientId ? <div ref={auth.buttonRef} /> : null}
      {auth.clientId ? null : (
        <p>
          Add <code>VITE_GOOGLE_CLIENT_ID</code> to enable dashboard sign-in.
        </p>
      )}
      {auth.authError ? <p>{auth.authError}</p> : null}
    </div>
  </section>
);

export const VideosPage = () => {
  const auth = useGoogleDashboardAuth();
  const requireAuth = !auth.token;

  usePageMetadata({
    description:
      "Internal Videos studio to preview, edit, and render Tandra's Remotion marketing compositions.",
    robots: "noindex, nofollow",
    title: "Videos | Tandra Peters",
  });

  return (
    <SitePageChrome>
      {requireAuth ? (
        <div className={layoutClass.containerWide}>
          <AuthPanel auth={auth} />
        </div>
      ) : (
        <div className="videos-shell">
          <VideosStudio />
        </div>
      )}
    </SitePageChrome>
  );
};

export default VideosPage;
