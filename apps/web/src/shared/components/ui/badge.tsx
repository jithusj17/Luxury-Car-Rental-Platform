import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold [&_svg]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground",
        soft: "bg-primary-soft text-primary",
        overlay: "bg-black/30 text-white",
        success: "bg-success-soft text-success-strong",
        danger: "bg-danger-soft text-danger-strong",
        info: "bg-info-soft text-info-strong",
        neutral: "bg-surface text-heading",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

export type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export type BookingStatus = "pending" | "confirmed" | "active" | "completed" | "cancelled";

const statusMap: Record<BookingStatus, { label: string; variant: BadgeProps["variant"] }> = {
  pending: { label: "Pending", variant: "soft" },
  confirmed: { label: "Confirmed", variant: "success" },
  active: { label: "Active", variant: "info" },
  completed: { label: "Completed", variant: "neutral" },
  cancelled: { label: "Cancelled", variant: "danger" },
};

/** Status pill used in dashboard tables (Approved / Pending / Sold in the template). */
export function StatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  const { label, variant } = statusMap[status];
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
