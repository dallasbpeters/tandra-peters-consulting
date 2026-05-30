import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { usePostHog } from "@posthog/react";
import {
  ColorWheel,
  Download,
  Instagram,
  MediaImage,
  Palette,
  Page,
  Text,
  Upload,
} from "iconoir-react";
import { SitePageChrome } from "../components/SitePageChrome";
import WaColorPicker from "@awesome.me/webawesome/dist/react/color-picker/index.js";
import type WaColorPickerElement from "@awesome.me/webawesome/dist/components/color-picker/color-picker.js";
import WaInput from "@awesome.me/webawesome/dist/react/input/index.js";
import WaSelect from "@awesome.me/webawesome/dist/react/select/index.js";
import WaTextarea from "@awesome.me/webawesome/dist/react/textarea/index.js";
import WaOption from "@awesome.me/webawesome/dist/react/option/index.js";
import { useGoogleDashboardAuth } from "../hooks/useGoogleDashboardAuth";
import { usePageMetadata } from "../hooks/usePageMetadata";
import { layoutClass } from "../styles/layoutClasses";
import "../styles/ad-dashboard.css";

type PlatformPreset = {
  id: string;
  label: string;
  helper: string;
  width: number;
  height: number;
};

type CreativeLayout = "photo-right" | "photo-fill" | "headline-card";

type CreativeState = {
  platformId: string;
  layout: CreativeLayout;
  eyebrow: string;
  headline: string;
  body: string;
  cta: string;
  footnote: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  imageUrl: string | null;
  imageName: string | null;
};

type CanvasTextOptions = {
  maxWidth: number;
  lineHeight: number;
  color: string;
  font: string;
  weight?: number;
  align?: CanvasTextAlign;
};

type PlatformShape = "square" | "wide" | "tall";

type CanvasBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type TextFit = {
  eyebrowSize: number;
  headlineSize: number;
  bodySize: number;
  ctaSize: number;
  footnoteSize: number;
  headlineLines: string[];
  bodyLines: string[];
  totalHeight: number;
};

const getSelectValue = (event: unknown): string =>
  (event as { target: { value: string } }).target.value;

const getInputValue = (event: unknown): string =>
  (event as { target: { value: string } }).target.value;

const PLATFORM_PRESETS: readonly PlatformPreset[] = [
  {
    id: "instagram-square",
    label: "Instagram Square",
    helper: "Feed, 1:1",
    width: 1080,
    height: 1080,
  },
  {
    id: "instagram-story",
    label: "Instagram Story",
    helper: "Story/Reel, 9:16",
    width: 1080,
    height: 1920,
  },
  {
    id: "facebook-feed",
    label: "Facebook Feed",
    helper: "Shared image, 1.91:1",
    width: 1200,
    height: 628,
  },
  {
    id: "linkedin-feed",
    label: "LinkedIn Feed",
    helper: "Single image",
    width: 1200,
    height: 627,
  },
  {
    id: "google-display",
    label: "Google Display",
    helper: "Square responsive",
    width: 1200,
    height: 1200,
  },
] as const;

const BRAND_SWATCHES = [
  { label: "Everglade", value: "#092A1D" },
  { label: "Paper", value: "#F6F2EA" },
  { label: "Mint", value: "#D5F6E9" },
  { label: "Purple", value: "#A48FE7" },
  { label: "Laurel", value: "#92B661" },
  { label: "Coral", value: "#D86642" },
  { label: "Storm", value: "#4F6F7A" },
  { label: "Granite", value: "#99AAA6" },
] as const;

const COLOR_PICKER_SWATCHES = BRAND_SWATCHES.map(
  (swatch) => swatch.value,
).join(";");

type AdColorPickerFieldProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
};

