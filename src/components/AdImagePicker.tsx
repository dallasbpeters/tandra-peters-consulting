import type WaPopoverElement from "@awesome.me/webawesome/dist/components/popover/popover.js";

import WaInput from "@awesome.me/webawesome/dist/react/input/index.js";
import WaPopover from "@awesome.me/webawesome/dist/react/popover/index.js";
import WaSwitch from "@awesome.me/webawesome/dist/react/switch/index.js";
import { MediaImage, RefreshDouble } from "iconoir-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import type { SanityImageAsset } from "../hooks/useSanityImageAssets";

import { useUnsplashImageSearch } from "../hooks/useUnsplashImageSearch";

type ImageSource = "sanity" | "unsplash";

type AdImagePickerProps = {
  images: SanityImageAsset[];
  loading: boolean;
  error: string | null;
  selectedImageUrl: string | null;
  onRefresh: () => void;
  onSelect: (image: SanityImageAsset) => void;
};

const thumbnailUrl = (url: string) => {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}w=240&h=160&fit=crop&auto=format`;
};

const previewUrl = (url: string) => {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}w=1200&h=840&fit=max&auto=format`;
};

const imageMeta = (image: SanityImageAsset) => {
  if (!image.width || !image.height) {
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
  const [imageSource, setImageSource] = useState<ImageSource>("sanity");
  const unsplash = useUnsplashImageSearch(imageSource === "unsplash");
  const currentImages = imageSource === "sanity" ? images : unsplash.images;
  const currentLoading = imageSource === "sanity" ? loading : unsplash.loading;
  const currentError = imageSource === "sanity" ? error : unsplash.error;
  const currentRefresh = imageSource === "sanity" ? onRefresh : unsplash.refresh;
  const selectedImage = useMemo(
    () => currentImages.find((image) => image.url === selectedImageUrl) ?? null,
    [currentImages, selectedImageUrl],
  );
  const [activeImageId, setActiveImageId] = useState<string | null>(null);

  const activeImage = useMemo(
    () =>
      currentImages.find((image) => image.id === activeImageId) ??
      selectedImage ??
      currentImages[0] ??
      null,
    [activeImageId, currentImages, selectedImage],
  );

  useEffect(() => {
    setActiveImageId(selectedImage?.id ?? currentImages[0]?.id ?? null);
  }, [currentImages, selectedImage]);

  const handleUseImage = () => {
    if (!activeImage) {
      return;
    }

    onSelect(activeImage);
    void popoverRef.current?.hide?.();
  };

  return (
    <div className="ad-image-picker">
      <button id={triggerId} type="button" className="ad-image-picker__trigger">
        {selectedImage ? (
          <img src={thumbnailUrl(selectedImage.url)} alt="" />
        ) : (
          <span className="ad-image-picker__trigger-icon">
            <MediaImage width={20} height={20} />
          </span>
        )}
        <span>
          <strong>
            {selectedImage?.label ??
              (imageSource === "sanity" ? "Choose from Sanity" : "Search Unsplash")}
          </strong>
          <small>
            {currentLoading
              ? "Loading image library..."
              : imageSource === "sanity"
                ? `${currentImages.length} CMS images`
                : `${currentImages.length} Unsplash results`}
          </small>
        </span>
      </button>

      <WaPopover
        ref={popoverRef}
        className="ad-image-picker__popover"
        for={triggerId}
        placement="left-start"
        distance={12}
        withoutArrow
      >
        <div className="ad-image-picker__surface">
          <div className="ad-image-picker__topbar">
            <div>
              <strong>
                {imageSource === "sanity" ? "Sanity image library" : "Unsplash search"}
              </strong>
              <span>
                {currentLoading
                  ? "Loading images..."
                  : imageSource === "sanity"
                    ? `${currentImages.length} photos from the CMS`
                    : `${currentImages.length} photos for "${unsplash.query}"`}
              </span>
            </div>
            <WaSwitch
              className="ad-image-picker__source-toggle"
              checked={imageSource === "unsplash"}
              size="s"
              onChange={(event) => setImageSource(getSwitchChecked(event) ? "unsplash" : "sanity")}
            >
              Search Unsplash
            </WaSwitch>
            <button type="button" onClick={currentRefresh} disabled={currentLoading}>
              <RefreshDouble width={15} height={15} />
              Refresh
            </button>
          </div>

          {imageSource === "unsplash" ? (
            <WaInput
              className="ad-image-picker__search"
              label="Unsplash search"
              value={unsplash.query}
              appearance="outlined"
              size="s"
              withClear
              onInput={(event) => unsplash.setQuery(getInputValue(event))}
            />
          ) : null}

          {currentError ? <p className="ad-dashboard-error">{currentError}</p> : null}

          {!currentLoading && !currentError && currentImages.length === 0 ? (
            <p className="ad-image-picker__empty">
              {imageSource === "sanity" ? "No Sanity images found." : "No Unsplash photos found."}
            </p>
          ) : null}

          {activeImage ? (
            <div className="ad-image-picker__browser">
              <section className="ad-image-picker__preview">
                <img
                  src={previewUrl(activeImage.url)}
                  alt=""
                  style={
                    activeImage.lqip ? { backgroundImage: `url(${activeImage.lqip})` } : undefined
                  }
                />
                <div>
                  <strong>{activeImage.label}</strong>
                  <span>
                    {imageAttribution(activeImage)
                      ? `${imageMeta(activeImage)} · ${imageAttribution(activeImage)}`
                      : imageMeta(activeImage)}
                  </span>
                  <button type="button" onClick={handleUseImage}>
                    Use this photo
                  </button>
                </div>
              </section>

              <div className="ad-image-picker__grid">
                {currentImages.map((image) => (
                  <button
                    key={image.id}
                    type="button"
                    className={image.id === activeImage.id ? "is-selected" : undefined}
                    onClick={() => setActiveImageId(image.id)}
                    title={`${image.label} (${imageMeta(image)})`}
                  >
                    <img
                      src={thumbnailUrl(image.url)}
                      alt=""
                      loading="lazy"
                      style={image.lqip ? { backgroundImage: `url(${image.lqip})` } : undefined}
                    />
                    <span>
                      <strong>{image.label}</strong>
                      <small>
                        {imageAttribution(image) ? imageAttribution(image) : imageMeta(image)}
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
