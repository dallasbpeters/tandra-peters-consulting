import { usePostHog } from "@posthog/react";
import {
  Calendar,
  Desk,
  NavArrowLeft,
  NavArrowRight,
  WarningTriangle,
} from "iconoir-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CalendarEntryForm } from "../components/content-calendar/calendar-entry-form";
import type { EntryFormSubmit } from "../components/content-calendar/calendar-entry-form";
import { CalendarMonthGrid } from "../components/content-calendar/calendar-month-grid";
import { CalendarPlanPanel } from "../components/content-calendar/calendar-plan-panel";
import { SitePageChrome } from "../components/site-page-chrome";
import { TransitionLink } from "../components/transition-link";
import { useGoogleDashboardAuth } from "../context/dashboard-auth-context";
import { usePageMetadata } from "../hooks/use-page-metadata";
import type {
  CalendarPlanProposal,
  ContentCalendarEntry,
} from "../lib/content-calendar";
import {
  addMonths,
  monthGridRange,
  monthRefFromDate,
  monthTitle,
  toIsoDate,
} from "../lib/content-calendar";
import { layoutClass } from "../styles/layout-classes";

import "../styles/desk.css";
import "../styles/content-calendar.css";

type AuthHeader = { Authorization: string } | null;

interface CalendarApiResponse {
  entries?: ContentCalendarEntry[];
  entry?: ContentCalendarEntry;
  error?: string;
  ok: boolean;
}

interface StatusMessage {
  text: string;
  tone: "error" | "success";
}

const parseCalendarResponse = async (
  response: Response
): Promise<CalendarApiResponse> => {
  try {
    return (await response.json()) as CalendarApiResponse;
  } catch {
    return {
      error: response.ok
        ? undefined
        : "The calendar returned an empty response.",
      ok: response.ok,
    };
  }
};

const useCalendarEntries = (
  authHeader: AuthHeader,
  range: { end: string; start: string }
) => {
  const [entries, setEntries] = useState<ContentCalendarEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!authHeader) {
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({
        end: range.end,
        start: range.start,
      });
      const response = await fetch(`/api/content-calendar?${params}`, {
        headers: authHeader,
      });
      const body = await parseCalendarResponse(response);
      if (response.ok && body.ok && body.entries) {
        setEntries(body.entries);
      } else {
        setLoadError(body.error ?? "Could not load the calendar.");
      }
    } catch {
      setLoadError("Could not load the calendar.");
    } finally {
      setIsLoading(false);
    }
  }, [authHeader, range.end, range.start]);

  useEffect(() => {
    load();
  }, [load]);

  const saveEntry = useCallback(
    async (value: EntryFormSubmit): Promise<string | null> => {
      if (!authHeader) {
        return "Sign in to edit the calendar.";
      }
      try {
        const isUpdate = Boolean(value.id);
        const response = await fetch("/api/content-calendar", {
          body: JSON.stringify(value),
          headers: { ...authHeader, "Content-Type": "application/json" },
          method: isUpdate ? "PATCH" : "POST",
        });
        const body = await parseCalendarResponse(response);
        if (response.ok && body.ok) {
          await load();
          return null;
        }
        return body.error ?? "Could not save this entry.";
      } catch {
        return "Could not save this entry.";
      }
    },
    [authHeader, load]
  );

  const createFromProposal = useCallback(
    async (proposal: CalendarPlanProposal): Promise<string | null> => {
      if (!authHeader) {
        return "Sign in to edit the calendar.";
      }
      try {
        const response = await fetch("/api/content-calendar", {
          body: JSON.stringify({
            ...proposal,
            generatedBy: "calendar-agent",
            status: "idea",
          }),
          headers: { ...authHeader, "Content-Type": "application/json" },
          method: "POST",
        });
        const body = await parseCalendarResponse(response);
        if (response.ok && body.ok) {
          await load();
          return null;
        }
        return body.error ?? "Could not add this proposal.";
      } catch {
        return "Could not add this proposal.";
      }
    },
    [authHeader, load]
  );

  const deleteEntry = useCallback(
    async (entry: ContentCalendarEntry): Promise<string | null> => {
      if (!authHeader) {
        return "Sign in to edit the calendar.";
      }
      try {
        const response = await fetch(
          `/api/content-calendar?id=${encodeURIComponent(entry.id)}`,
          { headers: authHeader, method: "DELETE" }
        );
        const body = await parseCalendarResponse(response);
        if (response.ok && body.ok) {
          await load();
          return null;
        }
        return body.error ?? "Could not delete this entry.";
      } catch {
        return "Could not delete this entry.";
      }
    },
    [authHeader, load]
  );

  return {
    createFromProposal,
    deleteEntry,
    entries,
    isLoading,
    loadError,
    saveEntry,
  };
};

const AuthPanel = ({
  auth,
}: {
  auth: ReturnType<typeof useGoogleDashboardAuth>;
}) => (
  <section className="desk-auth">
    <WarningTriangle aria-hidden height={22} width={22} />
    <div>
      <h1>Sign in to the content calendar</h1>
      <p>Private publishing plan for Tandra&apos;s marketing work.</p>
      {auth.clientId ? <div ref={auth.buttonRef} /> : null}
      {auth.clientId ? null : (
        <p>
          Add <code>VITE_GOOGLE_CLIENT_ID</code> to enable dashboard sign-in.
        </p>
      )}
      {auth.authError ? <p>{auth.authError}</p> : null}
      {auth.clientId && !auth.ready ? <p>Loading Google sign-in...</p> : null}
    </div>
  </section>
);

interface EditorState {
  date: string;
  entry: ContentCalendarEntry | null;
  open: boolean;
}

