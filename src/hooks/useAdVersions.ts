import { useEffect, useState } from "react";

import { getSanityClient } from "../sanity/client";
import { AD_CREATIVE_VERSIONS_QUERY } from "../sanity/queries";

export type AdCreativeVersion = {
  id: string;
  name: string;
  savedAt?: string;
  config: string;
};

type AdCreativeVersionResult = {
  _id?: string;
  name?: string;
  savedAt?: string;
  config?: string;
};

const toVersion = (doc: AdCreativeVersionResult): AdCreativeVersion | null => {
  if (!doc._id || !doc.name || !doc.config) {
    return null;
  }
  return {
    id: doc._id,
    name: doc.name,
    savedAt: doc.savedAt,
    config: doc.config,
  };
};

export const useAdVersions = () => {
  const [versions, setVersions] = useState<AdCreativeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const client = getSanityClient();
        const result = await client.fetch<AdCreativeVersionResult[]>(AD_CREATIVE_VERSIONS_QUERY);
        if (cancelled) {
          return;
        }
        setVersions(result.map(toVersion).filter(Boolean) as AdCreativeVersion[]);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load ad versions.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return {
    error,
    versions,
    loading,
    refresh: () => setReloadKey((current) => current + 1),
  };
};
