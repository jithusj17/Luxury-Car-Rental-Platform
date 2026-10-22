import { CircleAlert, CircleCheck } from "lucide-react";
import { cn } from "@/shared/lib/utils";

/** Form-level message (server error or success confirmation), announced to screen readers. */
export function FormAlert({ variant = "error", children, className }: { variant?: "error" | "success"; children: React.ReactNode; className?: string }) {
  const Icon = variant === "error" ? CircleAlert : CircleCheck;
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-md px-4 py-3 text-sm",
        variant === "error" ? "bg-danger-soft text-danger-strong" : "bg-success-soft text-success-strong",
        className,
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
