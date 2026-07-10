import { createElement, useState } from "react";

import type {
  PostcardDocumentProps,
  PostcardSize,
} from "./postcard-pdf-document";

export type { PostcardDocumentProps, PostcardSize };

export interface PostcardPdfDownloadProps extends PostcardDocumentProps {
  batchName?: string;
  /**
   * Saved Ad Builder creative (`config` JSON). When present the front page is
   * rendered as native PDF text, shapes, SVG paths, and original image assets.
   */
  frontConfig?: string;
}

const SLUG_RE = /[\s/]+/g;

export const PostcardPdfDownload = ({
  batchName,
  frontConfig,
  size = "6x9",
  ...docProps
}: PostcardPdfDownloadProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const [renderer, { PostcardDocument }, vectorFront] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./postcard-pdf-document"),
        import("./postcard-vector-front"),
      ]);
      vectorFront.registerPostcardVectorFonts(renderer.Font);
      if (!(frontConfig || docProps.frontImageDataUri)) {
        throw new Error(
          "The selected creative has no usable postcard front. Re-save it in Ad Builder before downloading the PDF."
        );
      }
      const element = createElement(PostcardDocument, {
        ...docProps,
        frontConfig,
        size,
      });
      const blob = await renderer
        .pdf(element as Parameters<typeof renderer.pdf>[0])
        .toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `postcard-${size}-${(batchName || "draft").toLowerCase().replace(SLUG_RE, "-")}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setGenerationError(
        error instanceof Error
          ? error.message
          : "Could not build the postcard PDF."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <button
        className="desk-pdf-download"
        disabled={isGenerating}
        onClick={handleDownload}
        type="button"
      >
        {isGenerating ? "Building PDF…" : "Download postcard PDF"}
      </button>
      {generationError ? (
        <p className="desk-creative-selector__error" role="alert">
          {generationError}
        </p>
      ) : null}
    </div>
  );
};
