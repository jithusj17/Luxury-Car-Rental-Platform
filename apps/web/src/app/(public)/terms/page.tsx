import { ContentPage } from "@/shell/content-page";

export const metadata = { title: "Terms & conditions" };

export default function TermsPage() {
  return (
    <ContentPage title="Terms & conditions">
      <div className="flex max-w-3xl flex-col gap-6 text-base">
        <p>These summary terms describe how bookings work on the platform. Full legal terms will be published before launch.</p>
        <h2 className="text-h4 font-medium">Bookings</h2>
        <p>A booking covers whole days from the pick-up date up to, but not including, the return date, in the vehicle’s local time. Dates are held for 15 minutes while payment completes.</p>
        <h2 className="text-h4 font-medium">Cancellations and refunds</h2>
        <p>Renters receive a full refund when cancelling at least 48 hours before pick-up, and 50% until pick-up. Hosts who cancel refund renters in full.</p>
        <h2 className="text-h4 font-medium">Fees</h2>
        <p>A 10% service fee is added to the rental subtotal and shown before payment.</p>
      </div>
    </ContentPage>
  );
}
