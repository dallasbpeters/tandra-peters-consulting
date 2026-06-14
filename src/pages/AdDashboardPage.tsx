import "@fontsource-variable/caveat/wght.css";
import "@fontsource/bebas-neue/latin-400.css";
import "@fontsource/ibm-plex-serif/400.css";
import "@fontsource/ibm-plex-serif/400-italic.css";
import type WaNumberInputElement from "@awesome.me/webawesome/dist/components/number-input/number-input.js";

import WaNumberInput from "@awesome.me/webawesome/dist/react/number-input/index.js";
import "@awesome.me/webawesome/dist/styles/themes/default.css";
import WaOption from "@awesome.me/webawesome/dist/react/option/index.js";
import WaPopover from "@awesome.me/webawesome/dist/react/popover/index.js";
import WaSelect from "@awesome.me/webawesome/dist/react/select/index.js";
import WaSwitch from "@awesome.me/webawesome/dist/react/switch/index.js";
import { usePostHog } from "@posthog/react";
import { LogOut, MediaImage, Palette, Page, Trash, Upload, User } from "iconoir-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import type {
  AdUnit,
  CreativeState,
  LogoVariant,
  PlatformPreset,
  PlatformShape,
} from "../lib/adCreative";

import { AdCanvasEditor } from "../components/AdCanvasEditor";
import { AdColorSwatch } from "../components/AdColorSwatch";
import { AdImagePicker } from "../components/AdImagePicker";
import { SitePageChrome } from "../components/SitePageChrome";
import { useGoogleDashboardAuth } from "../hooks/useGoogleDashboardAuth";
import { usePageMetadata } from "../hooks/usePageMetadata";
import { useSanityImageAssets, type SanityImageAsset } from "../hooks/useSanityImageAssets";
import { BRAND_SWATCHES, formatAdDimensions, getExportPixelSize } from "../lib/adCreative";
import { AD_TEMPLATES, applyAdTemplatePreset, type FontPresetId } from "../lib/adCreativeTemplates";
import "../styles/ad-dashboard.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const LINE_HEIGHT_DEFAULT = 100;
const TEXT_OFFSET_DEFAULT = 0;
const PRINT_DPI = 300;

const DEFAULT_TEXT_RHYTHM = {
  eyebrowLineHeight: LINE_HEIGHT_DEFAULT,
  headlineLineHeight: LINE_HEIGHT_DEFAULT,
  bodyLineHeight: LINE_HEIGHT_DEFAULT,
  ctaLineHeight: LINE_HEIGHT_DEFAULT,
  footnoteLineHeight: LINE_HEIGHT_DEFAULT,
  eyebrowOffset: TEXT_OFFSET_DEFAULT,
  headlineOffset: TEXT_OFFSET_DEFAULT,
  bodyOffset: TEXT_OFFSET_DEFAULT,
  ctaOffset: TEXT_OFFSET_DEFAULT,
  footnoteOffset: TEXT_OFFSET_DEFAULT,
} as const;

const DIMENSION_MIN_PX = 100;
const DIMENSION_MAX_PX = 4000;
const DIMENSION_MIN_IN = 1;
const DIMENSION_MAX_IN = 48;

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
  {
    id: "door-hanger-large",
    label: "Door Hanger — Large",
    helper: "Die-cut, print",
    width: 4.25,
    height: 11,
    unit: "in",
    cutout: { topRadius: 0.35, holeDiameter: 1.25, holeCenterFromTop: 1.5, slotWidth: 0.3 },
  },
  {
    id: "door-hanger-standard",
    label: "Door Hanger — Standard",
    helper: "Die-cut, print",
    width: 3.5,
    height: 8.5,
    unit: "in",
    cutout: { topRadius: 0.3, holeDiameter: 1.0, holeCenterFromTop: 1.3, slotWidth: 0.25 },
  },
] as const;

const LOGO_VARIANTS: ReadonlyArray<{
  id: LogoVariant;
  label: string;
  src: string;
}> = [
  {
    id: "horizontal-white",
    label: "Horizontal (white)",
    src: "/BC_Horizontal_White.svg",
  },
  {
    id: "vertical-white",
    label: "Vertical (white)",
    src: "/BC_Vertical_White.svg",
  },
] as const;

