import "@fontsource-variable/caveat/wght.css";
import "@fontsource/bebas-neue/latin-400.css";
import "@fontsource/ibm-plex-serif/400.css";
import "@fontsource/ibm-plex-serif/400-italic.css";
import type WaNumberInputElement from "@awesome.me/webawesome/dist/components/number-input/number-input.js";
import WaButton from "@awesome.me/webawesome/dist/react/button/index.js";

import "@awesome.me/webawesome/dist/styles/themes/default.css";
import WaNumberInput from "@awesome.me/webawesome/dist/react/number-input/index.js";
import WaOption from "@awesome.me/webawesome/dist/react/option/index.js";
import WaPopover from "@awesome.me/webawesome/dist/react/popover/index.js";
import WaSelect from "@awesome.me/webawesome/dist/react/select/index.js";
import WaSwitch from "@awesome.me/webawesome/dist/react/switch/index.js";
import { usePostHog } from "@posthog/react";
import {
  FloppyDisk,
  LogOut,
  MediaImage,
  Page,
  Palette,
  Trash,
  Upload,
  User,
} from "iconoir-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { AdCanvasEditor } from "../components/ad-canvas-editor";
import { AdColorSwatch } from "../components/ad-color-swatch";
import { AdImagePicker } from "../components/ad-image-picker";
import { SitePageChrome } from "../components/site-page-chrome";
import { useAdVersions } from "../hooks/use-ad-versions";
import { useGoogleDashboardAuth } from "../hooks/use-google-dashboard-auth";
import { usePageMetadata } from "../hooks/use-page-metadata";
import type { SanityImageAsset } from "../hooks/use-sanity-image-assets";
import { useSanityImageAssets } from "../hooks/use-sanity-image-assets";
import type {
  AdUnit,
  CreativeState,
  LogoVariant,
  PlatformPreset,
  PlatformShape,
} from "../lib/ad-creative";
import {
  BRAND_SWATCHES,
  formatAdDimensions,
  getExportPixelSize,
} from "../lib/ad-creative";
import type { FontPresetId } from "../lib/ad-creative-templates";
import {
  AD_TEMPLATES,
  applyAdTemplatePreset,
} from "../lib/ad-creative-templates";

import "../styles/ad-dashboard.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const LINE_HEIGHT_DEFAULT = 100;
const TEXT_OFFSET_DEFAULT = 0;
const PRINT_DPI = 300;

const DEFAULT_TEXT_RHYTHM = {
  bodyLineHeight: LINE_HEIGHT_DEFAULT,
  bodyOffset: TEXT_OFFSET_DEFAULT,
  ctaLineHeight: LINE_HEIGHT_DEFAULT,
  ctaOffset: TEXT_OFFSET_DEFAULT,
  eyebrowLineHeight: LINE_HEIGHT_DEFAULT,
  eyebrowOffset: TEXT_OFFSET_DEFAULT,
  footnoteLineHeight: LINE_HEIGHT_DEFAULT,
  footnoteOffset: TEXT_OFFSET_DEFAULT,
  headlineLineHeight: LINE_HEIGHT_DEFAULT,
  headlineOffset: TEXT_OFFSET_DEFAULT,
} as const;

const DIMENSION_MIN_PX = 100;
const DIMENSION_MAX_PX = 4000;
const DIMENSION_MIN_IN = 1;
const DIMENSION_MAX_IN = 48;

