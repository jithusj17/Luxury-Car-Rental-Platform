import { cn } from "@/shared/lib/utils";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-surface", className)} {...props} />;
}

export function LoadingSpinner({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <span role="status" className={cn("inline-flex items-center gap-2 text-sm", className)}>
      <span aria-hidden className="size-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Failure state with an optional retry action. */
export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this. Please try again.",
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div role="alert" className={cn("flex flex-col items-center gap-3 rounded-xl border border-danger/30 bg-danger-soft px-6 py-10 text-center", className)}>
      <h3 className="text-h5 font-medium">{title}</h3>
      <p className="max-w-sm">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-dashed border-border-strong px-6 py-12 text-center",
        className,
      )}
    >
      {icon && (
        <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary [&_svg]:size-6">
          {icon}
        </span>
      )}
      <h3 className="text-h5 font-medium">{title}</h3>
      {description && <p className="max-w-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
