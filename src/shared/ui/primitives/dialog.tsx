"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "@/shared/ui/utils"

import { Button } from "@/shared/ui/primitives/button"
import { XIcon } from "lucide-react"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/60 backdrop-blur-[2px] duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

const dialogContentVariants = cva(
  "fixed z-50 grid gap-4 border border-border bg-popover text-sm text-popover-foreground shadow-overlay outline-none data-open:animate-in data-closed:animate-out data-open:fade-in-0 data-closed:fade-out-0",
  {
    variants: {
      /** `center` = classic modal; `sheet` = bottom sheet on phones, right-hand drawer from tablet up. */
      variant: {
        center:
          "top-1/2 left-1/2 w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl p-4 duration-200 sm:max-w-sm data-open:zoom-in-95 data-closed:zoom-out-95",
        sheet:
          "inset-x-0 bottom-0 max-h-[90dvh] overflow-y-auto rounded-t-2xl border-b-0 p-0 duration-300 data-open:slide-in-from-bottom data-closed:slide-out-to-bottom md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[30rem] md:max-w-[calc(100%-2rem)] md:rounded-none md:rounded-l-2xl md:border-b md:border-r-0 md:data-open:slide-in-from-right md:data-closed:slide-out-to-right",
      },
    },
    defaultVariants: { variant: "center" },
  }
)

function DialogContent({
  className,
  children,
  showCloseButton = true,
  variant,
  ...props
}: DialogPrimitive.Popup.Props &
  VariantProps<typeof dialogContentVariants> & {
    showCloseButton?: boolean
  }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(dialogContentVariants({ variant }), className)}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-3 right-3"
                size="icon-sm"
              />
            }
          >
            <XIcon
            />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-base leading-none font-semibold",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
