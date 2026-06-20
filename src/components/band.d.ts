import type { CSSProperties, ReactElement } from "react";

export interface BandProps {
  amplitude?: number;
  autoAnimate?: boolean;
  className?: string;
  colors?: string[];
  maxHeight?: number;
  minHeight?: number;
  reverse?: boolean;
  rotate?: boolean;
  scrollEnd?: number;
  scrollStart?: number;
  speed?: number;
  style?: CSSProperties;
  tint?: string;
}

declare function Band(props: BandProps): ReactElement;
export default Band;
