/**
 * Shared domain logic for the content calendar.
 *
 * Pure date math and normalization used by both the /calendar page and the
 * Desk dashboard widget. Server-side persistence lives in
 * `api/lib/content-calendar.ts`; this module never touches the network.
 */

export const CONTENT_CHANNELS = [
  "article",
  "neighborhood-post",
  "google-post",
  "email",
  "ad",
  "postcard",
  "video",
] as const;

export type ContentChannel = (typeof CONTENT_CHANNELS)[number];

export const CONTENT_STATUSES = ["idea", "scheduled", "published"] as const;

export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const channelLabels: Record<ContentChannel, string> = {
  ad: "Ad",
  article: "Article",
  email: "Email",
  "google-post": "Google post",
  "neighborhood-post": "Neighborhood post",
  postcard: "Postcard",
  video: "Video",
};

export const statusLabels: Record<ContentStatus, string> = {
  idea: "Idea",
  published: "Published",
  scheduled: "Scheduled",
};

/** Where each channel's draft gets built inside the app. */
export const channelWorkspaceHrefs: Record<ContentChannel, string> = {
  ad: "/ads",
  article: "/marketing",
  email: "/emails",
  "google-post": "/marketing",
  "neighborhood-post": "/marketing",
  postcard: "/ads",
  video: "/advertising",
};

const AD_CANVAS_CHANNELS = new Set<ContentChannel>(["ad", "postcard", "video"]);

export interface CalendarEntryAction {
  description: string;
  href: string;
  label: string;
}

const describeEntryForPrompt = (entry: ContentCalendarEntry): string => {
  const details = [
    `Channel: ${channelLabels[entry.channel]}`,
    `Scheduled for: ${entry.scheduledFor.slice(0, 10)}`,
    entry.area ? `Area: ${entry.area}` : null,
    entry.targetKeyword ? `Target keyword: ${entry.targetKeyword}` : null,
    entry.brief ? `Brief: ${entry.brief}` : null,
  ].filter(Boolean);

  return [`Title: ${entry.title}`, ...details].join("\n");
};

export const buildCalendarEntryPrompt = (
  entry: ContentCalendarEntry
): string => {
  const channel = channelLabels[entry.channel].toLowerCase();
  return [
    `Help me produce this ${channel} from the content calendar.`,
    describeEntryForPrompt(entry),
    "Use Tandra's first-person voice, keep the wording plain-spoken, and use Sanity writing tools when the draft should become site content.",
  ].join("\n\n");
};

const calendarActionParams = (entry: ContentCalendarEntry): URLSearchParams => {
  const params = new URLSearchParams({
    calendarChannel: entry.channel,
    calendarDate: entry.scheduledFor.slice(0, 10),
    calendarEntryId: entry.id,
    calendarTitle: entry.title,
  });

  if (entry.area) {
    params.set("calendarArea", entry.area);
  }
  if (entry.brief) {
    params.set("calendarBrief", entry.brief);
  }
  if (entry.targetKeyword) {
    params.set("calendarKeyword", entry.targetKeyword);
  }

  return params;
};

export const buildCalendarEntryAction = (
  entry: ContentCalendarEntry
): CalendarEntryAction => {
  const params = calendarActionParams(entry);

  if (AD_CANVAS_CHANNELS.has(entry.channel)) {
    return {
      description: "Loads the calendar brief into the ad canvas.",
      href: `/ads?${params.toString()}`,
      label: "Open in ad canvas",
    };
  }

  if (entry.channel === "email") {
    return {
      description: "Starts an email draft from this calendar item.",
      href: `/emails?${params.toString()}`,
      label: "Draft email",
    };
  }

  params.set("calendarPrompt", buildCalendarEntryPrompt(entry));
  return {
    description: "Sends the brief to the Sanity-backed writing agent.",
    href: `/marketing?${params.toString()}`,
    label: "Open writing agent",
  };
};

export interface ContentCalendarEntry {
  area?: string;
  brief?: string;
  channel: ContentChannel;
  createdAt: string;
  createdBy: string;
  generatedBy: "calendar-agent" | "manual";
  id: string;
  /** YYYY-MM-DD */
  scheduledFor: string;
  sourceLeadId?: string;
  status: ContentStatus;
  targetKeyword?: string;
  title: string;
}

/** A proposal returned by the calendar agent, before it is saved. */
export interface CalendarPlanProposal {
  area?: string;
  brief: string;
  channel: ContentChannel;
  /** YYYY-MM-DD */
  scheduledFor: string;
  targetKeyword?: string;
  title: string;
}

