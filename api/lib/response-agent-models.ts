import type { ModelMessage } from "ai";

export const RESPONSE_AGENT_TEXT_MODEL = "llama-3.3-70b-versatile";
export const RESPONSE_AGENT_VISION_MODEL =
  "meta-llama/llama-4-scout-17b-16e-instruct";

const isImagePart = (part: unknown): boolean => {
  if (!part || typeof part !== "object") {
    return false;
  }

  const typed = part as { type?: string; mediaType?: string };
  if (typed.type === "image") {
    return true;
  }

  return (
    typed.type === "file" && Boolean(typed.mediaType?.startsWith("image/"))
  );
};

export const conversationHasImages = (messages: ModelMessage[]): boolean =>
  messages.some((message) => {
    if (message.role !== "user" || typeof message.content === "string") {
      return false;
    }

    return Array.isArray(message.content) && message.content.some(isImagePart);
  });

export const pickResponseAgentModel = (messages: ModelMessage[]): string =>
  conversationHasImages(messages)
    ? RESPONSE_AGENT_VISION_MODEL
    : RESPONSE_AGENT_TEXT_MODEL;
