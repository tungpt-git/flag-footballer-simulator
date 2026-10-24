import type { ReactNode } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/shared/ui/ThemeToggle";

const LogoMark = () => (
  <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
    <rect width="32" height="32" rx="8" className="fill-primary" />
    <path d="M7 22 C 12 22, 14 12, 25 9" fill="none" stroke="#0a1004" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M21.5 6.8 L26.2 8.7 L22.6 12.4 Z" fill="#0a1004" />
    <circle cx="7" cy="22" r="2.6" fill="#0a1004" />
  </svg>
);

type AppHeaderProps = {
  /** Mode switcher slot (rendered by the simulation context). */
  modeSwitcher?: ReactNode;
};

export const AppHeader = ({ modeSwitcher }: AppHeaderProps) => (
  <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-sidebar-border bg-sidebar px-3 md:px-4">
    <div className="flex min-w-0 items-center gap-3">
      <a
        href="#main-content"
        className="sr-only rounded-md bg-popover px-3 py-2 text-sm focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50"
      >
        Skip to content
      </a>
      <Link href="/" aria-label="Flag Football Lab home" className="flex items-center gap-2.5 rounded-md">
        <LogoMark />
        <span className="hidden font-display text-xl font-semibold uppercase tracking-wide text-foreground sm:inline">
          Flag Football <span className="text-primary">Lab</span>
        </span>
      </Link>
    </div>

    <div className="flex items-center gap-2">
      {modeSwitcher}
      <ThemeToggle />
      <div
        className="hidden size-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground sm:flex"
        role="img"
        aria-label="Signed in as Coach"
      >
        C
      </div>
    </div>
  </header>
);
