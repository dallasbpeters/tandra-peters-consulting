import type { WorkflowPageDoc } from "../sanity/map-sanity-workflow";
import { WORKFLOW_PAGE_QUERY } from "../sanity/queries";
import { useSanityQuery } from "./use-sanity-query";

export const useSanityWorkflowPage = () => {
  const { data, error, loading, refetch } =
    useSanityQuery<WorkflowPageDoc | null>({ query: WORKFLOW_PAGE_QUERY });
  return { error, loading, page: data ?? null, refetch };
};