type FontPreset = {
  id: FontPresetId;
  label: string;
  headlineFamily: string;
  bodyFamily: string;
  headlineWeight: number;
};

const FONT_PRESETS: readonly FontPreset[] = [
  {
    id: "brand-serif",
    label: "IBM Plex Serif",
    headlineFamily: '"IBM Plex Serif", serif',
    bodyFamily: "Hanken Grotesk Variable, sans-serif",
    headlineWeight: 400,
  },
  {
    id: "clean-sans",
    label: "Hanken Grotesk Variable",
    headlineFamily: "Hanken Grotesk Variable, sans-serif",
    bodyFamily: "Hanken Grotesk Variable, sans-serif",
    headlineWeight: 750,
  },
  {
    id: "condensed",
    label: "Bebas Neue",
    headlineFamily: '"Bebas Neue", sans-serif',
    bodyFamily: "Hanken Grotesk Variable, sans-serif",
    headlineWeight: 400,
  },
  {
    id: "caveat",
    label: "Caveat",
    // fontsource-variable registers the family as "Caveat Variable".
    headlineFamily: '"Caveat Variable", cursive',
    bodyFamily: '"Hanken Grotesk Variable", sans-serif',
    headlineWeight: 600,
  },
] as const;

// ─── Event helpers ────────────────────────────────────────────────────────────

const getSelectValue = (event: unknown): string =>
  (event as { target: { value: string } }).target.value;

const getSwitchChecked = (event: unknown): boolean =>
  Boolean((event as { target: { checked: boolean } }).target.checked);

// ─── Dimension helpers ────────────────────────────────────────────────────────

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const clampDimension = (value: number, unit: AdUnit) => {
  const min = unit === "px" ? DIMENSION_MIN_PX : DIMENSION_MIN_IN;
  const max = unit === "px" ? DIMENSION_MAX_PX : DIMENSION_MAX_IN;
  const step = unit === "px" ? 1 : 0.125;
  const clamped = clampNumber(value, min, max);
  return unit === "px" ? Math.round(clamped) : Math.round(clamped / step) * step;
};

const convertDimensionsForUnit = (
  width: number,
  height: number,
  fromUnit: AdUnit,
  toUnit: AdUnit,
) => {
  if (fromUnit === toUnit) return { width, height };
  if (toUnit === "in") {
    return {
      width: clampDimension(width / PRINT_DPI, "in"),
      height: clampDimension(height / PRINT_DPI, "in"),
    };
  }
  return {
    width: clampDimension(width * PRINT_DPI, "px"),
    height: clampDimension(height * PRINT_DPI, "px"),
  };
};

const formatIntegerDisplay = (value: number) => String(Math.round(value));

const formatDimensionDisplay = (value: number, unit: AdUnit) =>
  unit === "px" ? formatIntegerDisplay(value) : Number.parseFloat(value.toFixed(3)).toString();

const getSelectedPlatform = (platformId: string) =>
  PLATFORM_PRESETS.find((p) => p.id === platformId) ?? PLATFORM_PRESETS[0];

const getPlatformUnit = (platform: PlatformPreset): AdUnit => platform.unit ?? "px";

const getPlatformShape = (platform: Pick<PlatformPreset, "width" | "height">): PlatformShape => {
  const ratio = platform.width / platform.height;
  if (ratio < 0.78) return "tall";
  if (ratio > 1.35) return "wide";
  return "square";
};

const revokeObjectUrl = (url: string | null) => {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
};

// ─── Default state ────────────────────────────────────────────────────────────

