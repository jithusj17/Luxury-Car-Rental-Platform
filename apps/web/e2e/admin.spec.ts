import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

async function login(page: Page, email: string, password = "password1234") {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("non-admins can't use the admin area", async ({ page }) => {
  await login(page, "renter@example.com");
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Admins only" })).toBeVisible();
});

test("admin sees the overview and can suspend and reinstate a user", async ({ page }) => {
  await login(page, "admin@example.com");
  await page.getByRole("link", { name: "Admin area" }).click();
  await expect(page.getByRole("heading", { name: "Admin overview" })).toBeVisible();
  await expect(page.getByText("Listed cars")).toBeVisible();

  await page.goto("/admin/users");
  await page.getByLabel("Search name or email").fill("renter@");
  const row = page.getByRole("row", { name: /Rui Renter/ });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Suspend" }).click();
  await page.getByLabel("Reason (recorded in the audit log)").fill("Payment dispute");
  await page.getByRole("alertdialog").getByRole("button", { name: "Suspend" }).click();
  await expect(row.getByText("Suspended")).toBeVisible();

  await page.goto("/admin/audit-log");
  await expect(page.getByText("Suspended user")).toBeVisible();
  await expect(page.getByText("“Payment dispute”")).toBeVisible();

  await page.goto("/admin/users");
  await page.getByLabel("Search name or email").fill("renter@");
  await page.getByRole("row", { name: /Rui Renter/ }).getByRole("button", { name: "Reinstate" }).click();
  await expect(page.getByRole("row", { name: /Rui Renter/ }).getByText("Active")).toBeVisible();
});

test("admin unlists a car and it disappears from the catalog", async ({ page }) => {
  await login(page, "admin@example.com");
  await page.goto("/admin/vehicles");
  await page.getByLabel("Search make, model or city").fill("Model Y");
  const row = page.getByRole("row", { name: /Tesla Model Y/ });
  await row.getByRole("button", { name: "Unlist" }).click();
  await expect(row.getByText("Unlisted")).toBeVisible();

  await page.goto("/cars?q=Model%20Y");
  await expect(page.getByText("No cars match your search")).toBeVisible();
});
