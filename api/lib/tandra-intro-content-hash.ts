import { createHash } from "node:crypto";

import type { TandraIntroContent } from "./fetch-tandra-intro-content.js";

const orderedContent = (content: TandraIntroContent) => ({
  closing: {
    cta: content.closing.cta,
    kicker: content.closing.kicker,
    line1: content.closing.line1,
    line2: content.closing.line2,
  },
  inspection: {
    body: content.inspection.body,
    kicker: content.inspection.kicker,
    line1: content.inspection.line1,
    line2: content.inspection.line2,
    line3: content.inspection.line3,
  },
  managed: {
    items: content.managed.items,
    kicker: content.managed.kicker,
    line1: content.managed.line1,
    line2: content.managed.line2,
    line3: content.managed.line3,
  },
  proof: {
    items: content.proof.items,
    kicker: content.proof.kicker,
    line1: content.proof.line1,
    line2: content.proof.line2,
  },
  storm: {
    body: content.storm.body,
    kicker: content.storm.kicker,
    line1: content.storm.line1,
    line2: content.storm.line2,
  },
  straightAnswers: {
    kicker: content.straightAnswers.kicker,
    line1: content.straightAnswers.line1,
    line2: content.straightAnswers.line2,
    line3: content.straightAnswers.line3,
    quote: content.straightAnswers.quote,
  },
});

export const hashTandraIntroContent = (content: TandraIntroContent): string =>
  createHash("sha256")
    .update(JSON.stringify(orderedContent(content)))
    .digest("hex");
