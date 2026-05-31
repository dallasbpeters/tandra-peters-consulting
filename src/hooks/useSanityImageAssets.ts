import { useEffect, useState } from "react";
import { getSanityClient } from "../sanity/client";
import { SANITY_IMAGE_LIBRARY_QUERY } from "../sanity/queries";

export type SanityImageAsset = {
  id: string;
  url: string;
  label: string;
  width?: number;
  height?: number;
  lqip?: string;
  createdAt?: string;
};

type SanityImageAssetResult = {
  _id?: string;
  _createdAt?: string;
  originalFilename?: string;
  title?: string;
  altText?: string;
  url?: string;
  metadata?: {
    lqip?: string;
    dimensions?: {
      width?: number;
      height?: number;
    };
  };
};

const toImageAsset = (
  asset: SanityImageAssetResult,
): SanityImageAsset | null => {
  if (!asset._id || !asset.url) {
    return null;
  }

  return {
    id: asset._id,
    url: asset.url,
    label:
      asset.title?.trim() ||
      asset.altText?.trim() ||
      asset.originalFilename?.trim() ||
      "Sanity image",
    width: asset.metadata?.dimensions?.width,
    height: asset.metadata?.dimensions?.height,
    lqip: asset.metadata?.lqip,
    createdAt: asset._createdAt,
  };
};

export const useSanityImageAssets = () => {
  const [images, setImages] = useState<SanityImageAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadImages = async () => {
      setLoading(true);
      setError(null);

      try {
        const client = getSanityClient();
        const result = await client.fetch<SanityImageAssetResult[]>(
          SANITY_IMAGE_LIBRARY_QUERY,
        );
        if (cancelled) {
          return;
        }

        setImages(result.map(toImageAsset).filter(Boolean));
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load Sanity images.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadImages();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return {
    error,
    images,
    loading,
    refresh: () => setReloadKey((current) => current + 1),
  };
};