const PLATFORM_PRESETS: readonly PlatformPreset[] = [
  {
    height: 1080,
    helper: "Feed, 1:1",
    id: "instagram-square",
    label: "Instagram Square",
    width: 1080,
  },
  {
    height: 1920,
    helper: "Story/Reel, 9:16",
    id: "instagram-story",
    label: "Instagram Story",
    width: 1080,
  },
  {
    height: 628,
    helper: "Shared image, 1.91:1",
    id: "facebook-feed",
    label: "Facebook Feed",
    width: 1200,
  },
  {
    height: 627,
    helper: "Single image",
    id: "linkedin-feed",
    label: "LinkedIn Feed",
    width: 1200,
  },
  {
    height: 1200,
    helper: "Square responsive",
    id: "google-display",
    label: "Google Display",
    width: 1200,
  },
  {
    cutout: {
      holeCenterFromTop: 1.5,
      holeDiameter: 1.25,
      slotWidth: 0.3,
      topRadius: 0.35,
    },
    height: 11,
    helper: "Die-cut, print",
    id: "door-hanger-large",
    label: "Door Hanger — Large",
    unit: "in",
    width: 4.25,
  },
  {
    cutout: {
      holeCenterFromTop: 1.3,
      holeDiameter: 1.0,
      slotWidth: 0.25,
      topRadius: 0.3,
    },
    height: 8.5,
    helper: "Die-cut, print",
    id: "door-hanger-standard",
    label: "Door Hanger — Standard",
    unit: "in",
    width: 3.5,
  },
] as const;

