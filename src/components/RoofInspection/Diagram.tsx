import React, { useEffect, useRef, useState } from "react";
import { theme } from "../../theme";
import { DevViewerCompass } from "./DevViewerCompass";
import { useCameraContext } from "./context";

type DiagramProps = {
  /** Absolute or root-relative path to the GLB model, e.g. `"/roof.glb"`. */
  src: string;
  /** Accessible label for the landmark region. Defaults to a descriptive sentence. */
  alt?: string;
  /**
   * `Hotspot` components to slot into `<model-viewer>`.
   * Each child must carry a `slot="hotspot-{id}"` attribute so model-viewer
   * projects it onto the correct 3D surface.
   */
  children?: React.ReactNode;
};

let modelViewerScriptPromise: Promise<void> | null = null;

const loadModelViewerScript = () => {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  if (customElements.get("model-viewer")) {
    return Promise.resolve();
  }
  if (modelViewerScriptPromise) {
    return modelViewerScriptPromise;
  }

  modelViewerScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="/model-viewer.min.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.type = "module";
    script.src = "/model-viewer.min.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load model-viewer."));
    document.head.appendChild(script);
  });

  return modelViewerScriptPromise;
};

/**
 * Renders the interactive `<model-viewer>` 3D canvas for the roof inspection
 * section and wires up all imperative camera controls.
 *
 * @remarks
 * **Camera control sources** — two independent `useEffect` hooks drive the
 * camera imperatively through the `mvRef`:
 * 1. `activeViewId` changes (toolbar tab clicks) apply a full preset from
 *    `VIEWS` — orbit, target, and field-of-view all update together.
 * 2. `focusChapterId` changes (left-rail button clicks) pan the camera target
 *    to the hotspot's world-space position and optionally rotate to its
 *    `focusOrbit` angle. Hover events intentionally do **not** move the camera.
 *
 * **Shadow DOM overflow fix** — `<model-viewer>` ships with `contain: strict`
 * and `overflow: hidden` on its internal shadow elements. A polling
 * `requestAnimationFrame` loop injects a `<style>` tag into the shadow root
 * once the custom element upgrades, removing these constraints so hotspot
 * callout cards can render outside the canvas boundary.
 *
 * **Scroll passthrough** — `wheel` events are intercepted in the capture
 * phase and forwarded to `window.scrollBy` so hovering the canvas does not
 * prevent the user from scrolling the page.
 *
 * **Aspect ratio** — uses the padding-bottom trick (`height: 0; paddingBottom:
 * 75%`) because `<model-viewer>`'s shadow `:host { height: 150px }` rule has
 * higher specificity than `aspect-ratio` on the host element.
 */
