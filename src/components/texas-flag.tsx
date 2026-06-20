import type React from "react";

export interface TexasFlagProps {
  color?: string;
  height?: number;
  style?: React.CSSProperties;
  width?: number;
}

const TexasFlag = ({
  width = 24,
  height = 18,
  color = "#ffffff",
  style,
}: TexasFlagProps) => (
  <svg
    aria-hidden="true"
    height={height}
    style={style}
    viewBox="0 0 60 40"
    width={width}
  >
    <rect fill="#002868" height="40" width="24" />
    <rect fill="#ffffff" height="20" width="36" x="24" />
    <rect fill="#bf0a30" height="20" width="36" x="24" y="20" />
    <path
      d="M12 11.5l1.4 4.4h4.6l-3.7 2.7 1.4 4.4-3.7-2.7-3.7 2.7 1.4-4.4-3.7-2.7h4.6z"
      fill={color}
    />
  </svg>
);

export default TexasFlag;
