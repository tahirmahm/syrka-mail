import { test, expect } from "@playwright/test";
async function enter(page: any) {
  await page.goto("/?demo=1");
  await expect(page.locator(".demo-shell")).toHaveAttribute(
    "data-ready",
    "true",
  );
}
async function nav(page: any, name: string) {
  if (await page.getByRole("button", { name: "Open navigation" }).isVisible())
    await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Demo mailbox folders" })
    .getByRole("button", { name, exact: true })
    .click();
}
async function thesis(page: any) {
  await page
    .locator(".demo-open-thread")
    .filter({ hasText: "Thesis proposal: feedback" })
    .first()
    .click();
}
test("inline replies preserve drafts and formatting, accept safe attachments and stay in the thread", async ({
  page,
}) => {
  await enter(page);
  await thesis(page);
  await page.getByRole("button", { name: "Reply", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "Reply message" }),
  ).toBeFocused();
  await expect(page.locator(".inline-recipient-details")).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Reply message" })
    .fill("My saved inline response");
  await page
    .getByRole("button", { name: "Close inline reply and keep draft" })
    .click();
  await page.reload();
  await expect(page.locator(".demo-shell")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await thesis(page);
  await page.getByRole("button", { name: "Reply", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Reply message" }),
  ).toContainText("My saved inline response");
  await page.getByLabel("Reply attachment files").setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Fictional attachment notes"),
  });
  await expect(page.locator(".reply-attachments")).toContainText("notes.txt");
  await page.getByRole("button", { name: "Formatting options" }).click();
  await page.getByRole("textbox", { name: "Reply message" }).selectText();
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  await expect(
    page.locator(".inline-message-editor b,.inline-message-editor strong"),
  ).toContainText("My saved inline response");
  await page.screenshot({
    path: "artifacts/inline-reply-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Send in demo" }).click();
  await expect(page.locator(".conversation-message")).toHaveCount(3);
  await expect(page.locator(".conversation-message").last()).toContainText(
    "My saved inline response",
  );
  await expect(page.locator(".conversation-message").last()).toContainText(
    "notes.txt",
  );
});
test("calendar month/week/day/agenda, creation and editing work persistently", async ({
  page,
}) => {
  await enter(page);
  await nav(page, "Calendar");
  await expect(page.getByRole("grid")).toBeVisible();
  await expect(page.getByRole("gridcell")).toHaveCount(42);
  const title = await page.locator(".calendar-heading h2").innerText();
  await page.getByRole("button", { name: "Next calendar period" }).click();
  expect(await page.locator(".calendar-heading h2").innerText()).not.toBe(
    title,
  );
  await page.getByRole("button", { name: "Previous calendar period" }).click();
  await expect(page.locator(".calendar-heading h2")).toHaveText(title);
  await page.getByRole("button", { name: "Week", exact: true }).click();
  await expect(page.locator(".week-calendar>section")).toHaveCount(7);
  await page.getByRole("button", { name: "Day", exact: true }).click();
  await expect(page.locator(".day-hour")).toHaveCount(24);
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Calendar agenda" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Month", exact: true }).click();
  await page.getByRole("button", { name: "New event", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Event title" })
    .fill("Demo study session");
  await page
    .getByLabel("Event start", { exact: true })
    .fill("2026-11-15T10:00");
  await page.getByLabel("Event end", { exact: true }).fill("2026-11-15T11:00");
  await page.getByLabel("Event reminder", { exact: true }).selectOption("30");
  await page.getByRole("button", { name: "Save event", exact: true }).click();
  await expect(page.locator(".selected-day-agenda")).toContainText(
    "Demo study session",
  );
  await page
    .locator(".selected-day-agenda .calendar-event")
    .filter({ hasText: "Demo study session" })
    .click();
  await page
    .getByRole("textbox", { name: "Event title" })
    .fill("Revised study session");
  await page.getByRole("button", { name: "Save event", exact: true }).click();
  await page.reload();
  await expect(page.locator(".demo-shell")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await nav(page, "Calendar");
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search calendar" })
    .fill("Revised study");
  await expect(page.locator(".calendar-agenda")).toContainText(
    "Revised study session",
  );
  await page.screenshot({
    path: "artifacts/calendar-agenda.png",
    fullPage: true,
  });
});
test("interview event requires approval, preserves timezone and returns to its source", async ({
  page,
}) => {
  await enter(page);
  await nav(page, "Calendar");
  expect(
    await page.evaluate(() =>
      JSON.parse(
        localStorage.getItem("syrka.mail.demo.workspace.v1")!,
      ).events.some((e: any) => e.id === "demo-interview-event"),
    ),
  ).toBe(false);
  await page
    .getByRole("button", { name: "Review proposal", exact: true })
    .click();
  await expect(page.getByLabel("Event start", { exact: true })).toHaveValue(
    "2026-11-12T14:00",
  );
  await expect(page.getByLabel("Event timezone", { exact: true })).toHaveValue(
    "Europe/Prague",
  );
  await page
    .getByRole("button", { name: "Approve event", exact: true })
    .click();
  await expect(page.locator(".selected-day-agenda")).toContainText(
    "Interview — Policy Research Internship",
  );
  await page.screenshot({
    path: "artifacts/calendar-month-light.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.screenshot({
    path: "artifacts/calendar-month-dark.png",
    fullPage: true,
  });
  await page.locator(".selected-day-agenda .calendar-event").click();
  await page
    .getByRole("button", { name: "Open source email", exact: true })
    .click();
  await expect(page.locator(".demo-reader h2")).toContainText(
    "Interview invitation",
  );
  if (await page.getByLabel("Application stage", { exact: true }).count())
    await expect(
      page.getByLabel("Application stage", { exact: true }),
    ).toHaveValue(/Interview|Offer/);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem("syrka.mail.demo.workspace.v1")!,
        ).events.filter((e: any) => e.id === "demo-interview-event").length,
    ),
  ).toBe(1);
});
test("Academic confirms course associations, opens materials and creates a local working document", async ({
  page,
}) => {
  await enter(page);
  await nav(page, "Academic");
  await expect(
    page.getByRole("region", { name: "Academic workspace" }),
  ).toBeVisible();
  const correspondence = page
    .locator(".academic-thread")
    .filter({ hasText: "Seminar moved to room B204" })
    .first();
  await correspondence.getByRole("combobox").selectOption("course-ir");
  await correspondence
    .getByRole("button", { name: "Open in demo Campus" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "International Relations",
  );
  await page
    .getByRole("button", {
      name: "Chapters three and four — course reading list",
    })
    .click();
  await expect(page.locator(".reading-sample")).toContainText(
    "Fictional course material",
  );
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  const outline = page
    .locator(".next-step-card")
    .filter({ hasText: "Prepare the two-page research outline" });
  await outline
    .getByRole("button", { name: "Create working document" })
    .click();
  await page
    .getByRole("textbox", { name: "Working text" })
    .fill("My fictional research outline");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await outline
    .getByRole("button", { name: "Create working document" })
    .click();
  await expect(page.getByRole("textbox", { name: "Working text" })).toHaveValue(
    "My fictional research outline",
  );
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await outline
    .getByRole("button", { name: "Approve step", exact: true })
    .click();
  await expect(outline.locator(".state-pill")).toHaveText("approved");
  await page.screenshot({
    path: "artifacts/academic-desktop.png",
    fullPage: true,
  });
});
test("Academic ambiguous date must be confirmed before creating a calendar event", async ({
  page,
}) => {
  await enter(page);
  await nav(page, "Academic");
  const t = page
    .locator(".academic-thread")
    .filter({ hasText: "Thesis proposal: feedback and next steps" })
    .first();
  await t.getByRole("button", { name: "Propose Calendar event" }).click();
  await page
    .locator(".event-proposal")
    .filter({ hasText: "Thesis proposal: feedback" })
    .getByRole("button", { name: "Review proposal" })
    .click();
  await expect(page.getByLabel("Event start", { exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "Approve event" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "valid date",
  );
  await page
    .getByLabel("Event start", { exact: true })
    .fill("2026-11-06T16:00");
  await page.getByLabel("Event end", { exact: true }).fill("2026-11-06T16:30");
  await page.getByRole("button", { name: "Approve event" }).click();
  await expect(page.locator(".selected-day-agenda")).toContainText(
    "Thesis proposal",
  );
});
test("Applications updates stages, opens grounded Roadmaps/Passport context and starts an inline reply", async ({
  page,
}) => {
  await enter(page);
  await nav(page, "Applications");
  const card = page
    .locator(".opportunity-card")
    .filter({ hasText: "Policy Research Internship" });
  await card
    .getByLabel("Stage for Policy Research Internship")
    .selectOption("Offer");
  await page
    .locator(".application-pipeline")
    .getByRole("button", { name: /^Offer/ })
    .click();
  await expect(page.locator(".opportunity-card")).toHaveCount(1);
  await card.getByRole("button", { name: "Career path" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Policy Research / Geopolitical Analysis",
  );
  await page
    .getByRole("button", { name: "Propose demo preparation quest" })
    .click();
  await expect(
    page
      .locator(".next-step-card")
      .filter({ hasText: "Prepare: Policy Research" }),
  ).toHaveCount(1);
  await card
    .getByRole("button", { name: "Review demo Passport evidence" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "None is an issuer-verified credential",
  );
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.screenshot({
    path: "artifacts/applications-desktop.png",
    fullPage: true,
  });
  await page
    .locator(".next-step-card")
    .filter({ hasText: "Confirm your interview availability" })
    .getByRole("button", { name: "Draft reply" })
    .click();
  await expect(page.locator(".demo-reader h2")).toContainText(
    "Interview invitation",
  );
  if (await page.getByLabel("Application stage", { exact: true }).count())
    await expect(
      page.getByLabel("Application stage", { exact: true }),
    ).toHaveValue(/Interview|Offer/);
  await expect(
    page.getByRole("textbox", { name: "Reply message" }),
  ).toBeFocused();
  await page.reload();
  await expect(page.locator(".demo-shell")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await nav(page, "Applications");
  await expect(
    page.getByLabel("Stage for Policy Research Internship"),
  ).toHaveValue("Offer");
});
test("iPhone-sized calendar and inline keyboard-sized viewport stay usable with no floating overlap", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enter(page);
  await nav(page, "Calendar");
  await expect(page.getByRole("gridcell")).toHaveCount(42);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.screenshot({
    path: "artifacts/calendar-mobile-dark.png",
    fullPage: true,
  });
  await nav(page, "Academic");
  await page.screenshot({
    path: "artifacts/academic-mobile.png",
    fullPage: true,
  });
  await page
    .locator(".next-step-card")
    .filter({ hasText: "Acknowledge the requested revision" })
    .getByRole("button", { name: "Draft reply" })
    .click();
  await page
    .getByRole("textbox", { name: "Reply message" })
    .fill("A compact mobile response");
  await page.setViewportSize({ width: 390, height: 500 });
  await page
    .getByRole("button", { name: "Send in demo" })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("button", { name: "Send in demo" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Compose on mobile" }),
  ).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/inline-reply-mobile.png",
    fullPage: true,
  });
});
test("live Calendar navigation is available but writes stay disabled without an authorized adapter", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".shell")).toHaveAttribute("data-ready", "true");
  await page
    .locator(".sidebar nav")
    .getByRole("button", { name: "Calendar", exact: true })
    .click();
  await expect(page.getByRole("grid")).toBeVisible();
  await expect(page.getByRole("button", { name: "New event" })).toBeDisabled();
  await expect(page.locator(".workspace-context")).toContainText(
    "not connected",
  );
});
