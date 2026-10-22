import type { PriceBreakdown } from "@car-rental/contracts";
import { formatPrice } from "@/shared/lib/utils";
import { cn } from "@/shared/lib/utils";

/** Server-computed price breakdown. The client never calculates the amount charged. */
export function BookingSummary({ price, className }: { price: PriceBreakdown; className?: string }) {
  const money = (cents: number) => formatPrice(cents, price.currency);
  const exact = (cents: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: price.currency }).format(cents / 100);
  return (
    <dl className={cn("flex flex-col gap-3 text-sm", className)}>
      <div className="flex justify-between">
        <dt>
          {money(price.dailyRateCents)} × {price.days} {price.days === 1 ? "day" : "days"}
        </dt>
        <dd className="text-heading">{exact(price.subtotalCents)}</dd>
      </div>
      <div className="flex justify-between">
        <dt>Service fee</dt>
        <dd className="text-heading">{exact(price.serviceFeeCents)}</dd>
      </div>
      <div className="flex justify-between border-t border-border pt-3 font-heading text-base font-medium text-heading">
        <dt>Total</dt>
        <dd>{exact(price.totalCents)}</dd>
      </div>
    </dl>
  );
}
