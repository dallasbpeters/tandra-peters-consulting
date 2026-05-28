/**
 * Text content displayed inside a hotspot callout card.
 */
export type CalloutContent = {
  /** Primary heading shown at the top of the card. */
  title: string;
  /** One-to-two sentence description of the roof component. */
  body: string;
  /** What the inspector specifically looks for at this location. */
  watchFor: string;
};

/**
 * Which side of the hotspot dot the callout card opens toward.
 * Overridden to `"bottom"` on narrow viewports (≤ 700 px).
 */
export type Direction = "top" | "right" | "left" | "bottom";

/**
 * A single numbered inspection point on the roof model.
 *
 * @remarks
 * `position3d` / `normal3d` are the key fields that enable 3D rendering.
 * Without them `Hotspot` silently returns `null`, so chapters can be defined
 * in Sanity before 3D coordinates are available without breaking the UI.
 */
export type Chapter = {
  /**
   * Sanity array `_key` when this chapter was mapped from CMS data.
   * Used for stable React keys when coordinates change.
   */
  sanityKey?: string;
  /** Numeric string identifier, e.g. `"1"` through `"7"`. */
  id: string;
  /** Roman-numeral string shown in the rail, e.g. `"i"`, `"vii"`. */
  num: string;
  /** Short title shown in the left-rail nav list. */
  label: string;
  /**
   * Percentage-based overlay position for the retired 2D diagram mode.
   * No longer used in the 3D-only implementation but kept to avoid
   * breaking the type signature during the Sanity migration.
   */
  position: { top: string; left: string };
  /** Which side of the dot the callout card opens toward. */
  direction: Direction;
  callout: CalloutContent;
  /**
   * `<model-viewer>` `data-position` attribute — world-space XYZ in metres.
   * Format: `"Xm Ym Zm"`, e.g. `"0.19m 4.31m -0.47m"`.
   * When present the `Hotspot` component renders as a slotted element inside
   * `<model-viewer>` and is projected onto the 3D surface.
   */
  position3d?: string;
  /**
   * `<model-viewer>` `data-normal` attribute — outward surface normal at the
   * hotspot point, also in `"Xm Ym Zm"` format.
   * Used by `<model-viewer>` to hide hotspots that face away from the camera.
   */
  normal3d?: string;
  /**
   * `camera-orbit` string applied to `<model-viewer>` when this chapter is
   * selected from the rail nav, rotating the camera to face the component
   * face-on. Format: `"{azimuthal}deg {polar}deg {radius}"`.
   * Falls back to the current toolbar view's orbit when omitted.
   */
  focusOrbit?: string;
};

/**
 * A named camera preset selectable from the `Toolbar` tab strip.
 *
 * @remarks
 * All values are forwarded verbatim to `<model-viewer>` properties.
 * Refer to the model-viewer documentation for accepted string formats.
 */
export type View = {
  /** Unique identifier matched against `activeViewId` in context. */
  id: string;
  /** Human-readable label shown in the toolbar tab. */
  label: string;
  /** `camera-orbit` string, e.g. `"-155deg 65deg 4.5m"`. */
  cameraOrbit?: string;
  /** `camera-target` world-space point, e.g. `"0m 4.2m -1m"`. */
  cameraTarget?: string;
  /** `field-of-view` angle, e.g. `"30deg"` or `"auto"`. */
  fieldOfView?: string;
  /** `interpolation-decay` rate controlling camera animation speed. */
  interpolationDecay?: string;
};

/**
 * Context value for chapter-selection UI state — callout open/close.
 *
 * `Hotspot` and `Rail` subscribe to this context.
 * Changing `activeChapterId` (hover) only re-renders these consumers;
 * `Diagram` is intentionally excluded so hover never touches the 3D canvas.
 */
export type RoofInspectionContextValue = {
  /** All inspection chapters available in the current render. */
  chapters: Chapter[];
  /**
   * ID of the chapter whose callout is currently open (hover or click).
   * `null` when no callout is visible.
   */
  activeChapterId: string | null;
  setActiveChapterId: (id: string | null) => void;
};

/**
 * Context value for camera control — toolbar presets and chapter focus.
 *
 * `Diagram` and `Toolbar` subscribe to this context.
 * It is memoized in `RoofInspectionRoot` so its reference is stable when
 * `activeChapterId` changes, preventing `Diagram` from re-rendering on hover.
 *
 * @remarks
 * `focusChapterId` is set only by explicit rail-button clicks (never by hover),
 * so the `Diagram` camera-focus effect fires only on deliberate navigation.
 */
export type CameraContextValue = {
  /** All inspection chapters — needed by the camera-focus effect in `Diagram`. */
  chapters: Chapter[];
  /** All toolbar camera presets. */
  views: View[];
  /** ID of the currently selected toolbar `View`. */
  activeViewId: string;
  setActiveViewId: (id: string) => void;
  /**
   * ID of the chapter most recently activated by a rail button click.
   * `Diagram` watches this to rotate the camera to the hotspot.
   * `null` until the first deliberate click.
   */
  focusChapterId: string | null;
  setFocusChapterId: (id: string | null) => void;
};
