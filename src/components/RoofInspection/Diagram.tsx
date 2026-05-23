import React, { useEffect, useRef } from "react";
import { theme } from "../../theme";
import { useRoofInspection } from "./context";

type DiagramProps = {
  src: string;
  alt?: string;
  children?: React.ReactNode;
};

export const Diagram: React.FC<DiagramProps> = ({
  src,
  alt = "Interactive 3D model of a residential roof",
  children,
}) => {
  const { views, activeViewId, chapters, activeChapterId } = useRoofInspection();

  // Absolute URL so model-viewer's workers resolve the GLB correctly
  const absoluteSrc = src.startsWith("http")
    ? src
    : `${window.location.origin}${src}`;

  // Ref gives us the DOM element so we can imperatively drive the camera
  const mvRef = useRef<HTMLElement & {
    cameraOrbit: string;
    cameraTarget: string;
    fieldOfView: string;
  }>(null);

  // Toolbar view change → apply full camera preset
  useEffect(() => {
    const mv = mvRef.current;
    if (!mv) return;
    const view = views.find((v) => v.id === activeViewId);
    if (!view) return;
    if (view.cameraOrbit) mv.cameraOrbit = view.cameraOrbit;
    if (view.cameraTarget) mv.cameraTarget = view.cameraTarget;
    if (view.fieldOfView) mv.fieldOfView = view.fieldOfView;
  }, [activeViewId, views]);

  // Rail chapter selection → rotate camera to face the hotspot.
  // Sets cameraTarget to the hotspot's world-space position so it's centred
  // in frame, and applies the per-chapter focusOrbit if defined.
  useEffect(() => {
    const mv = mvRef.current;
    if (!mv || !activeChapterId) return;
    const chapter = chapters.find((c) => c.id === activeChapterId);
    if (!chapter?.position3d) return;

    // Centre the camera on the hotspot
    mv.cameraTarget = chapter.position3d;

    // Rotate to the chapter-specific orbit angle when provided
    if (chapter.focusOrbit) mv.cameraOrbit = chapter.focusOrbit;
  }, [activeChapterId, chapters]);

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
      model: { materials: Array<{ name: string; pbrMetallicRoughness: { setMetallicFactor: (v: number) => void; setRoughnessFactor: (v: number) => void } }> };
    };
    if (!mv?.model?.materials) return;
    for (const mat of mv.model.materials) {
      mat.pbrMetallicRoughness.setMetallicFactor(0.75);
      mat.pbrMetallicRoughness.setRoughnessFactor(0.25);
    }
  };

  // Derive the initial camera from the first/default view
  const defaultView = views.find((v) => v.id === activeViewId) ?? views[0];

  // Padding-bottom trick: gives the wrapper a concrete pixel height so
  // model-viewer's position:absolute height:100% resolves correctly.
  // model-viewer ships :host { height: 150px } which beats CSS aspect-ratio.
  const wrapperStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    height: 0,
    paddingBottom: "75%", // 4:3
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
        camera-orbit={defaultView?.cameraOrbit ?? "-155deg 65deg auto"}
        camera-target={defaultView?.cameraTarget ?? "auto"}
        field-of-view={defaultView?.fieldOfView ?? "auto"}
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
        onLoad={handleLoad}
        style={modelStyle}
      >
        {children}
      </model-viewer>
    </div>
  );
};