const CalendarDashboard = ({
  auth,
}: {
  auth: ReturnType<typeof useGoogleDashboardAuth>;
}) => {
  const [month, setMonth] = useState(() => monthRefFromDate(new Date()));
  const [editor, setEditor] = useState<EditorState>({
    date: toIsoDate(new Date()),
    entry: null,
    open: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<StatusMessage | null>(null);

  const authHeader = useMemo<AuthHeader>(
    () => (auth.token ? { Authorization: `Bearer ${auth.token}` } : null),
    [auth.token]
  );
  const range = useMemo(() => monthGridRange(month), [month]);
  const {
    createFromProposal,
    deleteEntry,
    entries,
    isLoading,
    loadError,
    saveEntry,
  } = useCalendarEntries(authHeader, range);

  const openForDay = useCallback((isoDate: string) => {
    setEditor({ date: isoDate, entry: null, open: true });
    setMessage(null);
  }, []);

  const openForEntry = useCallback((entry: ContentCalendarEntry) => {
    setEditor({ date: entry.scheduledFor.slice(0, 10), entry, open: true });
    setMessage(null);
  }, []);

  const closeEditor = useCallback(() => {
    setEditor((current) => ({ ...current, entry: null, open: false }));
  }, []);

  const handleSubmit = useCallback(
    async (value: EntryFormSubmit) => {
      setIsSaving(true);
      const error = await saveEntry(value);
      setIsSaving(false);
      if (error) {
        setMessage({ text: error, tone: "error" });
        return;
      }
      setMessage({
        text: value.id ? "Entry updated." : "Entry added.",
        tone: "success",
      });
      closeEditor();
    },
    [closeEditor, saveEntry]
  );

  const handleDelete = useCallback(
    async (entry: ContentCalendarEntry) => {
      setIsSaving(true);
      const error = await deleteEntry(entry);
      setIsSaving(false);
      if (error) {
        setMessage({ text: error, tone: "error" });
        return;
      }
      setMessage({ text: "Entry deleted.", tone: "success" });
      closeEditor();
    },
    [closeEditor, deleteEntry]
  );

  return (
    <div className={layoutClass.containerFull}>
      <div className="desk cal">
        <header className="desk-hero">
          <div>
            <span className="desk-eyebrow">
              <Calendar aria-hidden height={18} width={18} />
              Content calendar
            </span>
            <h1>One month of outreach, planned before it&apos;s due.</h1>
            <p>
              Schedule articles, neighborhood posts, Google updates, emails,
              postcards, and video — grounded in the same Desk signals that
              drive canvassing and lead capture.
            </p>
          </div>
          <nav aria-label="Calendar shortcuts" className="desk-hero__actions">
            <TransitionLink className="desk-primary-link" to="/desk">
              <Desk aria-hidden height={18} width={18} />
              Back to Desk
            </TransitionLink>
          </nav>
        </header>

        <section aria-label="Month calendar" className="desk-section cal-board">
          <div className="cal-toolbar">
            <h2>{monthTitle(month)}</h2>
            <div className="cal-toolbar__nav">
              <button
                aria-label="Previous month"
                className="cal-nav-button"
                onClick={() => setMonth((current) => addMonths(current, -1))}
                type="button"
              >
                <NavArrowLeft aria-hidden height={18} width={18} />
              </button>
              <button
                className="desk-text-link"
                onClick={() => setMonth(monthRefFromDate(new Date()))}
                type="button"
              >
                Today
              </button>
              <button
                aria-label="Next month"
                className="cal-nav-button"
                onClick={() => setMonth((current) => addMonths(current, 1))}
                type="button"
              >
                <NavArrowRight aria-hidden height={18} width={18} />
              </button>
            </div>
          </div>

          {authHeader ? null : (
            <p className="desk-empty">Sign in to load and edit the calendar.</p>
          )}
          {loadError ? <p className="desk-empty">{loadError}</p> : null}
          {isLoading && entries.length === 0 ? (
            <p className="desk-empty">Loading the month...</p>
          ) : null}
          {message ? (
            <p
              className={`desk-capture-message desk-capture-message--${message.tone}`}
            >
              {message.text}
            </p>
          ) : null}

          <div className="cal-layout">
            <CalendarMonthGrid
              entries={entries}
              month={month}
              onAddToDay={openForDay}
              onSelectEntry={openForEntry}
            />
            {editor.open ? (
              <aside aria-label="Entry editor" className="cal-editor">
                <CalendarEntryForm
                  entry={editor.entry}
                  initialDate={editor.date}
                  isBusy={isSaving}
                  onCancel={closeEditor}
                  onDelete={handleDelete}
                  onSubmit={handleSubmit}
                />
              </aside>
            ) : null}
          </div>
        </section>

        <section className="desk-section">
          <CalendarPlanPanel
            authHeader={authHeader}
            month={month}
            onAccept={createFromProposal}
          />
        </section>
      </div>
    </div>
  );
};

export const ContentCalendarPage = () => {
  const auth = useGoogleDashboardAuth();
  const posthog = usePostHog();
  const requireAuth = !auth.token;

  usePageMetadata({
    description:
      "Internal content calendar for planning Tandra's articles, neighborhood posts, emails, and outreach creative.",
    robots: "noindex, nofollow",
    title: "Content Calendar | Tandra Peters",
  });

  useEffect(() => {
    posthog?.capture("content_calendar_viewed");
  }, [posthog]);

  return (
    <SitePageChrome>
      {requireAuth ? (
        <div className={layoutClass.containerWide}>
          <AuthPanel auth={auth} />
        </div>
      ) : (
        <CalendarDashboard auth={auth} />
      )}
    </SitePageChrome>
  );
};
