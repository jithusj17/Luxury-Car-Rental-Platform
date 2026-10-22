"use client";

import { Timer } from "lucide-react";
import { useEffect, useState } from "react";

/** Time left on the payment hold; announces expiry. Server-side expiry is authoritative. */
export function HoldCountdown({ expiresAt, onExpire }: { expiresAt: string; onExpire?: () => void }) {
  const [remaining, setRemaining] = useState(() => new Date(expiresAt).getTime() - Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      const left = new Date(expiresAt).getTime() - Date.now();
      setRemaining(left);
      if (left <= 0) {
        clearInterval(timer);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, onExpire]);

  if (remaining <= 0) return <p role="status" className="font-medium text-danger-strong">Your hold has expired.</p>;
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  return (
    <p className="flex items-center gap-2 rounded-md bg-primary-soft px-4 py-3 text-sm text-heading">
      <Timer aria-hidden className="size-4 text-primary" />
      Dates held for{" "}
      <span className="font-semibold tabular-nums" aria-live="off">
        {minutes}:{String(seconds).padStart(2, "0")}
      </span>
    </p>
  );
}
