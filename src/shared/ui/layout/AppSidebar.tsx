"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartColumn, LayoutDashboard, PlayCircle, Route as RouteIcon, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/shared/ui/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/simulator", label: "Simulator", icon: PlayCircle },
  { href: "/players", label: "Roster", icon: Users },
  { href: "/playbook", label: "Playbook", icon: RouteIcon },
  { href: "/results", label: "Results", icon: ChartColumn },
];

const isActiveRoute = (pathname: string, href: string): boolean =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

/** Tablet: icon rail with captions. Desktop (xl): full sidebar. Hidden on phones (see MobileTabBar). */
export const AppSidebar = () => {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="hidden w-[4.75rem] shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-standard md:flex xl:w-60"
    >
      <ul className="flex flex-1 flex-col gap-1 p-2 xl:p-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = isActiveRoute(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative flex flex-col items-center gap-1 rounded-lg px-1 py-2.5 text-[0.6875rem] font-medium text-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-foreground xl:flex-row xl:gap-3 xl:px-3 xl:text-sm",
                  isActive && "bg-sidebar-accent text-foreground",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-2 bottom-2 -left-2 w-1 rounded-r-full bg-primary opacity-0 transition-opacity duration-150 xl:-left-3",
                    isActive && "opacity-100",
                  )}
                />
                <Icon className={cn("size-5 shrink-0", isActive && "text-primary")} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="hidden px-5 pb-4 text-xs text-muted-foreground xl:block">Season 2026 · Film room</p>
    </nav>
  );
};

/** Phones: bottom tab bar with thumb-sized targets. */
export const MobileTabBar = () => {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = isActiveRoute(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium text-muted-foreground transition-colors duration-150",
                  isActive && "text-foreground",
                )}
              >
                <Icon className={cn("size-5", isActive && "text-primary")} aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
