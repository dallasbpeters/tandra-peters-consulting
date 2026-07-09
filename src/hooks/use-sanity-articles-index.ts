import { ARTICLES_INDEX_QUERY } from "../sanity/queries";
import type { ArticlesPageDoc, PostListItem } from "../types/article";
import { useSanityQuery } from "./use-sanity-query";

interface ArticlesIndexPayload {
  page: ArticlesPageDoc | null;
  posts: PostListItem[];
}

export const useSanityArticlesIndex = () => {
  const { data, error, loading, refetch } =
    useSanityQuery<ArticlesIndexPayload | null>({
      presentationRefresh: false,
      query: ARTICLES_INDEX_QUERY,
    });

  return {
    error,
    loading,
    page: data?.page ?? null,
    posts: data?.posts ?? [],
    refetch,
  };
};
