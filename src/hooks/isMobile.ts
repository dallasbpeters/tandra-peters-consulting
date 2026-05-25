import { useEffect, useState } from "react";

export function useIsMobile(breakpoint = 768) {
  const query = `(max-width: ${breakpoint}px)`;
  const getInitialMatch = () =>
    typeof window !== "undefined" && window.matchMedia(query).matches;

  const [isMobile, setIsMobile] = useState<boolean>(getInitialMatch);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [query]);

  return isMobile;
}
