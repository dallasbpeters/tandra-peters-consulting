import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { buildSharePageUrl } from "../utils/siteUrl";

type MetaConfig = {
  title: string;
  description: string;
  type?: "website" | "article";
  robots?: string | null;
};

const DEFAULT_TITLE =
  "Tandra Peters | Birdcreek Roofing Consultant | Austin, TX";
const DEFAULT_DESCRIPTION =
  "Birdcreek Roofing consultant in Austin for roof assessments, insurance claim advocacy, and project oversight—one team from consultation through Texas installation.";

const ensureMeta = (
  selector: string,
  attrs: Record<string, string>,
): HTMLMetaElement => {
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  if (existing) {
    return existing;
  }

  const meta = document.createElement("meta");
  Object.entries(attrs).forEach(([key, value]) =>
    meta.setAttribute(key, value),
  );
  document.head.appendChild(meta);
  return meta;
};

const ensureCanonical = (): HTMLLinkElement => {
  const existing = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (existing) {
    return existing;
  }

  const link = document.createElement("link");
  link.setAttribute("rel", "canonical");
  document.head.appendChild(link);
  return link;
};

export const usePageMetadata = ({
  title,
  description,
  type = "website",
  robots = null,
}: MetaConfig) => {
  const location = useLocation();

  useEffect(() => {
    const url = buildSharePageUrl(location.pathname, location.search, "");
    document.title = title;

    ensureMeta('meta[name="description"]', {
      name: "description",
    }).setAttribute("content", description);
    ensureMeta('meta[property="og:title"]', {
      property: "og:title",
    }).setAttribute("content", title);
    ensureMeta('meta[property="og:description"]', {
      property: "og:description",
    }).setAttribute("content", description);
    ensureMeta('meta[property="og:url"]', { property: "og:url" }).setAttribute(
      "content",
      url,
    );
    ensureMeta('meta[property="og:type"]', {
      property: "og:type",
    }).setAttribute("content", type);
    ensureMeta('meta[name="twitter:title"]', {
      name: "twitter:title",
    }).setAttribute("content", title);
    ensureMeta('meta[name="twitter:description"]', {
      name: "twitter:description",
    }).setAttribute("content", description);
    if (robots) {
      ensureMeta('meta[name="robots"]', { name: "robots" }).setAttribute(
        "content",
        robots,
      );
    }
    ensureCanonical().setAttribute("href", url);

    return () => {
      document.title = DEFAULT_TITLE;
      ensureMeta('meta[name="description"]', {
        name: "description",
      }).setAttribute("content", DEFAULT_DESCRIPTION);
      ensureMeta('meta[property="og:title"]', {
        property: "og:title",
      }).setAttribute("content", "Tandra Peters | Austin Roofing Consultant");
      ensureMeta('meta[property="og:description"]', {
        property: "og:description",
      }).setAttribute(
        "content",
        "Roof assessments, insurance claim support, and oversight—paired with Birdcreek Roofing across Austin and Texas.",
      );
      ensureMeta('meta[property="og:url"]', {
        property: "og:url",
      }).setAttribute("content", buildSharePageUrl("/", "", ""));
      ensureMeta('meta[property="og:type"]', {
        property: "og:type",
      }).setAttribute("content", "website");
      ensureMeta('meta[name="twitter:title"]', {
        name: "twitter:title",
      }).setAttribute("content", "Tandra Peters | Austin Roofing Consultant");
      ensureMeta('meta[name="twitter:description"]', {
        name: "twitter:description",
      }).setAttribute(
        "content",
        "Roof assessments, insurance support, and trusted Birdcreek Roofing execution in Texas.",
      );
      if (robots) {
        ensureMeta('meta[name="robots"]', { name: "robots" }).remove();
      }
      ensureCanonical().setAttribute("href", buildSharePageUrl("/", "", ""));
    };
  }, [description, location.pathname, location.search, robots, title, type]);
};
