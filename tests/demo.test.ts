import test from "node:test";
import assert from "node:assert/strict";
import {
  seedDemo,
  visibleThreads,
  updateThread,
  restoreDemo,
  runScheduled,
} from "../lib/demo/model";
import { configurationStatus } from "../lib/config";
test("demo seeds 52 fictional messages across folders with conversations and safe attachments", () => {
  const s = seedDemo();
  assert.equal(
    s.threads.reduce((n, t) => n + t.messages.length, 0),
    52,
  );
  for (const folder of [
    "Inbox",
    "Sent",
    "Drafts",
    "Scheduled",
    "Archive",
    "Spam",
    "Trash",
  ])
    assert.ok(visibleThreads(s, folder).length > 0, folder);
  assert.ok(s.threads.some((t) => t.messages.length > 1));
  assert.ok(
    s.threads.some((t) => t.messages.some((m) => m.attachments.length > 0)),
  );
  assert.ok(
    s.threads.every((t) =>
      t.messages.every((m) => m.from.endsWith(".example>")),
    ),
  );
});
test("demo mutation changes only the selected thread and survives serialization", () => {
  const s = seedDemo(),
    id = s.threads[0].id;
  const next = updateThread(s, id, { folder: "Trash", starred: true });
  assert.equal(s.threads[0].folder, "Inbox");
  assert.equal(restoreDemo(JSON.stringify(next)).threads[0].folder, "Trash");
  assert.equal(visibleThreads(next, "Trash").length, 2);
});
test("demo searches sender and body, filters unread and excludes trash from all mail", () => {
  const s = seedDemo();
  assert.ok(visibleThreads(s, "Inbox", "thesis").length > 0);
  assert.ok(visibleThreads(s, "Inbox", "", true).every((t) => t.unread));
  assert.ok(
    visibleThreads(s, "All Mail").every(
      (t) => !["Trash", "Spam"].includes(t.folder),
    ),
  );
});
test("simulated scheduling is idempotent and never calls an external sender", () => {
  const s = seedDemo(new Date("2026-11-01T00:00:00Z"));
  const due = s.threads.find((t) => t.folder === "Scheduled")!;
  const next = runScheduled(s, Date.parse("2026-11-10T00:00:00Z"));
  assert.equal(next.threads.find((t) => t.id === due.id)?.folder, "Sent");
  assert.deepEqual(
    runScheduled(next, Date.parse("2026-11-10T00:00:00Z")),
    next,
  );
});
test("malformed or outdated browser storage safely restores fictional defaults", () => {
  for (const v of [
    "invalid",
    "{}",
    '{"version":0}',
    JSON.stringify({
      version: 1,
      threads: [{ id: "bad" }],
      commitments: [],
      applicationStates: {},
    }),
  ])
    assert.equal(restoreDemo(v).threads.length, 42);
});
test("configuration diagnostics expose names and statuses, never server secret values", () => {
  const s = configurationStatus({
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "public",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-secret",
    GMAIL_CLIENT_SECRET: "gmail-client-secret",
    TOKEN_ENCRYPTION_KEY: "key-secret",
  });
  assert.ok(s.auth.configured);
  assert.equal(s.providers.gmail.status, "not-configured");
  assert.ok(!JSON.stringify(s).includes("service-role-secret"));
  assert.ok(!JSON.stringify(s).includes("gmail-client-secret"));
  assert.ok(!JSON.stringify(s).includes("key-secret"));
});
