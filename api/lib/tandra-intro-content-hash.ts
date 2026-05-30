import { createHash } from "node:crypto";
import type { TandraIntroContent } from "./fetch-tandra-intro-content.js";

const orderedContent = (content: TandraIntroContent) => ({
  storm: {
    kicker: content.storm.kicker,
    line1: content.storm.line1,
    line2: content.storm.line2,
    body: content.storm.body,
  },
  straightAnswers: {
    kicker: content.straightAnswers.kicker,
    line1: content.straightAnswers.line1,
    line2: content.straightAnswers.line2,
    line3: content.straightAnswers.line3,
    quote: content.straightAnswers.quote,
  },
  inspection: {
    kicker: content.inspection.kicker,
    line1: content.inspection.line1,
    line2: content.inspection.line2,
    line3: content.inspection.line3,
    body: content.inspection.body,
  },
  managed: {
    kicker: content.managed.kicker,
    line1: content.managed.line1,
    line2: content.managed.line2,
    line3: content.managed.line3,
    items: content.managed.items,
  },
  proof: {
    kicker: content.proof.kicker,
    line1: content.proof.line1,
    line2: content.proof.line2,
    items: content.proof.items,
  },
  closing: {
    kicker: content.closing.kicker,
    line1: content.closing.line1,
    line2: content.closing.line2,
    cta: content.closing.cta,
  },
});

export const hashTandraIntroContent = (content: TandraIntroContent): string =>
  createHash("sha256")
    .update(JSON.stringify(orderedContent(content)))
    .digest("hex");
