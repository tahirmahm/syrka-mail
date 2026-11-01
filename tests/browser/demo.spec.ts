import { test, expect } from "@playwright/test";
async function enter(page: any) {
  await page.goto("/?demo=1");
  await expect(page.locator(".demo-shell")).toHaveAttribute(
    "data-ready",
    "true",
  );
}
async function folder(page: any, name: string) {
  await page
    .getByRole("navigation", { name: "Demo mailbox folders" })
    .getByRole("button", { name, exact: true })
    .click();
}
async function firstThread(page: any, text: string) {
  await page
    .locator(".demo-open-thread")
    .filter({ hasText: text })
    .first()
    .click();
}
test("demo is populated, visually labelled and sends no live mail or AI requests", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const external: string[] = [];
  page.on("request", (r) => {
    if (
      /\/api\/(mail|messages|ai|oauth|actions|connections|drafts)/.test(r.url())
    )
      external.push(r.url());
  });
  await enter(page);
  await expect(page.getByText("52 fictional messages")).toBeVisible();
  expect(await page.locator(".demo-row").count()).toBeGreaterThan(20);
  await page.screenshot({ path: "artifacts/demo-light.png", fullPage: true });
  await firstThread(page, "Thesis proposal");
  await expect(page.locator(".conversation-message")).toHaveCount(2);
  await page.getByRole("button", { name: "Demo summary", exact: true }).click();
  await expect(
    page.getByText("Simulated assistant · no model call"),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/demo-thread-light.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(
    await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
  ).toBe("rgb(0, 0, 0)");
  await page.screenshot({
    path: "artifacts/demo-thread-dark.png",
    fullPage: true,
  });
  await page.reload();
  await expect(page.locator(".demo-shell")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(external).toEqual([]);
});
test("compose, simulated send, search and refresh preserve local state", async ({
  page,
}) => {
  await enter(page);
  await page.locator(".sidebar .compose").click();
  await page
    .getByRole("textbox", { name: "TO", exact: true })
    .fill("recipient@example.com");
  await page
    .getByRole("textbox", { name: "Subject", exact: true })
    .fill("Browser-only simulation test");
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("No external delivery should occur.");
  await page
    .getByRole("button", { name: "Simulate send", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "No email left this browser",
  );
  await folder(page, "Sent");
  await expect(
    page
      .locator(".demo-row")
      .filter({ hasText: "Browser-only simulation test" }),
  ).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".demo-shell")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await folder(page, "Sent");
  await page
    .getByRole("textbox", { name: "Search demo messages" })
    .fill("Browser-only simulation test");
  await expect(page.locator(".demo-row")).toHaveCount(1);
});
test("drafts can be saved, restored and discarded", async ({ page }) => {
  await enter(page);
  await page.locator(".sidebar .compose").click();
  await page
    .getByRole("textbox", { name: "Subject", exact: true })
    .fill("Saved demo draft");
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("Private browser draft");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await folder(page, "Drafts");
  await firstThread(page, "Saved demo draft");
  await expect(
    page.getByRole("textbox", { name: "Message", exact: true }),
  ).toHaveValue("Private browser draft");
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  await expect(
    page.locator(".demo-row").filter({ hasText: "Saved demo draft" }),
  ).toHaveCount(0);
  await page.locator(".demo-open-thread").first().click();
  await page
    .getByRole("button", { name: "Simulate send", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText(
    "No email left this browser",
  );
});
test("reply-all preserves conversation and forwarding opens an editable draft", async ({
  page,
}) => {
  await enter(page);
  await firstThread(page, "Thesis proposal");
  await page.getByRole("button", { name: "Reply all", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "CC", exact: true }),
  ).toHaveValue("sam@mail.example");
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("My simulated response");
  await page
    .getByRole("button", { name: "Simulate send", exact: true })
    .click();
  await expect(page.locator(".conversation-message")).toHaveCount(3);
  await page.getByRole("button", { name: "Forward", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Subject", exact: true }),
  ).toHaveValue(/^Fwd:/);
  await expect(
    page.getByRole("textbox", { name: "Message", exact: true }),
  ).toHaveValue(/Forwarded fictional message/);
  await page.keyboard.press("Escape");
  await expect(page.locator(".conversation-message")).toHaveCount(3);
});
test("star, snooze, archive, delete, attachments and commitments are interactive", async ({
  page,
}) => {
  await enter(page);
  await firstThread(page, "Thesis proposal");
  await page.getByRole("button", { name: /meeting-invitation.ics/ }).click();
  await expect(page.getByRole("dialog")).toContainText("BEGIN:VCALENDAR");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page
    .getByRole("button", { name: "Propose commitment", exact: true })
    .click();
  await folder(page, "My Commitments");
  await page.getByRole("button", { name: "Approve proposal" }).first().click();
  await expect(page.locator(".state-pill.approved")).toHaveCount(1);
  await page.getByRole("button", { name: "View source email" }).first().click();
  await page.getByRole("button", { name: "Snooze thread for one day" }).click();
  await folder(page, "Snoozed");
  await firstThread(page, "Thesis proposal");
  await page
    .getByRole("button", { name: "Archive thread", exact: true })
    .click();
  await folder(page, "Archive");
  await firstThread(page, "Thesis proposal");
  await page.getByRole("button", { name: "Move thread to trash" }).click();
  await folder(page, "Trash");
  await expect(
    page.locator(".demo-row").filter({ hasText: "Thesis proposal" }),
  ).toHaveCount(1);
});
test("scheduled simulations can be cancelled and reset restores the demo", async ({
  page,
}) => {
  await enter(page);
  await page.locator(".sidebar .compose").click();
  await page
    .getByRole("textbox", { name: "TO", exact: true })
    .fill("colleague@example.com");
  await page
    .getByRole("textbox", { name: "Subject", exact: true })
    .fill("Scheduled browser test");
  await page
    .getByLabel("Schedule simulation", { exact: true })
    .fill("2099-11-12T14:00");
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  await folder(page, "Scheduled");
  await firstThread(page, "Scheduled browser test");
  await page
    .getByRole("button", { name: "Cancel schedule", exact: true })
    .click();
  await expect(
    page.locator(".demo-row").filter({ hasText: "Scheduled browser test" }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Demo settings", exact: true })
    .last()
    .click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await expect(page.getByText("52 fictional messages")).toBeVisible();
});
test("mobile navigation, thread and composer remain usable without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enter(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "artifacts/demo-mobile-inbox.png",
    fullPage: true,
  });
  await firstThread(page, "Thesis proposal");
  await expect(page.locator(".demo-reader")).toBeVisible();
  await page.screenshot({
    path: "artifacts/demo-mobile-thread.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Reply", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({
    path: "artifacts/demo-compose-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await folder(page, "Sent");
  await expect(page.getByRole("heading", { name: "Sent." })).toBeVisible();
});
test("demo star toggles and unread filtering reflect real local state", async ({
  page,
}) => {
  await enter(page);
  const subject = "Thesis proposal: feedback and next steps";
  await page
    .getByRole("button", { name: "Unstar " + subject, exact: true })
    .click();
  await folder(page, "Starred");
  await expect(
    page
      .locator(".demo-open-thread")
      .filter({ hasText: subject })
      .filter({ hasNotText: "Re:" }),
  ).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Demo mailbox folders" })
    .getByRole("button", { name: /^Inbox/ })
    .click();
  await page
    .getByRole("button", { name: "Star " + subject, exact: true })
    .click();
  await firstThread(page, subject);
  await page.getByRole("button", { name: "Mark unread", exact: true }).click();
  await page
    .getByRole("button", { name: "Back to message list", exact: true })
    .click();
  await page.getByRole("button", { name: "Unread", exact: true }).click();
  await expect(
    page.locator(".demo-open-thread").filter({ hasText: subject }).first(),
  ).toBeVisible();
});
