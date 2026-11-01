import test from "node:test";
import assert from "node:assert/strict";
import {
  workspaceForDemo,
  seedWorkspace,
  approveEvent,
  restoreWorkspace,
  validateEvent,
  sortedSteps,
} from "../lib/workspace/model";
import {
  activeReminders,
  monthDays,
  weekDays,
  shiftDay,
  zonedToIso,
  zonedValue,
  eventsForDay,
} from "../lib/workspace/calendar";
import { replyRecipients } from "../lib/mail/reply-types";
import {
  buildReplyMime,
  sanitizeReplyHtml,
  sendProviderReply,
  checkedAttachments,
} from "../lib/mail/replies";
import { limitedJson } from "../lib/mail/json";
test("month grid has seven columns, Monday start and leap-day/date navigation", () => {
  const days = monthDays("2028-02-15");
  assert.equal(days.length, 42);
  assert.equal(new Date(days[0] + "T12:00:00Z").getUTCDay(), 1);
  assert.ok(days.includes("2028-02-29"));
  assert.equal(shiftDay("2028-02-29", 1), "2028-03-01");
  assert.equal(weekDays("2026-11-01").length, 7);
});
test("calendar converts Prague local times and rejects DST gaps/ambiguity", () => {
  assert.equal(
    zonedToIso("2026-11-12T14:00", "Europe/Prague"),
    "2026-11-12T13:00:00.000Z",
  );
  assert.equal(
    zonedValue("2026-11-12T13:00:00Z", "Europe/Prague"),
    "2026-11-12T14:00",
  );
  assert.throws(
    () => zonedToIso("2026-03-29T02:30", "Europe/Prague"),
    /does not exist/,
  );
  assert.throws(
    () => zonedToIso("2026-10-25T02:30", "Europe/Prague"),
    /occurs twice/,
  );
});
test("proposed interview is not a calendar event until approved and approval is idempotent", () => {
  const s = seedWorkspace(),
    p = s.proposals[0];
  assert.ok(!s.events.some((e) => e.id === p.event.id));
  const approved = approveEvent(s, p.id, p.event);
  assert.equal(approved.events.filter((e) => e.id === p.event.id).length, 1);
  assert.equal(
    approveEvent(approved, p.id, p.event).events.length,
    approved.events.length,
  );
  assert.throws(
    () =>
      approveEvent(s, p.id, {
        ...p.event,
        source: { ...p.event.source!, accountId: "other-account" },
      }),
    /provenance/,
  );
});
test("calendar validation rejects invalid ranges and all-day events use exclusive end", () => {
  const s = seedWorkspace(),
    e = s.events.find((e) => e.allDay)!;
  assert.equal(eventsForDay([e], "2026-11-20", "Europe/Prague").length, 1);
  assert.equal(eventsForDay([e], "2026-11-21", "Europe/Prague").length, 0);
  assert.throws(() => validateEvent({ ...e, end: e.start }), /End must be/);
});
test("workspace preserves manual associations and stages across storage", () => {
  const s = seedWorkspace();
  s.associations[0].confirmedBy = "user";
  s.opportunities[0].stage = "Accepted";
  const restored = restoreWorkspace(JSON.stringify(s));
  assert.equal(restored.associations[0].confirmedBy, "user");
  assert.equal(restored.opportunities[0].stage, "Accepted");
  assert.equal(restoreWorkspace("broken").version, 1);
  const ambiguous = s.steps.find((v) => v.id === "step-outline")!;
  assert.equal(ambiguous.deadline, undefined);
  assert.ok(ambiguous.uncertainty);
  assert.ok(sortedSteps(s.steps)[0].deadline);
});
test("reply-all excludes the selected identity and deduplicates recipients", () => {
  assert.deepEqual(
    replyRecipients(
      {
        from: "Sender <sender@example.com>",
        to: ["me@example.com", "team@example.com"],
        cc: ["team@example.com", "Sender <sender@example.com>"],
      },
      "Me <me@example.com>",
      "all",
    ),
    { to: "sender@example.com", cc: "team@example.com" },
  );
});
const source = {
  id: "original",
  subject: "Original subject",
  from: "sender@example.com",
  preview: "",
  text: "source",
  date: "2026-11-01T00:00:00Z",
  unread: false,
  threadId: "thread-authorized",
  internetMessageId: "<original@example.com>",
};
const draft = {
  to: "sender@example.com",
  cc: "",
  bcc: "",
  subject: "Original subject",
  text: "Reply body",
  html: '<b>Reply body</b><img src="https://evil.invalid/pixel"><script>alert(1)</script>',
  attachments: [],
};
test("Gmail MIME preserves reply headers and sanitized formatting", () => {
  const raw = Buffer.from(
    buildReplyMime(source, draft, "reply"),
    "base64url",
  ).toString();
  assert.match(raw, /In-Reply-To: <original@example.com>/);
  assert.match(raw, /References: <original@example.com>/);
  assert.ok(!sanitizeReplyHtml(draft.html).includes("img"));
  assert.ok(!sanitizeReplyHtml(draft.html).includes("script"));
  assert.match(sanitizeReplyHtml(draft.html), /<b>Reply body<\/b>/);
  assert.throws(
    () =>
      buildReplyMime(
        { ...source, internetMessageId: "<x>\r\nBcc: victim@example.com" },
        draft,
        "reply",
      ),
    /unsafe/,
  );
});
test("Gmail native reply uses only the original authorized thread id", async () => {
  const old = global.fetch;
  global.fetch = async (url, init) => {
    assert.equal(
      String(url),
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    );
    const body = JSON.parse(String(init?.body));
    assert.equal(body.threadId, "thread-authorized");
    assert.equal(
      new Headers(init?.headers).get("authorization"),
      "Bearer fixture-token",
    );
    return Response.json({ id: "reply" });
  };
  try {
    await sendProviderReply(
      {
        provider: "gmail",
        access_token: "fixture-token",
        address: "me@example.com",
      },
      source,
      draft,
      "reply",
    );
  } finally {
    global.fetch = old;
  }
});
test("Graph reply uses native createReplyAll followed by patch and send", async () => {
  const old = global.fetch;
  const calls: string[] = [];
  global.fetch = async (url, init) => {
    calls.push(String(url));
    if (String(url).endsWith("/createReplyAll"))
      return Response.json({ id: "native-draft" });
    if (init?.method === "PATCH") {
      assert.ok(!String(init.body).includes("evil.invalid"));
      return new Response(null, { status: 204 });
    }
    return new Response(null, { status: 202 });
  };
  try {
    await sendProviderReply(
      {
        provider: "microsoft",
        access_token: "fixture",
        address: "me@example.com",
      },
      source,
      draft,
      "all",
    );
    assert.deepEqual(calls, [
      "https://graph.microsoft.com/v1.0/me/messages/original/createReplyAll",
      "https://graph.microsoft.com/v1.0/me/messages/native-draft",
      "https://graph.microsoft.com/v1.0/me/messages/native-draft/send",
    ]);
  } finally {
    global.fetch = old;
  }
});
test("attachments reject executable MIME/header injection and request reads are bounded", async () => {
  assert.throws(() =>
    checkedAttachments([
      { name: "evil.html", contentType: "text/html", dataBase64: "YWJj" },
    ]),
  );
  assert.throws(() =>
    checkedAttachments([
      {
        name: "x\r\nBcc: victim",
        contentType: "text/plain",
        dataBase64: "YWJj",
      },
    ]),
  );
  await assert.rejects(
    limitedJson(
      new Request("http://localhost", {
        method: "POST",
        body: '{"large":"value"}',
      }),
      5,
    ),
    /upload limit/,
  );
});

