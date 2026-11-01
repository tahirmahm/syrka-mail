import test from "node:test";
import assert from "node:assert/strict";
import { encrypt, decrypt } from "../lib/crypto";
import { validateDraft, zohoDomain } from "../lib/providers";
import { canTransition, proposedAction } from "../lib/actions";
import { assertAiPolicy } from "../lib/ai/policy";
test("credentials are encrypted with independent nonces and authenticated against tampering", () => {
  process.env.TOKEN_ENCRYPTION_KEY = "a".repeat(64);
  const a = encrypt("sensitive-test-token"),
    b = encrypt("sensitive-test-token");
  assert.notEqual(a, b);
  assert.ok(!a.includes("sensitive"));
  assert.equal(decrypt(a), "sensitive-test-token");
  const parts = a.split(".");
  parts[2] = Buffer.from("tampered").toString("base64url");
  assert.throws(() => decrypt(parts.join(".")));
});
test("encryption fails closed without key configuration", () => {
  delete process.env.TOKEN_ENCRYPTION_KEY;
  assert.throws(() => encrypt("token"));
});
test("sending rejects recipient and subject header injection", () => {
  assert.throws(() =>
    validateDraft({
      to: "a@test.com\r\nBcc:b@test.com",
      subject: "Hi",
      text: "x",
    }),
  );
  assert.throws(() =>
    validateDraft({
      to: "a@test.com",
      subject: "Hi\r\nBcc: b@test.com",
      text: "x",
    }),
  );
  assert.doesNotThrow(() =>
    validateDraft({ to: "a@test.com", subject: "Hello", text: "Message" }),
  );
});
test("Zoho supports configured regions and rejects arbitrary outbound destinations", () => {
  assert.equal(zohoDomain("https://mail.zoho.eu"), "https://mail.zoho.eu");
  assert.throws(() => zohoDomain("http://localhost:8080"));
  assert.throws(() => zohoDomain("https://evil.test"));
});
test("action state machine requires proposal approval and prevents client-completed actions", () => {
  assert.ok(canTransition("proposed", "approved"));
  assert.ok(canTransition("proposed", "dismissed"));
  assert.ok(!canTransition("proposed", "completed"));
  assert.ok(!canTransition("approved", "completed"));
  assert.ok(!canTransition("completed", "approved"));
});
test("action schema requires source provenance and versioned known destinations", () => {
  assert.ok(
    !proposedAction.safeParse({
      title: "Fake",
      destination: "https://evil.test",
    }).success,
  );
  assert.ok(
    proposedAction.safeParse({
      version: "syrka.mail.action/1",
      sourceMessageId: "mail-1",
      sourceAccountId: "2d6e5aa1-e202-4aa7-b65e-125710626863",
      destination: "dashboard",
      title: "Read assignment",
      description: "Review assignment",
      excerpt: "Please read chapter two.",
    }).success,
  );
});
test("AI is disabled without explicit consent and current verified free quota", () => {
  delete process.env.QWEN_FREE_QUOTA_VERIFIED;
  assert.throws(() => assertAiPolicy(false));
  assert.throws(() => assertAiPolicy(true));
  process.env.QWEN_FREE_QUOTA_VERIFIED = "true";
  process.env.QWEN_ENABLED = "true";
  process.env.QWEN_QUOTA_VERIFIED_AT = "2026-01-01";
  process.env.QWEN_QUOTA_VERIFICATION_EXPIRES_AT = "2026-01-02";
  assert.throws(() => assertAiPolicy(true));
});
