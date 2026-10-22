import { Menu, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogClose, DialogTitle, DialogTrigger, SheetContent } from "@/shared/components/ui/dialog";
import { AccountMenu } from "./account-menu";
import { Logo } from "./logo";
import { NavLink } from "./nav-link";
import { siteConfig } from "./navigation";

/** Main navigation, shared by the public site and the dashboard top bar (Figma "Menu" component). */
export function MainNav({ className }: { className?: string }) {
  return (
    <nav aria-label="Main" className={className}>
      <ul className="flex gap-8 xl:gap-10">
        {siteConfig.mainNav.map((item) => (
          <li key={item.href}>
            <NavLink
              href={item.href}
              className="font-heading text-base font-medium whitespace-nowrap transition-colors hover:text-primary"
              activeClassName="text-primary"
              inactiveClassName="text-heading"
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white">
      <div className="container-site flex h-[72px] items-center justify-between gap-6 lg:h-[98px]">
        <Logo />
        <MainNav className="hidden lg:block" />
        <div className="hidden items-center gap-5 lg:flex">
          <AccountMenu />
          <Button asChild variant="outline-primary">
            <Link href="/dashboard/fleet/new">
              <Plus aria-hidden />
              List your car
            </Link>
          </Button>
        </div>
        <MobileMenu />
      </div>
    </header>
  );
}

function MobileMenu() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
          <Menu />
        </Button>
      </DialogTrigger>
      <SheetContent side="right" className="gap-6 bg-white p-6" aria-describedby={undefined}>
        <DialogTitle className="sr-only">Menu</DialogTitle>
        <Logo />
        <nav aria-label="Mobile">
          <ul className="flex flex-col gap-1">
            {siteConfig.mainNav.map((item) => (
              <li key={item.href}>
                <DialogClose asChild>
                  <NavLink
                    href={item.href}
                    className="block rounded-md px-3 py-3 font-heading text-base font-medium"
                    activeClassName="bg-primary-soft text-primary"
                    inactiveClassName="text-heading hover:bg-surface"
                  >
                    {item.label}
                  </NavLink>
                </DialogClose>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto flex flex-col gap-4">
          <AccountMenu />
          <DialogClose asChild>
            <Button asChild>
              <Link href="/dashboard/fleet/new">List your car</Link>
            </Button>
          </DialogClose>
        </div>
      </SheetContent>
    </Dialog>
  );
}
