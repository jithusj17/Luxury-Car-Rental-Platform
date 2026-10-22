import { cn } from "@/shared/lib/utils";

/** White bordered panel used for dashboard sections and form groups. */
export function Card({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("rounded-xl border border-border bg-white p-5 sm:p-6", className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mb-5 flex flex-wrap items-center justify-between gap-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 className={cn("text-h4 font-medium", className)} {...props} />;
}
