import { Accordion } from "@/shared/components/ui/accordion";
import { ContentPage } from "@/shell/content-page";

export const metadata = { title: "FAQ" };

const faqs = [
  { question: "How long are my dates held while I pay?", answer: "15 minutes. If payment isn’t completed in time, the dates are released for other renters." },
  { question: "What happens if my card is declined?", answer: "Your hold stays in place until it expires, so you can try another card." },
  { question: "Can I cancel?", answer: "Yes. Cancel at least 48 hours before pick-up for a full refund, or until pick-up for a 50% refund. Hosts who cancel always refund in full." },
  { question: "When do I return the car?", answer: "By the morning of your return date. That day is free for the next renter." },
  { question: "How do I become a host?", answer: "Open your profile and choose “Become a host”, then add your vehicle from the Fleet page." },
  { question: "Are prices final?", answer: "Yes. The total shown before you pay — daily rate times days plus a 10% service fee — is what you’re charged." },
];

export default function FaqPage() {
  return (
    <ContentPage title="Frequently asked questions">
      <div className="mx-auto max-w-3xl">
        <Accordion items={faqs} />
      </div>
    </ContentPage>
  );
}
