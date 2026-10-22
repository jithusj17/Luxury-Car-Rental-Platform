import { expect, type Page } from "@playwright/test";

export const uniqueEmail = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
export const PASSWORD = "correct-horse-battery";

export async function register(page: Page, name: string, email = uniqueEmail("e2e")) {
  await page.goto("/register");
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirm password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign Up" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  return email;
}

/** Opens a date-range picker and selects two days of next month. */
export async function pickDatesNextMonth(page: Page, trigger: string, startDay: number, endDay: number) {
  await page.getByRole("button", { name: trigger, exact: true }).click();
  if ((await page.locator(".rdp-month").count()) === 1) {
    await page.getByRole("button", { name: /next month/i }).last().click();
  }
  const month = page.locator(".rdp-month").last();
  await month.locator(".rdp-day:not(.rdp-outside) button").getByText(String(startDay), { exact: true }).click();
  await month.locator(".rdp-day:not(.rdp-outside) button").getByText(String(endDay), { exact: true }).click();
}

/** Creates and publishes a vehicle via the owner UI; returns its make/model label. */
export async function listVehicle(page: Page, model: string) {
  await page.goto("/dashboard/fleet/new");
  const becomeHost = page.getByRole("button", { name: "Become a host" });
  await expect(becomeHost.or(page.getByLabel("Make *"))).toBeVisible();
  if (await becomeHost.isVisible()) await becomeHost.click();
  await page.getByLabel("Make *").fill("E2E Motors");
  await page.getByLabel("Model *").fill(model);
  await page.getByLabel("Daily rate (USD) *").fill("60");
  await page.getByLabel("City *").fill("Testville");
  await page.getByLabel("Air conditioning").check();
  await page.getByRole("button", { name: "List now" }).click();
  await expect(page).toHaveURL(/\/dashboard\/fleet$/);
  await expect(page.getByText(`E2E Motors ${model}`)).toBeVisible();
}

export async function logout(page: Page) {
  await page.context().clearCookies();
}
