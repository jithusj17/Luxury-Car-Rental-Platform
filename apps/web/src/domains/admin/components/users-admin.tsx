"use client";

import type { AdminUser, UserRole } from "@car-rental/contracts";
import { useCallback, useState } from "react";
import { useAuth } from "@/domains/auth/hooks";
import { errorMessage } from "@/shared/api/api-error";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { DataTable } from "@/shared/components/ui/data-table";
import { ErrorState, Skeleton } from "@/shared/components/ui/feedback";
import { Input } from "@/shared/components/ui/input";
import { Pagination } from "@/shared/components/ui/pagination";
import { useToast } from "@/shared/components/ui/toast";
import { useAdminUsers, useSetUserRoles, useSetUserSuspended } from "../hooks";
import { ALL, AdminFilter, AdminSearch } from "./admin-filters";

const PAGE_SIZE = 20;
const roleOptions = [
  { value: "owner", label: "Hosts" },
  { value: "admin", label: "Admins" },
];

/** All accounts: search, toggle host/admin roles, suspend or reinstate. */
export function UsersAdmin() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [role, setRole] = useState(ALL);
  const [page, setPage] = useState(1);
  const users = useAdminUsers({ q: q || undefined, role: role === ALL ? undefined : (role as UserRole), page, pageSize: PAGE_SIZE });
  const setRoles = useSetUserRoles();
  const setSuspended = useSetUserSuspended();
  const [suspending, setSuspending] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState("");
  const onSearch = useCallback((value: string) => {
    setQ(value);
    setPage(1);
  }, []);

  async function toggleRole(user: AdminUser, role: "owner" | "admin", on: boolean) {
    const next = { owner: user.roles.includes("owner"), admin: user.roles.includes("admin"), [role]: on };
    try {
      await setRoles.mutateAsync({ id: user.id, body: next });
      toast.success("Roles updated", user.fullName);
    } catch (error) {
      toast.error("Couldn't change roles", errorMessage(error));
    }
  }

  async function changeSuspension(user: AdminUser, suspended: boolean) {
    try {
      await setSuspended.mutateAsync({ id: user.id, body: { suspended, reason: reason.trim() || undefined } });
      toast.success(suspended ? "User suspended" : "User reinstated", user.fullName);
      setSuspending(null);
      setReason("");
    } catch (error) {
      toast.error("Couldn't update the account", errorMessage(error));
    }
  }

  return (
    <Card className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        <AdminSearch label="Search name or email" onSearch={onSearch} />
        <AdminFilter label="Roles" value={role} onChange={(v) => { setRole(v); setPage(1); }} options={roleOptions} />
      </div>
      {users.isPending ? (
        <Skeleton className="h-64" />
      ) : users.isError ? (
        <ErrorState action={<Button onClick={() => users.refetch()}>Try again</Button>} />
      ) : (
        <>
          <p className="text-sm"><span className="font-semibold text-primary">{users.data.total}</span> users</p>
          <DataTable
            caption="All users"
            rows={users.data.items}
            rowKey={(u) => u.id}
            columns={[
              {
                header: "User",
                cell: (u) => (
                  <div>
                    <p className="font-heading font-medium text-heading">{u.fullName}</p>
                    <p className="text-xs">{u.email}</p>
                  </div>
                ),
              },
              { header: "Joined", cell: (u) => <span className="text-sm text-heading">{new Date(u.createdAt).toLocaleDateString()}</span> },
              {
                header: "Status",
                cell: (u) => (u.suspendedAt ? <Badge variant="danger">Suspended</Badge> : <Badge variant="success">Active</Badge>),
              },
              {
                header: "Roles",
                cell: (u) => (
                  <div className="flex flex-col gap-2 text-sm text-heading">
                    {(["owner", "admin"] as const).map((r) => (
                      <label key={r} className="flex items-center gap-2">
                        <Checkbox
                          checked={u.roles.includes(r)}
                          disabled={setRoles.isPending || (r === "admin" && u.id === me?.id)}
                          onCheckedChange={(checked) => toggleRole(u, r, checked === true)}
                          aria-label={`${r === "owner" ? "Host" : "Admin"} role for ${u.fullName}`}
                        />
                        {r === "owner" ? "Host" : "Admin"}
                      </label>
                    ))}
                  </div>
                ),
              },
              {
                header: "Action",
                cell: (u) =>
                  u.id === me?.id ? (
                    <span className="text-xs">You</span>
                  ) : u.suspendedAt ? (
                    <Button variant="secondary" size="sm" onClick={() => changeSuspension(u, false)}>Reinstate</Button>
                  ) : (
                    <Button variant="secondary" size="sm" className="text-danger-strong" onClick={() => setSuspending(u)}>Suspend</Button>
                  ),
              },
            ]}
          />
          <Pagination page={page} pageCount={Math.ceil(users.data.total / PAGE_SIZE)} onPageChange={setPage} />
        </>
      )}
      <ConfirmDialog
        open={suspending !== null}
        onOpenChange={(open) => !open && setSuspending(null)}
        title={`Suspend ${suspending?.fullName ?? "user"}?`}
        description="They'll be signed out everywhere and can't sign in until reinstated. Their bookings are not changed."
        confirmLabel="Suspend"
        cancelLabel="Cancel"
        destructive
        pending={setSuspended.isPending}
        onConfirm={() => suspending && changeSuspension(suspending, true)}
      >
        <label htmlFor="suspend-reason" className="font-heading text-sm font-medium text-heading">Reason (recorded in the audit log)</label>
        <Input id="suspend-reason" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
      </ConfirmDialog>
    </Card>
  );
}
