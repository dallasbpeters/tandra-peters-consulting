import bebasNormalUrl from "@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff?url";
import caveatNormalUrl from "@fontsource/caveat/files/caveat-latin-400-normal.woff?url";
import caveatBoldUrl from "@fontsource/caveat/files/caveat-latin-700-normal.woff?url";
import hankenItalicUrl from "@fontsource/hanken-grotesk/files/hanken-grotesk-latin-400-italic.woff?url";
import hankenNormalUrl from "@fontsource/hanken-grotesk/files/hanken-grotesk-latin-400-normal.woff?url";
import hankenBoldItalicUrl from "@fontsource/hanken-grotesk/files/hanken-grotesk-latin-700-italic.woff?url";
import hankenBoldUrl from "@fontsource/hanken-grotesk/files/hanken-grotesk-latin-700-normal.woff?url";
import ibmPlexItalicUrl from "@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-400-italic.woff?url";
import ibmPlexNormalUrl from "@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-400-normal.woff?url";
import ibmPlexBoldItalicUrl from "@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-700-italic.woff?url";
import ibmPlexBoldUrl from "@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-700-normal.woff?url";
// oxlint-disable-next-line react-doctor/prefer-dynamic-import -- loaded only through the lazily imported postcard PDF document chunk.
import {
  Defs,
  Image,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";

import horizontalLogoSvg from "../../../public/BC_Horizontal_White.svg?raw";
import verticalLogoSvg from "../../../public/BC_Vertical_White.svg?raw";
import type { CanvasElement, TextCanvasElement } from "../../lib/ad-canvas-doc";
import { fitTextFontSize } from "../../lib/ad-text-fit";
import {
  parseAdVersionBackgroundColor,
  parseAdVersionCanvasElements,
} from "../../lib/ad-version-config";
import { buildQrVector } from "../../lib/qr-code";
import type { PostcardSize } from "./postcard-pdf-document";

const PAGE_DIMS: Record<PostcardSize, { height: number; width: number }> = {
  "4x6": { height: 4 * 72, width: 6 * 72 },
  "6x9": { height: 6 * 72, width: 9 * 72 },
};

const SVG_PATH_RE = /<path[^>]*\sd="([^"]+)"[^>]*>/g;
/** Longest edge (px) requested for embedded photos — 6x9 full-bleed at 300 DPI. */
export const PRINT_IMAGE_WIDTH = 2775;

interface LogoVector {
  height: number;
  paths: string[];
  width: number;
}

const parseLogo = (svg: string, width: number, height: number): LogoVector => ({
  height,
  paths: [...svg.matchAll(SVG_PATH_RE)].map((match) => match[1]),
  width,
});

const LOGOS = {
  "horizontal-white": parseLogo(horizontalLogoSvg, 204, 62.51),
  "vertical-white": parseLogo(verticalLogoSvg, 183.97, 117.21),
} as const;

type PdfFontStore = Pick<
  (typeof import("@react-pdf/renderer"))["Font"],
  "register"
>;

export const registerPostcardVectorFonts = (font: PdfFontStore): void => {
  font.register({
    family: "Hanken Grotesk",
    fonts: [
      { src: hankenNormalUrl, fontStyle: "normal", fontWeight: 400 },
      { src: hankenItalicUrl, fontStyle: "italic", fontWeight: 400 },
      { src: hankenBoldUrl, fontStyle: "normal", fontWeight: 700 },
      { src: hankenBoldItalicUrl, fontStyle: "italic", fontWeight: 700 },
    ],
  });
  font.register({
    family: "IBM Plex Serif",
    fonts: [
      { src: ibmPlexNormalUrl, fontStyle: "normal", fontWeight: 400 },
      { src: ibmPlexItalicUrl, fontStyle: "italic", fontWeight: 400 },
      { src: ibmPlexBoldUrl, fontStyle: "normal", fontWeight: 700 },
      { src: ibmPlexBoldItalicUrl, fontStyle: "italic", fontWeight: 700 },
    ],
  });
  font.register({
    family: "Bebas Neue",
    fonts: [
      { src: bebasNormalUrl, fontStyle: "normal", fontWeight: 400 },
      { src: bebasNormalUrl, fontStyle: "italic", fontWeight: 400 },
      { src: bebasNormalUrl, fontStyle: "normal", fontWeight: 700 },
      { src: bebasNormalUrl, fontStyle: "italic", fontWeight: 700 },
    ],
  });
  font.register({
    family: "Caveat",
    fonts: [
      { src: caveatNormalUrl, fontWeight: 400 },
      { src: caveatNormalUrl, fontStyle: "italic", fontWeight: 400 },
      { src: caveatBoldUrl, fontWeight: 700 },
      { src: caveatBoldUrl, fontStyle: "italic", fontWeight: 700 },
    ],
  });
};

