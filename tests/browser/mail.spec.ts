import { test, expect } from "@playwright/test";
test("honest onboarding, persistent appearance, compose and settings", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".shell")).toHaveAttribute("data-ready", "true");
  await expect(page.getByRole("heading", { name: "Inbox." })).toBeVisible();
  await expect(
    page.getByText("Your next conversation starts here."),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/desktop-light.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator(".shell")).toHaveAttribute("data-ready", "true");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({ path: "artifacts/desktop-dark.png", fullPage: true });
  await page.getByRole("button", { name: "Compose message" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send message", exact: true }),
  ).toBeDisabled();
  await page.screenshot({ path: "artifacts/compose.png", fullPage: true });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Connect an email account" }).click();
  await expect(
    page.getByRole("button", { name: "Connect", exact: true }),
  ).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Connect", exact: true }).first(),
  ).toBeDisabled();
});
test("mobile inbox has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".shell")).toHaveAttribute("data-ready", "true");
  await expect(page.getByRole("heading", { name: "Inbox." })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({ path: "artifacts/mobile.png", fullPage: true });
});
test("mail and AI cannot be called without configured authentication", async ({
  request,
}) => {
  for (const path of ["/api/mail", "/api/connections", "/api/actions"]) {
    const r = await request.get(path);
    expect(r.ok()).toBeFalsy();
    const data = await r.json();
    expect(data.error).toMatch(/Supabase is not configured|Sign in required/);
  }
  const r = await request.post("/api/ai", {
    data: { text: "untrusted input", action: "reply", consent: false },
  });
  expect(r.ok()).toBeFalsy();
});
