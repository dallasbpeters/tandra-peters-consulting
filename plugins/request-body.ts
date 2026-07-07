import type { IncomingMessage } from "node:http";

export const readRequestBody = async (
  req: IncomingMessage
): Promise<Buffer> => {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks);
};
