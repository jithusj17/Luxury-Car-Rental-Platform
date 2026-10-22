import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { authApi } from "../api";
import { VerifyEmailBanner, VerifyEmailConfirm } from "./email-verification";

let search = "";
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(search) }));

const user = (emailVerified: boolean) => ({
  id: "8d2b7a52-6a0f-4b6e-9b8f-2f5b9a1c0e11",
  email: "ana@example.com",
  fullName: "Ana Silva",
  phone: null,
  roles: ["renter" as const],
  emailVerified,
  createdAt: "2030-01-10T09:00:00.000Z",
});

function renderWith(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

afterEach(() => vi.restoreAllMocks());

describe("VerifyEmailConfirm", () => {
  it("verifies only when the user clicks, then confirms", async () => {
    search = "token=abcdefghijklmnopqrstuvwxyz";
    const verify = vi.spyOn(authApi, "verifyEmail").mockResolvedValue(user(true));
    renderWith(<VerifyEmailConfirm />);
    expect(verify).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Confirm my email" }));
    expect(verify).toHaveBeenCalledWith("abcdefghijklmnopqrstuvwxyz");
    expect(await screen.findByText("Thanks, ana@example.com is verified.")).toBeInTheDocument();
  });

  it("explains an incomplete link", () => {
    search = "";
    renderWith(<VerifyEmailConfirm />);
    expect(screen.getByRole("alert")).toHaveTextContent("This verification link is incomplete");
  });
});

describe("VerifyEmailBanner", () => {
  it("asks unverified users to verify and resends the link", async () => {
    vi.spyOn(authApi, "me").mockResolvedValue(user(false));
    const resend = vi.spyOn(authApi, "resendVerification").mockResolvedValue();
    renderWith(<VerifyEmailBanner />);

    await userEvent.click(await screen.findByRole("button", { name: "Resend link" }));
    expect(resend).toHaveBeenCalled();
    expect(await screen.findByText(/We sent a new link to ana@example.com/)).toBeInTheDocument();
  });

  it("stays hidden once the email is verified", async () => {
    const me = vi.spyOn(authApi, "me").mockResolvedValue(user(true));
    renderWith(<VerifyEmailBanner />);
    await vi.waitFor(() => expect(me).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Resend link" })).not.toBeInTheDocument();
  });
});
