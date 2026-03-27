import { useCallback, useEffect, useState } from "react";
import { stegaClean } from "@sanity/client/stega";
import { getSanityClient, isSanityStegaUiActive } from "../sanity/client";
import { ARTICLES_INDEX_QUERY } from "../sanity/queries";
import type { ArticlesPageDoc, PostListItem } from "../types/article";

type ArticlesIndexPayload = {
  page: ArticlesPageDoc | null;
  posts: PostListItem[];
};

export const useSanityArticlesIndex = () => {
  const [page, setPage] = useState<ArticlesPageDoc | null>(null);
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    try {
      const client = getSanityClient();
      const raw =
        await client.fetch<ArticlesIndexPayload>(ARTICLES_INDEX_QUERY);
      const result =
        raw && !isSanityStegaUiActive()
          ? (stegaClean(raw) as ArticlesIndexPayload)
          : raw;
      setPage(result?.page ?? null);
      setPosts(result?.posts ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { page, posts, loading, error, refetch };
};
