import { useEffect, useState } from "react";

import { getSanityClient } from "../sanity/client";
import { SANITY_IMAGE_LIBRARY_QUERY } from "../sanity/queries";

export interface SanityImageAsset {
  createdAt?: string;
  height?: number;
  id: string;
  label: string;
  lqip?: string;
  url: string;
  width?: number;
}

interface SanityImageAssetResult {
  _createdAt?: string;
  _id?: string;
  altText?: string;
  metadata?: {
    lqip?: string;
    dimensions?: {
      width?: number;
      height?: number;
    };
  };
  originalFilename?: string;
  title?: string;
  url?: string;
}

const toImageAsset = (
  asset: SanityImageAssetResult
): SanityImageAsset | null => {
  if (!(asset._id && asset.url)) {
    return null;
  }

  return {
    createdAt: asset._createdAt,
    height: asset.metadata?.dimensions?.height,
    id: asset._id,
    label:
      asset.title?.trim() ||
      asset.altText?.trim() ||
      asset.originalFilename?.trim() ||
      "Sanity image",
    lqip: asset.metadata?.lqip,
    url: asset.url,
    width: asset.metadata?.dimensions?.width,
  };
};

export const useSanityImageAssets = () => {
  const [images, setImages] = useState<SanityImageAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadImages = async () => {
      setLoading(true);
      setError(null);

      try {
        const client = getSanityClient();
        const result = await client.fetch<SanityImageAssetResult[]>(
          SANITY_IMAGE_LIBRARY_QUERY
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
              : "Could not load Sanity images."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadImages();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    error,
    images,
    loading,
    refresh: () => setReloadKey((current) => current + 1),
  };
};
