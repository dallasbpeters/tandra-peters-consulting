import type { PostCategory } from "../types/article";

export const postCategoryLabel = (
  category: PostCategory | string | undefined
): string => {
  const labels: Record<string, string> = {
    inspections: "Inspections",
    "insurance-claims": "Insurance & claims",
    maintenance: "Maintenance",
    "roof-replacement": "Roof replacement",
    "texas-homeowners": "Texas homeowners",
  };
  if (!category) {
    return "Article";
  }
  return labels[category] ?? category;
};
