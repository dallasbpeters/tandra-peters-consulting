import type { RefObject } from "react";
import { useEffect, useState } from "react";

/**
 * True once the target element enters (or is within rootMargin of) the viewport.
 * Observer disconnects after the first intersection to avoid repeat work.
 */
export const useNearViewport = <T extends Element>(
  ref: RefObject<T | null>,
  rootMargin = "480px 0px"
): boolean => {
  const [isNear, setIsNear] = useState(false);

  useEffect(() => {
    if (isNear) {
      return;
    }

    let observer: IntersectionObserver | null = null;
    let rafId = 0;

    const attach = () => {
      const node = ref.current;
      if (!node) {
        rafId = requestAnimationFrame(attach);
        return;
      }

      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            setIsNear(true);
            observer?.disconnect();
          }
        },
        { rootMargin }
      );

      observer.observe(node);
    };

    attach();

    return () => {
      cancelAnimationFrame(rafId);
      observer?.disconnect();
    };
  }, [isNear, rootMargin, ref.current]);

  return isNear;
};
