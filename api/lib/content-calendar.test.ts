import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();
const fetchMock = vi.fn();
const deleteMock = vi.fn();
const commitMock = vi.fn();
const setMock = vi.fn(() => ({ commit: commitMock }));
const patchMock = vi.fn(() => ({ set: setMock }));

vi.mock("@sanity/client", () => ({
  createClient: () => ({
    create: createMock,
    delete: deleteMock,
    fetch: fetchMock,
    patch: patchMock,
  }),
}));

const {
  createCalendarEntry,
  deleteCalendarEntry,
  listCalendarEntries,
  normalizeEntryPayload,
  updateCalendarEntry,
} = await import("./content-calendar");

const TITLE_ERROR_RE = /title/i;
const DATE_FORMAT_ERROR_RE = /YYYY-MM-DD/u;
const CHANNEL_ERROR_RE = /channel/i;
const DRAFT_ID_RE = /^drafts\.deskBoardItem\./u;

const TOKEN = { sanityWriteToken: "test-token" };
const WRITE = {
  createdBy: "dallas@example.com",
  sanityWriteToken: "test-token",
};

const validPayload = {
  brief: "Walk through what an adjuster looks for",
  channel: "article",
  scheduledFor: "2026-07-14",
  targetKeyword: "roof adjuster inspection texas",
  title: "What the adjuster checks first",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("normalizeEntryPayload", () => {
  it("returns normalized fields for a valid payload", () => {
    const result = normalizeEntryPayload(validPayload);
    expect(result).toMatchObject({
      channel: "article",
      scheduledFor: "2026-07-14",
      status: "idea",
      title: "What the adjuster checks first",
    });
  });

  it("rejects missing titles", () => {
    expect(normalizeEntryPayload({ ...validPayload, title: "  " })).toMatch(
      TITLE_ERROR_RE
    );
  });

  it("rejects bad dates", () => {
    expect(
      normalizeEntryPayload({ ...validPayload, scheduledFor: "2026-02-30" })
    ).toMatch(DATE_FORMAT_ERROR_RE);
    expect(
      normalizeEntryPayload({ ...validPayload, scheduledFor: "July 14" })
    ).toMatch(DATE_FORMAT_ERROR_RE);
  });

  it("rejects unknown channels", () => {
    expect(
      normalizeEntryPayload({ ...validPayload, channel: "tiktok" })
    ).toMatch(CHANNEL_ERROR_RE);
  });

  it("accepts ad entries", () => {
    const result = normalizeEntryPayload({ ...validPayload, channel: "ad" });
    expect(result).toMatchObject({ channel: "ad" });
  });

  it("falls back to safe defaults for status and generatedBy", () => {
    const result = normalizeEntryPayload({
      ...validPayload,
      generatedBy: "hacker",
      status: "bogus",
    });
    expect(result).toMatchObject({ generatedBy: "manual", status: "idea" });
  });
});

describe("createCalendarEntry", () => {
  it("requires a Sanity write token", async () => {
    const result = await createCalendarEntry(validPayload, {
      createdBy: "x",
      sanityWriteToken: undefined,
    });
    expect(result.status).toBe(500);
    expect(result.body.ok).toBe(false);
  });

  it("returns 400 without writing for invalid payloads", async () => {
    const result = await createCalendarEntry({ title: "" }, WRITE);
    expect(result.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("creates a draft document and echoes the record", async () => {
    createMock.mockImplementation((doc: Record<string, unknown>) =>
      Promise.resolve(doc)
    );
    const result = await createCalendarEntry(validPayload, WRITE);

    expect(result.status).toBe(200);
    expect(createMock).toHaveBeenCalledTimes(1);
    const doc = createMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(String(doc._id)).toMatch(DRAFT_ID_RE);
    expect(doc._type).toBe("deskBoardItem");
    expect(doc.detail).toBe("Walk through what an adjuster looks for");
    expect(doc.kind).toBe("content");
    expect(doc.publishDate).toBe("2026-07-14");
    expect(doc.createdBy).toBe("dallas@example.com");
    expect(result.body.entry).toMatchObject({
      channel: "article",
      scheduledFor: "2026-07-14",
      title: "What the adjuster checks first",
    });
  });

  it("marks calendar-agent entries as generated Desk content", async () => {
    createMock.mockImplementation((doc: Record<string, unknown>) =>
      Promise.resolve(doc)
    );
    await createCalendarEntry(
      { ...validPayload, generatedBy: "calendar-agent" },
      WRITE
    );
    const doc = createMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(doc.origin).toBe("generated");
  });
});

describe("listCalendarEntries", () => {
  it("validates range dates", async () => {
    const result = await listCalendarEntries({ start: "not-a-date" }, TOKEN);
    expect(result.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("passes the range to the GROQ query and maps records", async () => {
    fetchMock.mockResolvedValue([
      {
        _id: "drafts.deskBoardItem.1",
        buyerStage: "consideration",
        channel: "Email",
        createdAt: "2026-07-01T00:00:00Z",
        createdBy: "dallas@example.com",
        origin: "generated",
        publishDate: "2026-07-08",
        status: "scheduled",
        title: "Partner intro follow-up",
      },
    ]);

    const result = await listCalendarEntries(
      { end: "2026-08-08", start: "2026-06-28" },
      TOKEN
    );

    expect(result.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), {
      end: "2026-08-08",
      start: "2026-06-28",
    });
    expect(result.body.entries?.[0]).toMatchObject({
      channel: "email",
      generatedBy: "calendar-agent",
      status: "scheduled",
      title: "Partner intro follow-up",
    });
  });
});

describe("updateCalendarEntry", () => {
  it("rejects ids outside the draft prefix", async () => {
    const result = await updateCalendarEntry(
      { id: "siteSettings", status: "published" },
      TOKEN
    );
    expect(result.status).toBe(400);
    expect(patchMock).not.toHaveBeenCalled();
  });

  it("rejects empty patches", async () => {
    const result = await updateCalendarEntry(
      { id: "drafts.deskBoardItem.1" },
      TOKEN
    );
    expect(result.status).toBe(400);
  });

  it("validates provided fields", async () => {
    const result = await updateCalendarEntry(
      { id: "drafts.deskBoardItem.1", scheduledFor: "bogus" },
      TOKEN
    );
    expect(result.status).toBe(400);
    expect(patchMock).not.toHaveBeenCalled();
  });

  it("patches only provided fields", async () => {
    commitMock.mockResolvedValue({
      _id: "drafts.deskBoardItem.1",
      channel: "Blog",
      publishDate: "2026-07-20",
      status: "scheduled",
      title: "Moved entry",
    });

    const result = await updateCalendarEntry(
      {
        id: "drafts.deskBoardItem.1",
        scheduledFor: "2026-07-20",
        status: "scheduled",
      },
      TOKEN
    );

    expect(result.status).toBe(200);
    expect(patchMock).toHaveBeenCalledWith("drafts.deskBoardItem.1");
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        publishDate: "2026-07-20",
        status: "scheduled",
      })
    );
    expect(result.body.entry?.status).toBe("scheduled");
  });
});

describe("deleteCalendarEntry", () => {
  it("rejects unknown ids", async () => {
    const result = await deleteCalendarEntry("drafts.deskLead.1", TOKEN);
    expect(result.status).toBe(400);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("deletes valid draft ids", async () => {
    deleteMock.mockResolvedValue({});
    const result = await deleteCalendarEntry("drafts.deskBoardItem.9", TOKEN);
    expect(result.status).toBe(200);
    expect(deleteMock).toHaveBeenCalledWith("drafts.deskBoardItem.9");
  });
});
