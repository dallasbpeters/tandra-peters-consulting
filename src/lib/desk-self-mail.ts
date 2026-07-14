import type { PostcardSize } from "../components/desk/postcard-pdf-document";
/**
 * Pure helpers for the self-mail postcard batch: turn the zone's deliverable
 * roster into print-ready recipient blocks, chunk it so hundreds of pages render
 * without exhausting browser memory, and name each downloaded PDF. Kept free of
 * React / @react-pdf so it is trivially unit-testable and shared by the client
 * renderer and the node verification script.
 */
import { slugify } from "./desk-format";

/** A deliverable recipient as returned by the direct-mail `recipients` action. */
export interface SelfMailRecipient {
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
}

/**
 * Recipients rendered per generated PDF. The whole batch renders in the browser
 * with @react-pdf/renderer; chunking bounds peak memory for large zones (a
 * single 700-page document is far heavier than seven 100-page ones) and lets the
 * UI report progress per file.
 */
export const SELF_MAIL_CHUNK_SIZE = 100;

/**
 * Hard ceiling on recipients per generation, mirroring the server's
 * `ADDRESS_LIST_HARD_CAP` (the roster endpoint never returns more). A zone above
 * this is generated up to the cap with a clear "N of M" message so the operator
 * knows to tighten the zone rather than silently dropping addresses.
 */
export const SELF_MAIL_MAX_RECIPIENTS = 750;

/**
 * Addressee line for occupant mail. The roster strips owner names (PII), so
 * self-mailed pieces are addressed to the current resident — standard practice
 * for saturation/occupant direct mail.
 */
export const SELF_MAIL_ADDRESSEE = "Current Resident";

/** Delivery address block (OCR zone) for one recipient. */
export const recipientDeliveryLines = (
  recipient: SelfMailRecipient
): string[] => {
  const cityLine = [
    recipient.city.trim(),
    [recipient.state.trim(), recipient.zip.trim()].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  return [SELF_MAIL_ADDRESSEE, recipient.addressLine1.trim(), cityLine].filter(
    Boolean
  );
};

/** Pages one recipient contributes: front + back, or back-only without a front. */
export const pagesPerRecipient = (hasFront: boolean): number =>
  hasFront ? 2 : 1;

/** Total PDF pages for a recipient count (used to verify generated output). */
export const totalSelfMailPages = (
  recipientCount: number,
  hasFront: boolean
): number => recipientCount * pagesPerRecipient(hasFront);

/** Split recipients into fixed-size chunks (one PDF each). */
export const chunkRecipients = <T>(
  recipients: readonly T[],
  size: number = SELF_MAIL_CHUNK_SIZE
): T[][] => {
  const safeSize = Math.max(1, Math.floor(size));
  const chunks: T[][] = [];
  for (let index = 0; index < recipients.length; index += safeSize) {
    chunks.push(recipients.slice(index, index + safeSize));
  }
  return chunks;
};

/** Download filename for one part of a (possibly multi-file) self-mail batch. */
export const selfMailPdfFileName = (
  batchName: string,
  size: PostcardSize,
  part: number,
  totalParts: number
): string => {
  const slug = slugify(batchName.trim() || "self-mail");
  const base = `postcards-selfmail-${size}-${slug}`;
  return totalParts > 1
    ? `${base}-part-${part}-of-${totalParts}.pdf`
    : `${base}.pdf`;
};
