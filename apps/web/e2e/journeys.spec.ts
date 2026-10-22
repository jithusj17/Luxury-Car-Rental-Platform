import { expect, test } from "@playwright/test";
import { listVehicle, logout, pickDatesNextMonth, register } from "./helpers";

test.describe.configure({ mode: "serial" });

const model = `Roadster ${Date.now()}`;

test("protected pages send visitors to sign in and back", async ({ page }) => {
  await page.goto("/dashboard/bookings");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Fbookings/);
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
});

test("owner lists a car and blocks dates", async ({ page }) => {
  await register(page, "Olga Owner");
  await listVehicle(page, model);

  await page.goto("/dashboard/availability");
  await pickDatesNextMonth(page, "Dates", 20, 22);
  await page.getByLabel("Note (optional)").fill("Service");
  await page.getByRole("button", { name: "Block these dates" }).click();
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.getByText("Service").first()).toBeVisible();
  await logout(page);
});

test("renter finds the car, pays, and cancels for a refund", async ({ page }) => {
  await register(page, "Rita Renter");

  await page.goto("/cars?city=Testville");
  await page.getByRole("link", { name: `2026 E2E Motors ${model}` }).click();
  await expect(page.getByRole("heading", { name: `2026 E2E Motors ${model}` })).toBeVisible();

  // Owner-blocked nights (20–21) can't be picked; 10 → 13 is free.
  await pickDatesNextMonth(page, "Pick-up — Return", 10, 13);
  await expect(page.getByText("Total")).toBeVisible();
  await expect(page.getByText("$198.00")).toBeVisible(); // 3 × $60 + 10% fee
  await page.getByRole("button", { name: "Reserve" }).click();

  await expect(page).toHaveURL(/\/checkout\//);
  await expect(page.getByText(/Dates held for/)).toBeVisible();
  await page.getByRole("button", { name: /^Pay \$198/ }).click();
  await expect(page.getByRole("heading", { name: "You’re booked!" })).toBeVisible({ timeout: 20_000 });

  await page.getByRole("link", { name: "View booking" }).click();
  await expect(page.getByText("Confirmed").first()).toBeVisible();
  await page.getByRole("button", { name: "Cancel booking" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancel booking" }).click();
  await expect(page.getByText("Cancelled").first()).toBeVisible();
  await expect(page.getByText(/Refunded \$198/)).toBeVisible();
});

test("a declined card keeps the hold so the renter can retry", async ({ page }) => {
  await register(page, "Dana Retry");
  await page.goto("/cars?city=Testville");
  await page.getByRole("link", { name: `2026 E2E Motors ${model}` }).click();
  await pickDatesNextMonth(page, "Pick-up — Return", 24, 26);
  await page.getByRole("button", { name: "Reserve" }).click();
  await expect(page).toHaveURL(/\/checkout\//);

  await page.getByRole("button", { name: /^Declined:/ }).click();
  await page.getByRole("button", { name: /^Pay / }).click();
  await expect(page.getByText(/card was declined/)).toBeVisible();
  await page.getByRole("button", { name: /^Succeeds:/ }).click();
  await page.getByRole("button", { name: /^Pay / }).click();
  await expect(page.getByRole("heading", { name: "You’re booked!" })).toBeVisible({ timeout: 20_000 });
});
