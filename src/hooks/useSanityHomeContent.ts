import { useCallback, useEffect, useState } from "react";
import { getSanityClient } from "../sanity/client";
import { HOME_AND_SITE_QUERY } from "../sanity/queries";

export type HomeDocuments = {
  home: Record<string, unknown> | null;
  site: Record<string, unknown> | null;
};

export const useSanityHomeContent = () => {
  const [data, setData] = useState<HomeDocuments | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    try {
      const client = getSanityClient();
      const result = await client.fetch<HomeDocuments>(HOME_AND_SITE_QUERY);
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const client = getSanityClient();
        const result = await client.fetch<HomeDocuments>(HOME_AND_SITE_QUERY);
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error, refetch };
};
