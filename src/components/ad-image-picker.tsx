import type WaPopoverElement from "@awesome.me/webawesome/dist/components/popover/popover.js";
import WaButton from "@awesome.me/webawesome/dist/react/button/index.js";
import WaIcon from "@awesome.me/webawesome/dist/react/icon/index.js";
import WaInput from "@awesome.me/webawesome/dist/react/input/index.js";
import WaPopover from "@awesome.me/webawesome/dist/react/popover/index.js";
import WaSwitch from "@awesome.me/webawesome/dist/react/switch/index.js";
import { MediaImage, RefreshDouble } from "iconoir-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import type { SanityImageAsset } from "../hooks/use-sanity-image-assets";
import { useUnsplashImageSearch } from "../hooks/use-unsplash-image-search";
import { sanityImageUrl } from "../sanity/image-url";

import "../styles/ad-image-picker.css";

type ImageSource = "sanity" | "unsplash";

interface AdImagePickerProps {
  error: string | null;
  images: SanityImageAsset[];
  loading: boolean;
  onRefresh: () => void;
  onSelect: (image: SanityImageAsset) => void;
  selectedImageUrl: string | null;
}

const thumbnailUrl = (url: string) =>
  sanityImageUrl(url, { fit: "crop", h: 160, w: 240 });

const previewUrl = (url: string) =>
  sanityImageUrl(url, { fit: "max", h: 840, w: 1200 });

const imageMeta = (image: SanityImageAsset) => {
  if (!(image.width && image.height)) {
    return "Image";
  }

  return `${image.width} x ${image.height}`;
};

const imageAttribution = (image: SanityImageAsset): string | undefined => {
  const value = (image as { attribution?: unknown }).attribution;
  return typeof value === "string" && value.trim() ? value : undefined;
};

const getInputValue = (event: unknown): string =>
  (event as { target: { value: string } }).target.value;

const getSwitchChecked = (event: unknown): boolean =>
  Boolean((event as { target: { checked: boolean } }).target.checked);

