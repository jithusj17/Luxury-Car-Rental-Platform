"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "@/shared/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

function Overlay() {
  return <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60" />;
}

function CloseButton() {
  return (
    <DialogPrimitive.Close
      aria-label="Close"
      className="absolute top-5 right-5 rounded-full p-1 text-heading hover:bg-surface"
    >
      <X className="size-5" />
    </DialogPrimitive.Close>
  );
}

/** Centered modal (Login / Register popups: 30px radius, white, dimmed overlay). */
export function DialogContent({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <Overlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[920px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white shadow-lg",
          className,
        )}
        {...props}
      >
        {children}
        <CloseButton />
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** Off-canvas panel for mobile navigation. */
export function SheetContent({
  className,
  children,
  side = "left",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { side?: "left" | "right" }) {
  return (
    <DialogPrimitive.Portal>
      <Overlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-y-0 z-50 flex w-[min(320px,85vw)] flex-col overflow-y-auto shadow-lg",
          side === "left" ? "left-0" : "right-0",
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
