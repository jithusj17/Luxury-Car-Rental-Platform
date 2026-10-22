"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { LockKeyhole } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { FormAlert } from "@/shared/components/ui/form-alert";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
let stripePromise: Promise<Stripe | null> | undefined;
const getStripe = () => (stripePromise ??= loadStripe(publishableKey!));

type Props = { clientSecret: string; amountLabel: string; onSubmitted: () => void };

/**
 * Stripe's Payment Element: card details go straight from the browser to Stripe (PCI SAQ A),
 * never through our servers. The booking is confirmed by the signed webhook, not by this page.
 */
export function StripePaymentForm(props: Props) {
  if (!publishableKey) {
    return <FormAlert>Card payments aren’t configured. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY for the web app.</FormAlert>;
  }
  return (
    <Elements
      stripe={getStripe()}
      options={{
        clientSecret: props.clientSecret,
        appearance: {
          theme: "stripe",
          variables: { colorPrimary: "#ff7101", colorText: "#24272c", borderRadius: "10px", fontFamily: "Inter, system-ui, sans-serif" },
        },
      }}
    >
      <StripeForm {...props} />
    </Elements>
  );
}

function StripeForm({ amountLabel, onSubmitted }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;
    setPending(true);
    setError(null);
    const result = await stripe.confirmPayment({
      elements,
      // Used only by payment methods that need a redirect (e.g. 3-D Secure in some flows).
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });
    setPending(false);
    if (result.error) setError(result.error.message ?? "Your payment couldn’t be completed.");
    else onSubmitted();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <PaymentElement options={{ layout: "tabs" }} />
      {error && <FormAlert>{error} Your dates are still held — you can try again.</FormAlert>}
      <Button type="submit" disabled={!stripe || pending}>
        <LockKeyhole aria-hidden />
        {pending ? "Processing…" : `Pay ${amountLabel}`}
      </Button>
    </form>
  );
}
