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
  subsets: ["latin"],
  weights: [fontWeight],
});

const RoundedTextBoxInner: React.FC<Props> = ({
  textAlign,
  maxLines,
  borderRadius,
  horizontalPadding,
  text,
}) => {
  const { fontSize, lines } = fitTextOnNLines({
    fontFamily,
    fontWeight,
    maxBoxWidth: boxWidth - horizontalPadding * 2,
    maxFontSize,
    maxLines,
    text,
  });

  const textMeasurements = lines.map((t) =>
    measureText({
      additionalStyles: {
        lineHeight: String(lineHeight),
      },
      fontFamily,
      fontSize,
      fontVariantNumeric: "normal",
      fontWeight,
      letterSpacing: "normal",
      text: t,
      textTransform: "none",
      validateFontIsLoaded: true,
    })
  );
  const { d, boundingBox } = createRoundedTextBox({
    borderRadius,
    horizontalPadding,
    textAlign,
    textMeasurements,
  });

  const lineStyle = React.useMemo<React.CSSProperties>(
    () => ({
      color: "black",
      fontFamily,
      fontSize,
      fontWeight,
      lineHeight,
      paddingLeft: horizontalPadding,
      paddingRight: horizontalPadding,
      textAlign,
    }),
    [fontSize, textAlign, horizontalPadding]
  );

  return (
    <div
      style={{
        flexShrink: 0,
        height: boundingBox.height,
        position: "relative",
        width: boundingBox.width,
      }}
    >
      <svg
        aria-hidden="true"
        style={{
          height: boundingBox.height,
          overflow: "visible",
          position: "absolute",
          width: boundingBox.width,
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
      .catch((error) => {
        console.error(error);
      });
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return <RoundedTextBoxInner {...props} />;
}
