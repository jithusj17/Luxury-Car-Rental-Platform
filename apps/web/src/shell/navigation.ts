import type { LucideIcon } from "lucide-react";
import { CalendarCheck, CalendarRange, Car, ClipboardList, LayoutDashboard, UserRound, Wallet } from "lucide-react";

export type NavItem = { label: string; href: string };
export type DashboardNavItem = NavItem & { icon: LucideIcon };

export const siteConfig = {
  name: "Car Rental",
  description: "Rent the right car for every trip.",
  mainNav: [
    { label: "Home", href: "/" },
    { label: "Browse cars", href: "/cars" },
    { label: "How it works", href: "/how-it-works" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ] satisfies NavItem[],
  footerNav: [
    {
      title: "Company",
      items: [
        { label: "About us", href: "/about" },
        { label: "Contact", href: "/contact" },
        { label: "FAQ", href: "/faq" },
      ],
    },
    {
      title: "Renters",
      items: [
        { label: "Browse cars", href: "/cars" },
        { label: "How it works", href: "/how-it-works" },
        { label: "My bookings", href: "/dashboard/bookings" },
      ],
    },
    {
      title: "Owners",
      items: [
        { label: "List your car", href: "/dashboard/fleet/new" },
        { label: "Owner dashboard", href: "/dashboard/fleet" },
        { label: "Terms & conditions", href: "/terms" },
      ],
    },
  ] satisfies { title: string; items: NavItem[] }[],
} as const;

export const renterNav: DashboardNavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "My bookings", href: "/dashboard/bookings", icon: CalendarCheck },
  { label: "Profile", href: "/dashboard/profile", icon: UserRound },
];

/** Shown only to accounts with the owner role. */
export const ownerNav: DashboardNavItem[] = [
  { label: "Fleet", href: "/dashboard/fleet", icon: Car },
  { label: "Availability", href: "/dashboard/availability", icon: CalendarRange },
  { label: "Booking requests", href: "/dashboard/requests", icon: ClipboardList },
  { label: "Earnings", href: "/dashboard/earnings", icon: Wallet },
];