const pointPosition = (
  element: CanvasElement,
  width: number,
  height: number,
  // Images/rects/bands crop to their box; text must never clip (it wraps).
  // react-pdf only supports `overflow: "hidden"`, so "not clipping" = omitting it.
  clip = true
) => ({
  position: "absolute" as const,
  left: (element.x / 100) * width,
  top: (element.y / 100) * height,
  width: (element.width / 100) * width,
  ...(element.height === null
    ? {}
    : { height: (element.height / 100) * height }),
  opacity: element.opacity,
  ...(clip ? { overflow: "hidden" as const } : {}),
});

const pdfFontFamily = (fontFamily: string): string => {
  if (fontFamily.includes("Bebas")) {
    return "Bebas Neue";
  }
  if (fontFamily.includes("Caveat")) {
    return "Caveat";
  }
  if (fontFamily.includes("IBM Plex")) {
    return "IBM Plex Serif";
  }
  return "Hanken Grotesk";
};

const printImageUrl = (src: string): string => {
  try {
    const url = new URL(src, window.location.origin);
    if (url.hostname === "cdn.sanity.io") {
      url.searchParams.set("w", String(PRINT_IMAGE_WIDTH));
      url.searchParams.set("fit", "max");
      url.searchParams.set("fm", "jpg");
      url.searchParams.set("q", "90");
      return url.toString();
    }
    if (
      url.hostname === "images.unsplash.com" ||
      url.hostname === "plus.unsplash.com"
    ) {
      url.searchParams.set("w", String(PRINT_IMAGE_WIDTH));
      url.searchParams.set("q", "90");
      return url.toString();
    }
  } catch {
    return src;
  }
  return src;
};

const vectorTextStyle = (
  element: TextCanvasElement,
  pageWidth: number,
  pageHeight: number
) => {
  // Shrink a fixed-height text box so its wrapped copy fits (no-op for the usual
  // auto-height text). cqw → pt for the page width.
  const fittedCqw = fitTextFontSize({
    boxHeight: element.height,
    boxWidth: element.width,
    canvasAspect: pageWidth / pageHeight,
    fontSize: element.fontSize,
    letterSpacing: element.letterSpacing,
    lineHeight: element.lineHeight,
    text: element.text,
  });
  const fontSize = (fittedCqw / 100) * pageWidth;
  return {
    // clip:false — an absolutely-positioned <Text> with overflow:hidden cuts
    // wrapped lines off in react-pdf; omit it so the text wraps and grows.
    ...pointPosition(element, pageWidth, pageHeight, false),
    backgroundColor: element.background ?? undefined,
    borderRadius: (element.borderRadius / 100) * pageWidth,
    color: element.color,
    fontFamily: pdfFontFamily(element.fontFamily),
    fontSize,
    fontStyle: element.fontStyle,
    fontWeight: element.fontWeight >= 600 ? 700 : 400,
    letterSpacing: element.letterSpacing * fontSize,
    lineHeight: element.lineHeight,
    paddingHorizontal: (element.paddingX / 100) * pageWidth,
    paddingVertical: (element.paddingY / 100) * pageWidth,
    textAlign: element.textAlign,
  };
};