export const Diagram: React.FC<DiagramProps> = ({
  src,
  alt = "Interactive 3D model of a residential roof",
  children,
}) => {
  // Subscribes ONLY to CameraContext — not to chapter-selection state.
  // This means hover events (which only mutate activeChapterId in the sibling
  // RoofInspectionContext) never cause Diagram to re-render or touch model-viewer.
  const { views, activeViewId, chapters, focusChapterId } = useCameraContext();

  useEffect(() => {
    void loadModelViewerScript();
  }, []);

  // Keep a stable ref so the camera-focus effect can read chapters without
  // adding them as a dependency — chapters is a new array reference on every
  // render (computed inline in Home.tsx), so including it in [focusChapterId, chapters]
  // would re-fire the effect on every hover, moving the camera unexpectedly.
  const chaptersRef = useRef(chapters);
  chaptersRef.current = chapters;

  // Absolute URL so model-viewer's workers resolve the GLB correctly
  const absoluteSrc = src.startsWith("http")
    ? src
    : `${window.location.origin}${src}`;

  // Ref gives us the DOM element so we can imperatively drive the camera
  const mvRef = useRef<
    HTMLElement & {
      cameraOrbit: string;
      cameraTarget: string;
      fieldOfView: string;
      jumpCameraToGoal?: () => void;
    }
  >(null);

  // Toolbar view change → apply full camera preset
  useEffect(() => {
    const mv = mvRef.current;
    if (!mv) return;
    const view = views.find((v) => v.id === activeViewId);
    if (!view) return;
    if (view.cameraOrbit) mv.cameraOrbit = view.cameraOrbit;
    if (view.cameraTarget) mv.cameraTarget = view.cameraTarget;
    if (view.fieldOfView) mv.fieldOfView = view.fieldOfView;
    mv.jumpCameraToGoal?.();
  }, [activeViewId, views]);

  // Explicit chapter click (rail) → rotate camera to face the hotspot.
  // Watches focusChapterId ONLY — chapters is read via ref so that unstable
  // array references (re-created each render in Home.tsx) don't re-fire this
  // effect on every hover-induced re-render.
  useEffect(() => {
    const mv = mvRef.current;
    if (!mv || !focusChapterId) return;
    const chapter = chaptersRef.current.find((c) => c.id === focusChapterId);
    if (!chapter?.position3d) return;

    mv.cameraTarget = chapter.position3d;
    if (chapter.focusOrbit) mv.cameraOrbit = chapter.focusOrbit;
  }, [focusChapterId]);

  // Punch through the shadow DOM so hotspot callouts aren't clipped.
  // model-viewer sets `contain: strict` on :host (paint containment = clips overflow)
  // AND sets overflow:hidden on .container / .userInput internally.
  // We poll with rAF because the shadow root isn't available until the custom
  // element upgrades, which can happen after the first React render.
  useEffect(() => {
    const mv = mvRef.current as Element | null;
    if (!mv) return;

    let rafId: number;

    const tryInject = () => {
      const shadow = mv.shadowRoot;
      if (shadow) {
        if (!shadow.querySelector("#ri-overflow-fix")) {
          const style = document.createElement("style");
          style.id = "ri-overflow-fix";
          // Override every layer that can clip: the host contain, the container,
          // the userInput div, and anything else via *.
          style.textContent = `
            :host { contain: none !important; overflow: visible !important; }
            .container, .userInput { overflow: visible !important; }
          `;
          shadow.appendChild(style);
        }
        return; // injected — stop polling
      }
      rafId = requestAnimationFrame(tryInject);
    };

    rafId = requestAnimationFrame(tryInject);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Boost metallic/roughness on the roofing material after the model loads.
  const handleLoad = () => {
    const mv = mvRef.current as unknown as {
      model: {
        materials: Array<{
          name: string;
          pbrMetallicRoughness: {
            setMetallicFactor: (v: number) => void;
            setRoughnessFactor: (v: number) => void;
          };
        }>;
      };
    };
    if (!mv?.model?.materials) return;
    for (const mat of mv.model.materials) {
      mat.pbrMetallicRoughness.setMetallicFactor(0.75);
      mat.pbrMetallicRoughness.setRoughnessFactor(0.25);
    }
  };

  // Capture the initial camera strings at mount time ONLY.
  // Using useState (not useMemo) guarantees the value is computed once and
  // never changes — so React never writes new attribute values on re-renders
  // caused by hover/click state updates, which would overwrite whatever the
  // imperative useEffect has set on the model-viewer element.
  const [initialOrbit] = useState(
    () =>
      (views.find((v) => v.id === activeViewId) ?? views[0])?.cameraOrbit ??
      "-115deg 45deg 6.5m",
  );
  const [initialTarget] = useState(
    () =>
      (views.find((v) => v.id === activeViewId) ?? views[0])?.cameraTarget ??
      "auto",
  );
  const [initialFov] = useState(
    () =>
      (views.find((v) => v.id === activeViewId) ?? views[0])?.fieldOfView ??
      "auto",
  );

  // Padding-bottom trick: gives the wrapper a concrete pixel height so
  // model-viewer's position:absolute height:100% resolves correctly.
  // model-viewer ships :host { height: 150px } which beats CSS aspect-ratio.
  const wrapperStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    height: 0,
    paddingBottom: "85%", // 4:3
    background: theme.colors.paper,
    borderRadius: "2px",
    overflow: "visible",
  };

  // Inline styles on the host element beat shadow-DOM :host rules.
  // `contain: none` removes the paint-containment bucket that model-viewer sets
  // via `:host { contain: strict }`, which forces clipping even when overflow is visible.
  const modelStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    display: "block",
    overflow: "visible",
    contain: "none",
    ["--poster-color" as string]: theme.colors.paper,
    ["--progress-bar-color" as string]: "#7c32f4",
    ["--progress-mask" as string]: "none",
  };

  return (
    <div style={wrapperStyle} role="region" aria-label={alt}>
      <model-viewer
        ref={mvRef as React.Ref<HTMLElement>}
        id="mv"
        src={absoluteSrc}
        alt={alt}
        camera-orbit={initialOrbit}
        camera-target={initialTarget}
        field-of-view={initialFov}
        min-camera-orbit="210deg 75deg 360deg"
        max-camera-orbit="auto auto 100%"
        tone-mapping="neutral"
        ar-modes="webxr scene-viewer quick-look"
        camera-controls={true}
        interaction-prompt="none"
        loading="eager"
        shadow-intensity="1.5"
        shadow-softness=".6"
        environment-image="legacy"
        touch-action="pan-y"
        disable-zoom
        onLoad={handleLoad}
        style={modelStyle}
      >
        {children}
      </model-viewer>
      {import.meta.env.DEV ? <DevViewerCompass /> : null}
    </div>
  );
};
