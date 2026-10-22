"use client";

import type { PaymentStatus } from "@car-rental/contracts";
import { useState } from "react";
import { Badge, type BadgeProps } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { DataTable } from "@/shared/components/ui/data-table";
import { ErrorState, Skeleton } from "@/shared/components/ui/feedback";
import { Pagination } from "@/shared/components/ui/pagination";
import { formatDateTime } from "@/shared/lib/dates";
import { formatPrice } from "@/shared/lib/utils";
import { useAdminPayments } from "../hooks";
import { ALL, AdminFilter } from "./admin-filters";

const PAGE_SIZE = 20;
const statusStyle: Record<PaymentStatus, { label: string; variant: BadgeProps["variant"] }> = {
  REQUIRES_ACTION: { label: "Open", variant: "soft" },
  SUCCEEDED: { label: "Paid", variant: "success" },
  FAILED: { label: "Failed", variant: "danger" },
  CANCELLED: { label: "Cancelled", variant: "neutral" },
};
const statusOptions = (Object.keys(statusStyle) as PaymentStatus[]).map((s) => ({ value: s, label: statusStyle[s].label }));

/** Read-only view of payment attempts and refunds, for support and spotting failures. */
export function PaymentsAdmin() {
  const [status, setStatus] = useState(ALL);
  const [page, setPage] = useState(1);
  const payments = useAdminPayments({ status: status === ALL ? undefined : (status as PaymentStatus), page, pageSize: PAGE_SIZE });

  return (
    <Card className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        <AdminFilter label="Statuses" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={statusOptions} />
      </div>
      {payments.isPending ? (
        <Skeleton className="h-64" />
      ) : payments.isError ? (
        <ErrorState action={<Button onClick={() => payments.refetch()}>Try again</Button>} />
      ) : (
        <>
          <p className="text-sm"><span className="font-semibold text-primary">{payments.data.total}</span> payment attempts</p>
          <DataTable
            caption="All payments"
            rows={payments.data.items}
            rowKey={(p) => p.id}
            columns={[
              { header: "Created", cell: (p) => <span className="text-sm text-heading">{formatDateTime(p.createdAt)}</span> },
              { header: "Booking", cell: (p) => <code className="text-xs">{p.bookingId.slice(0, 8)}</code> },
              {
                header: "Amount",
                cell: (p) => (
                  <div className="text-sm">
                    <p className="font-heading font-medium text-heading">{formatPrice(p.amountCents, p.currency)}</p>
                    {p.refundedCents > 0 && <p className="text-xs text-success-strong">Refunded {formatPrice(p.refundedCents, p.currency)}</p>}
                  </div>
                ),
              },
              {
                header: "Status",
                cell: (p) => (
                  <div className="flex flex-col items-start gap-1">
                    <Badge variant={statusStyle[p.status].variant}>{statusStyle[p.status].label}</Badge>
                    {p.failureReason && <span className="text-xs text-danger-strong">{p.failureReason.replaceAll("_", " ")}</span>}
                  </div>
                ),
              },
              { header: "Provider", cell: (p) => <span className="text-sm">{p.provider}</span> },
            ]}
          />
          <Pagination page={page} pageCount={Math.ceil(payments.data.total / PAGE_SIZE)} onPageChange={setPage} />
        </>
      )}
    </Card>
  );
}
