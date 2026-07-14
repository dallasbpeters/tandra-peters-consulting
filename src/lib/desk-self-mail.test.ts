import { describe, expect, it } from "vitest";

import {
  chunkRecipients,
  pagesPerRecipient,
  recipientDeliveryLines,
  SELF_MAIL_ADDRESSEE,
  SELF_MAIL_CHUNK_SIZE,
  selfMailPdfFileName,
  totalSelfMailPages,
} from "./desk-self-mail";
import type { SelfMailRecipient } from "./desk-self-mail";

const recipient = (
  overrides: Partial<SelfMailRecipient> = {}
): SelfMailRecipient => ({
  addressLine1: "100 Oak St",
  city: "Austin",
  state: "TX",
  zip: "78724",
  ...overrides,
});

describe(recipientDeliveryLines, () => {
  it("builds an occupant-addressed USPS delivery block", () => {
    expect(recipientDeliveryLines(recipient())).toStrictEqual([
      SELF_MAIL_ADDRESSEE,
      "100 Oak St",
      "Austin, TX 78724",
    ]);
  });

  it("drops empty parts without leaving stray separators", () => {
    expect(
      recipientDeliveryLines(recipient({ city: "", state: "", zip: "78724" }))
    ).toStrictEqual([SELF_MAIL_ADDRESSEE, "100 Oak St", "78724"]);
  });
});

describe("page math", () => {
  it("counts front + back per recipient", () => {
    expect(pagesPerRecipient(true)).toBe(2);
    expect(pagesPerRecipient(false)).toBe(1);
    expect(totalSelfMailPages(120, true)).toBe(240);
    expect(totalSelfMailPages(120, false)).toBe(120);
  });
});

describe(chunkRecipients, () => {
  it("splits into fixed-size chunks that cover every recipient once", () => {
    const recipients = Array.from({ length: 250 }, (_, i) =>
      recipient({ addressLine1: `${i} Main St` })
    );
    const chunks = chunkRecipients(recipients, SELF_MAIL_CHUNK_SIZE);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(100);
    expect(chunks[2]).toHaveLength(50);
    expect(chunks.flat()).toHaveLength(250);
  });

  it("returns a single chunk when under the chunk size", () => {
    expect(chunkRecipients([recipient(), recipient()], 100)).toHaveLength(1);
  });
});

describe(selfMailPdfFileName, () => {
  it("omits the part suffix for a single-file batch", () => {
    expect(selfMailPdfFileName("North Austin", "6x9", 1, 1)).toBe(
      "postcards-selfmail-6x9-north-austin.pdf"
    );
  });

  it("adds a part-of-total suffix for a chunked batch", () => {
    expect(selfMailPdfFileName("North Austin", "4x6", 2, 4)).toBe(
      "postcards-selfmail-4x6-north-austin-part-2-of-4.pdf"
    );
  });
});
