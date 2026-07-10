import { stegaClean } from "@sanity/client/stega";
import { useEffect, useState } from "react";

import { getSanityClient } from "../sanity/client";
import { AD_CREATIVE_VERSIONS_QUERY } from "../sanity/queries";

export interface AdCreativeVersion {
  config: string;
  id: string;
  name: string;
  savedAt?: string;
  thumbnail?: string;
}

interface AdCreativeVersionResult {
  _id?: string;
  config?: string;
  name?: string;
  savedAt?: string;
  thumbnail?: string;
}

const toVersion = (doc: AdCreativeVersionResult): AdCreativeVersion | null => {
  const id = typeof doc._id === "string" ? stegaClean(doc._id) : "";
  const name = typeof doc.name === "string" ? stegaClean(doc.name) : "";
  const config = typeof doc.config === "string" ? stegaClean(doc.config) : "";
  if (!(id && name && config)) {
    return null;
  }
  return {
    config,
    id,
    name,
    savedAt:
      typeof doc.savedAt === "string" ? stegaClean(doc.savedAt) : undefined,
    thumbnail:
      typeof doc.thumbnail === "string" ? stegaClean(doc.thumbnail) : undefined,
  };
};

export const useAdVersions = () => {
  const [versions, setVersions] = useState<AdCreativeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const requestKey = reloadKey;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const client = getSanityClient();
        const result = await client.fetch<AdCreativeVersionResult[]>(
          AD_CREATIVE_VERSIONS_QUERY
        );
        if (cancelled || requestKey !== reloadKey) {
          return;
        }
        setVersions(
          result.map(toVersion).filter(Boolean) as AdCreativeVersion[]
        );
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load ad versions."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return {
    error,
    loading,
    refresh: () => setReloadKey((current) => current + 1),
    versions,
  };
};
