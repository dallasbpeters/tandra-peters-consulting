import WaButton from "@awesome.me/webawesome/dist/react/button/index.js";
import { Printer } from "iconoir-react";

import { formatNumber } from "../../lib/desk-format";
import type { CaptureMessage } from "../../lib/desk-types";
import type { SelfMailProgress } from "./self-mail-pdf";

const generateLabel = (
  busy: boolean,
  recipientEstimate: number | null
): string => {
  if (busy) {
    return "Generating…";
  }
  if (recipientEstimate && recipientEstimate > 0) {
    return `Generate self-mail PDFs (~${formatNumber(recipientEstimate)})`;
  }
  return "Generate self-mail PDFs";
};

const progressText = (progress: SelfMailProgress): string => {
  const files =
    progress.totalFiles > 1
      ? ` · file ${progress.completedFiles} of ${progress.totalFiles}`
      : "";
  return `Rendered ${formatNumber(progress.completedRecipients)} of ${formatNumber(
    progress.totalRecipients
  )} postcards${files}…`;
};

export const SelfMailPdfSection = ({
  busy,
  hasCreative,
  message,
  onGenerate,
  progress,
  recipientEstimate,
}: {
  busy: boolean;
  hasCreative: boolean;
  message: CaptureMessage | null;
  onGenerate: () => void;
  progress: SelfMailProgress | null;
  recipientEstimate: number | null;
}) => (
  <div className="desk-self-mail">
    <div className="desk-self-mail__intro">
      <span>Self-mail postcards</span>
      <strong>Print &amp; mail this zone yourself</strong>
      <p>
        Generate print-ready PDFs — one personalized postcard per address (front
        + back with that neighbor&apos;s delivery address, your return address,
        and a stamp box). No provider or send gate. Large zones split into
        multiple PDFs so hundreds of postcards download reliably.
      </p>
    </div>
    <WaButton
      appearance="plain"
      className="desk-primary-link"
      disabled={busy || !hasCreative}
      onClick={onGenerate}
    >
      <Printer aria-hidden height={18} slot="start" width={18} />
      {generateLabel(busy, recipientEstimate)}
    </WaButton>
    {progress ? (
      <p className="desk-self-mail__progress">{progressText(progress)}</p>
    ) : null}
    {message ? (
      <p
        className={`desk-provider-note desk-provider-note--${
          message.tone === "error" ? "error" : "good"
        }`}
      >
        {message.text}
      </p>
    ) : null}
    {hasCreative ? null : (
      <p className="desk-self-mail__hint">
        Select a saved creative above to enable self-mail PDFs.
      </p>
    )}
  </div>
);