const AdColorPickerField = ({
  label,
  value,
  onValueChange,
}: AdColorPickerFieldProps) => {
  const pickerRef = useRef<WaColorPickerElement | null>(null);

  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) return undefined;

    const handleValueChange = () => {
      onValueChange(picker.value ?? "");
    };

    picker.addEventListener("input", handleValueChange);
    picker.addEventListener("change", handleValueChange);

    return () => {
      picker.removeEventListener("input", handleValueChange);
      picker.removeEventListener("change", handleValueChange);
    };
  }, [onValueChange]);

  return (
    <div className="ad-dashboard-color-field">
      <span>{label}</span>
      <WaColorPicker
        ref={pickerRef}
        label={label}
        value={value}
        format="hex"
        uppercase
        size="s"
        placement="left-start"
        swatches={COLOR_PICKER_SWATCHES}
      />
    </div>
  );
};

const LAYOUTS: ReadonlyArray<{
  id: CreativeLayout;
  label: string;
  helper: string;
}> = [
  {
    id: "photo-right",
    label: "Photo side",
    helper: "Copy block with a strong image panel.",
  },
  {
    id: "photo-fill",
    label: "Full bleed",
    helper: "Photo-led creative with a grounded copy overlay.",
  },
  {
    id: "headline-card",
    label: "Text first",
    helper: "Bold message, small image badge.",
  },
];

const DEFAULT_CREATIVE: CreativeState = {
  platformId: "instagram-square",
  layout: "photo-right",
  eyebrow: "Austin roof help",
  headline: "Not sure if that roof damage is storm related?",
  body: "I will inspect it, explain what I see, and help you understand the next right step.",
  cta: "Book a free inspection",
  footnote: "Tandra Peters | Birdcreek Roofing",
  backgroundColor: "#092A1D",
  textColor: "#F6F2EA",
  accentColor: "#D5F6E9",
  imageUrl: null,
  imageName: null,
};

const getSelectedPlatform = (platformId: string) =>
  PLATFORM_PRESETS.find((platform) => platform.id === platformId) ??
  PLATFORM_PRESETS[0];

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load uploaded image."));
    img.src = src;
  });

const drawCoverImage = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  const scale = Math.max(width / image.width, height / image.height);
  const scaledWidth = image.width * scale;
  const scaledHeight = image.height * scale;
  const dx = x + (width - scaledWidth) / 2;
  const dy = y + (height - scaledHeight) / 2;
  context.drawImage(image, dx, dy, scaledWidth, scaledHeight);
};

const getPlatformShape = (platform: PlatformPreset): PlatformShape => {
  const ratio = platform.width / platform.height;
  if (ratio < 0.78) return "tall";
  if (ratio > 1.35) return "wide";
  return "square";
};

