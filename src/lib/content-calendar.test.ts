import { describe, expect, it } from "vitest";

import type { ContentCalendarEntry } from "./content-calendar";
import {
  addMonths,
  buildCalendarEntryAction,
  buildMonthGrid,
  entriesForNextDays,
  groupEntriesByDay,
  monthGridRange,
  monthKey,
  parseIsoDate,
  parsePlanProposals,
  toIsoDate,
} from "./content-calendar";

const makeEntry = (
  overrides: Partial<ContentCalendarEntry> & { id: string }
): ContentCalendarEntry => ({
  channel: "article",
  createdAt: "2026-07-01T00:00:00.000Z",
  createdBy: "test@example.com",
  generatedBy: "manual",
  scheduledFor: "2026-07-10",
  status: "idea",
  title: "Test entry",
  ...overrides,
});

describe(parseIsoDate, () => {
  it("parses a valid date in local time", () => {
    const date = parseIsoDate("2026-07-04");
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(6);
    expect(date?.getDate()).toBe(4);
  });

  it("rejects impossible calendar dates", () => {
    expect(parseIsoDate("2026-02-30")).toBeNull();
    expect(parseIsoDate("2025-02-29")).toBeNull();
    expect(parseIsoDate("2026-13-01")).toBeNull();
  });

  it("accepts leap-day in a leap year", () => {
    expect(parseIsoDate("2028-02-29")).not.toBeNull();
  });

  it("rejects non-strings and junk", () => {
    expect(parseIsoDate({})).toBeNull();
    expect(parseIsoDate(20_260_704)).toBeNull();
    expect(parseIsoDate("July 4, 2026")).toBeNull();
    expect(parseIsoDate("")).toBeNull();
  });
});

