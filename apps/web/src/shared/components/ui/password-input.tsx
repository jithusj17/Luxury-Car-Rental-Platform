"use client";

import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { cn } from "@/shared/lib/utils";
import { fieldControlClasses } from "./input";

/** Password field with a lock icon and a show/hide toggle (Login / Register frames). */
export function PasswordInput({ className, ...props }: React.ComponentProps<"input">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <LockKeyhole aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-icon" />
      <input
        type={visible ? "text" : "password"}
        className={cn(fieldControlClasses, "h-[46px] pr-11 pl-10", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-1 text-icon hover:text-heading"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
