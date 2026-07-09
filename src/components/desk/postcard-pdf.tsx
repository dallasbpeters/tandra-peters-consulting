import { createElement, useState } from "react";

import type {
  PostcardDocumentProps,
  PostcardSize,
} from "./postcard-pdf-document";

export type { PostcardDocumentProps, PostcardSize };

export interface PostcardPdfDownloadProps extends PostcardDocumentProps {
  batchName?: string;
}

const SLUG_RE = /[\s/]+/g;

export const PostcardPdfDownload = ({
  batchName,
  size = "6x9",
  ...docProps
}: PostcardPdfDownloadProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const [{ pdf }, { PostcardDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./postcard-pdf-document"),
      ]);
      const element = createElement(PostcardDocument, { ...docProps, size });
      const blob = await pdf(element as Parameters<typeof pdf>[0]).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `postcard-${size}-${(batchName || "draft").toLowerCase().replace(SLUG_RE, "-")}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      className="desk-pdf-download"
      disabled={isGenerating}
      onClick={handleDownload}
      type="button"
    >
      {isGenerating ? "Building PDF…" : "Download postcard PDF"}
    </button>
  );
};
