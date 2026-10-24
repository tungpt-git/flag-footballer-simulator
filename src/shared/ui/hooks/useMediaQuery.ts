"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Subscribes to a CSS media query. Returns `false` on the server and during hydration. */
export const useMediaQuery = (query: string): boolean => {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener("change", onChange);
      return () => mediaQueryList.removeEventListener("change", onChange);
    },
    [query],
  );
  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
};

/** Tailwind `xl` (>= 1280px) and `md` (>= 768px) breakpoints. */
export const DESKTOP_QUERY = "(min-width: 1280px)";
export const TABLET_QUERY = "(min-width: 768px)";
