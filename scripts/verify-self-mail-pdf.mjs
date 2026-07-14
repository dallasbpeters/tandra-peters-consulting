/**
 * Verification harness for the self-mail postcard batch PDF (Phase 2).
 *
 * The production batch document (`src/components/desk/postcard-pdf-document.tsx`)
 * pulls in the vector front, which imports fonts/SVGs through Vite-only `?url` /
 * `?raw` suffixes and cannot load under plain Node. So this script rebuilds the
 * SAME page STRUCTURE (one Front page + one Back page per recipient, at the same
 * `SIZE_DIMS` point dimensions) using the real `@react-pdf/renderer` pipeline,
 * renders a small fake roster to a PDF, then parses the output to prove:
 *   1. the page COUNT  = recipients × 2 (front + back), and
 *   2. every page's MediaBox matches the physical trim in points.
 *
 * Run: `node scripts/verify-self-mail-pdf.mjs`
 */
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import { createElement as el } from "react";

// Mirror of SIZE_DIMS in postcard-pdf-document.tsx (points; 1pt = 1/72in).
const SIZE_DIMS = {
  "4x6": { w: 6 * 72, h: 4 * 72 }, // 432 × 288 pt
  "6x9": { w: 9 * 72, h: 6 * 72 }, // 648 × 432 pt
};

const styles = StyleSheet.create({
  pageFront: { padding: 0 },
  pageBack: { padding: 24, fontFamily: "Helvetica" },
  frontFill: { width: "100%", height: "100%", backgroundColor: "#123a34" },
  line: { fontSize: 9, marginBottom: 2 },
});

const buildRecipients = (count) =>
  Array.from({ length: count }, (_, i) => ({
    key: `r-${i}`,
    lines: ["Current Resident", `${100 + i} Sample St`, "Austin, TX 78725"],
  }));

const buildDocument = (recipients, size) => {
  const { w, h } = SIZE_DIMS[size];
  const pages = recipients.flatMap((recipient) => [
    el(
      Page,
      { key: `${recipient.key}-front`, size: [w, h], style: styles.pageFront },
      el(View, { style: styles.frontFill })
    ),
    el(
      Page,
      { key: `${recipient.key}-back`, size: [w, h], style: styles.pageBack },
      recipient.lines.map((line, i) =>
        el(Text, { key: `${recipient.key}-l-${i}`, style: styles.line }, line)
      )
    ),
  ]);
  return el(Document, null, pages);
};

const countPages = (buffer) => {
  const text = buffer.toString("latin1");
  // Count page objects: "/Type /Page" but NOT "/Type /Pages".
  const matches = text.match(/\/Type\s*\/Page(?![s])/g);
  return matches ? matches.length : 0;
};

const mediaBoxes = (buffer) => {
  const text = buffer.toString("latin1");
  const re = /\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g;
  const boxes = [];
  let match = re.exec(text);
  while (match !== null) {
    boxes.push({ w: Number(match[1]), h: Number(match[2]) });
    match = re.exec(text);
  }
  return boxes;
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const run = async () => {
  const outDir = mkdtempSync(join(tmpdir(), "selfmail-verify-"));
  const cases = [
    { count: 3, size: "6x9" },
    { count: 5, size: "4x6" },
  ];
  for (const { count, size } of cases) {
    const recipients = buildRecipients(count);
    // eslint-disable-next-line no-await-in-loop
    const buffer = await pdf(buildDocument(recipients, size))
      .toBuffer()
      .then(
        (stream) =>
          new Promise((resolve, reject) => {
            const chunks = [];
            stream.on("data", (c) => chunks.push(c));
            stream.on("end", () => resolve(Buffer.concat(chunks)));
            stream.on("error", reject);
          })
      );
    const outPath = join(outDir, `self-mail-${size}-${count}.pdf`);
    writeFileSync(outPath, buffer);

    const expectedPages = count * 2;
    const pages = countPages(buffer);
    const boxes = mediaBoxes(buffer);
    const { w, h } = SIZE_DIMS[size];

    assert(
      pages === expectedPages,
      `${size}: expected ${expectedPages} pages, found ${pages}`
    );
    assert(
      boxes.length === expectedPages,
      `${size}: expected ${expectedPages} MediaBoxes, found ${boxes.length}`
    );
    for (const box of boxes) {
      assert(
        Math.abs(box.w - w) < 0.5 && Math.abs(box.h - h) < 0.5,
        `${size}: MediaBox ${box.w}×${box.h}pt ≠ trim ${w}×${h}pt`
      );
    }

    process.stdout.write(
      `PASS ${size}: ${count} recipients → ${pages} pages @ ${w}×${h}pt (${(
        w / 72
      ).toFixed(0)}×${(h / 72).toFixed(0)}in) — ${outPath}\n`
    );
  }
  process.stdout.write(`\nSample PDFs written to: ${outDir}\n`);
};

run().catch((error) => {
  process.stderr.write(`FAIL: ${error.message}\n`);
  process.exit(1);
});
