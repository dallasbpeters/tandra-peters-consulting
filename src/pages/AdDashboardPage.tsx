import {
  useCallback,
  useEffect,
  useMemo,
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
  { label: "Laurel", value: "#92B661" },
  { label: "Copper", value: "#D86642" },
  { label: "Storm", value: "#4F6F7A" },
] as const;

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

const wrapText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: CanvasTextOptions,
) => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (
      context.measureText(testLine).width > options.maxWidth &&
      currentLine
    ) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  context.fillStyle = options.color;
  context.textAlign = options.align ?? "left";
  context.textBaseline = "top";
  context.font = `${options.weight ?? 500} ${options.font}`;

  lines.forEach((line, index) => {
    context.fillText(line, x, y + index * options.lineHeight);
  });

  return y + lines.length * options.lineHeight;
};

const roundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
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
  const margin = Math.round(Math.min(width, height) * 0.075);
  const isTall = height > width * 1.25;
  const headlineSize = Math.round(Math.min(width, height) * (isTall ? 0.08 : 0.072));
  const bodySize = Math.round(Math.min(width, height) * 0.03);
  const smallSize = Math.round(Math.min(width, height) * 0.022);

  context.fillStyle = creative.backgroundColor;
  context.fillRect(0, 0, width, height);

  const image = creative.imageUrl ? await loadImage(creative.imageUrl) : null;

  if (creative.layout === "photo-fill" && image) {
    drawCoverImage(context, image, 0, 0, width, height);
    context.fillStyle = "rgba(9, 42, 29, 0.66)";
    context.fillRect(0, 0, width, height);
  }

  if (creative.layout === "photo-right" && image) {
    const photoWidth = isTall ? width - margin * 2 : Math.round(width * 0.42);
    const photoHeight = isTall
      ? Math.round(height * 0.42)
      : height - margin * 2;
    const photoX = isTall ? margin : width - margin - photoWidth;
    const photoY = isTall ? height - margin - photoHeight : margin;
    roundedRect(context, photoX, photoY, photoWidth, photoHeight, 32);
    context.save();
    context.clip();
    drawCoverImage(context, image, photoX, photoY, photoWidth, photoHeight);
    context.restore();
  }

  if (creative.layout === "headline-card") {
    context.fillStyle = creative.accentColor;
    roundedRect(context, margin, margin, width - margin * 2, height - margin * 2, 42);
    context.fill();
    context.fillStyle = creative.backgroundColor;
    roundedRect(
      context,
      margin + 18,
      margin + 18,
      width - margin * 2 - 36,
      height - margin * 2 - 36,
      28,
    );
    context.fill();

    if (image) {
      const badgeSize = Math.round(Math.min(width, height) * 0.22);
      const badgeX = width - margin - badgeSize;
      const badgeY = height - margin - badgeSize;
      roundedRect(context, badgeX, badgeY, badgeSize, badgeSize, 24);
      context.save();
      context.clip();
      drawCoverImage(context, image, badgeX, badgeY, badgeSize, badgeSize);
      context.restore();
    }
  }

  const textMaxWidth =
    creative.layout === "photo-right" && !isTall
      ? Math.round(width * 0.45)
      : width - margin * 2;
  const copyX = margin;
  const copyY = creative.layout === "photo-fill" ? height * 0.46 : margin * 1.2;

  context.fillStyle = creative.accentColor;
  context.font = `800 ${smallSize}px Manrope, sans-serif`;
  context.textBaseline = "top";
  context.letterSpacing = "0px";
  context.fillText(creative.eyebrow.toUpperCase(), copyX, copyY);

  const afterHeadline = wrapText(
    context,
    creative.headline,
    copyX,
    copyY + smallSize * 2.1,
    {
      color: creative.textColor,
      font: `${headlineSize}px "Instrument Serif", serif`,
      lineHeight: Math.round(headlineSize * 1.05),
      maxWidth: textMaxWidth,
      weight: 400,
    },
  );

  const afterBody = wrapText(
    context,
    creative.body,
    copyX,
    afterHeadline + bodySize * 0.75,
    {
      color: creative.textColor,
      font: `${bodySize}px Manrope, sans-serif`,
      lineHeight: Math.round(bodySize * 1.42),
      maxWidth: textMaxWidth,
      weight: 500,
    },
  );

  const ctaY = afterBody + bodySize * 1.15;
  context.fillStyle = creative.accentColor;
  roundedRect(
    context,
    copyX,
    ctaY,
    Math.min(textMaxWidth, context.measureText(creative.cta).width + margin * 0.9),
    bodySize * 2.25,
    999,
  );
  context.fill();
  context.fillStyle = creative.backgroundColor;
  context.font = `800 ${smallSize}px Manrope, sans-serif`;
  context.fillText(creative.cta, copyX + margin * 0.36, ctaY + bodySize * 0.55);

  context.fillStyle = creative.textColor;
  context.globalAlpha = 0.72;
  context.font = `700 ${smallSize}px Manrope, sans-serif`;
  context.fillText(creative.footnote, margin, height - margin * 0.82);
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
        <div className={`${layoutClass.containerWide} ad-dashboard-shell`}>
          {!auth.token ? <AuthPanel auth={auth} /> : null}

          {auth.token ? (
            <>
              <header className="ad-dashboard-header">
                <div>
                  <p className="ad-dashboard-eyebrow">Advertising dashboard</p>
                  <h1>Build platform-ready ad images.</h1>
                  <p>
                    Compose a fast, brand-aligned creative from Tandra&apos;s colors,
                    copy, and uploaded job photos. Export a PNG sized for the
                    selected platform.
                  </p>
                </div>
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
              </header>

              <section className="ad-dashboard-grid">
                <aside className="ad-dashboard-panel ad-dashboard-controls">
                  <div className="ad-dashboard-panel-header">
                    <Page width={20} height={20} />
                    <h2>Format</h2>
                  </div>
                  <div className="ad-dashboard-preset-grid">
                    {PLATFORM_PRESETS.map((platform) => (
                      <button
                        key={platform.id}
                        type="button"
                        className={
                          platform.id === creative.platformId
                            ? "ad-dashboard-preset is-active"
                            : "ad-dashboard-preset"
                        }
                        onClick={() => updateCreative("platformId", platform.id)}
                      >
                        <span>{platform.label}</span>
                        <small>
                          {platform.width} x {platform.height} |{" "}
                          {platform.helper}
                        </small>
                      </button>
                    ))}
                  </div>

                  <div className="ad-dashboard-panel-header">
                    <Instagram width={20} height={20} />
                    <h2>Layout</h2>
                  </div>
                  <div className="ad-dashboard-layout-grid">
                    {LAYOUTS.map((layout) => (
                      <button
                        key={layout.id}
                        type="button"
                        className={
                          layout.id === creative.layout
                            ? "ad-dashboard-layout is-active"
                            : "ad-dashboard-layout"
                        }
                        onClick={() => updateCreative("layout", layout.id)}
                      >
                        <span>{layout.label}</span>
                        <small>{layout.helper}</small>
                      </button>
                    ))}
                  </div>

                  <div className="ad-dashboard-panel-header">
                    <Text width={20} height={20} />
                    <h2>Copy</h2>
                  </div>
                  <label className="ad-dashboard-field">
                    <span>Eyebrow</span>
                    <input
                      value={creative.eyebrow}
                      onChange={(event) =>
                        updateCreative("eyebrow", event.target.value)
                      }
                    />
                  </label>
                  <label className="ad-dashboard-field">
                    <span>Headline</span>
                    <textarea
                      value={creative.headline}
                      rows={3}
                      onChange={(event) =>
                        updateCreative("headline", event.target.value)
                      }
                    />
                  </label>
                  <label className="ad-dashboard-field">
                    <span>Supporting copy</span>
                    <textarea
                      value={creative.body}
                      rows={4}
                      onChange={(event) =>
                        updateCreative("body", event.target.value)
                      }
                    />
                  </label>
                  <label className="ad-dashboard-field">
                    <span>CTA</span>
                    <input
                      value={creative.cta}
                      onChange={(event) =>
                        updateCreative("cta", event.target.value)
                      }
                    />
                  </label>
                  <label className="ad-dashboard-field">
                    <span>Footer</span>
                    <input
                      value={creative.footnote}
                      onChange={(event) =>
                        updateCreative("footnote", event.target.value)
                      }
                    />
                  </label>
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
                      className={`ad-creative-preview ad-creative-preview--${creative.layout}`}
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
                  <label className="ad-dashboard-color-field">
                    <span>Background</span>
                    <input
                      type="color"
                      value={creative.backgroundColor}
                      onChange={(event) =>
                        updateCreative("backgroundColor", event.target.value)
                      }
                    />
                  </label>
                  <label className="ad-dashboard-color-field">
                    <span>Text</span>
                    <input
                      type="color"
                      value={creative.textColor}
                      onChange={(event) =>
                        updateCreative("textColor", event.target.value)
                      }
                    />
                  </label>
                  <label className="ad-dashboard-color-field">
                    <span>Accent</span>
                    <input
                      type="color"
                      value={creative.accentColor}
                      onChange={(event) =>
                        updateCreative("accentColor", event.target.value)
                      }
                    />
                  </label>

                  <div className="ad-dashboard-note">
                    Keep the message direct: helpful roof guidance first, with
                    no sales pressure. Use real inspection or project photos
                    when possible.
                  </div>
                </aside>
              </section>
            </>
          ) : null}
        </div>
      </main>
    </SitePageChrome>
  );
};
