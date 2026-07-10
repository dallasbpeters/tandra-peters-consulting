/** Minimal window-like surface so the helper is unit-testable without a DOM. */
export interface ScrollableView {
  scrollTo: (x: number, y: number) => void;
  scrollX: number;
  scrollY: number;
}

/**
 * Stop a focusable element from scrolling the PAGE when it receives focus.
 *
 * Mapbox marks its interactive `.mapboxgl-canvas` `tabindex="0"` for keyboard
 * access, so a mouse click natively focuses the canvas. When the map is taller
 * than the viewport the browser scrolls the document to bring the freshly
 * focused canvas into view — which reads as "clicking the map jumps the page
 * down." A *native* (click-driven) focus can't be given `preventScroll`, so
 * instead we snapshot the scroll offset the instant before focus (`pointerdown`
 * / `mousedown`, capture phase — before the browser's focus + scroll runs) and
 * restore it inside the element's `focus` handler. Both run in the same
 * synchronous task, so the page never visibly moves. Only the target element is
 * affected: keyboard focus of other controls (zoom buttons, page links) and the
 * intentional "Use area" scroll-to-builder are untouched.
 *
 * @returns a teardown that removes the listeners.
 */
export const preventFocusScroll = (
  element: HTMLElement,
  view: ScrollableView = window
): (() => void) => {
  let scrollX = 0;
  let scrollY = 0;
  const remember = (): void => {
    scrollX = view.scrollX;
    scrollY = view.scrollY;
  };
  const restore = (): void => {
    view.scrollTo(scrollX, scrollY);
  };
  element.addEventListener("pointerdown", remember, true);
  element.addEventListener("mousedown", remember, true);
  element.addEventListener("focus", restore);
  return () => {
    element.removeEventListener("pointerdown", remember, true);
    element.removeEventListener("mousedown", remember, true);
    element.removeEventListener("focus", restore);
  };
};
