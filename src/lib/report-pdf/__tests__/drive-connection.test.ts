import { afterEach, describe, expect, it } from "vitest";

import {
  isDriveGrantedForEmail,
  loadDriveConnection,
  saveDriveConnection,
} from "../drive-connection";

const STORAGE_KEY = "tandra:report:drive-connection";
const LEGACY_SYNC_KEY = "tandra:report:drive-sync";

describe("drive-connection", () => {
  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_SYNC_KEY);
  });

  it("starts empty", () => {
    expect(loadDriveConnection()).toStrictEqual({
      connectedEmail: null,
      folderId: null,
      syncEnabled: false,
    });
  });

  it("persists sync preference, email, and folder id", () => {
    saveDriveConnection({
      connectedEmail: "Tandra@BirdcreekRoofing.com",
      folderId: "folder-123",
      syncEnabled: true,
    });
    expect(loadDriveConnection()).toStrictEqual({
      connectedEmail: "tandra@birdcreekroofing.com",
      folderId: "folder-123",
      syncEnabled: true,
    });
    expect(window.localStorage.getItem(LEGACY_SYNC_KEY)).toBe("true");
  });

  it("migrates the legacy drive-sync flag", () => {
    window.localStorage.setItem(LEGACY_SYNC_KEY, "true");
    expect(loadDriveConnection()).toStrictEqual({
      connectedEmail: null,
      folderId: null,
      syncEnabled: true,
    });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeTruthy();
    expect(window.localStorage.getItem(LEGACY_SYNC_KEY)).toBeNull();
  });

  it("matches grants by normalized email", () => {
    const state = saveDriveConnection({
      connectedEmail: "tandra@birdcreekroofing.com",
      syncEnabled: true,
    });
    expect(
      isDriveGrantedForEmail(state, "Tandra@BirdcreekRoofing.com")
    ).toBeTruthy();
    expect(isDriveGrantedForEmail(state, "other@example.com")).toBeFalsy();
    expect(isDriveGrantedForEmail(state, null)).toBeFalsy();
  });

  it("patches without wiping unrelated fields", () => {
    saveDriveConnection({
      connectedEmail: "tandra@birdcreekroofing.com",
      folderId: "folder-1",
      syncEnabled: true,
    });
    saveDriveConnection({ syncEnabled: false });
    expect(loadDriveConnection()).toStrictEqual({
      connectedEmail: "tandra@birdcreekroofing.com",
      folderId: "folder-1",
      syncEnabled: false,
    });
  });
});
