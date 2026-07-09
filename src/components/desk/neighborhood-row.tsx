import WaButton from "@awesome.me/webawesome/dist/react/button/index.js";
import WaCheckbox from "@awesome.me/webawesome/dist/react/checkbox/index.js";
import WaOption from "@awesome.me/webawesome/dist/react/option/index.js";
import WaSelect from "@awesome.me/webawesome/dist/react/select/index.js";
import { BubbleDownload } from "iconoir-react";

import {
  formatCurrencyValue,
  formatNumber,
  formatYearValue,
  waFieldValue,
} from "../../lib/desk-format";
import type {
  CanvassNeighborhood,
  CanvassStatus,
  CanvassTargetRecord,
  DeskAreaTarget,
} from "../../lib/desk-types";
import { TransitionLink } from "../transition-link";
import { canvassStatusLabels, canvassStatusOrder } from "./constants";

export const neighborhoodLabelOf = (target: DeskAreaTarget): string =>
  target.neighborhoodLabel || target.tractLabel;

export const targetToSnapshot = (
  target: DeskAreaTarget
): CanvassNeighborhood => ({
  county: target.countyLabel,
  dataStatus: target.dataStatus,
  homes: target.olderHomeEstimate,
  label: target.tractLabel,
  latitude: target.latitude,
  longitude: target.longitude,
  medianHomeAge: target.medianHomeAge,
  medianIncome: target.medianIncome,
  medianYearBuilt: target.medianYearBuilt,
  neighborhood: neighborhoodLabelOf(target),
  postalCode: target.postalCode,
  recommendedMailerCount: target.recommendedMailerCount,
  tractFips: target.id,
});

export const NeighborhoodRow = ({
  onToggle,
  selected,
  target,
}: {
  onToggle: (id: string) => void;
  selected: boolean;
  target: DeskAreaTarget;
}) => (
  <WaCheckbox
    checked={selected}
    className={
      selected
        ? "desk-canvass-row desk-canvass-row--selected"
        : "desk-canvass-row"
    }
    onChange={() => onToggle(target.id)}
  >
    <span className="desk-canvass-row__body">
      <strong>{neighborhoodLabelOf(target)}</strong>
      <span>
        {target.countyLabel}
        {target.postalCode ? ` · ${target.postalCode}` : ""}
      </span>
      <span>
        Income {formatCurrencyValue(target.medianIncome)} · Built{" "}
        {formatYearValue(target.medianYearBuilt)}
        {target.medianHomeAge ? ` · ${target.medianHomeAge} yrs` : ""}
      </span>
    </span>
    <span className="desk-canvass-row__homes">
      {formatNumber(target.recommendedMailerCount)}
      <small>mail pieces</small>
    </span>
  </WaCheckbox>
);

export const SavedTargetCard = ({
  isBusy,
  onDelete,
  onExport,
  onOpen,
  onStatusChange,
  target,
}: {
  isBusy: boolean;
  onDelete: (target: CanvassTargetRecord) => void;
  onExport: (target: CanvassTargetRecord) => void;
  onOpen: (target: CanvassTargetRecord) => void;
  onStatusChange: (target: CanvassTargetRecord, status: CanvassStatus) => void;
  target: CanvassTargetRecord;
}) => (
  <article className="desk-saved-target">
    <div className="desk-saved-target__head">
      <div>
        <strong>{target.name}</strong>
        <span>
          {formatNumber(target.homesTotal)} mail pieces ·{" "}
          {target.neighborhoods.length} neighborhood
          {target.neighborhoods.length === 1 ? "" : "s"}
        </span>
      </div>
      <span className={`desk-status desk-status--${target.status}`}>
        {canvassStatusLabels[target.status as CanvassStatus] ?? target.status}
      </span>
    </div>
    <div className="desk-saved-target__actions">
      <WaButton
        appearance="plain"
        className="desk-action-button"
        onClick={() => onOpen(target)}
      >
        Use area
      </WaButton>
      <label className="desk-status-select">
        <span className="desk-visually-hidden">Status for {target.name}</span>
        <WaSelect
          appearance="outlined"
          disabled={isBusy}
          onChange={(event) =>
            onStatusChange(target, waFieldValue(event) as CanvassStatus)
          }
          size="small"
          value={target.status}
        >
          {canvassStatusOrder.map((status) => (
            <WaOption key={status} value={status}>
              {canvassStatusLabels[status]}
            </WaOption>
          ))}
        </WaSelect>
      </label>
      <WaButton
        appearance="plain"
        className="desk-action-button"
        onClick={() => onExport(target)}
      >
        <BubbleDownload aria-hidden height={15} slot="start" width={15} />
        Walk sheet
      </WaButton>
      <TransitionLink className="desk-text-link" to="/ads">
        Creative
      </TransitionLink>
      <WaButton
        appearance="plain"
        className="desk-action-button desk-action-button--danger"
        disabled={isBusy}
        onClick={() => onDelete(target)}
      >
        Delete
      </WaButton>
    </div>
  </article>
);
