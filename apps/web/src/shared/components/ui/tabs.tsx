"use client";

import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/shared/lib/utils";

export const Tabs = TabsPrimitive.Root;
export const TabsContent = TabsPrimitive.Content;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("flex gap-2 overflow-x-auto [scrollbar-width:none]", className)}
      {...props}
    />
  );
}

/** Pill tab — the "Overview / Specs & features / …" row on Listing detail. */
export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "h-[42px] shrink-0 rounded-full border border-border px-5 font-heading text-sm font-medium text-heading transition-colors hover:border-heading data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
        className,
      )}
      {...props}
    />
  );
}
