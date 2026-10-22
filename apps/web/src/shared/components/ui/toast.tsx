"use client";

import { CircleAlert, CircleCheck, X } from "lucide-react";
import { Toast as ToastPrimitive } from "radix-ui";
import { createContext, use, useCallback, useMemo, useState } from "react";
import { cn } from "@/shared/lib/utils";

type ToastVariant = "success" | "error";
type ToastItem = { id: number; title: string; description?: string; variant: ToastVariant };
type Notify = (toast: Omit<ToastItem, "id">) => void;

const ToastContext = createContext<Notify | null>(null);

/** App-wide notifications (the spec's `Notification` component). Announced to screen readers. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const notify = useCallback<Notify>((toast) => {
    setToasts((current) => [...current.slice(-2), { ...toast, id: Date.now() + Math.random() }]);
  }, []);
  const remove = (id: number) => setToasts((current) => current.filter((t) => t.id !== id));

  return (
    <ToastContext value={notify}>
      <ToastPrimitive.Provider swipeDirection="right" duration={5000}>
        {children}
        {toasts.map((toast) => (
          <ToastPrimitive.Root
            key={toast.id}
            onOpenChange={(open) => !open && remove(toast.id)}
            className="flex items-start gap-3 rounded-lg border border-border bg-white p-4 shadow-lg"
          >
            {toast.variant === "success" ? (
              <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-success-strong" />
            ) : (
              <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-danger-strong" />
            )}
            <div className="flex-1">
              <ToastPrimitive.Title className="font-heading font-medium text-heading">{toast.title}</ToastPrimitive.Title>
              {toast.description && <ToastPrimitive.Description className="mt-1">{toast.description}</ToastPrimitive.Description>}
            </div>
            <ToastPrimitive.Close aria-label="Dismiss" className="text-icon hover:text-heading">
              <X className="size-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className={cn("fixed right-4 bottom-4 z-[100] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2")} />
      </ToastPrimitive.Provider>
    </ToastContext>
  );
}

export function useToast() {
  const notify = use(ToastContext);
  if (!notify) throw new Error("useToast must be used inside ToastProvider");
  return useMemo(
    () => ({
      success: (title: string, description?: string) => notify({ title, description, variant: "success" }),
      error: (title: string, description?: string) => notify({ title, description, variant: "error" }),
    }),
    [notify],
  );
}
