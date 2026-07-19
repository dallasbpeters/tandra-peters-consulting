import WaButtonGroup from "@awesome.me/webawesome/dist/react/button-group/index.js";
import WaButton from "@awesome.me/webawesome/dist/react/button/index.js";
import { usePostHog } from "@posthog/react";

import "@awesome.me/webawesome/dist/styles/themes/default.css";
import {
  Check,
  CloudUpload,
  Download,
  Folder,
  Google,
  Plus,
  SendMail,
  ShareAndroid,
  WarningTriangle,
} from "iconoir-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { EditorPane } from "../components/report-pdf/editor-pane";
import { PaneSwitcher } from "../components/report-pdf/pane-switcher";
import { ReportLibrary } from "../components/report-pdf/report-library";
import { ReportPreview } from "../components/report-pdf/report-preview";
import { ReportSendDialog } from "../components/report-pdf/report-send-dialog";
import { useInstallableManifest } from "../components/report-pdf/use-installable-manifest";
import { useReportEditor } from "../components/report-pdf/use-report-editor";
import { SitePageChrome } from "../components/site-page-chrome";
import { TransitionLink } from "../components/transition-link";
import { useGoogleDashboardAuth } from "../context/dashboard-auth-context";
import { useSanitySite } from "../context/use-sanity-site";
import { usePageMetadata } from "../hooks/use-page-metadata";
import { useSanityImageAssets } from "../hooks/use-sanity-image-assets";
import { GOOGLE_DRIVE_SCOPE } from "../lib/google-auth-core";
import { buildReportFilename } from "../lib/report-pdf/filename";
import { uploadPdfToDrive } from "../lib/report-pdf/google-drive";
import { buildLayoutModel } from "../lib/report-pdf/layout-model";
import { persistReport } from "../lib/report-pdf/report-library";
import type { SavedVersion } from "../lib/report-pdf/report-library";
import type { Report } from "../lib/report-pdf/types";
import { mapReportBranding } from "../sanity/map-sanity-home";

import "../styles/report-pdf.css";

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.download = filename;
  anchor.href = url;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const canShareFiles = (files: File[]): boolean =>
  typeof navigator !== "undefined" &&
  typeof navigator.canShare === "function" &&
  typeof navigator.share === "function" &&
  navigator.canShare({ files });