const LOGO_VARIANTS: readonly {
  id: LogoVariant;
  label: string;
  src: string;
}[] = [
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

interface FontPreset {
  bodyFamily: string;
  headlineFamily: string;
  headlineWeight: number;
  id: FontPresetId;
  label: string;
}

const FONT_PRESETS: readonly FontPreset[] = [
  {
    bodyFamily: "Hanken Grotesk Variable, sans-serif",
    headlineFamily: '"IBM Plex Serif", serif',
    headlineWeight: 400,
    id: "brand-serif",
    label: "IBM Plex Serif",
  },
  {
    bodyFamily: "Hanken Grotesk Variable, sans-serif",
    headlineFamily: "Hanken Grotesk Variable, sans-serif",
    headlineWeight: 750,
    id: "clean-sans",
    label: "Hanken Grotesk Variable",
  },
  {
    bodyFamily: "Hanken Grotesk Variable, sans-serif",
    headlineFamily: '"Bebas Neue", sans-serif',
    headlineWeight: 400,
    id: "condensed",
    label: "Bebas Neue",
  },
  {
    bodyFamily: '"Hanken Grotesk Variable", sans-serif',
    // fontsource-variable registers the family as "Caveat Variable".
    headlineFamily: '"Caveat Variable", cursive',
    headlineWeight: 600,

    id: "caveat",
    label: "Caveat",
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
  return unit === "px"
    ? Math.round(clamped)
    : Math.round(clamped / step) * step;
};

const convertDimensionsForUnit = (
  width: number,
  height: number,
  fromUnit: AdUnit,
  toUnit: AdUnit
) => {
  if (fromUnit === toUnit) {
    return { height, width };
  }
  if (toUnit === "in") {
    return {
      height: clampDimension(height / PRINT_DPI, "in"),
      width: clampDimension(width / PRINT_DPI, "in"),
    };
  }
  return {
    height: clampDimension(height * PRINT_DPI, "px"),
    width: clampDimension(width * PRINT_DPI, "px"),
  };
};

const formatIntegerDisplay = (value: number) => String(Math.round(value));

const formatDimensionDisplay = (value: number, unit: AdUnit) =>
  unit === "px"
    ? formatIntegerDisplay(value)
    : Number.parseFloat(value.toFixed(3)).toString();

const getSelectedPlatform = (platformId: string) =>
  PLATFORM_PRESETS.find((p) => p.id === platformId) ?? PLATFORM_PRESETS[0];

const getPlatformUnit = (platform: PlatformPreset): AdUnit =>
  platform.unit ?? "px";

const getPlatformShape = (
  platform: Pick<PlatformPreset, "width" | "height">
): PlatformShape => {
  const ratio = platform.width / platform.height;
  if (ratio < 0.78) {
    return "tall";
  }
  if (ratio > 1.35) {
    return "wide";
  }
  return "square";
};

const revokeObjectUrl = (url: string | null) => {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
};

// ─── Version persistence helpers ──────────────────────────────────────────────

const pad2 = (value: number) => String(value).padStart(2, "0");

// Format-CurrentDateTime — used as the default saved-version name.
const formatVersionName = (date = new Date()) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ` +
  `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;

// Serialize the editable configuration only. The uploaded File and blob: object
// URLs cannot be persisted, so we drop them; Sanity-hosted image URLs survive.
const serializeCreative = (creative: CreativeState): string => {
  const { imageFile: _imageFile, imageUrl, ...rest } = creative;
  return JSON.stringify({
    ...rest,
    imageUrl: imageUrl && !imageUrl.startsWith("blob:") ? imageUrl : null,
  });
};

const deserializeCreative = (config: string): CreativeState => {
  const parsed = JSON.parse(config) as Partial<CreativeState>;
  return { ...DEFAULT_CREATIVE, ...parsed, imageFile: null };
};

// ─── Default state ────────────────────────────────────────────────────────────

const DEFAULT_CREATIVE: CreativeState = {
  accentColor: AD_TEMPLATES[0].preset.accentColor,
  adHeight: PLATFORM_PRESETS[0].height,
  adWidth: PLATFORM_PRESETS[0].width,
  backgroundColor: AD_TEMPLATES[0].preset.backgroundColor,
  body: AD_TEMPLATES[0].preset.body,
  bodySize: AD_TEMPLATES[0].preset.bodySize,
  contentPadding: AD_TEMPLATES[0].preset.contentPadding,
  cta: AD_TEMPLATES[0].preset.cta,
  ctaSize: AD_TEMPLATES[0].preset.ctaSize,
  eyebrow: AD_TEMPLATES[0].preset.eyebrow,
  eyebrowSize: AD_TEMPLATES[0].preset.eyebrowSize,
  fontPresetId: AD_TEMPLATES[0].preset.fontPresetId,
  footnote: AD_TEMPLATES[0].preset.footnote,
  footnote2: AD_TEMPLATES[0].preset.footnote2,
  headline: AD_TEMPLATES[0].preset.headline,
  headlineAccentColor: AD_TEMPLATES[0].preset.headlineAccentColor,
  headlineColor: AD_TEMPLATES[0].preset.headlineColor,
  headlineSize: AD_TEMPLATES[0].preset.headlineSize,
  layout: AD_TEMPLATES[0].preset.layout,
  logoVariant: "horizontal-white",
  platformId: "instagram-square",
  showBottomBorder: true,
  showLogo: AD_TEMPLATES[0].preset.showLogo,
  templateId: AD_TEMPLATES[0].id,
  textColor: AD_TEMPLATES[0].preset.textColor,
  unit: "px",
  ...DEFAULT_TEXT_RHYTHM,
  imageFile: null,
  imageName: AD_TEMPLATES[0].preset.defaultImageName ?? null,
  imageUrl: AD_TEMPLATES[0].preset.defaultImageUrl ?? null,
};

// ─── Small field components ───────────────────────────────────────────────────

interface AdColorPickerFieldProps {
  label: string;
  onValueChange: (value: string) => void;
  value: string;
}

const AdColorPickerField = ({
  label,
  value,
  onValueChange,
}: AdColorPickerFieldProps) => (
  <div className="ad-dashboard-color-field">
    <AdColorSwatch label={label} onChange={onValueChange} value={value} />
    <span className="ad-dashboard-color-field-label">{label}</span>
  </div>
);

const useDraftNumberInput = (
  safeValue: number,
  formatDisplay: (value: number) => string,
  clampValue: (value: number) => number,
  onValueChange: (value: number) => void
) => {
  const inputRef = useRef<WaNumberInputElement | null>(null);
  const isFocusedRef = useRef(false);
  const [draftValue, setDraftValue] = useState(() => formatDisplay(safeValue));

  useEffect(() => {
    if (!isFocusedRef.current) {
      setDraftValue(formatDisplay(safeValue));
    }
  }, [formatDisplay, safeValue]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) {
      return;
    }

    const handleFocus = () => {
      isFocusedRef.current = true;
    };

    const handleInput = () => {
      const raw = input.value ?? "";
      setDraftValue(raw);
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        onValueChange(clampValue(parsed));
      }
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

  return { draftValue, inputRef };
};

interface AdDimensionNumberFieldProps {
  label: string;
  onValueChange: (value: number) => void;
  unit: AdUnit;
  value: number;
}

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
    [unit]
  );
  const clampValue = useCallback(
    (nextValue: number) => clampDimension(nextValue, unit),
    [unit]
  );
  const { inputRef, draftValue } = useDraftNumberInput(
    safeValue,
    formatDisplay,
    clampValue,
    onValueChange
  );

  return (
    <WaNumberInput
      appearance="outlined"
      inputmode={unit === "px" ? "numeric" : "decimal"}
      label={label}
      max={max}
      min={min}
      ref={inputRef}
      size="xs"
      step={step}
      value={draftValue}
    />
  );
};