export interface CalendarDay {
  /** YYYY-MM-DD */
  date: string;
  dayOfMonth: number;
  inMonth: boolean;
  isToday: boolean;
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/u;
const DAYS_PER_WEEK = 7;
const WEEKS_PER_GRID = 6;

export const toIsoDate = (date: Date): string => {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Parse a YYYY-MM-DD string into a local-time Date. Returns null for anything
 * that is not a real calendar date (e.g. 2026-02-30).
 */
export const parseIsoDate = (value: unknown): Date | null => {
  if (typeof value !== "string") {
    return null;
  }
  const match = value.trim().match(ISO_DATE_RE);
  if (!match) {
    return null;
  }
  const [, rawYear, rawMonth, rawDay] = match;
  const year = Number(rawYear);
  const monthIndex = Number(rawMonth) - 1;
  const day = Number(rawDay);
  const date = new Date(year, monthIndex, day);
  const isRealDate =
    date.getFullYear() === year &&
    date.getMonth() === monthIndex &&
    date.getDate() === day;
  return isRealDate ? date : null;
};

export interface MonthRef {
  /** 1-12 */
  month: number;
  year: number;
}

export const monthKey = ({ month, year }: MonthRef): string =>
  `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;

export const monthRefFromDate = (date: Date): MonthRef => ({
  month: date.getMonth() + 1,
  year: date.getFullYear(),
});

export const addMonths = (ref: MonthRef, delta: number): MonthRef => {
  const date = new Date(ref.year, ref.month - 1 + delta, 1);
  return monthRefFromDate(date);
};

export const monthTitle = (ref: MonthRef): string =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(ref.year, ref.month - 1, 1));

/** First and last ISO dates shown on the 6-week grid for a month. */
export const monthGridRange = (
  ref: MonthRef
): { end: string; start: string } => {
  const grid = buildMonthGrid(ref);
  const firstDay = grid[0]?.[0];
  const lastWeek = grid.at(-1);
  const lastDay = lastWeek?.at(-1);
  return {
    end: lastDay?.date ?? toIsoDate(new Date(ref.year, ref.month, 0)),
    start: firstDay?.date ?? toIsoDate(new Date(ref.year, ref.month - 1, 1)),
  };
};

/**
 * Build a Sunday-first 6-week grid covering the month, including leading and
 * trailing days from adjacent months so every row is a full week.
 */
export const buildMonthGrid = (
  ref: MonthRef,
  today: Date = new Date()
): CalendarDay[][] => {
  const firstOfMonth = new Date(ref.year, ref.month - 1, 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - firstOfMonth.getDay());
  const todayIso = toIsoDate(today);

  const weeks: CalendarDay[][] = [];
  const cursor = new Date(gridStart);
  for (let week = 0; week < WEEKS_PER_GRID; week += 1) {
    const days: CalendarDay[] = [];
    for (let day = 0; day < DAYS_PER_WEEK; day += 1) {
      const iso = toIsoDate(cursor);
      days.push({
        date: iso,
        dayOfMonth: cursor.getDate(),
        inMonth: cursor.getMonth() === ref.month - 1,
        isToday: iso === todayIso,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(days);
  }
  return weeks;
};

export const groupEntriesByDay = (
  entries: readonly ContentCalendarEntry[]
): Map<string, ContentCalendarEntry[]> => {
  const byDay = new Map<string, ContentCalendarEntry[]>();
  for (const entry of entries) {
    const key = entry.scheduledFor.slice(0, 10);
    const bucket = byDay.get(key);
    if (bucket) {
      bucket.push(entry);
    } else {
      byDay.set(key, [entry]);
    }
  }
  return byDay;
};

/**
 * Entries scheduled from `from` (inclusive) through the next `days` days,
 * sorted soonest-first. Used by the Desk "coming up" widget.
 */
export const entriesForNextDays = (
  entries: readonly ContentCalendarEntry[],
  days: number,
  from: Date = new Date()
): ContentCalendarEntry[] => {
  const start = toIsoDate(from);
  const endDate = new Date(from);
  endDate.setDate(endDate.getDate() + days);
  const end = toIsoDate(endDate);

  return entries
    .filter((entry) => {
      const day = entry.scheduledFor.slice(0, 10);
      return day >= start && day <= end;
    })
    .toSorted((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
};

const isContentChannel = (value: unknown): value is ContentChannel =>
  typeof value === "string" &&
  (CONTENT_CHANNELS as readonly string[]).includes(value);

const asTrimmedString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const MAX_PROPOSALS = 24;

/**
 * Validate raw LLM output into calendar plan proposals. Drops entries with
 * missing titles, unknown channels, or dates that are invalid or outside the
 * requested month. Never throws — malformed input yields an empty list.
 */
export const parsePlanProposals = (
  raw: unknown,
  month: MonthRef
): CalendarPlanProposal[] => {
  const list = Array.isArray(raw)
    ? raw
    : (raw as { proposals?: unknown })?.proposals;
  if (!Array.isArray(list)) {
    return [];
  }

  const prefix = monthKey(month);
  const proposals: CalendarPlanProposal[] = [];
  for (const item of list.slice(0, MAX_PROPOSALS)) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const record = item as Record<string, unknown>;
    const { channel } = record;
    const title = asTrimmedString(record.title);
    const scheduledFor = asTrimmedString(record.scheduledFor).slice(0, 10);
    const dateOk =
      scheduledFor.startsWith(prefix) && parseIsoDate(scheduledFor) !== null;
    if (!(title && isContentChannel(channel) && dateOk)) {
      continue;
    }
    proposals.push({
      area: asTrimmedString(record.area) || undefined,
      brief: asTrimmedString(record.brief),
      channel,
      scheduledFor,
      targetKeyword: asTrimmedString(record.targetKeyword) || undefined,
      title,
    });
  }
  return proposals;
};
