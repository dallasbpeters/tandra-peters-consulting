import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AuthHeader, CanvassTargetRecord } from "../lib/desk-types";
import { coerceWalkStatus, mergeRosterWithVisits } from "../lib/desk-walk";
import type {
  RosterHome,
  WalkHome,
  WalkHomesResponse,
  WalkStatus,
  WalkVisit,
  WalkVisitResponse,
  WalkVisitsResponse,
} from "../lib/desk-walk";

/** One pending, not-yet-confirmed edit waiting in the offline queue. */
interface QueuedEdit {
  followUpDate?: string;
  homeKey: string;
  notes?: string;
  status: WalkStatus;
  updatedAt: string;
}

interface RosterCache {
  cachedAt: string;
  capped: boolean;
  homes: RosterHome[];
  total: number;
}

const rosterKey = (targetId: string): string => `desk-walk:roster:${targetId}`;
const visitsKey = (targetId: string): string => `desk-walk:visits:${targetId}`;
const queueKey = (targetId: string): string => `desk-walk:queue:${targetId}`;

const readJson = <T>(key: string): T | null => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const writeJson = (key: string, value: unknown): void => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / unavailable — non-fatal, UI still holds state in memory */
  }
};

export interface UseWalkHomesResult {
  capped: boolean;
  error: string | null;
  homes: WalkHome[];
  isLoading: boolean;
  isOffline: boolean;
  pendingCount: number;
  reload: () => Promise<void>;
  saveVisit: (
    homeKey: string,
    change: { followUpDate?: string; notes?: string; status: WalkStatus }
  ) => void;
  setStatus: (homeKey: string, status: WalkStatus) => void;
  total: number;
}

/**
 * Roster load + per-home visit upsert with an optimistic, offline-friendly
 * local layer:
 *   - Roster is cached per target so re-opening works with no network round trip.
 *   - Status/notes edits write to localStorage immediately (queue) and reflect
 *     in the UI instantly, then POST to `/api/desk-walk` in the background.
 *   - The queue flushes on reconnect (`online`) and after every edit.
 */
