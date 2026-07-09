import type { AdCreativeVersion } from "../../hooks/use-ad-versions";
import {
  DEFAULT_BACK_CTA,
  defaultBackBody,
  defaultBackHeadline,
  isBackCopyCustomized,
  isReturnAddressCustomized,
  postcardScanUrl,
  resolveBackCopy,
  returnAddressLines,
  roofAgePhraseFor,
} from "../../lib/desk-postcard";
import type {
  DeskAreaTarget,
  DeskTargetZone,
  PostcardBackCopy,
  PostcardReturnAddress,
} from "../../lib/desk-types";
import { buildQrDataUri } from "../../lib/qr-code";
import { PostcardPdfDownload } from "./postcard-pdf";
import type { PostcardSize } from "./postcard-pdf";

const RETURN_ADDRESS_INPUTS: {
  key: keyof PostcardReturnAddress;
  label: string;
}[] = [
  { key: "name", label: "Return name" },
  { key: "company", label: "Company" },
  { key: "line1", label: "Street address" },
  { key: "line2", label: "Suite / unit (optional)" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "zip", label: "ZIP" },
];

export const PostcardBackEditor = ({
  batchName,
  copy,
  onChange,
  onReset,
  onReturnChange,
  onReturnReset,
  returnAddress,
  returnError,
  selectedTargets,
  zone,
}: {
  batchName: string;
  copy: PostcardBackCopy;
  onChange: (field: keyof PostcardBackCopy, value: string) => void;
  onReset: () => void;
  onReturnChange: (field: keyof PostcardReturnAddress, value: string) => void;
  onReturnReset: () => void;
  returnAddress: PostcardReturnAddress;
  returnError: string | null;
  selectedTargets: readonly DeskAreaTarget[];
  zone: DeskTargetZone | null;
}) => {
  const zoneName = zone?.label ?? (batchName || "selected Austin area");
  const roofAgePhrase = roofAgePhraseFor(selectedTargets);
  const customized = isBackCopyCustomized(copy);
  const returnCustomized = isReturnAddressCustomized(returnAddress);
  return (
    <details className="desk-back-editor">
      <summary>Edit back copy{customized ? " · customized" : ""}</summary>
      <div className="desk-back-editor__fields">
        <label className="desk-back-editor__field">
          <span>Headline</span>
          <input
            onChange={(event) => onChange("headline", event.target.value)}
            placeholder={defaultBackHeadline(zoneName)}
            type="text"
            value={copy.headline}
          />
        </label>
        <label className="desk-back-editor__field">
          <span>Message</span>
          <textarea
            onChange={(event) => onChange("body", event.target.value)}
            placeholder={defaultBackBody(roofAgePhrase)}
            rows={4}
            value={copy.body}
          />
        </label>
        <label className="desk-back-editor__field">
          <span>Call to action</span>
          <input
            onChange={(event) => onChange("cta", event.target.value)}
            placeholder={DEFAULT_BACK_CTA}
            type="text"
            value={copy.cta}
          />
        </label>
        {customized ? (
          <button
            className="desk-action-button"
            onClick={onReset}
            type="button"
          >
            Reset to suggested copy
          </button>
        ) : (
          <p className="desk-back-editor__hint">
            Leave a field blank to use the suggested copy shown as placeholder
            text. Changes save automatically.
          </p>
        )}
      </div>
      <div className="desk-back-editor__fields desk-back-editor__return">
        <p className="desk-back-editor__legend">
          Return address (prints on the mailer + used as the sender)
        </p>
        {RETURN_ADDRESS_INPUTS.map((field) => (
          <label className="desk-back-editor__field" key={field.key}>
            <span>{field.label}</span>
            <input
              onChange={(event) =>
                onReturnChange(field.key, event.target.value)
              }
              type="text"
              value={returnAddress[field.key]}
            />
          </label>
        ))}
        {returnError ? (
          <p className="desk-back-editor__error">{returnError}</p>
        ) : null}
        {returnCustomized ? (
          <button
            className="desk-action-button"
            onClick={onReturnReset}
            type="button"
          >
            Reset return address
          </button>
        ) : null}
      </div>
    </details>
  );
};

export const PostcardBackTemplate = ({
  batchName,
  copy,
  returnAddress,
  selectedCreativeVersion,
  selectedTargets,
  size,
  zone,
}: {
  batchName: string;
  copy: PostcardBackCopy;
  returnAddress: PostcardReturnAddress;
  selectedCreativeVersion: AdCreativeVersion | null;
  selectedTargets: readonly DeskAreaTarget[];
  size: PostcardSize;
  zone: DeskTargetZone | null;
}) => {
  const zoneName = zone?.label ?? (batchName || "selected Austin area");
  const roofAgePhrase = roofAgePhraseFor(selectedTargets);
  const scanUrl = postcardScanUrl(zone, batchName);
  const qrSrc = buildQrDataUri(scanUrl, "#123a34", "#ffffff");
  const { body, cta, headline } = resolveBackCopy(
    copy,
    zoneName,
    roofAgePhrase
  );
  const returnLines = returnAddressLines(returnAddress);

  return (
    <div className="desk-postcard-template">
      <div className="desk-postcard-template__heading">
        <div>
          <span>Postcard back</span>
          <strong>
            {selectedCreativeVersion
              ? `Back side paired with ${selectedCreativeVersion.name}.`
              : "Address-ready back side for print upload."}
          </strong>
        </div>
        <span className="desk-postcard-size-label">
          {size === "4x6" ? '4" × 6"' : '6" × 9"'}
        </span>
      </div>
      <div
        aria-label="Postcard back preview"
        className="desk-postcard-back"
        role="group"
      >
        <div className="desk-postcard-back__return">
          {returnLines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
        <div className="desk-postcard-back__postage">postage / indicia</div>
        <div className="desk-postcard-back__message">
          <strong>{headline}</strong>
          <p>{body}</p>
          <span>{cta}</span>
        </div>
        <div className="desk-postcard-back__qr">
          <img alt={`QR code linking to ${scanUrl}`} src={qrSrc} />
        </div>
        <address className="desk-postcard-back__recipient">
          <span>{"{{recipient_full_name}}"}</span>
          <span>{"{{mailing_address_line1}}"}</span>
          <span>{"{{mailing_address_line2}}"}</span>
          <span>{"{{mailing_city}}, {{mailing_state}} {{mailing_zip}}"}</span>
        </address>
      </div>
      <div className="desk-postcard-template__actions">
        <PostcardPdfDownload
          batchName={batchName}
          body={body}
          cta={cta}
          frontImageDataUri={selectedCreativeVersion?.thumbnail}
          headline={headline}
          qrDataUri={qrSrc}
          returnAddressLines={returnLines}
          size={size}
        />
      </div>
    </div>
  );
};
