"use client";

import { AlertDialog } from "radix-ui";
import { Button } from "./button";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  children?: React.ReactNode;
};

/** Confirmation for consequential actions (cancel a booking, archive a vehicle). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Keep it",
  destructive,
  pending,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 flex w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl bg-white p-6 shadow-lg">
          <AlertDialog.Title className="font-heading text-h4 font-medium text-heading">{title}</AlertDialog.Title>
          <AlertDialog.Description asChild>
            <div className="text-sm">{description}</div>
          </AlertDialog.Description>
          {children}
          <div className="mt-2 flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" size="sm" className="h-[42px]">
                {cancelLabel}
              </Button>
            </AlertDialog.Cancel>
            <Button
              size="sm"
              className={destructive ? "h-[42px] bg-danger-strong hover:bg-danger-strong/90" : "h-[42px]"}
              disabled={pending}
              onClick={onConfirm}
            >
              {pending ? "Working…" : confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