const DEFAULT_CREATIVE: CreativeState = {
  templateId: AD_TEMPLATES[0].id,
  platformId: "instagram-square",
  unit: "px",
  adWidth: PLATFORM_PRESETS[0].width,
  adHeight: PLATFORM_PRESETS[0].height,
  layout: AD_TEMPLATES[0].preset.layout,
  contentPadding: AD_TEMPLATES[0].preset.contentPadding,
  fontPresetId: AD_TEMPLATES[0].preset.fontPresetId,
  headlineSize: AD_TEMPLATES[0].preset.headlineSize,
  eyebrowSize: AD_TEMPLATES[0].preset.eyebrowSize,
  bodySize: AD_TEMPLATES[0].preset.bodySize,
  ctaSize: AD_TEMPLATES[0].preset.ctaSize,
  eyebrow: AD_TEMPLATES[0].preset.eyebrow,
  headline: AD_TEMPLATES[0].preset.headline,
  body: AD_TEMPLATES[0].preset.body,
  cta: AD_TEMPLATES[0].preset.cta,
  footnote: AD_TEMPLATES[0].preset.footnote,
  footnote2: AD_TEMPLATES[0].preset.footnote2,
  backgroundColor: AD_TEMPLATES[0].preset.backgroundColor,
  textColor: AD_TEMPLATES[0].preset.textColor,
  headlineColor: AD_TEMPLATES[0].preset.headlineColor,
  headlineAccentColor: AD_TEMPLATES[0].preset.headlineAccentColor,
  accentColor: AD_TEMPLATES[0].preset.accentColor,
  showLogo: AD_TEMPLATES[0].preset.showLogo,
  logoVariant: "horizontal-white",
  showBottomBorder: true,
  ...DEFAULT_TEXT_RHYTHM,
  imageFile: null,
  imageUrl: AD_TEMPLATES[0].preset.defaultImageUrl ?? null,
  imageName: AD_TEMPLATES[0].preset.defaultImageName ?? null,
};

// ─── Small field components ───────────────────────────────────────────────────

type AdColorPickerFieldProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
};

const AdColorPickerField = ({ label, value, onValueChange }: AdColorPickerFieldProps) => (
  <div className="ad-dashboard-color-field">
    <AdColorSwatch label={label} value={value} onChange={onValueChange} />
    <span className="ad-dashboard-color-field-label">{label}</span>
  </div>
);

const useDraftNumberInput = (
  safeValue: number,
  formatDisplay: (value: number) => string,
  clampValue: (value: number) => number,
  onValueChange: (value: number) => void,
) => {
  const inputRef = useRef<WaNumberInputElement | null>(null);
  const isFocusedRef = useRef(false);
  const [draftValue, setDraftValue] = useState(() => formatDisplay(safeValue));

  useEffect(() => {
    if (!isFocusedRef.current) setDraftValue(formatDisplay(safeValue));
  }, [formatDisplay, safeValue]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleFocus = () => {
      isFocusedRef.current = true;
    };

    const handleInput = () => {
      const raw = input.value ?? "";
      setDraftValue(raw);
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) onValueChange(clampValue(parsed));
    };

    const handleBlur = () => {
      isFocusedRef.current = false;
      const parsed = Number(input.value ?? "");
      if (Number.isFinite(parsed)) {
        const nextValue = clampValue(parsed);
        onValueChange(nextValue);
        setDraftValue(formatDisplay(nextValue));
        return;
      }
      setDraftValue(formatDisplay(safeValue));
    };

    input.addEventListener("focus", handleFocus);
    input.addEventListener("input", handleInput);
    input.addEventListener("change", handleInput);
    input.addEventListener("blur", handleBlur);
    return () => {
      input.removeEventListener("focus", handleFocus);
      input.removeEventListener("input", handleInput);
      input.removeEventListener("change", handleInput);
      input.removeEventListener("blur", handleBlur);
    };
  }, [clampValue, formatDisplay, onValueChange, safeValue]);

  return { inputRef, draftValue };
};

type AdDimensionNumberFieldProps = {
  label: string;
  value: number;
  unit: AdUnit;
  onValueChange: (value: number) => void;
};

const AdDimensionNumberField = ({
  label,
  value,
  unit,
  onValueChange,
}: AdDimensionNumberFieldProps) => {
  const safeValue = clampDimension(value, unit);
  const min = unit === "px" ? DIMENSION_MIN_PX : DIMENSION_MIN_IN;
  const max = unit === "px" ? DIMENSION_MAX_PX : DIMENSION_MAX_IN;
  const step = unit === "px" ? 1 : 0.125;
  const formatDisplay = useCallback(
    (nextValue: number) => formatDimensionDisplay(nextValue, unit),
    [unit],
  );
  const clampValue = useCallback((nextValue: number) => clampDimension(nextValue, unit), [unit]);
  const { inputRef, draftValue } = useDraftNumberInput(
    safeValue,
    formatDisplay,
    clampValue,
    onValueChange,
  );

  return (
    <WaNumberInput
      ref={inputRef}
      label={label}
      value={draftValue}
      min={min}
      max={max}
      step={step}
      inputmode={unit === "px" ? "numeric" : "decimal"}
      appearance="outlined"
      size="xs"
    />
  );
};

