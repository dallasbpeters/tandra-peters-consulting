import { useCallback, useEffect, useState } from "react";

import type {
  AuthHeader,
  CaptureMessage,
  DeskBoardRecord,
  DeskBoardResponse,
  DeskPlanModeValue,
} from "../lib/desk-types";

export const saveValidationError = (
  signedIn: boolean,
  selectedCount: number,
  name: string
): string | null => {
  if (!signedIn) {
    return "Sign in to save canvassing targets.";
  }
  if (selectedCount === 0) {
    return "Pick neighborhoods on the map first.";
  }
  if (!name.trim()) {
    return "Give this target a name.";
  }
  return null;
};

export const useDeskBoard = (authHeader: AuthHeader) => {
  const [records, setRecords] = useState<DeskBoardRecord[]>([]);
  const [isLoadingBoard, setIsLoadingBoard] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [generatingMode, setGeneratingMode] =
    useState<DeskPlanModeValue | null>(null);
  const [boardMessage, setBoardMessage] = useState<CaptureMessage | null>(null);

  const loadBoard = useCallback(async () => {
    setIsLoadingBoard(true);
    try {
      const response = await fetch("/api/desk-board", {
        headers: authHeader ?? undefined,
      });
      const body = (await response.json()) as DeskBoardResponse;
      if (response.ok && body.ok && body.items) {
        setRecords(body.items);
      }
    } catch {
      /* non-fatal — seed cards stay with default status */
    } finally {
      setIsLoadingBoard(false);
    }
  }, [authHeader]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const saveItem = useCallback(
    async (payload: Record<string, unknown>, busy: string): Promise<void> => {
      setBusyKey(busy);
      setBoardMessage(null);
      try {
        const response = await fetch("/api/desk-board", {
          body: JSON.stringify(payload),
          headers: authHeader
            ? { ...authHeader, "Content-Type": "application/json" }
            : { "Content-Type": "application/json" },
          method: "POST",
        });
        const body = (await response.json()) as DeskBoardResponse;
        if (response.ok && body.ok && body.item) {
          const saved = body.item;
          setRecords((current) => [
            ...current.filter((entry) => entry.id !== saved.id),
            saved,
          ]);
        } else {
          setBoardMessage({
            text: body.error ?? "Could not save this item.",
            tone: "error",
          });
        }
      } catch {
        setBoardMessage({ text: "Could not save this item.", tone: "error" });
      } finally {
        setBusyKey(null);
      }
    },
    [authHeader]
  );

  const generate = useCallback(
    async (mode: DeskPlanModeValue): Promise<void> => {
      setGeneratingMode(mode);
      setBoardMessage(null);
      try {
        const response = await fetch("/api/desk-plan", {
          body: JSON.stringify({ mode }),
          headers: authHeader
            ? { ...authHeader, "Content-Type": "application/json" }
            : { "Content-Type": "application/json" },
          method: "POST",
        });
        const body = (await response.json()) as DeskBoardResponse;
        if (response.ok && body.ok && body.items) {
          await loadBoard();
          const count = body.items.length;
          const plural = count === 1 ? "" : "s";
          setBoardMessage({
            text:
              mode === "content"
                ? `Added ${count} content idea${plural}.`
                : `Added ${count} task${plural}.`,
            tone: "success",
          });
        } else {
          setBoardMessage({
            text: body.error ?? "Could not generate new work.",
            tone: "error",
          });
        }
      } catch {
        setBoardMessage({
          text: "Could not generate new work.",
          tone: "error",
        });
      } finally {
        setGeneratingMode(null);
      }
    },
    [authHeader, loadBoard]
  );

  const deleteItem = useCallback(
    async (record: DeskBoardRecord): Promise<void> => {
      setBusyKey(record.id);
      setBoardMessage(null);
      try {
        const response = await fetch(
          `/api/desk-board?id=${encodeURIComponent(record.id)}`,
          {
            headers: authHeader ?? undefined,
            method: "DELETE",
          }
        );
        const body = (await response.json()) as DeskBoardResponse;
        if (response.ok && body.ok) {
          setRecords((current) =>
            current.filter((entry) => entry.id !== record.id)
          );
          setBoardMessage({
            text: "Deleted planned content.",
            tone: "success",
          });
          return;
        }
        setBoardMessage({
          text: body.error ?? "Could not delete this planned content.",
          tone: "error",
        });
      } catch {
        setBoardMessage({
          text: "Could not delete this planned content.",
          tone: "error",
        });
      } finally {
        setBusyKey(null);
      }
    },
    [authHeader]
  );

  return {
    boardMessage,
    busyKey,
    deleteItem,
    generate,
    generatingMode,
    isLoadingBoard,
    records,
    saveItem,
  };
};
