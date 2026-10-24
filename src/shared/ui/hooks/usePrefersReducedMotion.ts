"use client";

import { useCallback, useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

export const usePrefersReducedMotion = (): boolean => {
  const subscribe = useCallback((onChange: () => void) => {
    const mediaQueryList = window.matchMedia(QUERY);
    mediaQueryList.addEventListener("change", onChange);
    return () => mediaQueryList.removeEventListener("change", onChange);
  }, []);

  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
};