type AdUnitFieldProps = {
  unit: AdUnit;
  width: number;
  height: number;
  onUnitChange: (unit: AdUnit) => void;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
};

const AdUnitField = ({
  unit,
  width,
  height,
  onUnitChange,
  onWidthChange,
  onHeightChange,
}: AdUnitFieldProps) => (
  <div className="ad-dashboard-unit-field">
    <div className="ad-dashboard-unit-toggle">
      <span className={unit === "in" ? "is-active" : undefined}>in</span>
      <WaSwitch
        className="ad-dashboard-unit-switch"
        checked={unit === "px"}
        size="xs"
        onChange={(event) => onUnitChange(getSwitchChecked(event) ? "px" : "in")}
      >
        px
      </WaSwitch>
    </div>
    <div className="ad-dashboard-unit-dimensions">
      <AdDimensionNumberField
        label={`Width (${unit})`}
        value={width}
        unit={unit}
        onValueChange={onWidthChange}
      />
      <AdDimensionNumberField
        label={`Height (${unit})`}
        value={height}
        unit={unit}
        onValueChange={onHeightChange}
      />
    </div>
  </div>
);

// ─── Toolbar menu ─────────────────────────────────────────────────────────────

type ToolbarMenuProps = {
  icon: React.ReactNode;
  label: string;
  hideLabel?: boolean;
  children: React.ReactNode;
};

const ToolbarMenu = ({ icon, label, hideLabel, children }: ToolbarMenuProps) => {
  const triggerId = useId().replaceAll(":", "-");

  return (
    <div className="ad-toolbar-menu">
      <button
        id={triggerId}
        type="button"
        className="ad-toolbar-menu-trigger"
        aria-label={label}
        title={label}
      >
        {icon}
        {hideLabel ? null : <span>{label}</span>}
      </button>
      <WaPopover
        className="ad-toolbar-popover"
        for={triggerId}
        placement="bottom-start"
        distance={10}
        withoutArrow
      >
        <div className="ad-toolbar-popover-surface">{children}</div>
      </WaPopover>
    </div>
  );
};

// ─── Auth panel ───────────────────────────────────────────────────────────────