const getWrappedLines = (
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (context.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};

const measureTextFit = (
  context: CanvasRenderingContext2D,
  creative: CreativeState,
  box: CanvasBox,
  base: {
    eyebrowSize: number;
    headlineSize: number;
    bodySize: number;
    ctaSize: number;
    footnoteSize: number;
  },
): TextFit => {
  context.font = `400 ${base.headlineSize}px "Instrument Serif", serif`;
  const headlineLines = getWrappedLines(context, creative.headline, box.width);
  const headlineLineHeight = Math.round(base.headlineSize * 1.02);

  context.font = `600 ${base.bodySize}px Manrope, sans-serif`;
  const bodyLines = getWrappedLines(context, creative.body, box.width);
  const bodyLineHeight = Math.round(base.bodySize * 1.38);

  const totalHeight =
    base.eyebrowSize * 1.1 +
    base.eyebrowSize * 1.85 +
    headlineLines.length * headlineLineHeight +
    base.bodySize * 0.85 +
    bodyLines.length * bodyLineHeight +
    base.bodySize * 1.05 +
    base.ctaSize * 2.45;

  return {
    ...base,
    headlineLines,
    bodyLines,
    totalHeight,
  };
};

const fitTextBlock = (
  context: CanvasRenderingContext2D,
  creative: CreativeState,
  box: CanvasBox,
  shortestSide: number,
  shape: PlatformShape,
  layout: CreativeLayout,
): TextFit => {
  const baseHeadline =
    shortestSide *
    (layout === "headline-card"
      ? shape === "wide"
        ? 0.094
        : shape === "tall"
          ? 0.082
          : 0.088
      : shape === "wide"
        ? 0.074
        : shape === "tall"
          ? 0.078
          : 0.072);
  let scale = 1;
  let fit: TextFit;

  do {
    fit = measureTextFit(context, creative, box, {
      eyebrowSize: Math.max(18, Math.round(shortestSide * 0.023 * scale)),
      headlineSize: Math.max(38, Math.round(baseHeadline * scale)),
      bodySize: Math.max(18, Math.round(shortestSide * 0.031 * scale)),
      ctaSize: Math.max(17, Math.round(shortestSide * 0.025 * scale)),
      footnoteSize: Math.max(16, Math.round(shortestSide * 0.021 * scale)),
    });
    scale -= 0.05;
  } while (fit.totalHeight > box.height && scale >= 0.62);

  return fit;
};

const drawTextLines = (
  context: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  options: CanvasTextOptions,
) => {
  context.fillStyle = options.color;
  context.textAlign = options.align ?? "left";
  context.textBaseline = "top";
  context.font = `${options.weight ?? 500} ${options.font}`;

  lines.forEach((line, index) => {
    context.fillText(line, x, y + index * options.lineHeight);
  });

  return y + lines.length * options.lineHeight;
};

const drawTextBlock = (
  context: CanvasRenderingContext2D,
  creative: CreativeState,
  box: CanvasBox,
  fit: TextFit,
) => {
  let cursorY = box.y;

  context.fillStyle = creative.accentColor;
  context.font = `900 ${fit.eyebrowSize}px Manrope, sans-serif`;
  context.textBaseline = "top";
  context.fillText(creative.eyebrow.toUpperCase(), box.x, cursorY);
  cursorY += fit.eyebrowSize * 2.95;

  cursorY = drawTextLines(context, fit.headlineLines, box.x, cursorY, {
    color: creative.textColor,
    font: `${fit.headlineSize}px "Instrument Serif", serif`,
    lineHeight: Math.round(fit.headlineSize * 1.02),
    maxWidth: box.width,
    weight: 400,
  });

  cursorY += fit.bodySize * 0.85;
  cursorY = drawTextLines(context, fit.bodyLines, box.x, cursorY, {
    color: creative.textColor,
    font: `${fit.bodySize}px Manrope, sans-serif`,
    lineHeight: Math.round(fit.bodySize * 1.38),
    maxWidth: box.width,
    weight: 600,
  });

  const ctaY = cursorY + fit.bodySize * 1.05;
  const ctaPaddingX = fit.ctaSize * 1.55;
  const ctaHeight = fit.ctaSize * 2.45;
  context.font = `850 ${fit.ctaSize}px Manrope, sans-serif`;
  const ctaWidth = Math.min(
    box.width,
    context.measureText(creative.cta).width + ctaPaddingX * 2,
  );

  context.fillStyle = creative.accentColor;
  roundedRect(context, box.x, ctaY, ctaWidth, ctaHeight, ctaHeight / 2);
  context.fill();
  context.fillStyle = creative.backgroundColor;
  context.fillText(
    creative.cta,
    box.x + ctaPaddingX,
    ctaY + fit.ctaSize * 0.68,
  );
};

const roundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - safeRadius,
    y + height,
  );
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const drawCreative = async (
  creative: CreativeState,
  platform: PlatformPreset,
) => {
  const canvas = document.createElement("canvas");
  canvas.width = platform.width;
  canvas.height = platform.height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not available in this browser.");
  }

  const width = platform.width;
  const height = platform.height;
  const shortestSide = Math.min(width, height);
  const shape = getPlatformShape(platform);
  const margin = Math.round(
    shortestSide * (shape === "wide" ? 0.06 : shape === "tall" ? 0.07 : 0.075),
  );
  const gap = Math.round(shortestSide * 0.045);
  const radius = Math.round(shortestSide * 0.034);
  const footerReserve = Math.round(shortestSide * 0.065);

  context.fillStyle = creative.backgroundColor;
  context.fillRect(0, 0, width, height);

  const image = creative.imageUrl ? await loadImage(creative.imageUrl) : null;
  let copyBox: CanvasBox = {
    x: margin,
    y: margin,
    width: width - margin * 2,
    height: height - margin * 2 - footerReserve,
  };

  if (creative.layout === "photo-fill" && image) {
    drawCoverImage(context, image, 0, 0, width, height);
    context.fillStyle = "rgba(9, 42, 29, 0.66)";
    context.fillRect(0, 0, width, height);
    copyBox = {
      x: margin,
      y:
        shape === "tall"
          ? Math.round(height * 0.48)
          : shape === "wide"
            ? Math.round(height * 0.34)
            : Math.round(height * 0.42),
      width:
        shape === "wide"
          ? Math.round(width * 0.52)
          : width - margin * 2,
      height:
        shape === "tall"
          ? height - Math.round(height * 0.48) - margin - footerReserve
          : height - Math.round(height * 0.42) - margin - footerReserve,
    };
  }

  if (creative.layout === "headline-card") {
    const frameWidth = Math.max(14, Math.round(shortestSide * 0.026));
    const innerX = margin + frameWidth;
    const innerY = margin + frameWidth;
    const innerWidth = width - margin * 2 - frameWidth * 2;
    const innerHeight = height - margin * 2 - frameWidth * 2;
    const innerPad = Math.round(
      shortestSide * (shape === "wide" ? 0.048 : 0.06),
    );

    context.fillStyle = creative.accentColor;
    roundedRect(
      context,
      margin,
      margin,
      width - margin * 2,
      height - margin * 2,
      radius,
    );
    context.fill();
    context.fillStyle = creative.backgroundColor;
    roundedRect(context, innerX, innerY, innerWidth, innerHeight, radius * 0.7);
    context.fill();

    if (image) {
      const badgeSize = Math.round(
        shortestSide * (shape === "wide" ? 0.31 : shape === "tall" ? 0.34 : 0.24),
      );
      const badgeX =
        shape === "wide"
          ? innerX + innerWidth - innerPad - badgeSize
          : innerX + innerWidth - innerPad - badgeSize;
      const badgeY =
        shape === "tall"
          ? innerY + innerHeight - innerPad - badgeSize
          : innerY + innerHeight - innerPad - badgeSize;
      roundedRect(context, badgeX, badgeY, badgeSize, badgeSize, radius * 0.55);
      context.save();
      context.clip();
      drawCoverImage(context, image, badgeX, badgeY, badgeSize, badgeSize);
      context.restore();
    }

    copyBox = {
      x: innerX + innerPad,
      y: innerY + innerPad,
      width:
        image && shape === "wide"
          ? innerWidth - innerPad * 3 - Math.round(shortestSide * 0.31)
          : image && shape === "square"
            ? Math.round(innerWidth * 0.66)
            : innerWidth - innerPad * 2,
      height:
        image && shape === "tall"
          ? innerHeight - innerPad * 3 - Math.round(shortestSide * 0.34)
          : innerHeight - innerPad * 2 - footerReserve,
    };
  }

  if (creative.layout === "photo-right") {
    if (shape === "tall") {
      const photoWidth = width - margin * 2;
      const photoHeight = Math.round(height * 0.36);
      const photoX = margin;
      const photoY = height - margin - photoHeight;
      if (image) {
        roundedRect(context, photoX, photoY, photoWidth, photoHeight, radius);
        context.save();
        context.clip();
        drawCoverImage(context, image, photoX, photoY, photoWidth, photoHeight);
        context.restore();
      }
      copyBox = {
        x: margin,
        y: margin,
        width: width - margin * 2,
        height: photoY - margin - gap,
      };
    } else {
      const photoWidth = Math.round(width * (shape === "wide" ? 0.44 : 0.4));
      const photoHeight = height - margin * 2;
      const photoX = width - margin - photoWidth;
      const photoY = margin;
      if (image) {
        roundedRect(context, photoX, photoY, photoWidth, photoHeight, radius);
        context.save();
        context.clip();
        drawCoverImage(context, image, photoX, photoY, photoWidth, photoHeight);
        context.restore();
      }
      copyBox = {
        x: margin,
        y: margin,
        width: photoX - margin - gap,
        height: height - margin * 2 - footerReserve,
      };
    }
  }

  const fit = fitTextBlock(
    context,
    creative,
    copyBox,
    shortestSide,
    shape,
    creative.layout,
  );
  context.letterSpacing = "0px";
  drawTextBlock(context, creative, copyBox, fit);

  context.fillStyle = creative.textColor;
  context.globalAlpha = 0.72;
  context.font = `750 ${fit.footnoteSize}px Manrope, sans-serif`;
  context.fillText(
    creative.footnote,
    creative.layout === "headline-card" ? copyBox.x : margin,
    height - margin * 0.75,
    width - margin * 2,
  );
  context.globalAlpha = 1;

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Could not export PNG."));
      }
    }, "image/png");
  });
};

