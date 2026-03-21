import type React from "react";

export type TexasFlagProps = {
  width?: number;
  height?: number;
  color?: string;
  style?: React.CSSProperties;
};

const TexasFlag = ({
  width = 24,
  height = 18,
  color = "#ffffff",
  style,
}: TexasFlagProps) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 60 40"
    style={style}
    aria-hidden
  >
    <rect fill="#002868" width="24" height="40" />
    <rect fill="#ffffff" x="24" width="36" height="20" />
    <rect fill="#bf0a30" x="24" y="20" width="36" height="20" />
    <path
      fill={color}
      d="M12 11.5l1.4 4.4h4.6l-3.7 2.7 1.4 4.4-3.7-2.7-3.7 2.7 1.4-4.4-3.7-2.7h4.6z"
    />
  </svg>
);

export default TexasFlag;
