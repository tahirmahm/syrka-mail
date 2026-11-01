import test from "node:test";
import assert from "node:assert/strict";
import { listMailPage, sendMail, gmailMessage } from "../lib/providers";
import { createAdapter } from "../lib/mail/adapter";
test("Gmail nested plain text is decoded without rendering HTML", () => {
  const m = gmailMessage({
    id: "m1",
    payload: {
      headers: [
        { name: "Subject", value: "Subject" },
        { name: "From", value: "sender@test.invalid" },
      ],
      parts: [
        {
          mimeType: "multipart/alternative",
          parts: [
            {
              mimeType: "text/plain",
              body: {
                data: Buffer.from("Actual plain text").toString("base64url"),
              },
            },
            {
              mimeType: "text/html",
              body: {
                data: Buffer.from("<script>bad()</script>").toString(
                  "base64url",
                ),
              },
            },
          ],
        },
      ],
    },
    internalDate: "1000",
    labelIds: ["UNREAD"],
    snippet: "snippet",
  });
  assert.equal(m.text, "Actual plain text");
  assert.equal(m.unread, true);
});
test("Microsoft inbox retrieval scopes the mailbox folder and maps read state", async () => {
  const original = global.fetch;
  global.fetch = async (input, init) => {
    const u = new URL(String(input));
    assert.equal(u.hostname, "graph.microsoft.com");
    assert.equal(u.pathname, "/v1.0/me/mailFolders/inbox/messages");
    assert.equal(
      new Headers(init?.headers).get("authorization"),
      "Bearer fixture-token",
    );
    return Response.json({
      value: [
        {
          id: "m1",
          subject: "Fixture",
          from: { emailAddress: { address: "sender@test.invalid" } },
          body: { contentType: "text", content: "Fixture content" },
          bodyPreview: "Fixture",
          receivedDateTime: "2026-11-01T10:00:00Z",
          isRead: false,
        },
      ],
    });
  };
  try {
    const d = await listMailPage({
      provider: "microsoft",
      access_token: "fixture-token",
    });
    assert.equal(d.messages.length, 1);
    assert.equal(d.messages[0].text, "Fixture content");
    assert.equal(d.messages[0].unread, true);
  } finally {
    global.fetch = original;
  }
});
test("Zoho sending uses its configured region and authorized identity", async () => {
  const original = global.fetch;
  global.fetch = async (input, init) => {
    assert.equal(
      String(input),
      "https://mail.zoho.eu/api/accounts/account-1/messages",
    );
    assert.equal(
      new Headers(init?.headers).get("authorization"),
      "Zoho-oauthtoken fixture-token",
    );
    const body = JSON.parse(String(init?.body));
    assert.equal(body.fromAddress, "user@test.invalid");
    assert.equal(body.mailFormat, "plaintext");
    return Response.json({
      status: { code: 200 },
      data: { messageId: "fixture" },
    });
  };
  try {
    await sendMail(
      {
        provider: "zoho",
        access_token: "fixture-token",
        api_domain: "https://mail.zoho.eu",
        account_id: "account-1",
        address: "user@test.invalid",
      },
      {
        to: "recipient@test.invalid",
        subject: "Fixture",
        text: "Fixture body",
      },
    );
  } finally {
    global.fetch = original;
  }
});
test("unsupported Zoho mutations fail closed without network requests", async () => {
  const a = createAdapter({ provider: "zoho", access_token: "fixture-token" });
  assert.ok(!a.capabilities.has("archive"));
  await assert.rejects(a.mutate("m1", "archive", true), /not implemented/);
});
test("provider authorization errors do not expose credentials or response bodies", async () => {
  const original = global.fetch;
  global.fetch = async () =>
    new Response("sensitive provider body", { status: 401 });
  try {
    await assert.rejects(
      listMailPage({ provider: "microsoft", access_token: "fixture-token" }),
      (e) =>
        e instanceof Error &&
        !e.message.includes("fixture-token") &&
        !e.message.includes("sensitive"),
    );
  } finally {
    global.fetch = original;
  }
});
