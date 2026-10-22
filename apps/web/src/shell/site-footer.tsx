import { BadgeCheck, CalendarCheck, Headset, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { siteConfig } from "@/shell/navigation";
import { CurrentYear } from "./current-year";
import { Logo } from "./logo";

const highlights = [
  { icon: BadgeCheck, title: "Verified owners", text: "Every host is ID-checked" },
  { icon: CalendarCheck, title: "Instant booking", text: "Confirmed dates, no double bookings" },
  { icon: ShieldCheck, title: "Insurance included", text: "Cover on every trip" },
  { icon: Headset, title: "24/7 support", text: "We're here on the road" },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-heading text-white">
      <div className="container-site flex flex-col gap-10 py-10">
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-center gap-4">
              <Icon aria-hidden className="size-10 shrink-0 text-white" strokeWidth={1.25} />
              <div>
                <p className="font-heading text-h5 font-medium">{title}</p>
                <p className="text-white/60">{text}</p>
              </div>
            </li>
          ))}
        </ul>

        <hr className="border-white/10" />

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {siteConfig.footerNav.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="text-h4 font-medium text-white">{group.title}</h2>
              <ul className="mt-6 flex flex-col gap-3">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-white/60 transition-colors hover:text-primary">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div>
            <h2 className="text-h4 font-medium text-white">Need help?</h2>
            <p className="mt-6 text-white/60">
              Questions about a booking? Visit the{" "}
              <Link href="/faq" className="text-white underline-offset-4 hover:underline">
                FAQ
              </Link>{" "}
              or{" "}
              <Link href="/contact" className="text-white underline-offset-4 hover:underline">
                contact us
              </Link>
              .
            </p>
          </div>
        </div>

        <hr className="border-white/10" />

        <div className="flex flex-col-reverse items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="text-white/60">
            © <CurrentYear /> {siteConfig.name}. All rights reserved.
          </p>
          <Logo tone="light" />
        </div>
      </div>
    </footer>
  );
}
