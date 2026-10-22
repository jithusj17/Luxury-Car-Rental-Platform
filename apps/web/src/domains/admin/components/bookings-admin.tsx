"use client";

import type { Booking, BookingStatus as Status } from "@car-rental/contracts";
import { useState } from "react";
import { BookingStatus } from "@/domains/bookings/components/booking-status";
import { errorMessage } from "@/shared/api/api-error";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { DataTable } from "@/shared/components/ui/data-table";
import { ErrorState, Skeleton } from "@/shared/components/ui/feedback";
import { FormAlert } from "@/shared/components/ui/form-alert";
import { Textarea } from "@/shared/components/ui/input";
import { Pagination } from "@/shared/components/ui/pagination";
import { useToast } from "@/shared/components/ui/toast";
import { formatShortDate } from "@/shared/lib/dates";
import { formatPrice } from "@/shared/lib/utils";
import { useAdminBookings, useAdminCancelBooking } from "../hooks";
import { ALL, AdminFilter } from "./admin-filters";

const PAGE_SIZE = 20;
const statusOptions: { value: Status; label: string }[] = [
  { value: "PENDING_PAYMENT", label: "Awaiting payment" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "EXPIRED", label: "Expired" },
];

/** Every booking on the platform; admins can cancel with a full refund (reason required, audited). */
export function BookingsAdmin() {
  const toast = useToast();
  const [status, setStatus] = useState(ALL);
  const [page, setPage] = useState(1);
  const bookings = useAdminBookings({ status: status === ALL ? undefined : (status as Status), page, pageSize: PAGE_SIZE });
  const cancel = useAdminCancelBooking();
  const [cancelling, setCancelling] = useState<Booking | null>(null);
  const [reason, setReason] = useState("");

  async function confirmCancel() {
    if (!cancelling) return;
    try {
      await cancel.mutateAsync({ id: cancelling.id, reason: reason.trim() });
      toast.success("Booking cancelled", cancelling.status === "CONFIRMED" ? "The renter will be refunded in full." : undefined);
      setCancelling(null);
      setReason("");
    } catch {
      // Shown in the dialog.
    }
  }

  return (
    <Card className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        <AdminFilter label="Statuses" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={statusOptions} />
      </div>
      {bookings.isPending ? (
        <Skeleton className="h-64" />
      ) : bookings.isError ? (
        <ErrorState action={<Button onClick={() => bookings.refetch()}>Try again</Button>} />
      ) : (
        <>
          <p className="text-sm"><span className="font-semibold text-primary">{bookings.data.total}</span> bookings</p>
          <DataTable
            caption="All bookings"
            rows={bookings.data.items}
            rowKey={(b) => b.id}
            columns={[
              {
                header: "Booking",
                cell: (b) => (
                  <div>
                    <p className="font-heading font-medium text-heading">{b.vehicle.year} {b.vehicle.make} {b.vehicle.model}</p>
                    <p className="text-xs">Renter: {b.renter.name} · Host: {b.owner.name}</p>
                  </div>
                ),
              },
              { header: "Dates", cell: (b) => <span className="text-sm text-heading">{formatShortDate(b.pickupDate)} – {formatShortDate(b.returnDate)}</span> },
              { header: "Status", cell: (b) => <BookingStatus booking={b} /> },
              {
                header: "Total",
                cell: (b) => (
                  <div className="text-sm">
                    <p className="font-heading font-medium text-primary">{formatPrice(b.price.totalCents, b.price.currency)}</p>
                    {b.refundedCents > 0 && <p className="text-xs text-success-strong">Refunded {formatPrice(b.refundedCents, b.price.currency)}</p>}
                  </div>
                ),
              },
              {
                header: "Action",
                cell: (b) =>
                  b.cancellation.allowed ? (
                    <Button variant="secondary" size="sm" className="text-danger-strong" onClick={() => setCancelling(b)}>Cancel</Button>
                  ) : (
                    <span className="text-xs">—</span>
                  ),
              },
            ]}
          />
          <Pagination page={page} pageCount={Math.ceil(bookings.data.total / PAGE_SIZE)} onPageChange={setPage} />
        </>
      )}
      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={(open) => !open && setCancelling(null)}
        title="Cancel this booking?"
        description={
          cancelling?.status === "CONFIRMED"
            ? `The renter gets a full refund of ${formatPrice(cancelling.price.totalCents, cancelling.price.currency)} and the dates are released.`
            : "The hold is released. Nothing has been charged."
        }
        confirmLabel="Cancel booking"
        cancelLabel="Keep it"
        destructive
        pending={cancel.isPending}
        onConfirm={confirmCancel}
      >
        <label htmlFor="admin-cancel-reason" className="font-heading text-sm font-medium text-heading">Reason (required, shown to the renter)</label>
        <Textarea id="admin-cancel-reason" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} className="min-h-20" />
        {cancel.isError && <FormAlert>{errorMessage(cancel.error)}</FormAlert>}
      </ConfirmDialog>
    </Card>
  );
}
