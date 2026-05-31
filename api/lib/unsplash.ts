import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const UNSPLASH_SEARCH_URL = "https://api.unsplash.com/search/photos";
const DEFAULT_PER_PAGE = 30;

type EnvLike = Record<string, string | undefined>;

type UnsplashPhoto = {
  id?: string;
  alt_description?: string | null;
  description?: string | null;
  width?: number;
  height?: number;
  updated_at?: string;
  urls?: {
    regular?: string;
    small?: string;
    thumb?: string;
  };
  user?: {
    name?: string;
    links?: {
      html?: string;
    };
  };
  links?: {
    download_location?: string;
  };
};

type UnsplashSearchResponse = {
  results?: UnsplashPhoto[];
};

export type UnsplashImageAsset = {
  id: string;
  url: string;
  label: string;
  width?: number;
  height?: number;
  createdAt?: string;
  attribution?: string;
  authorName?: string;
  authorUrl?: string;
  downloadLocation?: string;
};

const parseEnvFile = (contents: string): EnvLike =>
  contents.split(/\r?\n/).reduce<EnvLike>((env, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return env;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      return env;
    }

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    env[key] = rawValue.replace(/^["']|["']$/g, "");
    return env;
  }, {});

const readLocalAustinLeadsUnsplashKey = (): string | undefined => {
  try {
    const envPath = resolve(
      process.cwd(),
      "../austin-leads-platform/.env.development.local",
    );
    return parseEnvFile(readFileSync(envPath, "utf8")).UNSPLASH_ACCESS_KEY;
  } catch {
    return undefined;
  }
};

export const readUnsplashAccessKey = (env: EnvLike = process.env): string =>
  env.UNSPLASH_ACCESS_KEY?.trim() ||
  env.VITE_UNSPLASH_ACCESS_KEY?.trim() ||
  readLocalAustinLeadsUnsplashKey()?.trim() ||
  "";

const toImageAsset = (photo: UnsplashPhoto): UnsplashImageAsset | null => {
  const url = photo.urls?.regular;
  if (!photo.id || !url) {
    return null;
  }

  const authorName = photo.user?.name?.trim();
  const label =
    photo.alt_description?.trim() ||
    photo.description?.trim() ||
    (authorName ? `Photo by ${authorName}` : "Unsplash photo");

  return {
    id: `unsplash:${photo.id}`,
    url,
    label,
    width: photo.width,
    height: photo.height,
    createdAt: photo.updated_at,
    attribution: authorName ? `Photo by ${authorName}` : undefined,
    authorName,
    authorUrl: photo.user?.links?.html,
    downloadLocation: photo.links?.download_location,
  };
};

export const searchUnsplashImages = async ({
  accessKey,
  query,
  page = 1,
}: {
  accessKey: string;
  query: string;
  page?: number;
}): Promise<UnsplashImageAsset[]> => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const url = new URL(UNSPLASH_SEARCH_URL);
  url.searchParams.set("query", trimmedQuery);
  url.searchParams.set("per_page", String(DEFAULT_PER_PAGE));
  url.searchParams.set("page", String(Math.max(1, page)));
  url.searchParams.set("content_filter", "high");

  const response = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      "Accept-Version": "v1",
    },
  });

  if (!response.ok) {
    throw new Error(`Unsplash search failed with ${response.status}.`);
  }

  const payload = (await response.json()) as UnsplashSearchResponse;
  return (payload.results ?? []).map(toImageAsset).filter(Boolean);
};

export const parseAllowedUnsplashImageUrl = (
  raw: string | undefined | null,
): URL | null => {
  if (!raw) {
    return null;
  }

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") {
      return null;
    }

    if (
      url.hostname !== "images.unsplash.com" &&
      url.hostname !== "plus.unsplash.com"
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
};
