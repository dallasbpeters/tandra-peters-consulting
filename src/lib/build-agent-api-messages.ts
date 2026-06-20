import type { FileUIPart, ModelMessage, UserModelMessage } from "ai";

export interface StoredChatImage {
  filename?: string;
  mediaType?: string;
  url: string;
}

interface UserMessageInput {
  content: string;
  images?: StoredChatImage[];
  role: "user";
}

interface AssistantMessageInput {
  content: string;
  role: "assistant";
}

export type ChatMessageForApi = UserMessageInput | AssistantMessageInput;

const isImageFile = (file: FileUIPart): boolean =>
  Boolean(
    file.mediaType?.startsWith("image/") || file.url.startsWith("data:image/")
  );

export const filePartsToImages = (files: FileUIPart[]): StoredChatImage[] =>
  files.filter(isImageFile).map((file) => ({
    filename: file.filename,
    mediaType: file.mediaType,
    url: file.url,
  }));

const buildUserContent = (
  text: string,
  images: StoredChatImage[]
): UserModelMessage["content"] => {
  const trimmed = text.trim();
  const imageParts = images.map((image) => ({
    image: image.url,
    type: "image" as const,
  }));

  if (imageParts.length === 0) {
    return trimmed;
  }

  const parts: (
    | { type: "text"; text: string }
    | { type: "image"; image: string }
  )[] = [];

  parts.push({
    text:
      trimmed ||
      "Screenshot of a Nextdoor conversation. Read the post and comments in the image, then draft an on-brand reply for Tandra.",
    type: "text",
  });
  parts.push(...imageParts);

  return parts;
};

export const buildApiMessages = (
  messages: ChatMessageForApi[]
): ModelMessage[] =>
  messages.map((message): ModelMessage => {
    if (message.role === "assistant") {
      return { content: message.content, role: "assistant" };
    }

    return {
      content: buildUserContent(message.content, message.images ?? []),
      role: "user",
    };
  });
