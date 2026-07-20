/**
 * Persist Google Drive connection *status* (not the access token).
 *
 * GIS access tokens are short-lived and stay in memory only. What we can — and
 * should — remember across reloads is:
 *   - whether the user wants Drive sync on
 *   - which Google account granted Drive (so we don't pretend another account
 *     is connected)
 *   - the "Roof Reports" folder id (skips a search on every save)
 *
 * On load we silently re-request a Drive token when the same account is signed
 * in; if that fails they reconnect with one click.
 */

const STORAGE_KEY = "tandra:report:drive-connection";
/** Legacy boolean key from the first Drive-sync toggle. */
const LEGACY_SYNC_KEY = "tandra:report:drive-sync";

export interface DriveConnectionState {
  /** Email that granted Drive access (lowercase). */
  connectedEmail: string | null;
  /** Cached Drive folder id for "Roof Reports". */
  folderId: string | null;
  /** User wants saves mirrored to Drive. */
  syncEnabled: boolean;
}

const EMPTY: DriveConnectionState = {
  connectedEmail: null,
  folderId: null,
  syncEnabled: false,
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const canUseStorage = (): boolean => typeof window !== "undefined";

export const loadDriveConnection = (): DriveConnectionState => {
  if (!canUseStorage()) {
    return EMPTY;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DriveConnectionState>;
      return {
        connectedEmail: parsed.connectedEmail
          ? normalizeEmail(parsed.connectedEmail)
          : null,
        folderId: parsed.folderId ?? null,
        syncEnabled: Boolean(parsed.syncEnabled),
      };
    }
    // One-time migrate the old "drive-sync=true" flag.
    if (window.localStorage.getItem(LEGACY_SYNC_KEY) === "true") {
      const migrated: DriveConnectionState = { ...EMPTY, syncEnabled: true };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      window.localStorage.removeItem(LEGACY_SYNC_KEY);
      return migrated;
    }
  } catch {
    // Corrupt JSON — fall through to empty.
  }
  return EMPTY;
};

export const saveDriveConnection = (
  patch: Partial<DriveConnectionState>
): DriveConnectionState => {
  const current = loadDriveConnection();
  const next: DriveConnectionState = {
    connectedEmail:
      patch.connectedEmail === undefined
        ? current.connectedEmail
        : patch.connectedEmail
          ? normalizeEmail(patch.connectedEmail)
          : null,
    folderId: patch.folderId === undefined ? current.folderId : patch.folderId,
    syncEnabled:
      patch.syncEnabled === undefined ? current.syncEnabled : patch.syncEnabled,
  };
  if (canUseStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    // Keep legacy key in sync so older code paths don't fight us.
    window.localStorage.setItem(
      LEGACY_SYNC_KEY,
      next.syncEnabled ? "true" : "false"
    );
  }
  return next;
};

/** True when the signed-in account is the one that previously granted Drive. */
export const isDriveGrantedForEmail = (
  state: DriveConnectionState,
  email: string | null | undefined
): boolean =>
  Boolean(
    email &&
    state.connectedEmail &&
    normalizeEmail(email) === state.connectedEmail
  );
