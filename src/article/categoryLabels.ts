import type { PostCategory } from "../types/article";

export const postCategoryLabel = (
  category: PostCategory | string | undefined,
): string => {
  const labels: Record<string, string> = {
    "roof-replacement": "Roof replacement",
    "insurance-claims": "Insurance & claims",
    inspections: "Inspections",
    maintenance: "Maintenance",
    "texas-homeowners": "Texas homeowners",
  };
  if (!category) {
    return "Article";
  }
  return labels[category] ?? category;
};
