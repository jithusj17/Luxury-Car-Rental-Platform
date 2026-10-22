import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { ContentPage } from "@/shell/content-page";

export const metadata = { title: "How it works" };

const renterSteps = [
  ["Find a car", "Search by city and dates. Only cars free for your dates are shown."],
  ["Reserve", "Your dates are held for 15 minutes while you pay — nobody else can take them."],
  ["Pay & drive", "Pay securely to confirm. You’ll get a confirmation email with the details."],
];
const hostSteps = [
  ["List your car", "Become a host and add your vehicle with its price and rental terms."],
  ["Manage your calendar", "Block dates when the car isn’t available. Bookings appear automatically."],
  ["Earn", "Paid bookings confirm instantly. Track earnings in your dashboard."],
];

function Steps({ title, steps }: { title: string; steps: string[][] }) {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2 font-medium">{title}</h2>
      <ol className="grid gap-6 md:grid-cols-3">
        {steps.map(([heading, text], i) => (
          <li key={heading} className="flex flex-col gap-3 rounded-xl bg-primary-soft p-6">
            <span className="flex size-10 items-center justify-center rounded-full bg-primary font-heading font-semibold text-white">{i + 1}</span>
            <h3 className="text-h4 font-medium">{heading}</h3>
            <p className="text-base">{text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function HowItWorksPage() {
  return (
    <ContentPage title="How it works" intro="Renting or hosting takes just a few steps.">
      <div className="flex flex-col gap-16">
        <Steps title="For renters" steps={renterSteps} />
        <Steps title="For hosts" steps={hostSteps} />
        <div className="flex flex-wrap gap-3">
          <Button asChild><Link href="/cars">Browse cars</Link></Button>
          <Button asChild variant="outline-primary"><Link href="/dashboard/fleet/new">List your car</Link></Button>
        </div>
      </div>
    </ContentPage>
  );
}
