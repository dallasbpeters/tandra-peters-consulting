import "../ads.vars.css";

import { loadFont } from "@remotion/google-fonts/Manrope";
import { fitTextOnNLines, measureText } from "@remotion/layout-utils";
import type { TextAlign } from "@remotion/rounded-text-box";
import { createRoundedTextBox } from "@remotion/rounded-text-box";
import React, { useEffect, useState } from "react";

interface Props {
  readonly borderRadius: number;
  readonly horizontalPadding: number;
  readonly maxLines: number;
  readonly text: string;
  readonly textAlign: TextAlign;
}

const fontWeight = "700";
const boxWidth = 1000;
const lineHeight = 1.1;
const maxFontSize = 200;

const { waitUntilDone, fontFamily } = loadFont("normal", {
  weights: [fontWeight],
  subsets: ["latin"],
});

const RoundedTextBoxInner: React.FC<Props> = ({
  textAlign,
  maxLines,
  borderRadius,
  horizontalPadding,
  text,
}) => {
  const { fontSize, lines } = fitTextOnNLines({
    maxLines,
    maxBoxWidth: boxWidth - horizontalPadding * 2,
    fontFamily,
    text,
    fontWeight,
    maxFontSize,
  });

  const textMeasurements = lines.map((t) =>
    measureText({
      text: t,
      fontFamily,
      fontSize,
      additionalStyles: {
        lineHeight: String(lineHeight),
      },
      fontVariantNumeric: "normal",
      fontWeight,
      letterSpacing: "normal",
      textTransform: "none",
      validateFontIsLoaded: true,
    })
  );
  const { d, boundingBox } = createRoundedTextBox({
    textMeasurements,
    textAlign,
    horizontalPadding,
    borderRadius,
  });

  const lineStyle = React.useMemo<React.CSSProperties>(
    () => ({
      fontSize,
      fontWeight,
      fontFamily,
      lineHeight,
      textAlign,
      paddingLeft: horizontalPadding,
      paddingRight: horizontalPadding,
      color: "black",
    }),
    [fontSize, textAlign, horizontalPadding]
  );

  return (
    <div
      style={{
        position: "relative",
        width: boundingBox.width,
        height: boundingBox.height,
        flexShrink: 0,
      }}
    >
      <svg
        aria-hidden="true"
        style={{
          position: "absolute",
          width: boundingBox.width,
          height: boundingBox.height,
          overflow: "visible",
        }}
        viewBox={boundingBox.viewBox}
      >
        <path d={d} fill="var(--color-purple)" />
      </svg>
      <div style={{ position: "relative" }}>
        {lines.map((line) => (
          <div key={line} style={lineStyle}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function RoundedTextBox(props: Props) {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    waitUntilDone()
      .then(() => {
        setFontsLoaded(true);
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return <RoundedTextBoxInner {...props} />;
}