describe(toIsoDate, () => {
  it("zero-pads month and day", () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe(buildMonthGrid, () => {
  it("always returns 6 weeks of 7 days", () => {
    const grid = buildMonthGrid({ month: 7, year: 2026 });
    expect(grid).toHaveLength(6);
    for (const week of grid) {
      expect(week).toHaveLength(7);
    }
  });

  it("starts on the Sunday on or before the 1st", () => {
    // July 1, 2026 is a Wednesday; the grid should start Sunday June 28.
    const grid = buildMonthGrid({ month: 7, year: 2026 });
    expect(grid[0]?.[0]?.date).toBe("2026-06-28");
    expect(grid[0]?.[0]?.inMonth).toBeFalsy();
    expect(grid[0]?.[3]?.date).toBe("2026-07-01");
    expect(grid[0]?.[3]?.inMonth).toBeTruthy();
  });

  it("handles February in a non-leap year", () => {
    const grid = buildMonthGrid({ month: 2, year: 2026 });
    const inMonthDays = grid.flat().filter((day) => day.inMonth);
    expect(inMonthDays).toHaveLength(28);
    expect(inMonthDays[0]?.date).toBe("2026-02-01");
    expect(inMonthDays.at(-1)?.date).toBe("2026-02-28");
  });

  it("handles February in a leap year", () => {
    const grid = buildMonthGrid({ month: 2, year: 2028 });
    const inMonthDays = grid.flat().filter((day) => day.inMonth);
    expect(inMonthDays).toHaveLength(29);
    expect(inMonthDays.at(-1)?.date).toBe("2028-02-29");
  });

  it("marks today only when it falls inside the grid", () => {
    const today = new Date(2026, 6, 15);
    const julyGrid = buildMonthGrid({ month: 7, year: 2026 }, today);
    const todayCells = julyGrid.flat().filter((day) => day.isToday);
    expect(todayCells).toHaveLength(1);
    expect(todayCells[0]?.date).toBe("2026-07-15");

    const marchGrid = buildMonthGrid({ month: 3, year: 2026 }, today);
    expect(marchGrid.flat().some((day) => day.isToday)).toBeFalsy();
  });
});

describe(monthGridRange, () => {
  it("covers leading and trailing out-of-month days", () => {
    const range = monthGridRange({ month: 7, year: 2026 });
    expect(range.start).toBe("2026-06-28");
    expect(range.end).toBe("2026-08-08");
  });
});

describe("month navigation helpers", () => {
  it("wraps across year boundaries", () => {
    expect(addMonths({ month: 12, year: 2026 }, 1)).toStrictEqual({
      month: 1,
      year: 2027,
    });
    expect(addMonths({ month: 1, year: 2026 }, -1)).toStrictEqual({
      month: 12,
      year: 2025,
    });
  });

  it("formats month keys with padding", () => {
    expect(monthKey({ month: 3, year: 2026 })).toBe("2026-03");
  });
});

describe(groupEntriesByDay, () => {
  it("groups multiple entries under the same day", () => {
    const entries = [
      makeEntry({ id: "a", scheduledFor: "2026-07-10" }),
      makeEntry({ id: "b", scheduledFor: "2026-07-10" }),
      makeEntry({ id: "c", scheduledFor: "2026-07-11" }),
    ];
    const grouped = groupEntriesByDay(entries);
    expect(grouped.get("2026-07-10")?.map((entry) => entry.id)).toStrictEqual([
      "a",
      "b",
    ]);
    expect(grouped.get("2026-07-11")).toHaveLength(1);
  });

  it("normalizes datetime strings down to the day", () => {
    const entries = [
      makeEntry({ id: "a", scheduledFor: "2026-07-10T09:30:00Z" }),
    ];
    expect(groupEntriesByDay(entries).has("2026-07-10")).toBeTruthy();
  });
});

describe(entriesForNextDays, () => {
  const from = new Date(2026, 6, 7);

  it("includes today through the horizon, sorted soonest-first", () => {
    const entries = [
      makeEntry({ id: "later", scheduledFor: "2026-07-13" }),
      makeEntry({ id: "today", scheduledFor: "2026-07-07" }),
      makeEntry({ id: "past", scheduledFor: "2026-07-06" }),
      makeEntry({ id: "beyond", scheduledFor: "2026-07-15" }),
    ];
    const upcoming = entriesForNextDays(entries, 7, from);
    expect(upcoming.map((entry) => entry.id)).toStrictEqual(["today", "later"]);
  });

  it("returns empty for no matches", () => {
    expect(
      entriesForNextDays(
        [makeEntry({ id: "x", scheduledFor: "2026-09-01" })],
        7,
        from
      )
    ).toStrictEqual([]);
  });
});

describe(parsePlanProposals, () => {
  const month = { month: 7, year: 2026 };

  it("accepts a bare array and a { proposals } wrapper", () => {
    const proposal = {
      brief: "Explain hail damage claims",
      channel: "article",
      scheduledFor: "2026-07-14",
      title: "Hail damage claims 101",
    };
    expect(parsePlanProposals([proposal], month)).toHaveLength(1);
    expect(parsePlanProposals({ proposals: [proposal] }, month)).toHaveLength(
      1
    );
  });

  it("accepts ad proposals", () => {
    const [proposal] = parsePlanProposals(
      [
        {
          brief: "Turn the recent hail checks into a simple ad.",
          channel: "ad",
          scheduledFor: "2026-07-22",
          title: "Need a second set of eyes on your roof?",
        },
      ],
      month
    );
    expect(proposal?.channel).toBe("ad");
  });

  it("drops proposals outside the requested month", () => {
    const result = parsePlanProposals(
      [
        {
          brief: "b",
          channel: "email",
          scheduledFor: "2026-08-02",
          title: "Wrong month",
        },
        {
          brief: "b",
          channel: "email",
          scheduledFor: "2026-07-02",
          title: "Right month",
        },
      ],
      month
    );
    expect(result.map((p) => p.title)).toStrictEqual(["Right month"]);
  });

  it("drops unknown channels, invalid dates, and missing titles", () => {
    const result = parsePlanProposals(
      [
        {
          brief: "b",
          channel: "tiktok",
          scheduledFor: "2026-07-02",
          title: "Bad channel",
        },
        {
          brief: "b",
          channel: "email",
          scheduledFor: "2026-07-32",
          title: "Bad date",
        },
        { brief: "b", channel: "email", scheduledFor: "2026-07-02", title: "" },
        null,
        "junk",
      ],
      month
    );
    expect(result).toStrictEqual([]);
  });

  it("returns empty for malformed roots", () => {
    expect(parsePlanProposals(null, month)).toStrictEqual([]);
    expect(parsePlanProposals("nope", month)).toStrictEqual([]);
    expect(parsePlanProposals({ proposals: "nope" }, month)).toStrictEqual([]);
  });

  it("trims optional fields and drops empties", () => {
    const [proposal] = parsePlanProposals(
      [
        {
          area: "  Georgetown ",
          brief: " Post angle ",
          channel: "neighborhood-post",
          scheduledFor: "2026-07-20",
          targetKeyword: "  ",
          title: " Roof check ",
        },
      ],
      month
    );
    expect(proposal).toStrictEqual({
      area: "Georgetown",
      brief: "Post angle",
      channel: "neighborhood-post",
      scheduledFor: "2026-07-20",
      targetKeyword: undefined,
      title: "Roof check",
    });
  });
});

describe(buildCalendarEntryAction, () => {
  it("sends ad entries to the ad canvas with calendar context", () => {
    const action = buildCalendarEntryAction(
      makeEntry({
        brief: "A calm roof-check offer for recent hail.",
        channel: "ad",
        id: "drafts.contentCalendarEntry.ad",
        scheduledFor: "2026-07-22",
        title: "Need a second set of eyes on your roof?",
      })
    );
    expect(action.href).toContain("/ads?");
    expect(action.href).toContain("calendarChannel=ad");
    expect(action.label).toBe("Open in ad canvas");
  });

  it("sends writing entries to the Sanity-backed marketing agent", () => {
    const action = buildCalendarEntryAction(
      makeEntry({
        channel: "article",
        id: "drafts.contentCalendarEntry.article",
        title: "What I check first after hail",
      })
    );
    expect(action.href).toContain("/marketing?");
    expect(action.href).toContain("calendarPrompt=");
  });
});
