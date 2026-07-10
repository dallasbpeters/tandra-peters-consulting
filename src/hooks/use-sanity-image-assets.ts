import { SANITY_IMAGE_LIBRARY_QUERY } from "../sanity/queries";
import { useSanityQuery } from "./use-sanity-query";

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

const toImageAssets = (
  result: SanityImageAssetResult[] | null
): SanityImageAsset[] =>
  (result ?? []).map(toImageAsset).filter((asset) => asset !== null);

export const useSanityImageAssets = () => {
  const { data, error, loading, refetch } = useSanityQuery<
    SanityImageAssetResult[] | null,
    SanityImageAsset[]
  >({
    presentationRefresh: false,
    query: SANITY_IMAGE_LIBRARY_QUERY,
    transform: toImageAssets,
  });

  return {
    error: error ? error.message : null,
    images: data ?? [],
    loading,
    refresh: refetch,
  };
};