interface AdUnitFieldProps {
  height: number;
  onHeightChange: (height: number) => void;
  onUnitChange: (unit: AdUnit) => void;
  onWidthChange: (width: number) => void;
  unit: AdUnit;
  width: number;
}

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
        checked={unit === "px"}
        className="ad-dashboard-unit-switch"
        onChange={(event) =>
          onUnitChange(getSwitchChecked(event) ? "px" : "in")
        }
        size="xs"
      >
        px
      </WaSwitch>
    </div>
    <div className="ad-dashboard-unit-dimensions">
      <AdDimensionNumberField
        label={`Width (${unit})`}
        onValueChange={onWidthChange}
        unit={unit}
        value={width}
      />
      <AdDimensionNumberField
        label={`Height (${unit})`}
        onValueChange={onHeightChange}
        unit={unit}
        value={height}
      />
    </div>
  </div>
);

// ─── Toolbar menu ─────────────────────────────────────────────────────────────

interface ToolbarMenuProps {
  children: React.ReactNode;
  hideLabel?: boolean;
  icon: React.ReactNode;
  label: string;
}

const ToolbarMenu = ({
  icon,
  label,
  hideLabel,
  children,
}: ToolbarMenuProps) => {
  const triggerId = useId().replaceAll(":", "-");

  return (
    <div className="ad-toolbar-menu">
      <button
        aria-label={label}
        className="ad-toolbar-menu-trigger"
        id={triggerId}
        title={label}
        type="button"
      >
        {icon}
        {hideLabel ? null : <span>{label}</span>}
      </button>
      <WaPopover
        className="ad-toolbar-popover"
        distance={10}
        for={triggerId}
        placement="bottom-start"
        withoutArrow
      >
        <div className="ad-toolbar-popover-surface">{children}</div>
      </WaPopover>
    </div>
  );
};

