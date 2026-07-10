import caveatLatinExtUrl from "@fontsource-variable/caveat/files/caveat-latin-ext-wght-normal.woff2?url";
import caveatLatinUrl from "@fontsource-variable/caveat/files/caveat-latin-wght-normal.woff2?url";
import hankenLatinExtItalicUrl from "@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-ext-wght-italic.woff2?url";
import hankenLatinExtUrl from "@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-ext-wght-normal.woff2?url";
import hankenLatinItalicUrl from "@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-wght-italic.woff2?url";
import hankenLatinUrl from "@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-wght-normal.woff2?url";
import bebasNeueLatinUrl from "@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff2?url";
import ibmPlexSerifLatinItalicUrl from "@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-400-italic.woff2?url";
import ibmPlexSerifLatinUrl from "@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-400-normal.woff2?url";
import ibmPlexSerifLatinExtItalicUrl from "@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-ext-400-italic.woff2?url";
import ibmPlexSerifLatinExtUrl from "@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-ext-400-normal.woff2?url";

interface FontFaceAsset {
  family: string;
  style: "italic" | "normal";
  unicodeRange?: string;
  url: string;
  weight: string;
}

const LATIN_UNICODE_RANGE =
  "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const LATIN_EXT_UNICODE_RANGE =
  "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF";

const AD_CANVAS_FONT_ASSETS: FontFaceAsset[] = [
  {
    family: "Hanken Grotesk Variable",
    style: "normal",
    unicodeRange: LATIN_EXT_UNICODE_RANGE,
    url: hankenLatinExtUrl,
    weight: "100 900",
  },
  {
    family: "Hanken Grotesk Variable",
    style: "normal",
    unicodeRange: LATIN_UNICODE_RANGE,
    url: hankenLatinUrl,
    weight: "100 900",
  },
  {
    family: "Hanken Grotesk Variable",
    style: "italic",
    unicodeRange: LATIN_EXT_UNICODE_RANGE,
    url: hankenLatinExtItalicUrl,
    weight: "100 900",
  },
  {
    family: "Hanken Grotesk Variable",
    style: "italic",
    unicodeRange: LATIN_UNICODE_RANGE,
    url: hankenLatinItalicUrl,
    weight: "100 900",
  },
  {
    family: "IBM Plex Serif",
    style: "normal",
    unicodeRange: LATIN_EXT_UNICODE_RANGE,
    url: ibmPlexSerifLatinExtUrl,
    weight: "400",
  },
  {
    family: "IBM Plex Serif",
    style: "normal",
    unicodeRange: LATIN_UNICODE_RANGE,
    url: ibmPlexSerifLatinUrl,
    weight: "400",
  },
  {
    family: "IBM Plex Serif",
    style: "italic",
    unicodeRange: LATIN_EXT_UNICODE_RANGE,
    url: ibmPlexSerifLatinExtItalicUrl,
    weight: "400",
  },
  {
    family: "IBM Plex Serif",
    style: "italic",
    unicodeRange: LATIN_UNICODE_RANGE,
    url: ibmPlexSerifLatinItalicUrl,
    weight: "400",
  },
  {
    family: "Bebas Neue",
    style: "normal",
    url: bebasNeueLatinUrl,
    weight: "400",
  },
  {
    family: "Caveat Variable",
    style: "normal",
    unicodeRange: LATIN_EXT_UNICODE_RANGE,
    url: caveatLatinExtUrl,
    weight: "400 700",
  },
  {
    family: "Caveat Variable",
    style: "normal",
    unicodeRange: LATIN_UNICODE_RANGE,
    url: caveatLatinUrl,
    weight: "400 700",
  },
];

export const blobToDataUrl = (blob: Blob): Promise<string> =>
  // FileReader is a callback-based API; wrapping it in a Promise is required.
  // oxlint-disable-next-line promise/avoid-new
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () =>
      reject(reader.error ?? new Error("Could not read the font file."))
    );
    reader.readAsDataURL(blob);
  });

const fetchFontDataUrl = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load export font (${response.status}).`);
  }
  return blobToDataUrl(await response.blob());
};

const buildFontFaceCss = (asset: FontFaceAsset, dataUrl: string) =>
  [
    "@font-face {",
    `  font-family: "${asset.family}";`,
    `  font-style: ${asset.style};`,
    "  font-display: swap;",
    `  font-weight: ${asset.weight};`,
    `  src: url(${dataUrl}) format("woff2");`,
    asset.unicodeRange ? `  unicode-range: ${asset.unicodeRange};` : null,
    "}",
  ]
    .filter(Boolean)
    .join("\n");

const buildAdCanvasFontEmbedCss = async (): Promise<string> => {
  try {
    const fontFaces = await Promise.all(
      AD_CANVAS_FONT_ASSETS.map(async (asset) =>
        buildFontFaceCss(asset, await fetchFontDataUrl(asset.url))
      )
    );
    return fontFaces.join("\n");
  } catch {
    return "";
  }
};

let adCanvasFontEmbedCssPromise: Promise<string> | null = null;

/**
 * Inlined @font-face CSS (fonts as data URLs) for the Ad Builder brand fonts.
 * Passed to html-to-image so exported/captured canvases render the correct
 * fonts. Memoized — the embed only builds once per session.
 */
export const getAdCanvasFontEmbedCss = (): Promise<string> => {
  adCanvasFontEmbedCssPromise ??= buildAdCanvasFontEmbedCss();
  return adCanvasFontEmbedCssPromise;
};
