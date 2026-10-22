"use client";

import { ChevronDown, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { useAuth, useLogout } from "@/domains/auth/hooks";
import { Skeleton } from "@/shared/components/ui/feedback";
import { cn } from "@/shared/lib/utils";

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

const itemClass =
  "flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm text-heading outline-none data-[highlighted]:bg-primary-soft data-[highlighted]:text-primary";

/** Header account control: sign-in link for visitors, avatar menu for signed-in users. */
export function AccountMenu({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const { user, isLoading } = useAuth();
  const logout = useLogout();
  const router = useRouter();

  if (isLoading) return <Skeleton className="h-6 w-32" />;
  if (!user) {
    return (
      <Link href="/login" className={cn("flex items-center gap-2 font-heading text-base hover:text-primary", tone === "light" ? "text-white" : "text-heading")}>
        <UserRound aria-hidden className="size-5" />
        Login / Register
      </Link>
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="flex items-center gap-2 rounded-full font-heading text-base font-medium text-heading">
        <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-placeholder text-sm text-heading">
          {initials(user.fullName)}
        </span>
        <span className="max-w-32 truncate">{user.fullName}</span>
        <ChevronDown aria-hidden className="size-4" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className="z-50 min-w-48 rounded-md border border-border bg-white p-1 shadow-lg">
          <DropdownMenu.Item asChild className={itemClass}>
            <Link href="/dashboard">Dashboard</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={itemClass}>
            <Link href="/dashboard/bookings">My bookings</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={itemClass}>
            <Link href="/dashboard/profile">Profile</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            className={itemClass}
            onSelect={() => logout.mutate(undefined, { onSettled: () => router.replace("/") })}
          >
            <LogOut aria-hidden className="size-4" /> Logout
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
