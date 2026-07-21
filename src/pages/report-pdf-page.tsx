import WaButtonGroup from "@awesome.me/webawesome/dist/react/button-group/index.js";
import WaButton from "@awesome.me/webawesome/dist/react/button/index.js";
import WaIcon from "@awesome.me/webawesome/dist/react/icon/index.js";
import { usePostHog } from "@posthog/react";

import "@awesome.me/webawesome/dist/styles/themes/default.css";
import {
  Check,
  CloudUpload,
  Download,
  Folder,
  Plus,
  SendMail,
  WarningTriangle,
} from "iconoir-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { EditorPane } from "../components/report-pdf/editor-pane";
import { PaneSwitcher } from "../components/report-pdf/pane-switcher";
import { PhotoAnnotator } from "../components/report-pdf/photo-annotator";
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
import {
  isDriveGrantedForEmail,
  loadDriveConnection,
  saveDriveConnection,
} from "../lib/report-pdf/drive-connection";
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
  const [annotatingId, setAnnotatingId] = useState<string | null>(null);
  // Persist sync preference + which account granted Drive (not the token).
  const [driveSync, setDriveSync] = useState(
    () => loadDriveConnection().syncEnabled
  );
  // Optimistic: same account previously granted Drive → show as connected
  // while we silently re-mint a token in the background.
  const [driveConnected, setDriveConnected] = useState(() =>
    isDriveGrantedForEmail(loadDriveConnection(), null)
  );
  const [driveFolderId, setDriveFolderId] = useState<string | null>(
    () => loadDriveConnection().folderId
  );
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

  // Restore Drive status for the signed-in account. Tokens stay in memory
  // only; we persist email + sync preference + folder id, then silently
  // re-mint a Drive token when GIS still has consent for that account.
  const driveRestoreForEmail = useRef<string | null>(null);
  useEffect(() => {
    const email = auth.user?.email ?? null;
    if (!(auth.token && email)) {
      setDriveConnected(false);
      return;
    }
    const stored = loadDriveConnection();
    const granted = isDriveGrantedForEmail(stored, email);
    setDriveSync(stored.syncEnabled);
    setDriveFolderId(stored.folderId);
    if (!granted) {
      setDriveConnected(false);
      return;
    }
    // Show connected immediately for the matching account; refresh token.
    setDriveConnected(true);
    if (driveRestoreForEmail.current === email) {
      return;
    }
    driveRestoreForEmail.current = email;
    void auth
      .requestAccessToken(GOOGLE_DRIVE_SCOPE, { silent: true })
      .then(() => setDriveConnected(true))
      .catch(() => {
        // Consent lapsed — keep the stored preference, require a click.
        setDriveConnected(false);
      });
  }, [auth, auth.token, auth.user?.email]);

  const brand = useMemo(
    () => mapReportBranding(sanity.data?.reportBranding),
    [sanity.data?.reportBranding]
  );

  const model = useMemo(
    () => buildLayoutModel(editor.report, brand),
    [editor.report, brand]
  );

  const hasPhotos = editor.report.photos.length > 0;

  const annotatingPhoto =
    editor.report.photos.find((photo) => photo.id === annotatingId) ?? null;

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
          // Cached from Connect / silent restore, so this normally shows no popup.
          const driveToken = await auth.requestAccessToken(GOOGLE_DRIVE_SCOPE);
          const mirror = await uploadPdfToDrive({
            existingFileId: driveFileId ?? undefined,
            folderId: driveFolderId ?? undefined,
            filename: name,
            pdf: blob,
            token: driveToken,
          });
          drive = { fileId: mirror.fileId, webViewLink: mirror.webViewLink };
          setDriveFileId(mirror.fileId);
          if (mirror.folderId) {
            setDriveFolderId(mirror.folderId);
            saveDriveConnection({ folderId: mirror.folderId });
          }
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
    saveDriveConnection({ syncEnabled: next });
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
      const email = auth.user?.email ?? null;
      setDriveConnected(true);
      setDriveSync(true);
      saveDriveConnection({
        connectedEmail: email,
        syncEnabled: true,
      });
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
          {auth.token ? (
            <WaButtonGroup>
              <WaButton
                appearance="filled"
                pill
                onClick={() => setLibraryOpen(true)}
              >
                <WaIcon slot="start" name="folder" library="iconoir" />
                Library
              </WaButton>
              <WaButton appearance="filled" pill onClick={handleNew}>
                <WaIcon slot="start" name="plus" library="iconoir" />
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
                <WaIcon slot="start" name="cloud-upload" library="iconoir" />
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
                <WaIcon slot="start" name="mail" library="iconoir" />
                Send
              </WaButton>
              <WaButton
                appearance="filled"
                pill
                disabled={!hasPhotos}
                loading={generating}
                onClick={() => void runGenerate("download")}
              >
                <WaIcon slot="start" name="download" library="iconoir" />
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
                  <WaIcon slot="start" name="share-ios" library="iconoir" />
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
                    <WaIcon src="./drive-logo.svg" slot="start" />
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
                  <WaIcon src="./drive-logo.svg" slot="start" />
                  {(() => {
                    if (driveBusy) {
                      return "Connecting…";
                    }
                    // Same account granted before but silent re-mint failed.
                    if (
                      isDriveGrantedForEmail(
                        loadDriveConnection(),
                        auth.user?.email
                      )
                    ) {
                      return "Reconnect Drive";
                    }
                    return "Connect Drive";
                  })()}
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
                brand={brand}
                busy={editor.busy}
                coverLibrary={coverLibrary}
                idToken={auth.token}
                onAddFiles={editor.addFiles}
                onAddSection={editor.addSection}
                onAnnotatePhoto={(id) => setAnnotatingId(id)}
                onCaptionChange={editor.setCaption}
                onCoverImageChange={editor.setCoverImage}
                onFieldChange={editor.setField}
                onMovePhoto={editor.movePhoto}
                onRemovePhoto={editor.removePhoto}
                onRemoveSection={editor.removeSection}
                onRenameSection={editor.renameSection}
                onReorderPhotos={editor.reorderPhotos}
                onSectionChange={editor.setSection}
                onTableChange={editor.setTable}
                report={editor.report}
                savedVersion={currentReportId ? currentVersion : null}
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
      {annotatingPhoto ? (
        <PhotoAnnotator
          image={annotatingPhoto.processedImage}
          initialScene={annotatingPhoto.annotations}
          key={annotatingPhoto.id}
          onCancel={() => setAnnotatingId(null)}
          onSave={(scene) => {
            const id = annotatingPhoto.id;
            setAnnotatingId(null);
            void editor.setAnnotations(id, scene);
          }}
        />
      ) : null}
    </SitePageChrome>
  );
};
