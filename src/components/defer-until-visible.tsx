import type { ReactNode } from "react";
import { useRef } from "react";

import { useNearViewport } from "../hooks/use-near-viewport";

interface DeferUntilVisibleProps {
  children: ReactNode;
  className?: string;
  /** Reserved space before the section mounts (avoids layout shift). */
  minHeight?: string | number;
  rootMargin?: string;
}

/**
 * Mounts children only when the placeholder nears the viewport so lazy chunks,
 * Mapbox, model-viewer, and large assets stay off the initial critical path.
 */
export const DeferUntilVisible = ({
  children,
  minHeight,
  rootMargin = "480px 0px",
  className,
}: DeferUntilVisibleProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isNear = useNearViewport(ref, rootMargin);

  return (
    <div className={className} ref={ref} style={{ minHeight }}>
      {isNear ? children : null}
    </div>
  );
};