const AuthPanel = ({
  auth,
}: {
  auth: ReturnType<typeof useGoogleDashboardAuth>;
}) => (
  <section className="ad-dashboard-auth">
    <div>
      <p className="ad-dashboard-eyebrow">Google gated</p>
      <h1>Sign in to build ad creative.</h1>
      <p>
        This dashboard is restricted to allowed Google accounts and does not
        expose the creative tools on the public site.
      </p>
    </div>
    {!auth.clientId ? (
      <p className="ad-dashboard-error">
        Add <code>VITE_GOOGLE_CLIENT_ID</code> to enable Google sign-in.
      </p>
    ) : (
      <>
        <div ref={auth.buttonRef} />
        {!auth.ready ? <p>Loading Google sign-in...</p> : null}
        {auth.authError ? (
          <p className="ad-dashboard-error">{auth.authError}</p>
        ) : null}
      </>
    )}
  </section>
);

export const AdDashboardPage = () => {
  const auth = useGoogleDashboardAuth();
  const posthog = usePostHog();
  const [creative, setCreative] = useState<CreativeState>(DEFAULT_CREATIVE);
  const [exporting, setExporting] = useState(false);
  const selectedPlatform = useMemo(
    () => getSelectedPlatform(creative.platformId),
    [creative.platformId],
  );
  const selectedPlatformShape = getPlatformShape(selectedPlatform);

  usePageMetadata({
    title: "Ad Builder | Tandra Peters",
    description:
      "Internal advertising dashboard for creating brand-aligned platform ad images.",
    robots: "noindex, nofollow",
  });

  useEffect(() => {
    posthog?.capture("ad_dashboard_viewed");
  }, [posthog]);

  useEffect(
    () => () => {
      if (creative.imageUrl) {
        URL.revokeObjectURL(creative.imageUrl);
      }
    },
    [creative.imageUrl],
  );

  const updateCreative = useCallback(
    <K extends keyof CreativeState>(key: K, value: CreativeState[K]) => {
      setCreative((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const handleImageChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const url = URL.createObjectURL(file);
      setCreative((current) => {
        if (current.imageUrl) {
          URL.revokeObjectURL(current.imageUrl);
        }

        return {
          ...current,
          imageUrl: url,
          imageName: file.name,
        };
      });
    },
    [],
  );

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const blob = await drawCreative(creative, selectedPlatform);
      downloadBlob(
        blob,
        `tandra-ad-${selectedPlatform.id}-${Date.now()}.png`,
      );
      posthog?.capture("ad_creative_exported", {
        platform: selectedPlatform.id,
        layout: creative.layout,
      });
    } finally {
      setExporting(false);
    }
  }, [creative, posthog, selectedPlatform]);

  const previewStyle = {
    "--ad-bg": creative.backgroundColor,
    "--ad-ink": creative.textColor,
    "--ad-accent": creative.accentColor,
    aspectRatio: `${selectedPlatform.width} / ${selectedPlatform.height}`,
  } as CSSProperties & Record<string, string>;

  return (
    <SitePageChrome>
      <main className={layoutClass.pageMain}>
        <div className="ad-dashboard-shell">
          {!auth.token ? <AuthPanel auth={auth} /> : null}

          {auth.token ? (
            <>

              <section className="ad-dashboard-grid">
                <aside className="ad-dashboard-panel ad-dashboard-controls">
                  <div className="ad-dashboard-panel-header">
                    <Page width={20} height={20} />
                    <h2>Format</h2>
                  </div>
                  <div className="ad-dashboard-preset-grid">
                    <WaSelect
                      name="platform"
                      label="Platform"
                      value={creative.platformId}
                      appearance="outlined"
                      size="s"
                      onChange={(event) =>
                        updateCreative(
                          "platformId",
                          getSelectValue(event),
                        )
                      }
                    >
                      {PLATFORM_PRESETS.map((platform) => (
                        <WaOption key={platform.id} value={platform.id}>
                          {platform.label} · {platform.width} x{" "}
                          {platform.height} · {platform.helper}
                        </WaOption>
                      ))}
                    </WaSelect>
                  </div>

                  <div className="ad-dashboard-panel-header">
                    <Instagram width={20} height={20} />
                    <h2>Layout</h2>
                  </div>
                  <div className="ad-dashboard-layout-grid">
                    <WaSelect
                      name="layout"
                      label="Layout"
                      value={creative.layout}
                      appearance="outlined"
                      size="s"
                      onChange={(event) =>
                        updateCreative(
                          "layout",
                          getSelectValue(event) as CreativeLayout,
                        )
                      }
                    >
                      {LAYOUTS.map((layout) => (
                        <WaOption key={layout.id} value={layout.id}>
                          {layout.label} · {layout.helper}
                        </WaOption>
                      ))}
                    </WaSelect>
                  </div>

                  <div className="ad-dashboard-panel-header">
                    <Text width={20} height={20} />
                    <h2>Copy</h2>
                  </div>
                  <WaInput
                    className="ad-dashboard-field"
                    label="Eyebrow"
                    value={creative.eyebrow}
                    appearance="outlined"
                    size="s"
                    withClear
                    onInput={(event) =>
                      updateCreative("eyebrow", getInputValue(event))
                    }
                  />
                  <WaTextarea
                    className="ad-dashboard-field"
                    label="Headline"
                    value={creative.headline}
                    rows={3}
                    resize="vertical"
                    appearance="outlined"
                    size="s"
                    onInput={(event) =>
                      updateCreative("headline", getInputValue(event))
                    }
                  />
                  <WaTextarea
                    className="ad-dashboard-field"
                    label="Supporting copy"
                    value={creative.body}
                    rows={4}
                    resize="vertical"
                    appearance="outlined"
                    size="s"
                    onInput={(event) =>
                      updateCreative("body", getInputValue(event))
                    }
                  />
                  <WaInput
                    className="ad-dashboard-field"
                    label="CTA"
                    value={creative.cta}
                    appearance="outlined"
                    size="s"
                    withClear
                    onInput={(event) =>
                      updateCreative("cta", getInputValue(event))
                    }
                  />
                  <WaInput
                    className="ad-dashboard-field"
                    label="Footer"
                    value={creative.footnote}
                    appearance="outlined"
                    size="s"
                    withClear
                    onInput={(event) =>
                      updateCreative("footnote", getInputValue(event))
                    }
                  />
                  <div className="ad-dashboard-user">
                    {auth.user?.picture ? (
                      <img src={auth.user.picture} alt="" />
                    ) : null}
                    <div>
                      <strong>{auth.user?.name ?? auth.user?.email}</strong>
                      <span>{auth.user?.email}</span>
                    </div>
                    <button type="button" onClick={() => auth.signOut()}>
                      Sign out
                    </button>
                  </div>
                </aside>

                <section className="ad-dashboard-stage">
                  <div className="ad-dashboard-toolbar">
                    <div>
                      <strong>{selectedPlatform.label}</strong>
                      <span>
                        {selectedPlatform.width} x {selectedPlatform.height}px
                      </span>
                    </div>
                    <button
                      type="button"
                      className="ad-dashboard-export"
                      onClick={() => void handleExport()}
                      disabled={exporting}
                    >
                      <Download width={18} height={18} />
                      {exporting ? "Exporting..." : "Export PNG"}
                    </button>
                  </div>

                  <div className="ad-dashboard-preview-wrap">
                    <article
                      className={`ad-creative-preview ad-creative-preview--${creative.layout} is-${selectedPlatformShape}`}
                      style={previewStyle}
                    >
                      {creative.imageUrl ? (
                        <div
                          className="ad-creative-photo"
                          style={{ backgroundImage: `url(${creative.imageUrl})` }}
                        />
                      ) : (
                        <div className="ad-creative-photo ad-creative-photo--empty">
                          <MediaImage width={34} height={34} />
                          <span>Upload a job photo</span>
                        </div>
                      )}
                      <div className="ad-creative-copy">
                        <p>{creative.eyebrow}</p>
                        <h2>{creative.headline}</h2>
                        <span>{creative.body}</span>
                        <strong>{creative.cta}</strong>
                      </div>
                      <footer>{creative.footnote}</footer>
                    </article>
                  </div>
                </section>

                <aside className="ad-dashboard-panel ad-dashboard-brand">
                  <div className="ad-dashboard-panel-header">
                    <Upload width={20} height={20} />
                    <h2>Image</h2>
                  </div>
                  <label className="ad-dashboard-upload">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                    <MediaImage width={22} height={22} />
                    <span>
                      {creative.imageName ?? "Choose roof, project, or portrait photo"}
                    </span>
                  </label>

                  <div className="ad-dashboard-panel-header">
                    <Palette width={20} height={20} />
                    <h2>Brand colors</h2>
                  </div>
                  <div className="ad-dashboard-color-grid">
                    {BRAND_SWATCHES.map((swatch) => (
                      <button
                        key={swatch.value}
                        type="button"
                        style={{ backgroundColor: swatch.value }}
                        onClick={() =>
                          setCreative((current) => ({
                            ...current,
                            backgroundColor: swatch.value,
                            textColor:
                              swatch.value === "#F6F2EA"
                                ? "#092A1D"
                                : current.textColor,
                          }))
                        }
                      >
                        <span>{swatch.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="ad-dashboard-panel-header">
                    <ColorWheel width={20} height={20} />
                    <h2>Fine tune</h2>
                  </div>
                  <AdColorPickerField
                    label="Background"
                    value={creative.backgroundColor}
                    onValueChange={(value) =>
                      updateCreative("backgroundColor", value)
                    }
                  />
                  <AdColorPickerField
                    label="Text"
                    value={creative.textColor}
                    onValueChange={(value) =>
                      updateCreative("textColor", value)
                    }
                  />
                  <AdColorPickerField
                    label="Accent"
                    value={creative.accentColor}
                    onValueChange={(value) =>
                      updateCreative("accentColor", value)
                    }
                  />
                </aside>
              </section>
            </>
          ) : null}
        </div>
      </main>
    </SitePageChrome>
  );
};