const VectorLogo = ({
  color,
  element,
  pageHeight,
  pageWidth,
}: {
  color: string;
  element: Extract<CanvasElement, { kind: "logo" }>;
  pageHeight: number;
  pageWidth: number;
}) => {
  const logo = LOGOS[element.variant] ?? LOGOS["horizontal-white"];
  const width = (element.width / 100) * pageWidth;
  const height =
    element.height === null
      ? width * (logo.height / logo.width)
      : (element.height / 100) * pageHeight;
  return (
    <Svg
      key={element.id}
      style={{ ...pointPosition(element, pageWidth, pageHeight), height }}
      viewBox={`0 0 ${logo.width} ${logo.height}`}
    >
      {logo.paths.map((path) => (
        <Path d={path} fill={color} key={path} />
      ))}
    </Svg>
  );
};

const VectorBand = ({
  element,
  pageHeight,
  pageWidth,
}: {
  element: Extract<CanvasElement, { kind: "band" }>;
  pageHeight: number;
  pageWidth: number;
}) => {
  const colors = element.colors.length > 0 ? element.colors : ["#092a1d"];
  const lastIndex = Math.max(1, colors.length - 1);
  return (
    <Svg
      key={element.id}
      style={pointPosition(element, pageWidth, pageHeight)}
      viewBox="0 0 100 100"
    >
      <Defs>
        <LinearGradient
          id={`gradient-${element.id}`}
          x1={element.rotate ? "100%" : "0%"}
          x2={element.rotate ? "0%" : "100%"}
        >
          {colors.map((color, index) => (
            <Stop
              key={`${color}-${index}`}
              offset={`${(index / lastIndex) * 100}%`}
              stopColor={color}
            />
          ))}
        </LinearGradient>
      </Defs>
      <Rect fill={`url(#gradient-${element.id})`} height="100" width="100" />
    </Svg>
  );
};

const VectorQr = ({
  element,
  pageHeight,
  pageWidth,
}: {
  element: Extract<CanvasElement, { kind: "qr" }>;
  pageHeight: number;
  pageWidth: number;
}) => {
  const qr = buildQrVector(element.value);
  return (
    <Svg
      key={element.id}
      style={pointPosition(element, pageWidth, pageHeight)}
      viewBox={`0 0 ${qr.size} ${qr.size}`}
    >
      <Rect fill={element.bgColor} height={qr.size} width={qr.size} />
      <Path d={qr.path} fill={element.fgColor} />
    </Svg>
  );
};

const renderElement = (
  element: CanvasElement,
  pageWidth: number,
  pageHeight: number
) => {
  switch (element.kind) {
    case "text": {
      const text =
        element.textTransform === "uppercase"
          ? element.text.toUpperCase()
          : element.text;
      return (
        <Text
          key={element.id}
          style={vectorTextStyle(element, pageWidth, pageHeight)}
        >
          {text}
        </Text>
      );
    }
    case "image": {
      return (
        <Image
          key={element.id}
          src={printImageUrl(element.src)}
          style={{
            ...pointPosition(element, pageWidth, pageHeight),
            objectFit: element.objectFit,
          }}
        />
      );
    }
    case "logo": {
      return (
        <VectorLogo
          color={element.color ?? "#ffffff"}
          element={element}
          key={element.id}
          pageHeight={pageHeight}
          pageWidth={pageWidth}
        />
      );
    }
    case "rect": {
      return (
        <View
          key={element.id}
          style={{
            ...pointPosition(element, pageWidth, pageHeight),
            backgroundColor: element.fill,
            borderRadius: (element.borderRadius / 100) * pageWidth,
          }}
        />
      );
    }
    case "band": {
      return (
        <VectorBand
          element={element}
          key={element.id}
          pageHeight={pageHeight}
          pageWidth={pageWidth}
        />
      );
    }
    case "qr": {
      return (
        <VectorQr
          element={element}
          key={element.id}
          pageHeight={pageHeight}
          pageWidth={pageWidth}
        />
      );
    }
    default: {
      return null;
    }
  }
};

export const PostcardVectorFront = ({
  config,
  size,
}: {
  config: string;
  size: PostcardSize;
}) => {
  const { height, width } = PAGE_DIMS[size];
  const elements = parseAdVersionCanvasElements(config);
  if (elements.length === 0) {
    return null;
  }
  return (
    <View
      style={{
        backgroundColor: parseAdVersionBackgroundColor(config),
        height,
        position: "relative",
        width,
      }}
    >
      {elements.map((element) => renderElement(element, width, height))}
    </View>
  );
};
