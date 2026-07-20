import WaButton from "@awesome.me/webawesome/dist/react/button/index.js";
import WaIcon from "@awesome.me/webawesome/dist/react/icon/index.js";

import "@awesome.me/webawesome/dist/styles/themes/default.css";
import { Clock, Download, Folder, Trash, Xmark } from "iconoir-react";
import { useCallback, useEffect, useState } from "react";

import {
  deleteReport,
  getReport,
  hydrateReport,
  listReports,
} from "../../lib/report-pdf/report-library";
import type {
  ReportSnapshot,
  ReportSummary,
  SavedVersion,
} from "../../lib/report-pdf/report-library";
import type { Report } from "../../lib/report-pdf/types";

interface ReportLibraryProps {
  currentReportId: string | null;
  idToken: string;
  onClose: () => void;
  onRecall: (report: Report, id: string, version: SavedVersion) => void;
  open: boolean;
}

const formatDate = (value?: string): string =>
  value ? new Date(value).toLocaleString() : "";

export const ReportLibrary = ({
  currentReportId,
  idToken,
  onClose,
  onRecall,
  open,
}: ReportLibraryProps) => {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReports(await listReports(idToken));
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not load library."
      );
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    if (open) {
      refresh();
    }
  }, [open, refresh]);

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

  const recallVersion = useCallback(
    async (id: string, version: SavedVersion) => {
      if (!version.report) {
        setError("This version has no saved data.");
        return;
      }
      setBusyId(id);
      setError(null);
      try {
        const snapshot = JSON.parse(version.report) as ReportSnapshot;
        const report = await hydrateReport(snapshot);
        onRecall(report, id, version);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Could not open report."
        );
      } finally {
        setBusyId(null);
      }
    },
    [onRecall]
  );

  const openLatest = useCallback(
    async (id: string) => {
      setBusyId(id);
      setError(null);
      try {
        const detail = await getReport(id, idToken);
        const latest = detail.versions?.at(-1);
        if (!latest) {
          setError("This report has no versions yet.");
          return;
        }
        await recallVersion(id, latest);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Could not open report."
        );
      } finally {
        setBusyId(null);
      }
    },
    [idToken, recallVersion]
  );

  const toggleVersions = useCallback(
    async (id: string) => {
      if (expandedId === id) {
        setExpandedId(null);
        return;
      }
      setBusyId(id);
      setError(null);
      try {
        const detail = await getReport(id, idToken);
        setReports((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, versionsList: detail.versions } : r
          )
        );
        setExpandedId(id);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Could not load versions."
        );
      } finally {
        setBusyId(null);
      }
    },
    [expandedId, idToken]
  );

  const removeReport = useCallback(
    async (id: string) => {
      setBusyId(id);
      setError(null);
      try {
        await deleteReport(id, idToken);
        setReports((prev) => prev.filter((r) => r.id !== id));
      } catch (error) {
        setError(error instanceof Error ? error.message : "Could not delete.");
      } finally {
        setBusyId(null);
      }
    },
    [idToken]
  );

  if (!open) {
    return null;
  }

  return (
    <div
      aria-label="Report library"
      aria-modal="true"
      className="report-library-overlay"
      role="dialog"
    >
      <button
        aria-label="Close library"
        className="report-library-scrim"
        onClick={onClose}
        type="button"
      />
      <div className="report-library-panel">
        <header className="report-library-head">
          <h2>Report library</h2>
          <WaButton appearance="filled" onClick={onClose} size="small">
            <Xmark slot="start" />
            Close
          </WaButton>
        </header>

        {error ? <p className="report-library-error">{error}</p> : null}
        {loading ? <p className="report-library-empty">Loading…</p> : null}
        {!loading && reports.length === 0 ? (
          <p className="report-library-empty">
            No saved reports yet. Generate a report and choose “Save to
            library.”
          </p>
        ) : null}

        <ul className="report-library-list">
          {reports.map((report) => {
            const versions = (
              report as ReportSummary & {
                versionsList?: SavedVersion[];
              }
            ).versionsList;
            const isBusy = busyId === report.id;
            return (
              <li
                className="report-library-card"
                data-current={report.id === currentReportId}
                key={report.id}
              >
                <div className="report-library-card-main">
                  <div
                    onClick={() => openLatest(report.id)}
                    className="report-library-meta"
                  >
                    <p className="report-library-title">
                      {report.title || "Untitled report"}
                    </p>
                    {report.propertyAddress ? (
                      <p className="report-library-sub">
                        {report.propertyAddress}
                      </p>
                    ) : null}
                    <p className="report-library-sub">
                      {report.versionCount ?? 0} version
                      {(report.versionCount ?? 0) === 1 ? "" : "s"} ·{" "}
                      {formatDate(report.updatedAt)}
                    </p>
                  </div>
                </div>
                <div className="report-library-actions">
                  <WaButton
                    appearance="filled"
                    loading={isBusy}
                    onClick={() => openLatest(report.id)}
                    size="small"
                    variant="brand"
                  >
                    <WaIcon
                      slot="start"
                      name="arrow-right"
                      label="Open report"
                      library="iconoir"
                    />
                    Open
                  </WaButton>
                  <WaButton
                    appearance="outlined"
                    onClick={() => toggleVersions(report.id)}
                    size="small"
                  >
                    <Clock slot="start" />
                    Versions
                  </WaButton>
                  {report.latest?.pdfUrl ? (
                    <WaButton
                      appearance="filled"
                      href={report.latest.pdfUrl}
                      rel="noreferrer"
                      size="small"
                      target="_blank"
                    >
                      <Download slot="start" />
                      PDF
                    </WaButton>
                  ) : null}
                  <WaButton
                    appearance="filled"
                    variant="danger"
                    onClick={() => removeReport(report.id)}
                    size="small"
                  >
                    <Trash slot="start" />
                    Delete
                  </WaButton>
                </div>

                {expandedId === report.id && versions ? (
                  <ul className="report-library-versions">
                    {[...versions].toReversed().map((version) => (
                      <li key={version._key ?? version.versionNumber}>
                        <span>
                          v{version.versionNumber} ·{" "}
                          {formatDate(version.savedAt)}
                        </span>
                        <span className="report-library-version-actions">
                          <WaButton
                            appearance="filled"
                            onClick={() => recallVersion(report.id, version)}
                            size="small"
                          >
                            <WaIcon
                              slot="start"
                              name="arrow-right"
                              label="Open report"
                              library="iconoir"
                            />
                            Restore
                          </WaButton>
                          {version.pdfUrl ? (
                            <WaButton
                              appearance="filled"
                              href={version.pdfUrl}
                              rel="noreferrer"
                              size="small"
                              target="_blank"
                            >
                              <Download slot="start" />
                              PDF
                            </WaButton>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
