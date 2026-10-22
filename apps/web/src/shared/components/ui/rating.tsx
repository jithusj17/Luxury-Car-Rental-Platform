import { Star } from "lucide-react";
import { cn } from "@/shared/lib/utils";

type RatingProps = { value: number; max?: number; className?: string };

/** Read-only star rating (rounded to the nearest whole star). */
export function Rating({ value, max = 5, className }: RatingProps) {
  const filled = Math.round(Math.min(Math.max(value, 0), max));
  return (
    <span role="img" aria-label={`Rated ${value} out of ${max}`} className={cn("inline-flex gap-0.5", className)}>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          aria-hidden
          className={cn("size-4", i < filled ? "fill-primary text-primary" : "fill-border text-border")}
        />
      ))}
    </span>
  );
}
