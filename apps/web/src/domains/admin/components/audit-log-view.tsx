"use client";

import { ClipboardList } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { DataTable } from "@/shared/components/ui/data-table";
import { EmptyState, ErrorState, Skeleton } from "@/shared/components/ui/feedback";
import { Pagination } from "@/shared/components/ui/pagination";
import { formatDateTime } from "@/shared/lib/dates";
import { useAuditLog } from "../hooks";

const actionLabels: Record<string, string> = {
  "user.roles_changed": "Changed roles",
  "user.suspended": "Suspended user",
  "user.reinstated": "Reinstated user",
  "vehicle.status_changed": "Changed car status",
  "booking.cancelled": "Cancelled booking",
};

function describe(details: Record<string, unknown>): string {
  if (Array.isArray(details.to)) return `→ ${(details.to as string[]).join(", ")}`;
  if (typeof details.status === "string") return `→ ${details.status.toLowerCase()}`;
  if (typeof details.reason === "string") return `“${details.reason}”`;
  return "";
}

/** Who did what, when — every admin change is recorded by the API in the same transaction. */
export function AuditLogTable({ pageSize = 20 }: { pageSize?: number }) {
  const [page, setPage] = useState(1);
  const log = useAuditLog({ page, pageSize });

  if (log.isPending) return <Skeleton className="h-40" />;
  if (log.isError) return <ErrorState action={<Button onClick={() => log.refetch()}>Try again</Button>} />;
  if (log.data.total === 0) return <EmptyState icon={<ClipboardList />} title="No admin actions yet" />;

  return (
    <div className="flex flex-col gap-6">
      <DataTable
        caption="Admin audit log"
        rows={log.data.items}
        rowKey={(e) => e.id}
        columns={[
          { header: "When", cell: (e) => <span className="text-sm text-heading">{formatDateTime(e.createdAt)}</span> },
          { header: "Admin", cell: (e) => <span className="text-sm text-heading">{e.actor.name}</span> },
          { header: "Action", cell: (e) => <span className="font-heading font-medium text-heading">{actionLabels[e.action] ?? e.action}</span> },
          {
            header: "Target",
            cell: (e) => (
              <span className="text-sm">
                {e.targetType} <code className="text-xs">{e.targetId.slice(0, 8)}</code> {describe(e.details)}
              </span>
            ),
          },
        ]}
      />
      {pageSize >= 20 && <Pagination page={page} pageCount={Math.ceil(log.data.total / pageSize)} onPageChange={setPage} />}
    </div>
  );
}
