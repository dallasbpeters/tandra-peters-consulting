import WaButton from "@awesome.me/webawesome/dist/react/button/index.js";
import { Mail, Send } from "iconoir-react";
import { useState } from "react";

import type { AdCreativeVersion } from "../../hooks/use-ad-versions";
import { formatNumber } from "../../lib/desk-format";
import type {
  DeskAreaTarget,
  DeskTargetZone,
  DirectMailPlanResponse,
  PostcardBackCopy,
  PostcardReturnAddress,
  ProviderConnectionResult,
  ProviderKeysStatusResult,
  ProviderSubmitResult,
  ProviderTestProofResult,
  DirectMailProviderOption,
  ZoneValidationResult,
  CaptureMessage,
} from "../../lib/desk-types";
import { CapturedAreasPreview } from "./captured-areas-preview";
import { CreativeVersionSelector } from "./creative-version-selector";
import { PostcardBackEditor, PostcardBackTemplate } from "./postcard-back";
import type { PostcardSize } from "./postcard-pdf";
import { ProviderKeyForm } from "./provider-key-form";

export const validationMessageTone = (
  tone: ZoneValidationResult["tone"]
): CaptureMessage["tone"] => {
  if (tone === "good") {
    return "success";
  }
  if (tone === "error") {
    return "error";
  }
  return "neutral";
};

const directMailProviderStatus = (plan: DirectMailPlanResponse): string => {
  if (plan.providerKey === "mock") {
    return "planning only";
  }
  return plan.providerReady ? "send service ready" : "setup needed";
};

const ProviderNote = ({
  ok,
  text,
  url,
  urlLabel,
}: {
  ok: boolean;
  text: string;
  url?: string;
  urlLabel?: string;
}) => (
  <p
    className={`desk-provider-note desk-provider-note--${ok ? "good" : "error"}`}
  >
    {text}
    {url ? (
      <a href={url} rel="noopener noreferrer" target="_blank">
        {urlLabel ?? "Open"}
      </a>
    ) : null}
  </p>
);

const submitLabel = (submitting: boolean, sendEnabled: boolean): string => {
  if (submitting) {
    return "Submitting…";
  }
  return sendEnabled ? "Submit live order" : "Submit test order";
};

const submissionText = (submission: ProviderSubmitResult): string => {
  const parts = [submission.message];
  if (submission.orderId) {
    parts.push(`Order ${submission.orderId}`);
  }
  return parts.join(" · ");
};

