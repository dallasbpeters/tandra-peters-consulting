import { SendDiagonal } from "iconoir-react";
import { useEffect, useMemo, useState } from "react";

import type {
  ContentCalendarEntry,
  ContentChannel,
  ContentStatus,
} from "../../lib/content-calendar";
import {
  buildCalendarEntryAction,
  CONTENT_CHANNELS,
  CONTENT_STATUSES,
  channelLabels,
  statusLabels,
} from "../../lib/content-calendar";
import { TransitionLink } from "../transition-link";

export interface EntryFormValue {
  area: string;
  brief: string;
  channel: ContentChannel;
  scheduledFor: string;
  status: ContentStatus;
  targetKeyword: string;
  title: string;
}

export interface EntryFormSubmit extends EntryFormValue {
  id?: string;
}

const emptyValue = (scheduledFor: string): EntryFormValue => ({
  area: "",
  brief: "",
  channel: "article",
  scheduledFor,
  status: "idea",
  targetKeyword: "",
  title: "",
});

const valueFromEntry = (entry: ContentCalendarEntry): EntryFormValue => ({
  area: entry.area ?? "",
  brief: entry.brief ?? "",
  channel: entry.channel,
  scheduledFor: entry.scheduledFor.slice(0, 10),
  status: entry.status,
  targetKeyword: entry.targetKeyword ?? "",
  title: entry.title,
});

export interface CalendarEntryFormProps {
  /** Entry being edited, or null when creating. */
  entry: ContentCalendarEntry | null;
  /** Default date for new entries (YYYY-MM-DD). */
  initialDate: string;
  isBusy: boolean;
  onCancel: () => void;
  onDelete: (entry: ContentCalendarEntry) => void;
  onSubmit: (value: EntryFormSubmit) => void;
}

export const CalendarEntryForm = ({
  entry,
  initialDate,
  isBusy,
  onCancel,
  onDelete,
  onSubmit,
}: CalendarEntryFormProps) => {
  const [value, setValue] = useState<EntryFormValue>(() =>
    entry ? valueFromEntry(entry) : emptyValue(initialDate)
  );

  // Reset the form whenever a different entry (or day) is opened.
  useEffect(() => {
    setValue(entry ? valueFromEntry(entry) : emptyValue(initialDate));
  }, [entry, initialDate]);

  const patch = (fields: Partial<EntryFormValue>) =>
    setValue((current) => ({ ...current, ...fields }));

  const productionAction = useMemo(
    () => (entry ? buildCalendarEntryAction(entry) : null),
    [entry]
  );

  return (
    <form
      className="cal-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ ...value, id: entry?.id });
      }}
    >
      <h3>{entry ? "Edit entry" : "New entry"}</h3>

      <label htmlFor="cal-entry-title">
        <span>Title</span>
        <input
          id="cal-entry-title"
          maxLength={160}
          onChange={(event) => patch({ title: event.currentTarget.value })}
          placeholder="What I check first after a hail storm"
          required
          type="text"
          value={value.title}
        />
      </label>

      <div className="cal-form__row">
        <label htmlFor="cal-entry-channel">
          <span>Channel</span>
          <select
            id="cal-entry-channel"
            onChange={(event) => {
              const next = event.currentTarget.value;
              if ((CONTENT_CHANNELS as readonly string[]).includes(next)) {
                patch({ channel: next as ContentChannel });
              }
            }}
            value={value.channel}
          >
            {CONTENT_CHANNELS.map((channel) => (
              <option key={channel} value={channel}>
                {channelLabels[channel]}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="cal-entry-status">
          <span>Status</span>
          <select
            id="cal-entry-status"
            onChange={(event) => {
              const next = event.currentTarget.value;
              if ((CONTENT_STATUSES as readonly string[]).includes(next)) {
                patch({ status: next as ContentStatus });
              }
            }}
            value={value.status}
          >
            {CONTENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="cal-entry-date">
          <span>Date</span>
          <input
            id="cal-entry-date"
            onChange={(event) =>
              patch({ scheduledFor: event.currentTarget.value })
            }
            required
            type="date"
            value={value.scheduledFor}
          />
        </label>
      </div>

      <label htmlFor="cal-entry-keyword">
        <span>Target keyword</span>
        <input
          id="cal-entry-keyword"
          maxLength={160}
          onChange={(event) =>
            patch({ targetKeyword: event.currentTarget.value })
          }
          placeholder="hail damage roof inspection georgetown tx"
          type="text"
          value={value.targetKeyword}
        />
      </label>

      <label htmlFor="cal-entry-area">
        <span>Neighborhood / city focus</span>
        <input
          id="cal-entry-area"
          maxLength={140}
          onChange={(event) => patch({ area: event.currentTarget.value })}
          placeholder="Georgetown"
          type="text"
          value={value.area}
        />
      </label>

      <label htmlFor="cal-entry-brief">
        <span>Angle / brief</span>
        <textarea
          id="cal-entry-brief"
          maxLength={1400}
          onChange={(event) => patch({ brief: event.currentTarget.value })}
          placeholder="Plain-spoken walk-through of what an adjuster looks for, ending with the free roof-check offer."
          rows={4}
          value={value.brief}
        />
      </label>

      <div className="cal-form__actions">
        <button className="desk-primary-link" disabled={isBusy} type="submit">
          {entry ? "Save changes" : "Add to calendar"}
        </button>
        <button
          className="desk-text-link"
          disabled={isBusy}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        {entry ? (
          <button
            className="desk-text-link desk-text-link--danger"
            disabled={isBusy}
            onClick={() => onDelete(entry)}
            type="button"
          >
            Delete
          </button>
        ) : null}
      </div>

      {productionAction ? (
        <div className="cal-form__handoff">
          <div>
            <span>Production action</span>
            <p>{productionAction.description}</p>
          </div>
          <TransitionLink
            className="desk-primary-link"
            to={productionAction.href}
          >
            <SendDiagonal aria-hidden height={17} width={17} />
            {productionAction.label}
          </TransitionLink>
        </div>
      ) : (
        <p className="cal-form__hint">
          Save this {channelLabels[value.channel].toLowerCase()} before opening
          a production tool.
        </p>
      )}
    </form>
  );
};
