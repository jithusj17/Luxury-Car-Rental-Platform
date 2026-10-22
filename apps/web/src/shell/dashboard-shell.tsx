import { Menu, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogTitle, DialogTrigger, SheetContent } from "@/shared/components/ui/dialog";
import { AccountMenu } from "./account-menu";
import { CurrentYear } from "./current-year";
import { DashboardSidebarNav } from "./dashboard-sidebar";
import { Logo } from "./logo";
import { siteConfig } from "./navigation";
import { MainNav } from "./site-header";

type Area = "dashboard" | "admin";

function SidebarContent({ inSheet = false, area }: { inSheet?: boolean; area: Area }) {
  return (
    <>
      <div className="flex h-[68px] shrink-0 items-center px-8">
        <Logo tone="light" />
      </div>
      <hr className="border-white/5" />
      <DashboardSidebarNav inSheet={inSheet} area={area} />
      <p className="px-8 pt-6 pb-8 text-body">
        Copyright © <CurrentYear /> {siteConfig.name}
      </p>
    </>
  );
}

/** Dashboard frame from 37–43: 280px dark sidebar, site navigation in the top bar, content area. */
export function DashboardShell({ children, area = "dashboard" }: { children: React.ReactNode; area?: Area }) {
  return (
    <div className="flex min-h-dvh bg-white">
      <aside className="sticky top-0 hidden h-dvh w-[280px] shrink-0 flex-col overflow-y-auto bg-heading lg:flex">
        <SidebarContent area={area} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 border-b border-border bg-white px-4 sm:px-8 lg:h-[80px]">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open dashboard menu">
                <Menu />
              </Button>
            </DialogTrigger>
            <SheetContent className="bg-heading" aria-describedby={undefined}>
              <DialogTitle className="sr-only">Dashboard menu</DialogTitle>
              <SidebarContent inSheet area={area} />
            </SheetContent>
          </Dialog>
          <MainNav className="hidden xl:block" />
          <div className="ml-auto flex items-center gap-5">
            <div className="hidden sm:block">
              <AccountMenu />
            </div>
            <Button asChild size="sm" className="h-[42px]">
              <Link href="/dashboard/fleet/new">
                <Plus aria-hidden />
                List your car
              </Link>
            </Button>
          </div>
        </header>
        <main className="flex-1 px-4 py-8 sm:px-8 xl:px-[30px]">{children}</main>
      </div>
    </div>
  );
}
