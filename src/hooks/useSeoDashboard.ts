import { useCallback, useEffect, useState } from "react";
import type { SeoDashboardPayload } from "../types/seo";

type UseSeoDashboardState = {
  data: SeoDashboardPayload | null;
  loading: boolean;
  error: string | null;
  statusCode: number | null;
  refetch: () => Promise<void>;
};

type DashboardResponseBody = Partial<SeoDashboardPayload> & {
  error?: string;
  detail?: string;
};

const parseDashboardResponse = (
  raw: string,
): DashboardResponseBody | null => {
  if (!raw.trim()) {
    return null;
  }

  try {
    return JSON.parse(raw) as DashboardResponseBody;
  } catch {
    return {
      error: raw.trim(),
      detail: raw.trim(),
    };
  }
};

export const useSeoDashboard = (token: string | null): UseSeoDashboardState => {
  const [data, setData] = useState<SeoDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);

  const refetch = useCallback(async () => {
    if (!token) {
      setData(null);
      setError(null);
      setStatusCode(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/seo/dashboard", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const raw = await response.text();
      const payload = parseDashboardResponse(raw);

      if (!response.ok) {
        setStatusCode(response.status);
        throw new Error(payload?.detail || payload?.error || "Request failed");
      }

      if (!payload) {
        throw new Error("Dashboard returned an empty response");
      }

      setData(payload as SeoDashboardPayload);
      setError(null);
      setStatusCode(response.status);
    } catch (err) {
      if (!statusCode) {
        setStatusCode(null);
      }
      setError(
        err instanceof Error
          ? err.message
          : "Could not load dashboard",
      );
    } finally {
      setLoading(false);
    }
  }, [token, statusCode]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, statusCode, refetch };
};
