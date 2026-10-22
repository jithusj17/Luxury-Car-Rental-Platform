"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/shared/lib/utils";

export function isActivePath(pathname: string, href: string, exact = href === "/" || href === "/dashboard" || href === "/admin") {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

type NavLinkProps = React.ComponentProps<typeof Link> & {
  href: string;
  activeClassName: string;
  inactiveClassName: string;
};

function ActiveAwareLink({ href, className, activeClassName, inactiveClassName, ...props }: NavLinkProps) {
  const active = isActivePath(usePathname(), href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(className, active ? activeClassName : inactiveClassName)}
      {...props}
    />
  );
}

/**
 * Link that styles itself by whether it matches the current route. The pathname is request data
 * under Cache Components, so the prerendered shell shows the inactive style and the active state
 * streams in.
 */
export function NavLink(props: NavLinkProps) {
  const { href, className, activeClassName: _a, inactiveClassName, ...rest } = props;
  return (
    <Suspense fallback={<Link href={href} className={cn(className, inactiveClassName)} {...rest} />}>
      <ActiveAwareLink {...props} />
    </Suspense>
  );
}
