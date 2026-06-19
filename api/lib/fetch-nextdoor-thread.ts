const NEXTDOOR_HOST_RE = /^https?:\/\/(?:[a-z0-9-]+\.)?nextdoor\.com\//i;
const LOGIN_WALL_RE =
  /sign\s*in|log\s*in|join\s+nextdoor|create\s+(?:a\s+)?(?:free\s+)?account|verify\s+your\s+address/i;
const NEXT_DATA_SCRIPT_RE =
  /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i;

export interface FetchNextdoorResult {
  body?: string;
  comments?: string[];
  message?: string;
  status: "success" | "login_required" | "not_found" | "error";
  title?: string;
  url: string;
}

const normalizeUrl = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("url is required");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("url must be a valid absolute URL");
  }

  if (!NEXTDOOR_HOST_RE.test(parsed.href)) {
    throw new Error("url must be a nextdoor.com link");
  }

  return parsed.href;
};

const decodeHtml = (value: string): string =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const readMetaContent = (
  html: string,
  property: string
): string | undefined => {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );
  const match = html.match(re);
  return match?.[1] ? decodeHtml(match[1]) : undefined;
};

const stripHtml = (html: string): string =>
  decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );

const collectStrings = (
  value: unknown,
  keys: Set<string>,
  out: string[]
): void => {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectStrings(item, keys, out);
    }
    return;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (
      keys.has(key) &&
      typeof nested === "string" &&
      nested.trim().length > 20
    ) {
      out.push(nested.trim());
    }
    collectStrings(nested, keys, out);
  }
};

const extractFromNextData = (
  html: string
): { title?: string; body?: string; comments: string[] } => {
  const match = html.match(NEXT_DATA_SCRIPT_RE);
  if (!match?.[1]) {
    return { comments: [] };
  }

  try {
    const data = JSON.parse(match[1]) as unknown;
    const bodies: string[] = [];
    const titles: string[] = [];
    const comments: string[] = [];

    collectStrings(
      data,
      new Set([
        "body",
        "text",
        "message",
        "content",
        "postText",
        "subject",
        "title",
      ]),
      bodies
    );
    collectStrings(data, new Set(["title", "subject"]), titles);
    collectStrings(
      data,
      new Set(["commentBody", "commentText", "replyText"]),
      comments
    );

    const uniqueBodies = [...new Set(bodies)].sort(
      (a, b) => b.length - a.length
    );
    const uniqueComments = [...new Set(comments)].filter(
      (comment) => !uniqueBodies[0]?.includes(comment)
    );

    return {
      title: titles[0],
      body: uniqueBodies[0],
      comments: uniqueComments.slice(0, 12),
    };
  } catch {
    return { comments: [] };
  }
};

const looksLikeLoginWall = (html: string, title?: string): boolean => {
  const sample = `${title ?? ""}\n${stripHtml(html).slice(0, 4000)}`;
  return LOGIN_WALL_RE.test(sample);
};

const fetchHtml = (url: string, cookie?: string): Promise<Response> => {
  const headers: Record<string, string> = {
    Accept: "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
  };

  if (cookie?.trim()) {
    headers.Cookie = cookie.trim();
  }

  return fetch(url, { headers, redirect: "follow" });
};

const fetchViaJinaReader = async (
  url: string,
  apiKey?: string
): Promise<string | null> => {
  const readerUrl = `https://r.jina.ai/${url}`;
  const headers: Record<string, string> = {
    Accept: "text/plain",
  };

  if (apiKey?.trim()) {
    headers.Authorization = `Bearer ${apiKey.trim()}`;
  }

  const response = await fetch(readerUrl, { headers });
  if (!response.ok) {
    return null;
  }

  const text = (await response.text()).trim();
  return text.length > 0 ? text : null;
};

const formatResult = (result: FetchNextdoorResult): string => {
  const lines = [`URL: ${result.url}`, `Status: ${result.status}`];

  if (result.message) {
    lines.push(`Message: ${result.message}`);
  }
  if (result.title) {
    lines.push("", `Title: ${result.title}`);
  }
  if (result.body) {
    lines.push("", "Post body:", result.body);
  }
  if (result.comments?.length) {
    lines.push("", "Comments:");
    for (const [index, comment] of result.comments.entries()) {
      lines.push(`${index + 1}. ${comment}`);
    }
  }

  return lines.join("\n");
};

export const fetchNextdoorThread = async (
  rawUrl: string,
  options?: { cookie?: string; jinaApiKey?: string }
): Promise<string> => {
  const url = normalizeUrl(rawUrl);

  try {
    const jinaText = await fetchViaJinaReader(url, options?.jinaApiKey);
    if (jinaText && !LOGIN_WALL_RE.test(jinaText.slice(0, 2000))) {
      return formatResult({
        url,
        status: "success",
        body: jinaText,
        message: "Fetched via reader proxy.",
      });
    }

    const response = await fetchHtml(url, options?.cookie);
    if (response.status === 404) {
      return formatResult({
        url,
        status: "not_found",
        message: "Nextdoor returned 404 for this link.",
      });
    }

    if (!response.ok) {
      return formatResult({
        url,
        status: "error",
        message: `Nextdoor returned HTTP ${response.status}.`,
      });
    }

    const html = await response.text();
    const title =
      readMetaContent(html, "og:title") ??
      readMetaContent(html, "twitter:title");
    const description =
      readMetaContent(html, "og:description") ??
      readMetaContent(html, "description");
    const nextData = extractFromNextData(html);

    if (looksLikeLoginWall(html, title) && !nextData.body && !description) {
      return formatResult({
        url,
        status: "login_required",
        message:
          "This post requires a signed-in Nextdoor session. If the user did not attach a screenshot or paste the thread, ask them to attach a screenshot (tap + in the chat) or paste the post and comments.",
      });
    }

    const body = nextData.body ?? description ?? stripHtml(html).slice(0, 6000);
    if (!body || body.length < 40) {
      return formatResult({
        url,
        status: "login_required",
        title,
        message:
          "Could not extract readable post text from the page. The thread may be private or require sign-in.",
      });
    }

    return formatResult({
      url,
      status: "success",
      title: nextData.title ?? title,
      body,
      comments: nextData.comments,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return formatResult({
      url,
      status: "error",
      message,
    });
  }
};

export const NEXTDOOR_FETCH_TOOL = {
  name: "fetch_nextdoor_post",
  description:
    "Fetch the text of a Nextdoor post or comment thread from a nextdoor.com URL. Call this when the user shares a Nextdoor link before drafting a reply. Returns post body and any comments found, or a login_required status if the page is not publicly readable.",
  inputSchema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "Full nextdoor.com URL for the post or thread",
      },
    },
    required: ["url"],
    additionalProperties: false,
  },
} as const;
