"use client";

import { LogOut, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useAuth, useLogout } from "@/domains/auth/hooks";
import { Skeleton } from "@/shared/components/ui/feedback";
import { cn } from "@/shared/lib/utils";
import { NavLink } from "./nav-link";
import { ownerNav, renterNav, type DashboardNavItem } from "./navigation";

const link = {
  base: "flex items-center gap-3 rounded-md px-3.5 py-3 font-heading text-base transition-colors [&_svg]:size-[22px]",
  active: "bg-primary font-bold text-white",
  inactive: "font-medium text-white/80 hover:bg-white/5 hover:text-white",
};

function NavGroup({ title, items, inSheet }: { title: string; items: DashboardNavItem[]; inSheet: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="px-3.5 font-heading text-sm text-white/50">{title}</p>
      <ul className="flex flex-col gap-1.5">
        {items.map(({ href, label, icon: Icon }) => {
          const item = (
            <NavLink href={href} className={link.base} activeClassName={link.active} inactiveClassName={link.inactive}>
              <Icon aria-hidden />
              {label}
            </NavLink>
          );
          return <li key={href}>{inSheet ? <DialogPrimitive.Close asChild>{item}</DialogPrimitive.Close> : item}</li>;
        })}
      </ul>
    </div>
  );
}

/** Account block + role-aware navigation of the 280px dark sidebar (37_Dash Board). */
export function DashboardSidebarNav({ inSheet = false }: { inSheet?: boolean }) {
  const { user, isOwner, isLoading } = useAuth();
  const logout = useLogout();
  const router = useRouter();

  return (
    <>
      <div className="flex items-center gap-2.5 px-8 py-5">
        <span className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-white text-heading">
          <UserRound aria-hidden className="size-6" />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-white/60">Account</p>
          {isLoading ? <Skeleton className="mt-1 h-4 w-32 bg-white/10" /> : <p className="truncate text-white">{user?.email}</p>}
        </div>
      </div>
      <hr className="mb-6 border-white/5" />
      <nav aria-label="Dashboard" className="flex flex-col gap-6 px-4">
        <NavGroup title="Menu" items={renterNav} inSheet={inSheet} />
        {isOwner && <NavGroup title="Hosting" items={ownerNav} inSheet={inSheet} />}
      </nav>
      <div className="mt-auto px-4 pt-6">
        <button
          type="button"
          onClick={() => logout.mutate(undefined, { onSettled: () => router.replace("/") })}
          className={cn(link.base, link.inactive, "w-full")}
        >
          <LogOut aria-hidden />
          Logout
        </button>
      </div>
    </>
  );
}
