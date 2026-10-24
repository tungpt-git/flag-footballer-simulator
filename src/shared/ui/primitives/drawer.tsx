"use client";

import { Button } from "@/shared/ui/primitives/button";
import { cn } from "@/shared/ui/utils";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { XIcon } from "lucide-react";
import * as React from "react";

/** Right-edge drawer. Dismissal swipes toward the right. */
function Drawer({
  swipeDirection = "right",
  ...props
}: DrawerPrimitive.Root.Props) {
  return (
    <DrawerPrimitive.Root
      data-slot="drawer"
      swipeDirection={swipeDirection}
      {...props}
    />
  );
}

function DrawerTrigger({ ...props }: DrawerPrimitive.Trigger.Props) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({ ...props }: DrawerPrimitive.Portal.Props) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose({ ...props }: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({
  className,
  ...props
}: DrawerPrimitive.Backdrop.Props) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="drawer-overlay"
      className={cn(
        "fixed inset-0 z-50 min-h-dvh bg-black/60 backdrop-blur-[2px] opacity-[calc(1-var(--drawer-swipe-progress))] transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-starting-style:opacity-0 data-swiping:duration-0 supports-[-webkit-touch-callout:none]:absolute",
        className,
      )}
      {...props}
    />
  );
}

function DrawerContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DrawerPrimitive.Popup.Props & {
  showCloseButton?: boolean;
}) {
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Viewport
        data-slot="drawer-viewport"
        className="pointer-events-none fixed inset-0 z-50 flex items-stretch justify-end supports-[-webkit-touch-callout:none]:absolute"
      >
        <DrawerPrimitive.Popup
          data-slot="drawer-popup"
          className={cn(
            "pointer-events-auto relative flex h-full max-h-full w-[min(30rem,calc(100%-1.5rem))] min-h-0 touch-none flex-col overflow-visible border-l border-border bg-popover text-sm text-popover-foreground shadow-overlay outline-none select-none",
            "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform transform-[translateX(var(--drawer-swipe-movement-x))]",
            "data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-starting-style:transform-[translateX(calc(100%+2px))] data-ending-style:transform-[translateX(calc(100%+2px))] data-swiping:duration-0",
            "after:pointer-events-none after:absolute after:inset-y-0 after:left-full after:w-12 after:bg-popover after:content-['']",
            "sm:rounded-l-2xl",
            className,
          )}
          {...props}
        >
          <DrawerPrimitive.Content
            data-slot="drawer-content"
            className="flex min-h-0 flex-1 touch-auto flex-col overflow-hidden rounded-[inherit] select-text"
          >
            {children}
          </DrawerPrimitive.Content>
          {showCloseButton && (
            <DrawerPrimitive.Close
              data-slot="drawer-close"
              render={
                <Button
                  variant="ghost"
                  className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 z-10"
                  size="icon-sm"
                />
              }
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </DrawerPrimitive.Close>
          )}
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn("flex shrink-0 flex-col gap-2", className)}
      {...props}
    />
  );
}

/** Scroll container between the header and footer. The shell itself does not scroll. */
function DrawerBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-body"
      className={cn(
        "scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain",
        className,
      )}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn(
        "flex shrink-0 items-center justify-end gap-2 border-t border-border bg-popover px-5 py-3",
        className,
      )}
      {...props}
    />
  );
}

function DrawerTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn(
        "font-heading text-base leading-none font-semibold",
        className,
      )}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
};
