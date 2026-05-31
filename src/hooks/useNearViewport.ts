import { useEffect, useState, type RefObject } from "react";

/**
 * True once the target element enters (or is within rootMargin of) the viewport.
 * Observer disconnects after the first intersection to avoid repeat work.
 */
export const useNearViewport = <T extends Element>(
  ref: RefObject<T | null>,
  rootMargin = "480px 0px",
): boolean => {
  const [isNear, setIsNear] = useState(false);

  useEffect(() => {
    if (isNear) {
      return;
    }

    const node = ref.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsNear(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isNear, rootMargin]);

  return isNear;
};
