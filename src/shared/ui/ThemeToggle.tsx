"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { THEME_STORAGE_KEY } from "@/shared/ui/theme";

const subscribeToThemeClass = (onChange: () => void): (() => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
};

const readIsDark = (): boolean => document.documentElement.classList.contains("dark");

/** Switches between the dark broadcast and light coaching-board themes; the choice is persisted. */
export const ThemeToggle = () => {
  const isDark = useSyncExternalStore(subscribeToThemeClass, readIsDark, () => true);

  const handleToggle = useCallback((): void => {
    const nextIsDark = !readIsDark();
    document.documentElement.classList.toggle("dark", nextIsDark);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextIsDark ? "dark" : "light");
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={!isDark}
    >
      {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  );
};