test("calendar reminders only activate for approved events within their configured time window", () => {
  const s = seedWorkspace();
  const event = s.proposals[0].event;
  assert.equal(
    activeReminders([event], Date.parse("2026-11-12T12:45:00Z")).length,
    1,
  );
  assert.equal(
    activeReminders([event], Date.parse("2026-11-12T12:00:00Z")).length,
    0,
  );
  assert.equal(
    activeReminders([event], Date.parse("2026-11-12T13:01:00Z")).length,
    0,
  );
  assert.ok(
    !activeReminders(s.events, Date.parse("2026-11-12T12:45:00Z")).some(
      (e) => e.id === event.id,
    ),
  );
});

test("legacy demo application choices survive the workspace upgrade without overriding newer workspace records", () => {
  const migrated = workspaceForDemo(null, {
    "thread-1": "Offer",
    "thread-7": "Review",
  });
  assert.equal(
    migrated.opportunities.find((o) => o.threadId === "thread-1")?.stage,
    "Offer",
  );
  assert.equal(
    migrated.opportunities.find((o) => o.threadId === "thread-7")?.stage,
    "Assessment",
  );
  assert.equal(
    workspaceForDemo(JSON.stringify(migrated), {
      "thread-1": "Interview",
    }).opportunities.find((o) => o.threadId === "thread-1")?.stage,
    "Offer",
  );
});
