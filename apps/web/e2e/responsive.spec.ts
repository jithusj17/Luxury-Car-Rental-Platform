import { expect, test } from "@playwright/test";

/** Mobile layout checks: no horizontal overflow and the off-canvas menu works. */
for (const path of ["/", "/cars", "/login", "/faq"]) {
  test(`no horizontal scroll on ${path}`, async ({ page }) => {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("mobile menu opens and navigates", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Browse cars" }).click();
  await expect(page).toHaveURL(/\/cars$/);
});