const ProviderRow = ({
  connection,
  hasCreative,
  hasSelection,
  isSelected,
  keysStatus,
  onLoadKeysStatus,
  onSaveKeys,
  onSubmit,
  onTestProof,
  onUse,
  onVerify,
  proof,
  provider,
  savingKeys,
  sendEnabled,
  submission,
  submitting,
  testing,
  verifying,
}: {
  connection: ProviderConnectionResult | null;
  hasCreative: boolean;
  hasSelection: boolean;
  isSelected: boolean;
  keysStatus: ProviderKeysStatusResult | null;
  onLoadKeysStatus: (key: string) => void;
  onSaveKeys: (key: string, values: Record<string, string>) => void;
  onSubmit: (key: string) => void;
  onTestProof: (key: string) => void;
  onUse: (key: string) => void;
  onVerify: (key: string) => void;
  proof: ProviderTestProofResult | null;
  provider: DirectMailProviderOption;
  savingKeys: boolean;
  sendEnabled: boolean;
  submission: ProviderSubmitResult | null;
  submitting: boolean;
  testing: boolean;
  verifying: boolean;
}) => {
  const [showKeys, setShowKeys] = useState(false);
  const showConnection = connection?.providerKey === provider.key;
  const showProof = proof?.providerKey === provider.key;
  const showSubmission = submission?.providerKey === provider.key;
  const isConnected = showConnection ? Boolean(connection?.ok) : provider.ready;
  const canSubmit = isConnected && hasCreative && hasSelection;
  const handleToggleKeys = () => {
    setShowKeys((current) => {
      const next = !current;
      if (next) {
        onLoadKeysStatus(provider.key);
      }
      return next;
    });
  };
  return (
    <li className={isSelected ? "is-selected" : ""}>
      <div>
        <strong>
          {provider.name}
          {provider.recommended ? (
            <span className="desk-provider-badge">Recommended</span>
          ) : null}
        </strong>
        <small>{provider.fit}</small>
        <small>{provider.approxCost}</small>
        <small>Upload: {provider.uploadMode}</small>
        <em>{provider.ready ? "Connected" : "Setup needed"}</em>
      </div>
      <div className="desk-mail-plan__provider-actions">
        <WaButton
          appearance="plain"
          className="desk-action-button"
          onClick={handleToggleKeys}
        >
          {showKeys ? "Hide keys" : "Set up keys"}
        </WaButton>
        <WaButton
          appearance="plain"
          className="desk-action-button"
          disabled={verifying}
          onClick={() => onVerify(provider.key)}
        >
          {verifying ? "Checking…" : "Test connection"}
        </WaButton>
        <WaButton
          appearance="plain"
          className="desk-action-button"
          onClick={() => onUse(provider.key)}
        >
          {isSelected ? "Selected" : "Use this"}
        </WaButton>
        {provider.canTestProof ? (
          <WaButton
            appearance="plain"
            className="desk-action-button"
            disabled={testing || !hasCreative}
            onClick={() => onTestProof(provider.key)}
          >
            {testing ? "Sending…" : "Send test proof"}
          </WaButton>
        ) : null}
        <WaButton
          appearance="plain"
          className="desk-action-button"
          disabled={submitting || !canSubmit}
          onClick={() => onSubmit(provider.key)}
        >
          <Send aria-hidden height={16} slot="start" width={16} />
          {submitLabel(submitting, sendEnabled)}
        </WaButton>
        {provider.setupUrl ? (
          <a href={provider.setupUrl} rel="noopener noreferrer" target="_blank">
            {provider.setupLabel}
          </a>
        ) : null}
      </div>
      {showKeys ? (
        <ProviderKeyForm
          onSave={(values) => onSaveKeys(provider.key, values)}
          provider={provider}
          saving={savingKeys}
          status={keysStatus?.providerKey === provider.key ? keysStatus : null}
        />
      ) : null}
      {showConnection && connection ? (
        <ProviderNote
          ok={connection.ok}
          text={
            connection.accountLabel
              ? `${connection.message} · ${connection.accountLabel}`
              : connection.message
          }
        />
      ) : null}
      {showProof && proof ? (
        <ProviderNote
          ok={proof.ok}
          text={proof.message}
          url={proof.proofUrl}
          urlLabel="View proof PDF"
        />
      ) : null}
      {showSubmission && submission ? (
        <ProviderNote
          ok={submission.ok}
          text={`[${submission.mode.toUpperCase()}] ${submissionText(submission)}`}
          url={submission.previewUrl}
          urlLabel="View postcard"
        />
      ) : null}
    </li>
  );
};

