import WaButton from "@awesome.me/webawesome/dist/react/button/index.js";
import WaInput from "@awesome.me/webawesome/dist/react/input/index.js";
import WaTextarea from "@awesome.me/webawesome/dist/react/textarea/index.js";

import "@awesome.me/webawesome/dist/styles/themes/default.css";
import { Google, SendMail, Xmark } from "iconoir-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { GOOGLE_CONTACTS_SCOPE } from "../../lib/google-auth-core";
import {
  fetchGoogleContacts,
  fetchServerRecipients,
  mergeRecipients,
  sendReport,
} from "../../lib/report-pdf/report-recipients";
import type {
  Recipient,
  SendReportResult,
} from "../../lib/report-pdf/report-recipients";
import { waValue } from "./wa-value";

interface ReportSendDialogProps {
  driveWebViewLink?: string;
  idToken: string;
  onClose: () => void;
  open: boolean;
  pdfUrl: string;
  reportTitle: string;
  requestAccessToken: (scope: string) => Promise<string>;
}

export const ReportSendDialog = ({
  driveWebViewLink,
  idToken,
  onClose,
  open,
  pdfUrl,
  reportTitle,
  requestAccessToken,
}: ReportSendDialogProps) => {
  const [pool, setPool] = useState<Recipient[]>([]);
  const [selected, setSelected] = useState<Recipient[]>([]);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [googleConnected, setGoogleConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SendReportResult | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setSubject(reportTitle);
    setResult(null);
    setError(null);
    fetchServerRecipients(idToken, "")
      .then(setPool)
      .catch(() => setError("Could not load contacts."));
  }, [open, idToken, reportTitle]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const connectGoogle = useCallback(async () => {
    setError(null);
    try {
      const token = await requestAccessToken(GOOGLE_CONTACTS_SCOPE);
      const contacts = await fetchGoogleContacts(token);
      setPool((prev) => mergeRecipients(prev, contacts));
      setGoogleConnected(true);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not load Google Contacts."
      );
    }
  }, [requestAccessToken]);

  const selectedEmails = useMemo(
    () => new Set(selected.map((r) => r.email)),
    [selected]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return pool.slice(0, 50);
    }
    return pool
      .filter(
        (r) =>
          r.name.toLowerCase().includes(term) ||
          r.email.toLowerCase().includes(term)
      )
      .slice(0, 50);
  }, [pool, search]);

  const toggle = useCallback((recipient: Recipient) => {
    setSelected((prev) =>
      prev.some((r) => r.email === recipient.email)
        ? prev.filter((r) => r.email !== recipient.email)
        : [...prev, recipient]
    );
  }, []);

  const addTypedEmail = useCallback(() => {
    const email = search.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return;
    }
    const recipient: Recipient = { email, id: "", name: email, source: "crm" };
    setSelected((prev) =>
      prev.some((r) => r.email === email) ? prev : [...prev, recipient]
    );
    setSearch("");
  }, [search]);

  const send = useCallback(async () => {
    if (selected.length === 0) {
      setError("Select at least one recipient.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const outcome = await sendReport({
        driveWebViewLink,
        idToken,
        message,
        pdfUrl,
        recipients: selected.map((r) => ({
          email: r.email,
          id: r.id,
          name: r.name,
        })),
        reportTitle,
        subject,
      });
      setResult(outcome);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not send.");
    } finally {
      setSending(false);
    }
  }, [
    driveWebViewLink,
    idToken,
    message,
    pdfUrl,
    reportTitle,
    selected,
    subject,
  ]);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-label="Send report"
      aria-modal="true"
      className="report-library-overlay"
      role="dialog"
    >
      <button
        aria-label="Close"
        className="report-library-scrim"
        onClick={onClose}
        type="button"
      />
      <div className="report-library-panel">
        <header className="report-library-head">
          <h2>Send report</h2>
          <WaButton appearance="filled" onClick={onClose} size="small">
            <Xmark slot="start" />
            Close
          </WaButton>
        </header>

        {error ? <p className="report-library-error">{error}</p> : null}

        {result ? (
          <div className="report-send-result">
            <p>Sent to {result.sent.length} recipient(s).</p>
            {result.attached ? (
              <p className="report-library-sub">PDF attached.</p>
            ) : (
              <p className="report-library-sub">
                PDF was too large to attach — the email links to it instead.
              </p>
            )}
            {result.failed.length > 0 ? (
              <ul className="report-send-failed">
                {result.failed.map((f) => (
                  <li key={f.email}>
                    {f.email}: {f.error}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <>
            <WaInput
              label="Subject"
              onInput={(event) => setSubject(waValue(event))}
              value={subject}
            />
            <WaTextarea
              label="Message"
              onInput={(event) => setMessage(waValue(event))}
              placeholder="Add a short note (optional)…"
              rows={3}
              value={message}
            />

            <div className="report-send-recipients-head">
              <WaInput
                label="Recipients"
                onInput={(event) => setSearch(waValue(event))}
                placeholder="Search or type an email…"
                value={search}
                withClear
              />
              {googleConnected ? null : (
                <WaButton
                  appearance="outlined"
                  onClick={() => void connectGoogle()}
                  size="small"
                >
                  <Google slot="start" />
                  Google Contacts
                </WaButton>
              )}
            </div>

            {search.trim() &&
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(search.trim()) ? (
              <WaButton
                appearance="filled"
                onClick={addTypedEmail}
                size="small"
              >
                Add “{search.trim()}”
              </WaButton>
            ) : null}

            {selected.length > 0 ? (
              <ul className="report-send-chips">
                {selected.map((r) => (
                  <li key={r.email}>
                    <button onClick={() => toggle(r)} type="button">
                      {r.name} ✕
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <ul className="report-send-pool">
              {filtered.map((r) => (
                <li key={r.email}>
                  <label>
                    <input
                      checked={selectedEmails.has(r.email)}
                      onChange={() => toggle(r)}
                      type="checkbox"
                    />
                    <span>
                      <strong>{r.name}</strong>
                      <span className="report-library-sub">{r.email}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            <WaButton
              appearance="filled"
              disabled={selected.length === 0}
              loading={sending}
              onClick={() => void send()}
              variant="brand"
            >
              <SendMail slot="start" />
              {sending ? "Sending…" : `Send to ${selected.length || ""}`}
            </WaButton>
          </>
        )}
      </div>
    </div>
  );
};
