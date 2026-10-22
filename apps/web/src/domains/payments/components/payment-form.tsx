"use client";

import { CreditCard, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "@/shared/api/api-error";
import { Button } from "@/shared/components/ui/button";
import { Field } from "@/shared/components/ui/field";
import { FormAlert } from "@/shared/components/ui/form-alert";
import { Input } from "@/shared/components/ui/input";
import { TEST_CARDS } from "../api";
import { usePayBooking } from "../hooks";

const failureMessages: Record<string, string> = {
  failed: "Your card was declined. Try another card — your dates are still held.",
};

/**
 * Payment step. Development uses the built-in mock provider; a real provider replaces the card
 * input with its hosted fields so card data never touches our servers.
 */
export function PaymentForm({ bookingId, amountLabel, onSubmitted }: { bookingId: string; amountLabel: string; onSubmitted: () => void }) {
  const [card, setCard] = useState<string>(TEST_CARDS[0].number);
  const pay = usePayBooking(bookingId);
  const failed = pay.data && pay.data.status !== "succeeded";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = await pay.mutateAsync(card.replace(/\s+/g, "")).catch(() => undefined);
    if (result?.status === "succeeded") onSubmitted();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Field label="Card number" htmlFor="card-number" hint="Test mode — no real charge is made.">
        <Input id="card-number" inputMode="numeric" autoComplete="cc-number" icon={<CreditCard />} value={card} onChange={(e) => setCard(e.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-2 text-xs">
        {TEST_CARDS.map((test) => (
          <button key={test.number} type="button" onClick={() => setCard(test.number)} className="rounded-full border border-border px-3 py-1 hover:border-primary">
            {test.label}: {test.number.slice(-4)}
          </button>
        ))}
      </div>
      {pay.isError && <FormAlert>{errorMessage(pay.error)}</FormAlert>}
      {failed && <FormAlert>{failureMessages.failed}</FormAlert>}
      <Button type="submit" disabled={pay.isPending}>
        <LockKeyhole aria-hidden />
        {pay.isPending ? "Processing…" : `Pay ${amountLabel}`}
      </Button>
    </form>
  );
}
