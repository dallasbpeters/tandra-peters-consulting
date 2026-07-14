import { describe, expect, it } from "vitest";

import { SIZE_DIMS } from "./postcard-pdf-document";
import { PRINT_IMAGE_WIDTH } from "./postcard-vector-front";

/**
 * Locks the resolution of the react-pdf "Download postcard PDF" path (and the
 * self-mail batch that reuses it). Unlike the provider HTML path there is no
 * external rasterizer: the PDF carries VECTOR text/logo/QR plus full-resolution
 * embedded photos, so it prints sharp at any DPI. We therefore assert:
 *   1. the page size (pt) corresponds to the correct physical trim, and
 *   2. embedded photos are pulled at print width (≥ the 6x9 print requirement),
 * which together guarantee a print-quality piece.
 */

const PT_PER_IN = 72;
const PRINT_DPI = 300;

// Physical trim (inches, landscape) each postcard size must map to.
const TRIM_IN = {
  "4x6": { heightIn: 4, widthIn: 6 },
  "6x9": { heightIn: 6, widthIn: 9 },
} as const;

// 6x9 full-bleed width at 300 DPI — the required embedded-photo width.
const MIN_PRINT_IMAGE_WIDTH = 2775;

describe("postcard PDF page dimensions", () => {
  it.each(["4x6", "6x9"] as const)(
    "sizes the %s page to the physical trim in points",
    (size) => {
      const trim = TRIM_IN[size];
      expect(SIZE_DIMS[size].w).toBe(trim.widthIn * PT_PER_IN);
      expect(SIZE_DIMS[size].h).toBe(trim.heightIn * PT_PER_IN);
      // A point is 1/72", so the page is exactly the physical trim; a 300 DPI
      // rasterization of it is trim × 300 px (e.g. 6x9 → 2700 × 1800 at trim).
      expect(SIZE_DIMS[size].w / PT_PER_IN).toBe(trim.widthIn);
      expect((SIZE_DIMS[size].w / PT_PER_IN) * PRINT_DPI).toBe(
        trim.widthIn * PRINT_DPI
      );
    }
  );
});

describe("postcard PDF image resolution", () => {
  it("requests embedded photos at print width, not a thumbnail", () => {
    // Full-res photos are pulled at 2775 px (6x9 print width) so they stay
    // razor-sharp when the PDF is rasterized for print.
    expect(PRINT_IMAGE_WIDTH).toBeGreaterThanOrEqual(MIN_PRINT_IMAGE_WIDTH);
  });
});