export const useWalkHomes = (
  authHeader: AuthHeader,
  target: CanvassTargetRecord | null
): UseWalkHomesResult => {
  const targetId = target?.id ?? "";

  const [roster, setRoster] = useState<RosterHome[]>([]);
  const [capped, setCapped] = useState(false);
  const [total, setTotal] = useState(0);
  const [visits, setVisits] = useState<Record<string, WalkVisit>>({});
  const [queue, setQueue] = useState<QueuedEdit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(
    typeof navigator === "undefined" ? false : !navigator.onLine
  );

  // Refs so the (stable) flush callback always sees the latest values without
  // re-subscribing the `online` listener on every edit.
  const authRef = useRef(authHeader);
  const queueRef = useRef(queue);
  const rosterRef = useRef(roster);
  authRef.current = authHeader;
  queueRef.current = queue;
  rosterRef.current = roster;

  const persistQueue = useCallback(
    (next: QueuedEdit[]) => {
      setQueue(next);
      if (targetId) {
        writeJson(queueKey(targetId), next);
      }
    },
    [targetId]
  );

  const persistVisits = useCallback(
    (next: Record<string, WalkVisit>) => {
      setVisits(next);
      if (targetId) {
        writeJson(visitsKey(targetId), next);
      }
    },
    [targetId]
  );

  // Push one pending edit to the server; on success drop it from the queue.
  const flushOne = useCallback(
    async (edit: QueuedEdit): Promise<boolean> => {
      const header = authRef.current;
      if (!(header && targetId)) {
        return false;
      }
      try {
        const response = await fetch("/api/desk-walk", {
          body: JSON.stringify({
            action: "upsert",
            followUpDate: edit.followUpDate,
            homeKey: edit.homeKey,
            notes: edit.notes,
            status: edit.status,
            targetId,
          }),
          headers: { ...header, "Content-Type": "application/json" },
          method: "POST",
        });
        const body = (await response.json()) as WalkVisitResponse;
        return response.ok && body.ok;
      } catch {
        return false;
      }
    },
    [targetId]
  );

  const flushQueue = useCallback(async () => {
    const pending = queueRef.current;
    if (pending.length === 0) {
      return;
    }
    const remaining: QueuedEdit[] = [];
    let anyFailed = false;
    for (const edit of pending) {
      // Sequential so later edits to the same home never race ahead of earlier
      // ones (last-write-wins matches the order the field user tapped).
      const sent = anyFailed ? false : await flushOne(edit);
      if (!sent) {
        anyFailed = true;
        remaining.push(edit);
      }
    }
    setIsOffline(anyFailed);
    persistQueue(remaining);
  }, [flushOne, persistQueue]);

  const loadVisits = useCallback(async () => {
    const header = authRef.current;
    if (!(header && targetId)) {
      return;
    }
    try {
      const response = await fetch("/api/desk-walk", {
        body: JSON.stringify({ action: "list", targetId }),
        headers: { ...header, "Content-Type": "application/json" },
        method: "POST",
      });
      const body = (await response.json()) as WalkVisitsResponse;
      if (!(response.ok && body.ok && body.visits)) {
        return;
      }
      // Server snapshot seeds local visits, but a home with a still-pending
      // queued edit keeps its optimistic value (pending edits always win).
      const pendingKeys = new Set(queueRef.current.map((edit) => edit.homeKey));
      setVisits((current) => {
        const next = { ...current };
        for (const visit of body.visits ?? []) {
          if (!pendingKeys.has(visit.homeKey)) {
            next[visit.homeKey] = visit;
          }
        }
        if (targetId) {
          writeJson(visitsKey(targetId), next);
        }
        return next;
      });
    } catch {
      /* offline — keep the cached local visits */
      setIsOffline(true);
    }
  }, [targetId]);

  const loadRoster = useCallback(async () => {
    const header = authRef.current;
    if (!(header && target)) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/desk-homes", {
        body: JSON.stringify({
          neighborhoods: target.neighborhoods,
          zone: target.zone,
        }),
        headers: { ...header, "Content-Type": "application/json" },
        method: "POST",
      });
      const body = (await response.json()) as WalkHomesResponse;
      if (response.ok && body.ok && body.homes) {
        setRoster(body.homes);
        setCapped(Boolean(body.capped));
        setTotal(body.total ?? body.homes.length);
        writeJson(rosterKey(target.id), {
          cachedAt: new Date().toISOString(),
          capped: Boolean(body.capped),
          homes: body.homes,
          total: body.total ?? body.homes.length,
        } satisfies RosterCache);
        if (body.homes.length === 0 && body.status === "missing-key") {
          setError("Home matching needs RENTCAST_API_KEY to be configured.");
        }
        return;
      }
      setError(body.error ?? "Could not load the homes for this area.");
    } catch {
      // Network failure — the cached roster (if any) stays on screen.
      setIsOffline(true);
      if (rosterRef.current.length === 0) {
        setError("You're offline and this area isn't cached yet.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [target]);

  const reload = useCallback(async () => {
    await Promise.all([loadRoster(), loadVisits()]);
    await flushQueue();
  }, [flushQueue, loadRoster, loadVisits]);

  // Hold the latest reload so the mount effect can call it without depending on
  // its identity (target objects are re-created by the saved-targets poll).
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  // Hydrate from cache instantly, then refresh from the network.
  useEffect(() => {
    if (!targetId) {
      return;
    }
    const cachedRoster = readJson<RosterCache>(rosterKey(targetId));
    if (cachedRoster) {
      setRoster(cachedRoster.homes);
      setCapped(cachedRoster.capped);
      setTotal(cachedRoster.total);
    }
    const cachedVisits = readJson<Record<string, WalkVisit>>(
      visitsKey(targetId)
    );
    setVisits(cachedVisits ?? {});
    const cachedQueue = readJson<QueuedEdit[]>(queueKey(targetId));
    setQueue(cachedQueue ?? []);
  }, [targetId]);

  useEffect(() => {
    if (targetId && authHeader) {
      reloadRef.current();
    }
  }, [targetId, authHeader]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      flushQueue();
    };
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [flushQueue]);

  const applyEdit = useCallback(
    (
      homeKey: string,
      change: { followUpDate?: string; notes?: string; status: WalkStatus }
    ) => {
      const now = new Date().toISOString();
      const nextVisit: WalkVisit = {
        followUpDate: change.followUpDate,
        homeKey,
        notes: change.notes,
        status: coerceWalkStatus(change.status),
        targetId,
        updatedAt: now,
      };
      persistVisits({ ...visits, [homeKey]: nextVisit });
      const edit: QueuedEdit = {
        followUpDate: change.followUpDate,
        homeKey,
        notes: change.notes,
        status: nextVisit.status,
        updatedAt: now,
      };
      // Collapse any earlier pending edit for the same home — only the latest
      // state needs to reach the server.
      persistQueue([
        ...queueRef.current.filter((item) => item.homeKey !== homeKey),
        edit,
      ]);
      flushQueue();
    },
    [flushQueue, persistQueue, persistVisits, targetId, visits]
  );

  const saveVisit = useCallback(
    (
      homeKey: string,
      change: { followUpDate?: string; notes?: string; status: WalkStatus }
    ) => applyEdit(homeKey, change),
    [applyEdit]
  );

  const setStatus = useCallback(
    (homeKey: string, status: WalkStatus) => {
      const existing = visits[homeKey];
      applyEdit(homeKey, {
        followUpDate: existing?.followUpDate,
        notes: existing?.notes,
        status,
      });
    },
    [applyEdit, visits]
  );

  const homes = useMemo(
    () => mergeRosterWithVisits(roster, Object.values(visits)),
    [roster, visits]
  );

  return {
    capped,
    error,
    homes,
    isLoading,
    isOffline,
    pendingCount: queue.length,
    reload,
    saveVisit,
    setStatus,
    total,
  };
};
