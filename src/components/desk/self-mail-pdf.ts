import { createElement } from "react";

import {
  chunkRecipients,
  recipientDeliveryLines,
  SELF_MAIL_CHUNK_SIZE,
  selfMailPdfFileName,
} from "../../lib/desk-self-mail";
import type { SelfMailRecipient } from "../../lib/desk-self-mail";
import type {
  PostcardDocumentProps,
  PostcardSize,
  SelfMailPage,
} from "./postcard-pdf-document";

/** Progress across the whole batch (recipients rendered so far, files written). */
export interface SelfMailProgress {
  completedFiles: number;
  completedRecipients: number;
  totalFiles: number;
  totalRecipients: number;
}

export interface GenerateSelfMailInput {
  batchName: string;
  /** Recipients rendered per PDF file (bounds browser memory for big zones). */
  chunkSize?: number;
  /** Shared creative + back copy for every postcard. */
  docProps: Omit<PostcardDocumentProps, "size">;
  onProgress?: (progress: SelfMailProgress) => void;
  recipients: readonly SelfMailRecipient[];
  size: PostcardSize;
}

export interface GenerateSelfMailResult {
  files: number;
  recipients: number;
}

// A short gap between programmatic downloads so the browser doesn't collapse the
// rapid-fire object-URL clicks into a single (or blocked) download.
const DOWNLOAD_GAP_MS = 400;
const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const downloadBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * Generate print-ready self-mail postcard PDFs — one personalized postcard
 * (front + back with the recipient's delivery address) per address in the zone.
 *
 * Rendered CLIENT-SIDE with @react-pdf/renderer, reusing the exact vector
 * front + back verified for print resolution in Phase 1 (no separate,
 * lower-quality server renderer). Large zones are chunked into multiple PDFs so
 * hundreds of pages never exhaust browser memory; each chunk downloads as its
 * own file and progress is reported after every chunk.
 */
export const generateSelfMailPdfs = async (
  input: GenerateSelfMailInput
): Promise<GenerateSelfMailResult> => {
  const {
    batchName,
    chunkSize = SELF_MAIL_CHUNK_SIZE,
    docProps,
    onProgress,
    recipients,
    size,
  } = input;
  if (recipients.length === 0) {
    throw new Error("No deliverable addresses in this zone to self-mail.");
  }
  if (!(docProps.frontConfig || docProps.frontImageDataUri)) {
    throw new Error(
      "Select a saved Ad Builder creative before generating self-mail PDFs."
    );
  }

  const [renderer, { PostcardBatchDocument }, vectorFront] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./postcard-pdf-document"),
    import("./postcard-vector-front"),
  ]);
  vectorFront.registerPostcardVectorFonts(renderer.Font);

  const chunks = chunkRecipients(recipients, chunkSize);
  const totalFiles = chunks.length;
  let completedRecipients = 0;
  onProgress?.({
    completedFiles: 0,
    completedRecipients: 0,
    totalFiles,
    totalRecipients: recipients.length,
  });

  for (let part = 0; part < totalFiles; part += 1) {
    const chunk = chunks[part];
    const pages: SelfMailPage[] = chunk.map((recipient, index) => ({
      key: `${part}-${index}`,
      lines: recipientDeliveryLines(recipient),
    }));
    const element = createElement(PostcardBatchDocument, {
      ...docProps,
      recipients: pages,
      size,
    });
    // eslint-disable-next-line no-await-in-loop -- sequential by design: render
    // one chunk at a time to cap peak memory, and space out the downloads.
    const blob = await renderer
      .pdf(element as Parameters<typeof renderer.pdf>[0])
      .toBlob();
    downloadBlob(
      blob,
      selfMailPdfFileName(batchName, size, part + 1, totalFiles)
    );
    completedRecipients += chunk.length;
    onProgress?.({
      completedFiles: part + 1,
      completedRecipients,
      totalFiles,
      totalRecipients: recipients.length,
    });
    if (part + 1 < totalFiles) {
      // eslint-disable-next-line no-await-in-loop -- intentional inter-file gap.
      await wait(DOWNLOAD_GAP_MS);
    }
  }

  return { files: totalFiles, recipients: recipients.length };
};
