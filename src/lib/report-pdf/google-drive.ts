/**
 * Mirror a report PDF into the signed-in user's Google Drive using the
 * least-privilege `drive.file` scope (the app only ever sees files it creates).
 * PDFs go into a "Roof Reports" folder; re-saving updates the same file.
 */
const DRIVE_FILES = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const FOLDER_NAME = "Roof Reports";

export interface DriveMirrorResult {
  fileId: string;
  /** "Roof Reports" folder id — cache this to skip a search next save. */
  folderId: string;
  webViewLink: string;
}

interface DriveFileResponse {
  id?: string;
  webViewLink?: string;
}

const authHeader = (token: string): HeadersInit => ({
  Authorization: `Bearer ${token}`,
});

interface DriveErrorBody {
  error?: { errors?: { reason?: string }[]; message?: string };
}

/** Read a Drive error response into a single actionable message. */
const driveError = async (
  response: Response,
  fallback: string
): Promise<Error> => {
  const body = (await response.json().catch(() => ({}))) as DriveErrorBody;
  const message = body.error?.message;
  const reason = body.error?.errors?.[0]?.reason;
  if (response.status === 401) {
    return new Error(
      "Google Drive access expired. Reconnect Drive and try again."
    );
  }
  if (response.status === 403 && reason === "insufficientPermissions") {
    return new Error(
      "Drive permission wasn't granted. Reconnect and allow Google Drive access."
    );
  }
  if (
    response.status === 403 &&
    /has not been used|disabled/i.test(message ?? "")
  ) {
    return new Error(
      "The Google Drive API isn't enabled for this project. Enable it in Google Cloud Console."
    );
  }
  return new Error(message ? `${fallback} (${message})` : fallback);
};

const findOrCreateFolder = async (token: string): Promise<string> => {
  const query = encodeURIComponent(
    `name='${FOLDER_NAME}' and mimeType='${FOLDER_MIME}' and trashed=false`
  );
  const found = await fetch(
    `${DRIVE_FILES}?q=${query}&spaces=drive&fields=files(id)`,
    { headers: authHeader(token) }
  );
  if (!found.ok) {
    throw await driveError(found, "Could not search Google Drive.");
  }
  const data = (await found.json()) as { files?: { id?: string }[] };
  const existing = data.files?.[0]?.id;
  if (existing) {
    return existing;
  }
  const created = await fetch(DRIVE_FILES, {
    body: JSON.stringify({ mimeType: FOLDER_MIME, name: FOLDER_NAME }),
    headers: { ...authHeader(token), "Content-Type": "application/json" },
    method: "POST",
  });
  if (!created.ok) {
    throw await driveError(created, "Could not create the Drive folder.");
  }
  const folder = (await created.json()) as DriveFileResponse;
  if (!folder.id) {
    throw new Error("Could not create the Drive folder.");
  }
  return folder.id;
};

const buildMultipartBody = (
  metadata: Record<string, unknown>,
  pdf: Blob,
  boundary: string
): Blob => {
  const preamble =
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    "Content-Type: application/pdf\r\n\r\n";
  return new Blob([preamble, pdf, `\r\n--${boundary}--`]);
};

export interface DriveUploadParams {
  existingFileId?: string;
  /** Cached "Roof Reports" folder id from a previous upload. */
  folderId?: string;
  filename: string;
  pdf: Blob;
  token: string;
}

export const uploadPdfToDrive = async ({
  existingFileId,
  folderId: cachedFolderId,
  filename,
  pdf,
  token,
}: DriveUploadParams): Promise<DriveMirrorResult> => {
  const metadata: Record<string, unknown> = { name: filename };
  let folderId = cachedFolderId ?? "";
  if (!existingFileId) {
    folderId = cachedFolderId || (await findOrCreateFolder(token));
    metadata.parents = [folderId];
  }

  const boundary = `rpt${Math.random().toString(36).slice(2)}`;
  const body = buildMultipartBody(metadata, pdf, boundary);
  const target = existingFileId
    ? `${DRIVE_UPLOAD}/${existingFileId}?uploadType=multipart&fields=id,webViewLink`
    : `${DRIVE_UPLOAD}?uploadType=multipart&fields=id,webViewLink`;

  const response = await fetch(target, {
    body,
    headers: {
      ...authHeader(token),
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    method: existingFileId ? "PATCH" : "POST",
  });
  const data = (await response.json()) as DriveFileResponse & {
    error?: { message?: string };
  };
  if (!response.ok || !data.id) {
    throw new Error(data.error?.message ?? "Google Drive upload failed.");
  }
  return {
    fileId: data.id,
    folderId: folderId || cachedFolderId || "",
    webViewLink: data.webViewLink ?? "",
  };
};
