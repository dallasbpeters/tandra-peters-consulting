import type { CSSProperties, ReactElement } from "react";

export interface BandProps {
  colors?: string[];
  tint?: string;
  minHeight?: number;
  maxHeight?: number;
  rotate?: boolean;
  scrollStart?: number;
  scrollEnd?: number;
  reverse?: boolean;
  autoAnimate?: boolean;
  speed?: number;
  amplitude?: number;
  className?: string;
  style?: CSSProperties;
}

declare function Band(props: BandProps): ReactElement;
export default Band;
