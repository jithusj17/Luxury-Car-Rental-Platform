import Link from "next/link";
import { siteConfig } from "@/shell/navigation";
import { cn } from "@/shared/lib/utils";

/** Steering-wheel mark exported from the Figma Menu component (node 190:2116). */
function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={className} fill="currentColor">
      <path d="M20 22.3438C20.6472 22.3438 21.1719 21.8191 21.1719 21.1719C21.1719 20.5247 20.6472 20 20 20C19.3528 20 18.8281 20.5247 18.8281 21.1719C18.8281 21.8191 19.3528 22.3438 20 22.3438Z" />
      <path d="M20 0C8.98766 0 0 8.9882 0 20C0 31.0126 8.9882 40 20 40C31.0125 40 40 31.0118 40 20C40 8.98766 31.0118 0 20 0ZM20 4.76562C27.6034 4.76562 33.9234 10.3647 35.0541 17.6562H30.9901C28.4134 17.6562 25.9652 16.6223 24.2734 14.8195C21.9609 12.3549 18.0393 12.3541 15.7266 14.8194C14.0348 16.6223 11.5866 17.6562 9.00984 17.6562H4.94594C6.07664 10.3647 12.3966 4.76562 20 4.76562ZM20 24.6875C18.0616 24.6875 16.4844 23.1105 16.4844 21.1719C16.4844 19.2333 18.0616 17.6562 20 17.6562C21.9386 17.6562 23.5156 19.2333 23.5156 21.1719C23.5156 23.1105 21.9386 24.6875 20 24.6875ZM5.81406 25.5545C7.15547 25.0282 8.12406 24.6875 9.45312 24.6875C13.7256 24.6875 17.0484 28.4948 16.4048 32.7727H16.402C16.3066 33.4244 16.1197 34.0594 15.847 34.659C11.2564 33.3566 7.54148 29.951 5.81406 25.5545ZM24.154 34.6587C23.8807 34.0593 23.6935 33.4244 23.598 32.7727H23.5952C22.8453 27.7879 27.4469 23.6748 32.2166 24.887C32.7195 25.0148 33.3487 25.2261 34.1859 25.5545C32.4586 29.9507 28.7441 33.3562 24.154 34.6587Z" />
    </svg>
  );
}

export function Logo({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-1.5", className)}>
      <LogoMark className="size-10 shrink-0 text-primary" />
      <span className={cn("font-heading text-h3 font-semibold whitespace-nowrap", tone === "light" ? "text-white" : "text-heading")}>
        {siteConfig.name}
      </span>
    </Link>
  );
}