// ─── Auth panel ───────────────────────────────────────────────────────────────

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
    {auth.clientId ? (
      <>
        <div ref={auth.buttonRef} />
        {auth.ready ? null : <p>Loading Google sign-in...</p>}
        {auth.authError ? (
          <p className="ad-dashboard-error">{auth.authError}</p>
        ) : null}
      </>
    ) : (
      <p className="ad-dashboard-error">
        Add <code>VITE_GOOGLE_CLIENT_ID</code> to enable Google sign-in.
      </p>
    )}
  </section>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export const AdDashboardPage = () => {
  const auth = useGoogleDashboardAuth();
  const posthog = usePostHog();
  const imageLibrary = useSanityImageAssets();
  const versions = useAdVersions();
  const [creative, setCreative] = useState<CreativeState>(DEFAULT_CREATIVE);
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [versionStatus, setVersionStatus] = useState<string | null>(null);
  const [versionBusy, setVersionBusy] = useState(false);

  const selectedPlatform = useMemo(
    () => getSelectedPlatform(creative.platformId),
    [creative.platformId]
  );
  const exportPixelSize = useMemo(
    () =>
      getExportPixelSize(creative.adWidth, creative.adHeight, creative.unit),
    [creative.adWidth, creative.adHeight, creative.unit]
  );
  const selectedPlatformShape = getPlatformShape({
    height: exportPixelSize.height,
    width: exportPixelSize.width,
  });
  const selectedTemplate = useMemo(
    () =>
      AD_TEMPLATES.find((t) => t.id === creative.templateId) ?? AD_TEMPLATES[0],
    [creative.templateId]
  );

  usePageMetadata({
    description:
      "Internal advertising dashboard for creating brand-aligned platform ad images.",
    robots: "noindex, nofollow",
    title: "Ad Builder | Tandra Peters",
  });

  useEffect(() => {
    posthog?.capture("ad_dashboard_viewed");
  }, [posthog]);

  useEffect(
    () => () => {
      revokeObjectUrl(creative.imageUrl);
    },
    [creative.imageUrl]
  );

  const updateCreative = useCallback(
    <K extends keyof CreativeState>(key: K, value: CreativeState[K]) => {
      setCreative((current) => ({ ...current, [key]: value }));
    },
    []
  );

  const handlePlatformChange = useCallback((platformId: string) => {
    const platform = getSelectedPlatform(platformId);
    // Switch to the format's natural unit so door hangers land in inches and
    // social presets land in pixels without the user toggling units.
    const unit = getPlatformUnit(platform);
    setCreative((current) => ({
      ...current,
      adHeight: platform.height,
      adWidth: platform.width,
      platformId,
      unit,
    }));
  }, []);

  const handleUnitChange = useCallback((nextUnit: AdUnit) => {
    setCreative((current) => {
      if (current.unit === nextUnit) {
        return current;
      }
      const dimensions = convertDimensionsForUnit(
        current.adWidth,
        current.adHeight,
        current.unit,
        nextUnit
      );
      return {
        ...current,
        adHeight: dimensions.height,
        adWidth: dimensions.width,
        unit: nextUnit,
      };
    });
  }, []);

  const handleImageChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      const url = URL.createObjectURL(file);
      setCreative((current) => {
        revokeObjectUrl(current.imageUrl);
        return {
          ...current,
          imageFile: file,
          imageName: file.name,
          imageUrl: url,
        };
      });
    },
    []
  );

  const handleImageRemove = useCallback(() => {
    setCreative((current) => {
      revokeObjectUrl(current.imageUrl);
      return { ...current, imageFile: null, imageName: null, imageUrl: null };
    });
  }, []);

  const handleTemplateChange = useCallback((templateId: string) => {
    const template =
      AD_TEMPLATES.find((t) => t.id === templateId) ?? AD_TEMPLATES[0];
    setCreative((current) => applyAdTemplatePreset(current, template));
  }, []);

  const handleSanityImageSelect = useCallback((image: SanityImageAsset) => {
    setCreative((current) => {
      revokeObjectUrl(current.imageUrl);
      return {
        ...current,
        imageFile: null,
        imageName: image.label,
        imageUrl: image.url,
      };
    });
  }, []);

  const handleSaveVersion = useCallback(async () => {
    if (!auth.token) {
      return;
    }
    setVersionBusy(true);
    setVersionStatus(null);
    try {
      const response = await fetch("/api/ad-versions", {
        body: JSON.stringify({
          config: serializeCreative(creative),

          name: formatVersionName(),
        }),
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`Save failed (${response.status})`);
      }
      setVersionStatus("Version saved.");
      versions.refresh();
    } catch (saveError) {
      setVersionStatus(
        saveError instanceof Error
          ? saveError.message
          : "Could not save version."
      );
    } finally {
      setVersionBusy(false);
    }
  }, [auth.token, creative, versions]);

  const handleSelectVersion = useCallback(
    (id: string) => {
      setSelectedVersionId(id);
      if (!id) {
        return;
      }
      const match = versions.versions.find((version) => version.id === id);
      if (!match) {
        return;
      }
      try {
        setCreative((current) => {
          revokeObjectUrl(current.imageUrl);
          return deserializeCreative(match.config);
        });
        setVersionStatus(`Loaded "${match.name}".`);
      } catch {
        setVersionStatus("Could not load that version.");
      }
    },
    [versions.versions]
  );

  const handleDeleteVersion = useCallback(async () => {
    if (!(auth.token && selectedVersionId)) {
      return;
    }
    setVersionBusy(true);
    setVersionStatus(null);
    try {
      const response = await fetch("/api/ad-versions", {
        body: JSON.stringify({ id: selectedVersionId }),
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
        },
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`Delete failed (${response.status})`);
      }
      setSelectedVersionId("");
      setVersionStatus("Version deleted.");
      versions.refresh();
    } catch (deleteError) {
      setVersionStatus(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete version."
      );
    } finally {
      setVersionBusy(false);
    }
  }, [auth.token, selectedVersionId, versions]);

  const toolbarMenus = (
    <div className="ad-toolbar-menus">
      <ToolbarMenu icon={<Page height={16} width={16} />} label="Format">
        <WaSelect
          appearance="outlined"
          label="Platform"
          name="platform"
          onChange={(event) => handlePlatformChange(getSelectValue(event))}
          size="xs"
          value={creative.platformId}
        >
          {PLATFORM_PRESETS.map((platform) => (
            <WaOption key={platform.id} value={platform.id}>
              {platform.label} ·{" "}
              {formatAdDimensions(
                platform.width,
                platform.height,
                getPlatformUnit(platform)
              )}{" "}
              · {platform.helper}
            </WaOption>
          ))}
        </WaSelect>
        <AdUnitField
          height={creative.adHeight}
          onHeightChange={(adHeight) => updateCreative("adHeight", adHeight)}
          onUnitChange={handleUnitChange}
          onWidthChange={(adWidth) => updateCreative("adWidth", adWidth)}
          unit={creative.unit}
          width={creative.adWidth}
        />
      </ToolbarMenu>

      <ToolbarMenu icon={<MediaImage height={16} width={16} />} label="Design">
        <WaSelect
          appearance="outlined"
          label="Design"
          name="template"
          onChange={(event) => handleTemplateChange(getSelectValue(event))}
          size="xs"
          value={creative.templateId}
        >
          {AD_TEMPLATES.map((template) => (
            <WaOption key={template.id} value={template.id}>
              {template.label} · {template.helper}
            </WaOption>
          ))}
        </WaSelect>
        {selectedTemplate.thumbnail ? (
          // biome-ignore lint/correctness/useImageSize: dynamic size controlled by CSS
          <img
            alt=""
            className="ad-dashboard-template-preview"
            src={selectedTemplate.thumbnail}
          />
        ) : null}
        <WaSelect
          appearance="outlined"
          label="Font"
          name="fontPreset"
          onChange={(event) =>
            updateCreative(
              "fontPresetId",
              getSelectValue(event) as FontPresetId
            )
          }
          size="xs"
          value={creative.fontPresetId}
        >
          {FONT_PRESETS.map((fontPreset) => (
            <WaOption key={fontPreset.id} value={fontPreset.id}>
              {fontPreset.label}
            </WaOption>
          ))}
        </WaSelect>
        <p className="ad-dashboard-rhythm-hint">
          Picking a new Design or Font reseeds the canvas. Text, sizing, and
          styling all happen directly on the canvas.
        </p>
      </ToolbarMenu>

      <ToolbarMenu icon={<Upload height={16} width={16} />} label="Image">
        <label className="ad-dashboard-upload">
          <input
            accept="image/*"
            id="ad-image-upload"
            name="ad-image-upload"
            onChange={handleImageChange}
            type="file"
          />
          <MediaImage height={22} width={22} />
          <span>
            {creative.imageName ?? "Choose roof, project, or portrait photo"}
          </span>
        </label>
        {creative.imageUrl ? (
          <button
            className="ad-dashboard-remove-image"
            onClick={handleImageRemove}
            type="button"
          >
            <Trash height={16} width={16} />
            Remove current image
          </button>
        ) : null}
      </ToolbarMenu>

      <AdImagePicker
        error={imageLibrary.error}
        images={imageLibrary.images}
        loading={imageLibrary.loading}
        onRefresh={imageLibrary.refresh}
        onSelect={handleSanityImageSelect}
        selectedImageUrl={creative.imageUrl}
      />

      <ToolbarMenu icon={<Palette height={16} width={16} />} label="Brand">
        <WaSwitch
          checked={creative.showLogo}
          onChange={(event) =>
            updateCreative("showLogo", getSwitchChecked(event))
          }
          size="xs"
        >
          Show Birdcreek logo
        </WaSwitch>
        {creative.showLogo ? (
          <WaSelect
            appearance="outlined"
            label="Logo lockup"
            name="logoVariant"
            onChange={(event) =>
              updateCreative(
                "logoVariant",
                getSelectValue(event) as LogoVariant
              )
            }
            size="xs"
            value={creative.logoVariant}
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
              onClick={() =>
                setCreative((current) => ({
                  ...current,
                  backgroundColor: swatch.value,
                  textColor:
                    swatch.value === "#F6F2EA" ? "#092A1D" : current.textColor,
                }))
              }
              style={{ backgroundColor: swatch.value }}
              type="button"
            >
              <span>{swatch.label}</span>
            </button>
          ))}
        </div>

        <p className="ad-toolbar-popover-label">Fine tune</p>
        <div className="ad-dashboard-color-grid">
          <AdColorPickerField
            label="Bg"
            onValueChange={(value) => updateCreative("backgroundColor", value)}
            value={creative.backgroundColor}
          />
          <AdColorPickerField
            label="Accent"
            onValueChange={(value) =>
              setCreative((current) => ({
                ...current,
                accentColor: value,
                headlineAccentColor: value,
              }))
            }
            value={creative.headlineAccentColor}
          />
        </div>
      </ToolbarMenu>

      <ToolbarMenu
        icon={<FloppyDisk height={16} width={16} />}
        label="Versions"
      >
        <WaButton
          appearance="filled"
          loading={versionBusy}
          onClick={() => {
            handleSaveVersion();
          }}
          size="small"
          variant="brand"
        >
          <FloppyDisk height={15} slot="start" width={15} />
          Save version
        </WaButton>

        <WaSelect
          appearance="outlined"
          label="Saved versions"
          name="adVersion"
          onChange={(event) => handleSelectVersion(getSelectValue(event))}
          placeholder={versions.loading ? "Loading…" : "Choose a version"}
          size="xs"
          value={selectedVersionId}
        >
          {versions.versions.map((version) => (
            <WaOption key={version.id} value={version.id}>
              {version.name}
            </WaOption>
          ))}
        </WaSelect>

        <WaButton
          appearance="outlined"
          disabled={!selectedVersionId || versionBusy}
          onClick={() => {
            handleDeleteVersion();
          }}
          size="small"
          variant="danger"
        >
          <Trash height={15} slot="start" width={15} />
          Delete version
        </WaButton>

        {versions.error ? (
          <p className="ad-dashboard-error">{versions.error}</p>
        ) : null}
        {versionStatus ? (
          <p className="ad-toolbar-popover-label">{versionStatus}</p>
        ) : null}
      </ToolbarMenu>
    </div>
  );

  const accountMenu = (
    <ToolbarMenu
      hideLabel
      icon={
        auth.user?.picture ? (
          // biome-ignore lint/correctness/useImageSize: dynamic size controlled by CSS
          <img alt="" className="ad-toolbar-avatar" src={auth.user.picture} />
        ) : (
          <User height={16} width={16} />
        )
      }
      label="Account"
    >
      <div className="ad-dashboard-user">
        {auth.user?.picture ? (
          // biome-ignore lint/correctness/useImageSize: dynamic size controlled by CSS
          <img alt="" src={auth.user.picture} />
        ) : null}
        <div>
          <strong>{auth.user?.name ?? auth.user?.email}</strong>
          <span>{auth.user?.email}</span>
        </div>
        <button onClick={() => auth.signOut()} type="button">
          <LogOut height={15} width={15} />
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
        {auth.token ? null : <AuthPanel auth={auth} />}

        {auth.token ? (
          <AdCanvasEditor
            creative={creative}
            selectedPlatform={selectedPlatform}
            selectedPlatformShape={selectedPlatformShape}
            toolbarEnd={accountMenu}
            toolbarStart={toolbarMenus}
          />
        ) : null}
      </div>
    </SitePageChrome>
  );
};
