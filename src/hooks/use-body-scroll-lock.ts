import { useEffect } from "react";

/**
 * Locks scrolling on `document.body` while `isLocked` is true, restoring the
 * previous `overflow` value on unlock/unmount. Using `overflow: hidden` (rather
 * than `position: fixed`) preserves the current scroll position, so the page
 * does not jump to the top when the lock is released.
 *
 * Safe to call at the top level of a conditionally-mounted component: the
 * effect cleanup runs on unmount, so navigating away while a drawer/modal is
 * open still restores scrolling.
 */
export const useBodyScrollLock = (isLocked: boolean): void => {
  useEffect(() => {
    if (!isLocked || typeof document === "undefined") {
      return;
    }

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [isLocked]);
};
