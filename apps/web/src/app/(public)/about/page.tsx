import { BadgeCheck, CalendarCheck, ShieldCheck } from "lucide-react";
import { ContentPage } from "@/shell/content-page";

export const metadata = { title: "About us" };

const reasons = [
  { icon: BadgeCheck, title: "Trusted hosts", text: "Every listing belongs to a verified host who manages its calendar and condition." },
  { icon: CalendarCheck, title: "Reliable bookings", text: "Dates are locked the moment you reserve, so a car can never be double-booked." },
  { icon: ShieldCheck, title: "Fair policies", text: "Clear prices up front and free cancellation up to 48 hours before pick-up." },
];

export default function AboutPage() {
  return (
    <ContentPage title="About us" intro="We connect people who need a car with hosts who have one to share.">
      <h2 className="mb-8 text-h2 font-medium">Why choose us</h2>
      <ul className="grid gap-6 md:grid-cols-3">
        {reasons.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex flex-col gap-3 rounded-xl border border-border p-6">
            <Icon aria-hidden className="size-10 text-primary" strokeWidth={1.5} />
            <h3 className="text-h4 font-medium">{title}</h3>
            <p className="text-base">{text}</p>
          </li>
        ))}
      </ul>
    </ContentPage>
  );
}
