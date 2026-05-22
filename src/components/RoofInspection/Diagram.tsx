import React from "react";
import { theme } from "../../theme";

type DiagramProps = {
  /** Path to the roof cutaway image (e.g. "/roof-sidecut.svg"). */
  src: string;
  alt?: string;
  children?: React.ReactNode;
};

/**
 * The diagram stage: a dark 16:9 container that renders the cutaway image
 * and positions Hotspot children absolutely over it.
 */
export const Diagram: React.FC<DiagramProps> = ({
  src,
  alt = "Cutaway illustration of a residential roof showing structural layers",
  children,
}) => {
  const containerStyle: React.CSSProperties = {
    position: "relative",
    background: theme.colors.paper,
    aspectRatio: "6 / 3",
  };

  const imgStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "30% 30%",
    opacity: 0.92,
  };

      return (
        <div style={containerStyle} className="ri-diagram" role="img" aria-label={alt}>
      <img src={src} alt="" aria-hidden="true" style={imgStyle} />
      {children}
    </div>
  );
};
