import WaButton from "@awesome.me/webawesome/dist/react/button/index.js";
import WaCheckbox from "@awesome.me/webawesome/dist/react/checkbox/index.js";
import WaOption from "@awesome.me/webawesome/dist/react/option/index.js";
import WaSelect from "@awesome.me/webawesome/dist/react/select/index.js";
import { ArrowRight, Calendar, Trash } from "iconoir-react";

import { waFieldValue, formatPublishDate } from "../../lib/desk-format";
import type {
  ActionItem,
  DeskBoardRecord,
  DeskBoardStatusValue,
} from "../../lib/desk-types";
import { TransitionLink } from "../transition-link";
import {
  toneClass,
  CONTENT_STATUS_ORDER,
  CONTENT_STATUS_LABELS,
} from "./constants";

export const StatusToggleButton = ({
  busy,
  done,
  onToggle,
}: {
  busy: boolean;
  done: boolean;
  onToggle: () => void;
}) => (
  <WaCheckbox
    checked={done}
    className="desk-status-toggle"
    disabled={busy}
    onChange={onToggle}
  >
    {done ? "Done" : "To do"}
  </WaCheckbox>
);

export const ActionRow = ({
  busy,
  item,
  onToggle,
  status,
}: {
  busy: boolean;
  item: ActionItem;
  onToggle: () => void;
  status: DeskBoardStatusValue;
}) => {
  const done = status === "done";
  return (
    <li className={done ? "desk-action desk-action--done" : "desk-action"}>
      <StatusToggleButton busy={busy} done={done} onToggle={onToggle} />
      <div>
        <span className={toneClass(item.tone)}>{item.due}</span>
        <h3>{item.label}</h3>
        <p>{item.outcome}</p>
      </div>
      <div className="desk-action__meta">
        <span>{item.channel}</span>
        <span>{item.owner}</span>
        <TransitionLink className="desk-link-button" to={item.href}>
          Open
          <ArrowRight aria-hidden height={16} width={16} />
        </TransitionLink>
      </div>
    </li>
  );
};

export const GeneratedTaskRow = ({
  busy,
  onToggle,
  record,
}: {
  busy: boolean;
  onToggle: () => void;
  record: DeskBoardRecord;
}) => {
  const done = record.status === "done";
  return (
    <li className={`desk-action${done ? "desk-action--done" : ""}`}>
      <StatusToggleButton busy={busy} done={done} onToggle={onToggle} />
      <div>
        <span className="desk-pill desk-pill--neutral">
          {record.origin === "generated" ? "AI" : "Added"}
        </span>
        <h3>{record.title}</h3>
        {record.detail ? <p>{record.detail}</p> : null}
      </div>
      <div className="desk-action__meta">
        {record.channel ? <span>{record.channel}</span> : null}
        {record.href ? (
          <TransitionLink className="desk-link-button" to={record.href}>
            Open
            <ArrowRight aria-hidden height={16} width={16} />
          </TransitionLink>
        ) : null}
      </div>
    </li>
  );
};

export const CalendarRow = ({
  busy,
  deletePending,
  onCancelDelete,
  onConfirmDelete,
  onRequestDelete,
  onStatusChange,
  record,
}: {
  busy: boolean;
  deletePending: boolean;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onRequestDelete: () => void;
  onStatusChange: (status: DeskBoardStatusValue) => void;
  record: DeskBoardRecord;
}) => (
  <li className="desk-calendar-row">
    <div className="desk-calendar-row__date">
      <Calendar aria-hidden height={16} width={16} />
      <span>{formatPublishDate(record.publishDate)}</span>
    </div>
    <div className="desk-calendar-row__body">
      <h3>{record.title}</h3>
      {record.detail ? <p>{record.detail}</p> : null}
      <div className="desk-calendar-row__tags">
        {record.pillar ? (
          <span className="desk-tag">{record.pillar}</span>
        ) : null}
        {record.buyerStage ? (
          <span className="desk-tag desk-tag--muted">{record.buyerStage}</span>
        ) : null}
        {record.channel ? (
          <span className="desk-tag desk-tag--muted">{record.channel}</span>
        ) : null}
      </div>
    </div>
    <div className="desk-calendar-row__actions">
      <WaSelect
        aria-label="Content status"
        appearance="outlined"
        className="desk-calendar-row__status"
        disabled={busy}
        onChange={(event) =>
          onStatusChange(waFieldValue(event) as DeskBoardStatusValue)
        }
        size="small"
        value={record.status}
      >
        {CONTENT_STATUS_ORDER.map((value) => (
          <WaOption key={value} value={value}>
            {CONTENT_STATUS_LABELS[value]}
          </WaOption>
        ))}
      </WaSelect>
      {deletePending ? (
        <div className="desk-calendar-row__delete-confirm">
          <button
            className="desk-delete-button desk-delete-button--confirm"
            disabled={busy}
            onClick={onConfirmDelete}
            type="button"
          >
            Delete
          </button>
          <button
            className="desk-delete-button"
            disabled={busy}
            onClick={onCancelDelete}
            type="button"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          aria-label={`Delete ${record.title}`}
          className="desk-delete-button"
          disabled={busy}
          onClick={onRequestDelete}
          type="button"
        >
          <Trash aria-hidden height={15} width={15} />
          Delete
        </button>
      )}
    </div>
  </li>
);