export const DirectMailPlanPanel = ({
  adVersionsError,
  adVersionsLoading,
  backCopy,
  batchName,
  connection,
  creativeVersions,
  isPreparing,
  keysStatus,
  onBackCopyChange,
  onBackCopyReset,
  onLoadKeysStatus,
  onPrepare,
  onReturnAddressChange,
  onReturnAddressReset,
  onSaveKeys,
  onSelectCreativeVersion,
  onSizeChange,
  onSubmit,
  onTestProof,
  onVerify,
  plan,
  proof,
  returnAddress,
  returnAddressError: returnError,
  savingKeysKey,
  selectedCreativeVersion,
  selectedCount,
  selectedTargets,
  size,
  submission,
  submittingKey,
  testingKey,
  verifyingKey,
  zone,
}: {
  adVersionsError: string | null;
  adVersionsLoading: boolean;
  backCopy: PostcardBackCopy;
  batchName: string;
  connection: ProviderConnectionResult | null;
  creativeVersions: readonly AdCreativeVersion[];
  isPreparing: boolean;
  keysStatus: ProviderKeysStatusResult | null;
  onBackCopyChange: (field: keyof PostcardBackCopy, value: string) => void;
  onBackCopyReset: () => void;
  onLoadKeysStatus: (key: string) => void;
  onPrepare: (provider?: string) => void;
  onReturnAddressChange: (
    field: keyof PostcardReturnAddress,
    value: string
  ) => void;
  onReturnAddressReset: () => void;
  onSaveKeys: (key: string, values: Record<string, string>) => void;
  onSelectCreativeVersion: (id: string) => void;
  onSizeChange: (size: PostcardSize) => void;
  onSubmit: (key: string) => void;
  onTestProof: (key: string) => void;
  onVerify: (key: string) => void;
  plan: DirectMailPlanResponse | null;
  proof: ProviderTestProofResult | null;
  returnAddress: PostcardReturnAddress;
  returnAddressError: string | null;
  savingKeysKey: string | null;
  selectedCreativeVersion: AdCreativeVersion | null;
  selectedCount: number;
  selectedTargets: readonly DeskAreaTarget[];
  size: PostcardSize;
  submission: ProviderSubmitResult | null;
  submittingKey: string | null;
  testingKey: string | null;
  verifyingKey: string | null;
  zone: DeskTargetZone | null;
}) => {
  const hasSelection = selectedCount > 0;
  const selectedProviderKey = plan?.providerKey ?? "";
  const hasCreative = selectedCreativeVersion !== null;
  const sendEnabled = plan?.sendEnabled ?? false;
  return (
    <div className="desk-mail-plan">
      <div>
        <span>Mail batch</span>
        <strong>
          {hasSelection
            ? "Prepare this zone, then connect a print/mail service."
            : "Create a zone first."}
        </strong>
        <p>
          {hasSelection
            ? "Pick a service below, test the connection, and send a no-charge proof. Nothing mails live until sending is enabled."
            : "Turn on zone mode and click the map, or manually select areas from the list."}
        </p>
      </div>
      {hasSelection ? (
        <CreativeVersionSelector
          error={adVersionsError}
          loading={adVersionsLoading}
          onSelect={onSelectCreativeVersion}
          selectedVersion={selectedCreativeVersion}
          versions={creativeVersions}
        />
      ) : null}
      <WaButton
        appearance="plain"
        className="desk-primary-link"
        disabled={isPreparing || !hasSelection}
        onClick={() => onPrepare()}
      >
        <Mail aria-hidden height={18} slot="start" width={18} />
        {isPreparing ? "Preparing..." : "Prepare mail batch"}
      </WaButton>
      {hasSelection ? (
        <CapturedAreasPreview plan={plan} selectedTargets={selectedTargets} />
      ) : null}
      {plan ? (
        <div className="desk-mail-plan__result">
          <div>
            <strong>{formatNumber(plan.estimatedPieces)}</strong>
            <span>planned mail pieces</span>
          </div>
          <div>
            <strong>{plan.provider}</strong>
            <span>{directMailProviderStatus(plan)}</span>
          </div>
          <div>
            <strong>{formatNumber(plan.rentcast.recipientReadyCount)}</strong>
            <span>matched mailing addresses</span>
          </div>
          {plan.nextSteps.length > 0 ? (
            <ul>
              {plan.nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          ) : null}
          {plan.providers.length > 0 ? (
            <div className="desk-mail-plan__providers">
              <span>Print/mail services</span>
              <ul>
                {plan.providers.map((provider) => (
                  <ProviderRow
                    connection={connection}
                    hasCreative={hasCreative}
                    hasSelection={hasSelection}
                    isSelected={provider.key === selectedProviderKey}
                    key={provider.key}
                    keysStatus={keysStatus}
                    onLoadKeysStatus={onLoadKeysStatus}
                    onSaveKeys={onSaveKeys}
                    onSubmit={onSubmit}
                    onTestProof={onTestProof}
                    onUse={onPrepare}
                    onVerify={onVerify}
                    proof={proof}
                    provider={provider}
                    savingKeys={savingKeysKey === provider.key}
                    sendEnabled={sendEnabled}
                    submission={submission}
                    submitting={submittingKey === provider.key}
                    testing={testingKey === provider.key}
                    verifying={verifyingKey === provider.key}
                  />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
      {hasSelection ? (
        <>
          <PostcardBackEditor
            batchName={batchName}
            copy={backCopy}
            onChange={onBackCopyChange}
            onReset={onBackCopyReset}
            onReturnChange={onReturnAddressChange}
            onReturnReset={onReturnAddressReset}
            returnAddress={returnAddress}
            returnError={returnError}
            selectedTargets={selectedTargets}
            zone={zone}
          />
          <fieldset className="desk-postcard-size-picker">
            <legend>Postcard size</legend>
            {(["4x6", "6x9"] as const).map((s) => (
              <label key={s}>
                <input
                  checked={size === s}
                  name="postcard-size"
                  onChange={() => onSizeChange(s)}
                  type="radio"
                  value={s}
                />
                {s === "4x6" ? '4" × 6"' : '6" × 9"'}
              </label>
            ))}
          </fieldset>
          <PostcardBackTemplate
            batchName={batchName}
            copy={backCopy}
            returnAddress={returnAddress}
            selectedCreativeVersion={selectedCreativeVersion}
            selectedTargets={selectedTargets}
            size={size}
            zone={zone}
          />
        </>
      ) : null}
    </div>
  );
};
