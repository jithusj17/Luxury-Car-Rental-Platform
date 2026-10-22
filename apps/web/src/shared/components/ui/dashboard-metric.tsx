import { cn } from "@/shared/lib/utils";
import { Skeleton } from "./feedback";

/** Stat tile from 37_Dash Board: icon in a white circle on the soft brand background. */
export function DashboardMetric({
  icon,
  label,
  value,
  hint,
  loading,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-5 rounded-xl bg-primary-soft p-5", className)}>
      <span aria-hidden className="flex size-[70px] shrink-0 items-center justify-center rounded-full bg-white text-primary [&_svg]:size-7">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-heading text-base font-medium text-heading">{label}</p>
        {loading ? <Skeleton className="mt-1 h-7 w-16 bg-white" /> : <p className="font-heading text-h3 font-semibold text-heading">{value}</p>}
        {hint && <p className="text-xs">{hint}</p>}
      </div>
    </div>
  );
}