export const ReportPdfPage = () => {
  const posthog = usePostHog();
  const auth = useGoogleDashboardAuth();
  const sanity = useSanitySite();
  const editor = useReportEditor();
  const coverLibrary = useSanityImageAssets();

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);
  const [driveFileId, setDriveFileId] = useState<string | null>(null);
  const [lastPdfUrl, setLastPdfUrl] = useState<string | null>(null);
  const [lastDriveLink, setLastDriveLink] = useState<string | undefined>();
  const [sendOpen, setSendOpen] = useState(false);
  const [driveSync, setDriveSync] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem("tandra:report:drive-sync") === "true"
  );
  // A live Drive grant only exists after an explicit, user-gesture connect.
  // Access tokens are per-session, so this always starts false on load.
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveBusy, setDriveBusy] = useState(false);

  usePageMetadata({
    description:
      "Turn inspection photos into a branded Birdcreek PDF report from your phone.",
    robots: "noindex, nofollow",
    title: "Photo Report | Tandra Peters",
  });

  useInstallableManifest();

  useEffect(() => {
    posthog?.capture("report_pdf_tool_viewed");
  }, [posthog]);

  const brand = useMemo(
    () => mapReportBranding(sanity.data?.reportBranding),
    [sanity.data?.reportBranding]
  );

  const model = useMemo(
    () => buildLayoutModel(editor.report, brand),
    [editor.report, brand]
  );

  const hasPhotos = editor.report.photos.length > 0;

  // Edits invalidate the last saved PDF, so a subsequent Send re-saves first.
  useEffect(() => {
    setLastPdfUrl(null);
    setLastDriveLink(undefined);
  }, [editor.report]);

  const buildPdf = async (): Promise<{
    blob: Blob;
    file: File;
    name: string;
  }> => {
    const { renderReportPdf } =
      await import("../components/report-pdf/report-document");
    const blob = await renderReportPdf(brand, model);
    const name = buildReportFilename(editor.report.title, editor.report.date);
    return {
      blob,
      file: new File([blob], name, { type: "application/pdf" }),
      name,
    };
  };

  const runGenerate = async (mode: "download" | "share"): Promise<void> => {
    if (!hasPhotos || generating) {
      return;
    }
    setGenerating(true);
    setGenError(null);
    setStatus(null);
    try {
      const { blob, file, name } = await buildPdf();
      if (mode === "share" && canShareFiles([file])) {
        await navigator.share({ files: [file], title: model.headerTitle });
        setStatus("Shared.");
      } else {
        downloadBlob(blob, name);
        setStatus(`Saved ${name}`);
      }
      posthog?.capture("report_pdf_generated", {
        mode,
        photos: editor.report.photos.length,
      });
    } catch (error) {
      // A user cancelling the native share sheet throws AbortError — not an error.
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      setGenError(
        error instanceof Error
          ? error.message
          : "Could not generate the PDF. Please try again."
      );
    } finally {
      setGenerating(false);
    }
  };

  const runSave = async (): Promise<{
    driveWebViewLink?: string;
    pdfUrl: string;
  } | null> => {
    if (!(hasPhotos && auth.token) || saving) {
      return null;
    }
    setSaving(true);
    setGenError(null);
    setStatus(null);
    try {
      const { blob, name } = await buildPdf();

      let drive: { fileId?: string; webViewLink?: string } | undefined;
      let driveNote = "";
      if (driveSync && !driveConnected) {
        driveNote = " — connect Google Drive to mirror the PDF.";
      } else if (driveSync && driveConnected) {
        try {
          // Cached from the Connect click, so this normally shows no popup.
          const driveToken = await auth.requestAccessToken(GOOGLE_DRIVE_SCOPE);
          const mirror = await uploadPdfToDrive({
            existingFileId: driveFileId ?? undefined,
            filename: name,
            pdf: blob,
            token: driveToken,
          });
          drive = { fileId: mirror.fileId, webViewLink: mirror.webViewLink };
          setDriveFileId(mirror.fileId);
        } catch (error) {
          // Grant expired or upload failed — force a fresh gesture-based connect.
          setDriveConnected(false);
          driveNote = ` — Drive sync failed (${
            error instanceof Error ? error.message : "reconnect and retry"
          }).`;
        }
      }

      const result = await persistReport({
        drive,
        existingId: currentReportId ?? undefined,
        idToken: auth.token,
        pdfBlob: blob,
        report: editor.report,
      });
      setCurrentReportId(result.id);
      setCurrentVersion(result.versionNumber);
      setLastPdfUrl(result.pdfUrl);
      setLastDriveLink(drive?.webViewLink);
      setStatus(`Saved to library (v${result.versionNumber})${driveNote}.`);
      posthog?.capture("report_pdf_saved", {
        drive: Boolean(drive),
        versionNumber: result.versionNumber,
      });
      return { driveWebViewLink: drive?.webViewLink, pdfUrl: result.pdfUrl };
    } catch (error) {
      setGenError(
        error instanceof Error ? error.message : "Could not save the report."
      );
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleOpenSend = async (): Promise<void> => {
    if (lastPdfUrl) {
      setSendOpen(true);
      return;
    }
    const saved = await runSave();
    if (saved) {
      setSendOpen(true);
    }
  };

  const handleRecall = useCallback(
    (recalled: Report, id: string, version: SavedVersion) => {
      editor.loadReport(recalled);
      setCurrentReportId(id);
      setCurrentVersion(version.versionNumber ?? 1);
      setDriveFileId(version.driveFileId ?? null);
      setLibraryOpen(false);
      setStatus(
        `Opened “${recalled.title || "Untitled report"}” (v${
          version.versionNumber ?? 1
        }).`
      );
    },
    [editor.loadReport]
  );

  const handleNew = () => {
    editor.resetReport();
    setCurrentReportId(null);
    setCurrentVersion(null);
    setDriveFileId(null);
    setStatus("Started a new report.");
  };

  const persistDriveSync = (next: boolean) => {
    setDriveSync(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "tandra:report:drive-sync",
        next ? "true" : "false"
      );
    }
  };

  // Must run from a direct click: the OAuth consent popup is blocked if it
  // isn't tied to a user gesture (this was why "Sync to Drive" did nothing).
  const connectDrive = async (): Promise<void> => {
    if (driveBusy) {
      return;
    }
    setDriveBusy(true);
    setGenError(null);
    setStatus(null);
    try {
      await auth.requestAccessToken(GOOGLE_DRIVE_SCOPE);
      setDriveConnected(true);
      persistDriveSync(true);
      setStatus(
        "Google Drive connected — saves will mirror the PDF to your “Roof Reports” folder."
      );
    } catch (error) {
      setDriveConnected(false);
      setGenError(
        error instanceof Error
          ? error.message
          : "Could not connect Google Drive. Please allow the popup and try again."
      );
    } finally {
      setDriveBusy(false);
    }
  };

  const renderAuthGate = () => {
    if (!auth.clientId) {
      return (
        <div className="report-auth-card">
          <div
            style={{
              alignItems: "center",
              color: "#b3261e",
              display: "flex",
              gap: "0.5rem",
              justifyContent: "center",
            }}
          >
            <WarningTriangle height={20} width={20} />
            <strong>Google sign-in is not configured</strong>
          </div>
          <p className="report-status">
            Add <code>VITE_GOOGLE_CLIENT_ID</code> to enable this tool.
          </p>
        </div>
      );
    }
    return (
      <div className="report-auth-card">
        <h2>Sign in to build a report</h2>
        <p className="report-status">
          This tool is for Tandra&rsquo;s team. Sign in with an allowed Google
          account to continue.
        </p>
        <div className="report-auth-button" ref={auth.buttonRef} />
        {auth.authError ? (
          <p className="report-error">{auth.authError}</p>
        ) : null}
        {auth.ready ? null : (
          <p className="report-status">Loading Google sign-in…</p>
        )}
      </div>
    );
  };

  return (
    <SitePageChrome>
      <div className="report-pdf-shell">
        <div className="report-pdf-header">
          <div>
            <h1>Photo Report</h1>
            {currentReportId && currentVersion ? (
              <p className="report-status">
                Editing a saved report · v{currentVersion}
              </p>
            ) : null}
          </div>
          {auth.token ? (
            <WaButtonGroup>
              <WaButton
                appearance="filled"
                pill
                onClick={() => setLibraryOpen(true)}
              >
                <Folder height={16} slot="start" width={16} />
                Library
              </WaButton>
              <WaButton appearance="filled" pill onClick={handleNew}>
                <Plus height={16} slot="start" width={16} />
                New
              </WaButton>
              <WaButton
                appearance="filled"
                pill
                disabled={!hasPhotos}
                loading={saving}
                onClick={() => void runSave()}
                variant="brand"
              >
                <CloudUpload height={16} slot="start" width={16} />
                {(() => {
                  if (saving) {
                    return "Saving…";
                  }
                  return currentReportId ? "Save version" : "Save to library";
                })()}
              </WaButton>
              <WaButton
                appearance="filled"
                pill
                disabled={!hasPhotos}
                loading={saving}
                onClick={() => void handleOpenSend()}
              >
                <SendMail height={16} slot="start" width={16} />
                Send
              </WaButton>
              <WaButton
                appearance="filled"
                pill
                disabled={!hasPhotos}
                loading={generating}
                onClick={() => void runGenerate("download")}
              >
                <Download height={16} slot="start" width={16} />
                {generating ? "Generating…" : "Download PDF"}
              </WaButton>
              {typeof navigator !== "undefined" &&
              typeof navigator.share === "function" ? (
                <WaButton
                  appearance="filled"
                  pill
                  disabled={!hasPhotos || generating}
                  onClick={() => void runGenerate("share")}
                >
                  <ShareAndroid height={16} slot="start" width={16} />
                  Share
                </WaButton>
              ) : null}
              {driveConnected ? (
                <WaButton
                  appearance={driveSync ? "filled" : "outlined"}
                  onClick={() => persistDriveSync(!driveSync)}
                  variant={driveSync ? "brand" : "neutral"}
                >
                  {driveSync ? (
                    <Check height={16} slot="start" width={16} />
                  ) : (
                    <Google height={16} slot="start" width={16} />
                  )}
                  {driveSync ? "Drive sync on" : "Drive sync off"}
                </WaButton>
              ) : (
                <WaButton
                  appearance="filled"
                  pill
                  loading={driveBusy}
                  onClick={() => void connectDrive()}
                >
                  <Google height={16} slot="start" width={16} />
                  {driveBusy ? "Connecting…" : "Connect Drive"}
                </WaButton>
              )}
            </WaButtonGroup>
          ) : null}
        </div>

        {genError ? (
          <p className="report-error" role="alert">
            {genError}
          </p>
        ) : null}
        {status ? <p className="report-status">{status}</p> : null}

        {auth.token ? (
          <PaneSwitcher
            editor={
              <EditorPane
                addError={editor.addError}
                busy={editor.busy}
                coverLibrary={coverLibrary}
                idToken={auth.token}
                onAddFiles={editor.addFiles}
                onAddSection={editor.addSection}
                onCaptionChange={editor.setCaption}
                onCoverImageChange={editor.setCoverImage}
                onFieldChange={editor.setField}
                onMovePhoto={editor.movePhoto}
                onRemovePhoto={editor.removePhoto}
                onRemoveSection={editor.removeSection}
                onRenameSection={editor.renameSection}
                onSectionChange={editor.setSection}
                onTableChange={editor.setTable}
                report={editor.report}
              />
            }
            preview={<ReportPreview brand={brand} model={model} />}
          />
        ) : (
          renderAuthGate()
        )}
      </div>
      {auth.token ? (
        <ReportLibrary
          currentReportId={currentReportId}
          idToken={auth.token}
          onClose={() => setLibraryOpen(false)}
          onRecall={handleRecall}
          open={libraryOpen}
        />
      ) : null}
      {auth.token && lastPdfUrl ? (
        <ReportSendDialog
          driveWebViewLink={lastDriveLink}
          idToken={auth.token}
          onClose={() => setSendOpen(false)}
          open={sendOpen}
          pdfUrl={lastPdfUrl}
          reportTitle={editor.report.title || "Roof inspection report"}
          requestAccessToken={auth.requestAccessToken}
        />
      ) : null}
    </SitePageChrome>
  );
};
