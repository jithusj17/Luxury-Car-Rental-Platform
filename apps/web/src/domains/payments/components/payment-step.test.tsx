import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { paymentsApi } from "../api";
import { PaymentStep } from "./payment-step";

vi.mock("@/shared/components/ui/toast", () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));

const payment = (provider: string) => ({
  id: "8d2b7a52-6a0f-4b6e-9b8f-2f5b9a1c0e11",
  bookingId: "3f1c2b9e-1d4a-4c7e-8a0b-6e5d4c3b2a19",
  status: "REQUIRES_ACTION" as const,
  amountCents: 16500,
  refundedCents: 0,
  currency: "USD" as const,
  provider,
  clientSecret: "pi_123_secret_456",
  failureReason: null,
  createdAt: "2030-01-10T09:00:00.000Z",
});

function renderStep() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PaymentStep bookingId="3f1c2b9e-1d4a-4c7e-8a0b-6e5d4c3b2a19" amountLabel="$165" onSubmitted={() => {}} />
    </QueryClientProvider>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe("PaymentStep", () => {
  it("shows the test-card form for the development provider", async () => {
    vi.spyOn(paymentsApi, "start").mockResolvedValue(payment("mock"));
    renderStep();
    expect(await screen.findByLabelText("Card number")).toBeInTheDocument();
  });

  it("uses Stripe for Stripe payments and explains a missing publishable key", async () => {
    vi.spyOn(paymentsApi, "start").mockResolvedValue(payment("stripe"));
    renderStep();
    expect(await screen.findByText(/NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Card number")).not.toBeInTheDocument();
  });

  it("offers a retry when the payment can't be opened", async () => {
    vi.spyOn(paymentsApi, "start").mockRejectedValue(new Error("offline"));
    renderStep();
    expect(await screen.findByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
