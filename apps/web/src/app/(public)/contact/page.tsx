import { Mail, MapPin, Phone } from "lucide-react";
import { ContentPage } from "@/shell/content-page";

export const metadata = { title: "Contact" };

const channels = [
  { icon: Mail, label: "Email", value: "support@carrental.example", href: "mailto:support@carrental.example" },
  { icon: Phone, label: "Phone", value: "+351 210 000 000", href: "tel:+351210000000" },
  { icon: MapPin, label: "Office", value: "Rua Augusta 1, Lisbon" },
];

export default function ContactPage() {
  return (
    <ContentPage title="Contact us" intro="Questions about a booking or hosting? We’re happy to help.">
      <ul className="grid gap-6 md:grid-cols-3">
        {channels.map(({ icon: Icon, label, value, href }) => (
          <li key={label} className="flex flex-col gap-2 rounded-xl border border-border p-6">
            <Icon aria-hidden className="size-8 text-primary" />
            <h2 className="text-h5 font-medium">{label}</h2>
            {href ? <a href={href} className="text-base text-heading hover:text-primary">{value}</a> : <p className="text-base">{value}</p>}
          </li>
        ))}
      </ul>
    </ContentPage>
  );
}
