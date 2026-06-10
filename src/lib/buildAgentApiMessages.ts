import type { FileUIPart, ModelMessage, UserModelMessage } from "ai";

export type StoredChatImage = {
  url: string;
  mediaType?: string;
  filename?: string;
};

type UserMessageInput = {
  role: "user";
  content: string;
  images?: StoredChatImage[];
};

type AssistantMessageInput = {
  role: "assistant";
  content: string;
};

export type ChatMessageForApi = UserMessageInput | AssistantMessageInput;

const isImageFile = (file: FileUIPart): boolean =>
  Boolean(file.mediaType?.startsWith("image/") || file.url.startsWith("data:image/"));

export const filePartsToImages = (files: FileUIPart[]): StoredChatImage[] =>
  files.filter(isImageFile).map((file) => ({
    url: file.url,
    mediaType: file.mediaType,
    filename: file.filename,
  }));

const buildUserContent = (text: string, images: StoredChatImage[]): UserModelMessage["content"] => {
  const trimmed = text.trim();
  const imageParts = images.map((image) => ({
    type: "image" as const,
    image: image.url,
  }));

  if (imageParts.length === 0) {
    return trimmed;
  }

  const parts: Array<{ type: "text"; text: string } | { type: "image"; image: string }> = [];

  parts.push({
    type: "text",
    text:
      trimmed ||
      "Screenshot of a Nextdoor conversation. Read the post and comments in the image, then draft an on-brand reply for Tandra.",
  });
  parts.push(...imageParts);

  return parts;
};

export const buildApiMessages = (messages: ChatMessageForApi[]): ModelMessage[] =>
  messages.map((message): ModelMessage => {
    if (message.role === "assistant") {
      return { role: "assistant", content: message.content };
    }

    return {
      role: "user",
      content: buildUserContent(message.content, message.images ?? []),
    };
  });
