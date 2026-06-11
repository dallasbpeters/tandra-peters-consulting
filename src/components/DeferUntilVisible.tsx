import { useRef, type ReactNode } from "react";

import { useNearViewport } from "../hooks/useNearViewport";

type DeferUntilVisibleProps = {
  children: ReactNode;
  /** Reserved space before the section mounts (avoids layout shift). */
  minHeight?: string | number;
  rootMargin?: string;
  className?: string;
};

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
    <div ref={ref} className={className} style={{ minHeight: isNear ? undefined : minHeight }}>
      {isNear ? children : null}
    </div>
  );
};