const AuthPanel = ({ auth }: { auth: ReturnType<typeof useGoogleDashboardAuth> }) => (
  <section className="ad-dashboard-auth">
    <div>
      <p className="ad-dashboard-eyebrow">Google gated</p>
      <h1>Sign in to build ad creative.</h1>
      <p>
        This dashboard is restricted to allowed Google accounts and does not expose the creative
        tools on the public site.
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
        {auth.authError ? <p className="ad-dashboard-error">{auth.authError}</p> : null}
      </>
    )}
  </section>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export const AdDashboardPage = () => {
  const auth = useGoogleDashboardAuth();
  const posthog = usePostHog();
  const imageLibrary = useSanityImageAssets();
  const [creative, setCreative] = useState<CreativeState>(DEFAULT_CREATIVE);

  const selectedPlatform = useMemo(
    () => getSelectedPlatform(creative.platformId),
    [creative.platformId],
  );
  const exportPixelSize = useMemo(
    () => getExportPixelSize(creative.adWidth, creative.adHeight, creative.unit),
    [creative.adWidth, creative.adHeight, creative.unit],
  );
  const selectedPlatformShape = getPlatformShape({
    width: exportPixelSize.width,
    height: exportPixelSize.height,
  });
  const selectedTemplate = useMemo(
    () => AD_TEMPLATES.find((t) => t.id === creative.templateId) ?? AD_TEMPLATES[0],
    [creative.templateId],
  );

  usePageMetadata({
    title: "Ad Builder | Tandra Peters",
    description: "Internal advertising dashboard for creating brand-aligned platform ad images.",
    robots: "noindex, nofollow",
  });

  useEffect(() => {
    posthog?.capture("ad_dashboard_viewed");
  }, [posthog]);

  useEffect(
    () => () => {
      revokeObjectUrl(creative.imageUrl);
    },
    [creative.imageUrl],
  );

  const updateCreative = useCallback(
    <K extends keyof CreativeState>(key: K, value: CreativeState[K]) => {
      setCreative((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const handlePlatformChange = useCallback((platformId: string) => {
    const platform = getSelectedPlatform(platformId);
    // Switch to the format's natural unit so door hangers land in inches and
    // social presets land in pixels without the user toggling units.
    const unit = getPlatformUnit(platform);
    setCreative((current) => ({
      ...current,
      platformId,
      unit,
      adWidth: platform.width,
      adHeight: platform.height,
    }));
  }, []);

  const handleUnitChange = useCallback((nextUnit: AdUnit) => {
    setCreative((current) => {
      if (current.unit === nextUnit) return current;
      const dimensions = convertDimensionsForUnit(
        current.adWidth,
        current.adHeight,
        current.unit,
        nextUnit,
      );
      return {
        ...current,
        unit: nextUnit,
        adWidth: dimensions.width,
        adHeight: dimensions.height,
      };
    });
  }, []);

  const handleImageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCreative((current) => {
      revokeObjectUrl(current.imageUrl);
      return {
        ...current,
        imageFile: file,
        imageUrl: url,
        imageName: file.name,
      };
    });
  }, []);

  const handleImageRemove = useCallback(() => {
    setCreative((current) => {
      revokeObjectUrl(current.imageUrl);
      return { ...current, imageFile: null, imageUrl: null, imageName: null };
    });
  }, []);

  const handleTemplateChange = useCallback((templateId: string) => {
    const template = AD_TEMPLATES.find((t) => t.id === templateId) ?? AD_TEMPLATES[0];
    setCreative((current) => applyAdTemplatePreset(current, template));
  }, []);

  const handleSanityImageSelect = useCallback((image: SanityImageAsset) => {
    setCreative((current) => {
      revokeObjectUrl(current.imageUrl);
      return {
        ...current,
        imageFile: null,
        imageUrl: image.url,
        imageName: image.label,
      };
    });
  }, []);

  const toolbarMenus = (
    <div className="ad-toolbar-menus">
      <ToolbarMenu icon={<Page width={16} height={16} />} label="Format">
        <WaSelect
          name="platform"
          label="Platform"
          value={creative.platformId}
          appearance="outlined"
          size="xs"
          onChange={(event) => handlePlatformChange(getSelectValue(event))}
        >
          {PLATFORM_PRESETS.map((platform) => (
            <WaOption key={platform.id} value={platform.id}>
              {platform.label} ·{" "}
              {formatAdDimensions(platform.width, platform.height, getPlatformUnit(platform))} ·{" "}
              {platform.helper}
            </WaOption>
          ))}
        </WaSelect>
        <AdUnitField
          unit={creative.unit}
          width={creative.adWidth}
          height={creative.adHeight}
          onUnitChange={handleUnitChange}
          onWidthChange={(adWidth) => updateCreative("adWidth", adWidth)}
          onHeightChange={(adHeight) => updateCreative("adHeight", adHeight)}
        />
      </ToolbarMenu>

      <ToolbarMenu icon={<MediaImage width={16} height={16} />} label="Design">
        <WaSelect
          name="template"
          label="Design"
          value={creative.templateId}
          appearance="outlined"
          size="xs"
          onChange={(event) => handleTemplateChange(getSelectValue(event))}
        >
          {AD_TEMPLATES.map((template) => (
            <WaOption key={template.id} value={template.id}>
              {template.label} · {template.helper}
            </WaOption>
          ))}
        </WaSelect>
        {selectedTemplate.thumbnail ? (
          <img className="ad-dashboard-template-preview" src={selectedTemplate.thumbnail} alt="" />
        ) : null}
        <WaSelect
          name="fontPreset"
          label="Font"
          value={creative.fontPresetId}
          appearance="outlined"
          size="xs"
          onChange={(event) =>
            updateCreative("fontPresetId", getSelectValue(event) as FontPresetId)
          }
        >
          {FONT_PRESETS.map((fontPreset) => (
            <WaOption key={fontPreset.id} value={fontPreset.id}>
              {fontPreset.label}
            </WaOption>
          ))}
        </WaSelect>
        <p className="ad-dashboard-rhythm-hint">
          Picking a new Design or Font reseeds the canvas. Text, sizing, and styling all happen
          directly on the canvas.
        </p>
      </ToolbarMenu>

      <ToolbarMenu icon={<Upload width={16} height={16} />} label="Image">
        <label className="ad-dashboard-upload">
          <input
            name="ad-image-upload"
            id="ad-image-upload"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
          />
          <MediaImage width={22} height={22} />
          <span>{creative.imageName ?? "Choose roof, project, or portrait photo"}</span>
        </label>
        {creative.imageUrl ? (
          <button type="button" className="ad-dashboard-remove-image" onClick={handleImageRemove}>
            <Trash width={16} height={16} />
            Remove current image
          </button>
        ) : null}
      </ToolbarMenu>

      <AdImagePicker
        images={imageLibrary.images}
        loading={imageLibrary.loading}
        error={imageLibrary.error}
        selectedImageUrl={creative.imageUrl}
        onRefresh={imageLibrary.refresh}
        onSelect={handleSanityImageSelect}
      />

      <ToolbarMenu icon={<Palette width={16} height={16} />} label="Brand">
        <WaSwitch
          checked={creative.showLogo}
          size="xs"
          onChange={(event) => updateCreative("showLogo", getSwitchChecked(event))}
        >
          Show Birdcreek logo
        </WaSwitch>
        {creative.showLogo ? (
          <WaSelect
            name="logoVariant"
            label="Logo lockup"
            value={creative.logoVariant}
            appearance="outlined"
            size="xs"
            onChange={(event) =>
              updateCreative("logoVariant", getSelectValue(event) as LogoVariant)
            }
          >
            {LOGO_VARIANTS.map((logo) => (
              <WaOption key={logo.id} value={logo.id}>
                {logo.label}
              </WaOption>
            ))}
          </WaSelect>
        ) : null}

        <p className="ad-toolbar-popover-label">Background swatches</p>
        <div className="ad-dashboard-color-grid">
          {BRAND_SWATCHES.map((swatch) => (
            <button
              key={`${swatch.label}-${swatch.value}`}
              type="button"
              style={{ backgroundColor: swatch.value }}
              onClick={() =>
                setCreative((current) => ({
                  ...current,
                  backgroundColor: swatch.value,
                  textColor: swatch.value === "#F6F2EA" ? "#092A1D" : current.textColor,
                }))
              }
            >
              <span>{swatch.label}</span>
            </button>
          ))}
        </div>

        <p className="ad-toolbar-popover-label">Fine tune</p>
        <div className="ad-dashboard-color-grid">
          <AdColorPickerField
            label="Bg"
            value={creative.backgroundColor}
            onValueChange={(value) => updateCreative("backgroundColor", value)}
          />
          <AdColorPickerField
            label="Accent"
            value={creative.accentColor}
            onValueChange={(value) => updateCreative("accentColor", value)}
          />
        </div>
      </ToolbarMenu>
    </div>
  );

  const accountMenu = (
    <ToolbarMenu
      icon={
        auth.user?.picture ? (
          <img className="ad-toolbar-avatar" src={auth.user.picture} alt="" />
        ) : (
          <User width={16} height={16} />
        )
      }
      label="Account"
      hideLabel
    >
      <div className="ad-dashboard-user">
        {auth.user?.picture ? <img src={auth.user.picture} alt="" /> : null}
        <div>
          <strong>{auth.user?.name ?? auth.user?.email}</strong>
          <span>{auth.user?.email}</span>
        </div>
        <button type="button" onClick={() => auth.signOut()}>
          <LogOut width={15} height={15} />
          Sign out
        </button>
      </div>
    </ToolbarMenu>
  );

  // SiteShell already wraps non-home routes in <main class="site-page-main">;
  // the --ad-dashboard modifier comes from getMainRouteClass.
  return (
    <SitePageChrome>
      <div className="ad-dashboard-shell wa-dark">
        {!auth.token ? <AuthPanel auth={auth} /> : null}

        {auth.token ? (
          <AdCanvasEditor
            creative={creative}
            selectedPlatform={selectedPlatform}
            selectedPlatformShape={selectedPlatformShape}
            toolbarStart={toolbarMenus}
            toolbarEnd={accountMenu}
          />
        ) : null}
      </div>
    </SitePageChrome>
  );
};
