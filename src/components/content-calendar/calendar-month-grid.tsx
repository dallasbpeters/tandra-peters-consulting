import { Plus } from "iconoir-react";
import { useMemo } from "react";

import type {
  ContentCalendarEntry,
  MonthRef,
} from "../../lib/content-calendar";
import {
  buildMonthGrid,
  channelLabels,
  groupEntriesByDay,
} from "../../lib/content-calendar";

const WEEKDAY_LABELS = [
  { long: "Sunday", short: "Sun" },
  { long: "Monday", short: "Mon" },
  { long: "Tuesday", short: "Tue" },
  { long: "Wednesday", short: "Wed" },
  { long: "Thursday", short: "Thu" },
  { long: "Friday", short: "Fri" },
  { long: "Saturday", short: "Sat" },
] as const;

const dayCellClass = (inMonth: boolean, isToday: boolean): string => {
  const classes = ["cal-day"];
  if (!inMonth) {
    classes.push("cal-day--outside");
  }
  if (isToday) {
    classes.push("cal-day--today");
  }
  return classes.join(" ");
};

const readableDate = (iso: string): string => {
  const [year, month, day] = iso.split("-").map(Number);
  if (!(year && month && day)) {
    return iso;
  }
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
};

export interface CalendarMonthGridProps {
  entries: readonly ContentCalendarEntry[];
  month: MonthRef;
  onAddToDay?: (isoDate: string) => void;
  onSelectEntry: (entry: ContentCalendarEntry) => void;
}

export const CalendarMonthGrid = ({
  entries,
  month,
  onAddToDay,
  onSelectEntry,
}: CalendarMonthGridProps) => {
  const weeks = useMemo(() => buildMonthGrid(month), [month]);
  const entriesByDay = useMemo(() => groupEntriesByDay(entries), [entries]);

  return (
    <div className="cal-grid">
      <div aria-hidden className="cal-weekdays">
        {WEEKDAY_LABELS.map((weekday) => (
          <span key={weekday.short}>{weekday.short}</span>
        ))}
      </div>
      {weeks.map((week) => (
        <div className="cal-week" key={week[0]?.date}>
          {week.map((day) => {
            const dayEntries = entriesByDay.get(day.date) ?? [];
            return (
              <div
                className={dayCellClass(day.inMonth, day.isToday)}
                key={day.date}
              >
                <div className="cal-day__head">
                  <span aria-hidden className="cal-day__number">
                    {day.dayOfMonth}
                  </span>
                  {onAddToDay ? (
                    <button
                      aria-label={`Add entry on ${readableDate(day.date)}`}
                      className="cal-day__add"
                      onClick={() => onAddToDay(day.date)}
                      type="button"
                    >
                      <Plus aria-hidden height={14} width={14} />
                    </button>
                  ) : null}
                </div>
                {dayEntries.length > 0 ? (
                  <ul className="cal-day__entries">
                    {dayEntries.map((entry) => (
                      <li key={entry.id}>
                        <button
                          aria-label={`${entry.title} — ${channelLabels[entry.channel]} on ${readableDate(day.date)}`}
                          className={`cal-chip cal-chip--${entry.channel} cal-chip--status-${entry.status}`}
                          onClick={() => onSelectEntry(entry)}
                          title={entry.title}
                          type="button"
                        >
                          <span className="cal-chip__channel">
                            {channelLabels[entry.channel]}
                          </span>
                          <span className="cal-chip__title">{entry.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
