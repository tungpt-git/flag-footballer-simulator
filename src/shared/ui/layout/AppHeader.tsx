import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/shared/ui/ThemeToggle";
import { ActivationAccess } from "@/shared/ui/layout/ActivationAccess";

const LogoMark = () => (
  <svg viewBox="84 207 1531 492" className="h-7 w-auto fill-primary" aria-hidden="true">
    <path d="M 709,687 1172,687 1300,559 864,559 852,561 824,571 797,590 Z" />
    <path d="M 1465,390 1057,393 798,393 758,394 722,401 693,414 667,433 429,688 653,689 791,533 814,512 838,502 850,500 1352,499 Z" />
    <path d="M 824,217 549,216 532,220 512,229 500,237 487,249 460,282 270,499 92,690 386,690 602,458 719,328 798,237 811,225 Z" />
    <path d="M 739,348 1479,345 1606,216 888,215 863,222 848,230 835,240 Z" />
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
      <Suspense fallback={<span aria-hidden="true" className="size-8 shrink-0 rounded-full bg-secondary" />}>
        <ActivationAccess />
      </Suspense>
    </div>
  </header>
);
