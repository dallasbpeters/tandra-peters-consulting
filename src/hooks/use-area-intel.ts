import { useEffect, useState } from "react";

import { parseDeskAreaIntelResponse } from "../lib/desk-area-api";
import type { DeskAreaIntelResponse } from "../lib/desk-types";

export const useAreaIntel = () => {
  const [intel, setIntel] = useState<DeskAreaIntelResponse | null>(null);
  const [intelError, setIntelError] = useState<string | null>(null);
  const [isLoadingIntel, setIsLoadingIntel] = useState(true);

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      try {
        const response = await fetch("/api/desk-area-intel");
        const body = await parseDeskAreaIntelResponse(response);
        if (!isActive) {
          return;
        }
        if (response.ok && body.ok) {
          setIntel(body);
        } else {
          setIntelError(body.error ?? "Could not load neighborhood signals.");
        }
      } catch {
        if (isActive) {
          setIntelError("Could not load neighborhood signals.");
        }
      } finally {
        if (isActive) {
          setIsLoadingIntel(false);
        }
      }
    };
    load();
    return () => {
      isActive = false;
    };
  }, []);

  return { intel, intelError, isLoadingIntel };
};
