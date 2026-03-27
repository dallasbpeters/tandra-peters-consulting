import { useCallback, useEffect, useState } from "react";
import { stegaClean } from "@sanity/client/stega";
import { getSanityClient, isSanityStegaUiActive } from "../sanity/client";
import { POST_BY_SLUG_QUERY } from "../sanity/queries";
import { SANITY_PRESENTATION_REFRESH_EVENT } from "../sanity/presentationEvents";
import type { PostDetail } from "../types/article";

export const useSanityPostBySlug = (slug: string | undefined) => {
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(slug));
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!slug?.trim()) {
      setPost(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const client = getSanityClient();
      const raw = await client.fetch<PostDetail | null>(POST_BY_SLUG_QUERY, {
        slug: slug.trim(),
      });
      if (!raw) {
        setPost(null);
        setError(null);
        return;
      }
      setPost(isSanityStegaUiActive() ? raw : (stegaClean(raw) as PostDetail));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setPost(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    const onPresentationRefresh = () => {
      void refetch();
    };

    window.addEventListener(
      SANITY_PRESENTATION_REFRESH_EVENT,
      onPresentationRefresh,
    );
    return () => {
      window.removeEventListener(
        SANITY_PRESENTATION_REFRESH_EVENT,
        onPresentationRefresh,
      );
    };
  }, [refetch]);

  return { post, loading, error, refetch };
};
