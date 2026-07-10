import { POST_BY_SLUG_QUERY } from "../sanity/queries";
import type { PostDetail } from "../types/article";
import { useSanityQuery } from "./use-sanity-query";

export const useSanityPostBySlug = (slug: string | undefined) => {
  const trimmed = slug?.trim();
  const { data, error, loading, refetch } = useSanityQuery<PostDetail | null>({
    enabled: Boolean(trimmed),
    params: trimmed ? { slug: trimmed } : undefined,
    query: POST_BY_SLUG_QUERY,
    resetDataOnError: true,
    showLoadingOnRefetch: true,
  });

  return { error, loading, post: data ?? null, refetch };
};
