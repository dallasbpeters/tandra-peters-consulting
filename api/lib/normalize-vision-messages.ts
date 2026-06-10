import type { ModelMessage, UserModelMessage } from "ai";

type DecodedImage = {
  data: Uint8Array;
  mediaType?: string;
};

const decodeDataUrl = (value: string): DecodedImage | null => {
  if (!value.startsWith("data:")) {
    return null;
  }

  const [meta = "", payload = ""] = value.slice(5).split(",", 2);
  const mediaType = meta.split(";")[0] || undefined;
  const data = meta.includes(";base64")
    ? Uint8Array.from(Buffer.from(payload, "base64"))
    : new TextEncoder().encode(decodeURIComponent(payload));

  return { data, mediaType };
};

const normalizeImagePart = (part: { type: string; image?: unknown; mediaType?: string }) => {
  if (part.type !== "image" || part.image == null) {
    return part;
  }

  const image = part.image;
  if (image instanceof URL) {
    if (image.protocol !== "data:") {
      return part;
    }

    const decoded = decodeDataUrl(image.href);
    if (!decoded) {
      return part;
    }

    return {
      ...part,
      image: decoded.data,
      mediaType: part.mediaType ?? decoded.mediaType,
    };
  }

  if (typeof image === "string" && image.startsWith("data:")) {
    const decoded = decodeDataUrl(image);
    if (!decoded) {
      return part;
    }

    return {
      ...part,
      image: decoded.data,
      mediaType: part.mediaType ?? decoded.mediaType,
    };
  }

  return part;
};

const normalizeUserContent = (
  content: UserModelMessage["content"],
): UserModelMessage["content"] => {
  if (typeof content === "string") {
    return content;
  }

  return content.map((part) =>
    normalizeImagePart(part as { type: string; image?: unknown; mediaType?: string }),
  ) as UserModelMessage["content"];
};

/** Groq vision rejects `data:` URL strings — decode to Uint8Array before generateText. */
export const normalizeVisionMessages = (messages: ModelMessage[]): ModelMessage[] =>
  messages.map((message) => {
    if (message.role !== "user") {
      return message;
    }

    return {
      ...message,
      content: normalizeUserContent(message.content),
    };
  });
