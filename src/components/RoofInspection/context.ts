import { createContext, useContext } from "react";

import type { CameraContextValue, RoofInspectionContextValue } from "./types";

/**
 * Chapter-selection context — drives callout open/close state.
 *
 * Consumed by `Hotspot` and `Rail`. Intentionally excludes camera state so
 * that `activeChapterId` changes (hover) do not trigger `Diagram` re-renders.
 */
export const RoofInspectionContext =
  createContext<RoofInspectionContextValue | null>(null);

/**
 * Camera context — drives toolbar presets and chapter-focus camera movement.
 *
 * Consumed by `Diagram` and `Toolbar`. The value is memoized in
 * `RoofInspectionRoot` so its reference stays stable when `activeChapterId`
 * changes, preventing unnecessary re-renders of the 3D canvas.
 */
export const CameraContext = createContext<CameraContextValue | null>(null);

/**
 * Convenience hook for chapter-selection state (`Hotspot`, `Rail`).
 *
 * @throws {Error} When called outside a `<RoofInspection>` provider tree.
 */
export const useRoofInspection = (): RoofInspectionContextValue => {
  const ctx = useContext(RoofInspectionContext);
  if (!ctx) {
    throw new Error(
      "useRoofInspection must be used inside a <RoofInspection> root component."
    );
  }
  return ctx;
};

/**
 * Convenience hook for camera state (`Diagram`, `Toolbar`, `Rail`).
 *
 * @throws {Error} When called outside a `<RoofInspection>` provider tree.
 *
 * @example
 * ```tsx
 * const { focusChapterId, setFocusChapterId } = useCameraContext();
 * ```
 */
export const useCameraContext = (): CameraContextValue => {
  const ctx = useContext(CameraContext);
  if (!ctx) {
    throw new Error(
      "useCameraContext must be used inside a <RoofInspection> root component."
    );
  }
  return ctx;
};