export const AdImagePicker = ({
  images,
  loading,
  error,
  selectedImageUrl,
  onRefresh,
  onSelect,
}: AdImagePickerProps) => {
  const triggerId = useId().replaceAll(":", "-");
  const popoverRef = useRef<WaPopoverElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [imageSource, setImageSource] = useState<ImageSource>("sanity");
  const unsplash = useUnsplashImageSearch(imageSource === "unsplash");
  const currentImages = imageSource === "sanity" ? images : unsplash.images;
  const currentLoading = imageSource === "sanity" ? loading : unsplash.loading;
  const currentError = imageSource === "sanity" ? error : unsplash.error;
  const currentRefresh =
    imageSource === "sanity" ? onRefresh : unsplash.refresh;
  const selectedImage = useMemo(
    () => currentImages.find((image) => image.url === selectedImageUrl) ?? null,
    [currentImages, selectedImageUrl]
  );
  const [activeImageId, setActiveImageId] = useState<string | null>(null);

  const activeImage = useMemo(
    () =>
      currentImages.find((image) => image.id === activeImageId) ??
      selectedImage ??
      currentImages[0] ??
      null,
    [activeImageId, currentImages, selectedImage]
  );

  useEffect(() => {
    setActiveImageId(selectedImage?.id ?? currentImages[0]?.id ?? null);
  }, [currentImages, selectedImage]);

  // When the popover opens near the bottom of the page, scroll it fully into
  // view so the whole panel is reachable.
  useEffect(() => {
    const popover = popoverRef.current;
    if (!popover) {
      return;
    }
    const handleAfterShow = () => {
      requestAnimationFrame(() => {
        const surface = surfaceRef.current;
        if (!surface) {
          return;
        }
        const rect = surface.getBoundingClientRect();
        const margin = 16;
        const overflowBottom = rect.bottom - window.innerHeight + margin;
        if (overflowBottom > 0) {
          window.scrollBy({ behavior: "smooth", top: overflowBottom });
        }
      });
    };
    popover.addEventListener("wa-after-show", handleAfterShow);
    return () => {
      popover.removeEventListener("wa-after-show", handleAfterShow);
    };
  }, []);

  const handleUseImage = () => {
    if (!activeImage) {
      return;
    }

    onSelect(activeImage);
    popoverRef.current?.hide?.();
  };

  const imageCountLabel =
    imageSource === "sanity"
      ? `${currentImages.length} photos from the CMS`
      : `${currentImages.length} photos for "${unsplash.query}"`;

  return (
    <div className="ad-image-picker">
      <WaButton
        appearance="outlined"
        aria-label="Image library"
        className="ad-toolbar-menu-trigger ad-image-picker__trigger"
        id={triggerId}
        title="Image library"
        type="button"
      >
        {selectedImage ? (
          // biome-ignore lint/correctness/useImageSize: dynamic size controlled by CSS
          <img
            slot="start"
            style={{ width: "70px", height: "30px" }}
            alt=""
            src={thumbnailUrl(selectedImage.url)}
          />
        ) : (
          <WaIcon
            slot="start"
            name="image"
            family="iconoir"
            variant="outline"
          />
        )}
        Library
      </WaButton>

      <WaPopover
        className="ad-image-picker__popover"
        distance={10}
        for={triggerId}
        placement="bottom-end"
        ref={popoverRef}
        withoutArrow
      >
        <div className="ad-image-picker__surface" ref={surfaceRef}>
          <div className="ad-image-picker__topbar">
            <div>
              <strong>
                {imageSource === "sanity"
                  ? "Sanity image library"
                  : "Unsplash search"}
              </strong>
              <span>
                {currentLoading ? "Loading images..." : imageCountLabel}
              </span>
            </div>
            <WaSwitch
              checked={imageSource === "unsplash"}
              className="ad-image-picker__source-toggle"
              onChange={(event) =>
                setImageSource(getSwitchChecked(event) ? "unsplash" : "sanity")
              }
              size="s"
            >
              Search Unsplash
            </WaSwitch>
            <WaButton
              appearance="outlined"
              disabled={currentLoading}
              onClick={currentRefresh}
              type="button"
            >
              <WaIcon
                slot="start"
                name="refresh"
                family="ion"
                variant="outline"
              />
              Refresh
            </WaButton>
          </div>

          {imageSource === "unsplash" ? (
            <WaInput
              appearance="outlined"
              className="ad-image-picker__search"
              label="Unsplash search"
              onInput={(event) => unsplash.setQuery(getInputValue(event))}
              size="s"
              value={unsplash.query}
              withClear
            />
          ) : null}

          {currentError ? (
            <p className="ad-dashboard-error">{currentError}</p>
          ) : null}

          {!(currentLoading || currentError) && currentImages.length === 0 ? (
            <p className="ad-image-picker__empty">
              {imageSource === "sanity"
                ? "No Sanity images found."
                : "No Unsplash photos found."}
            </p>
          ) : null}

          {activeImage ? (
            <div className="ad-image-picker__browser">
              <section className="ad-image-picker__preview">
                {/* biome-ignore lint/correctness/useImageSize: dynamic size controlled by CSS */}
                <img
                  alt=""
                  src={previewUrl(activeImage.url)}
                  style={
                    activeImage.lqip
                      ? { backgroundImage: `url(${activeImage.lqip})` }
                      : undefined
                  }
                />
                <div>
                  <strong>{activeImage.label}</strong>
                  <span>
                    {imageAttribution(activeImage)
                      ? `${imageMeta(activeImage)} · ${imageAttribution(activeImage)}`
                      : imageMeta(activeImage)}
                  </span>
                  <WaButton
                    size="s"
                    appearance="filled"
                    onClick={handleUseImage}
                    type="button"
                  >
                    <WaIcon slot="start" name="check" library="iconoir" />
                    Use this photo
                  </WaButton>
                </div>
              </section>

              <div className="ad-image-picker__grid">
                {currentImages.map((image) => (
                  <button
                    className={
                      image.id === activeImage.id ? "is-selected" : undefined
                    }
                    key={image.id}
                    onClick={() => setActiveImageId(image.id)}
                    title={`${image.label} (${imageMeta(image)})`}
                    type="button"
                  >
                    {/* biome-ignore lint/correctness/useImageSize: dynamic size controlled by CSS */}
                    <img
                      alt=""
                      loading="lazy"
                      src={thumbnailUrl(image.url)}
                      style={
                        image.lqip
                          ? { backgroundImage: `url(${image.lqip})` }
                          : undefined
                      }
                    />
                    <span>
                      <strong>{image.label}</strong>
                      <small>
                        {imageAttribution(image)
                          ? imageAttribution(image)
                          : imageMeta(image)}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </WaPopover>
    </div>
  );
};
