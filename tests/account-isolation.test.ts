import test from "node:test";
import assert from "node:assert/strict";
import { connection } from "../lib/server";
import { encrypt } from "../lib/crypto";
test("mailbox lookup always constrains selected account by authenticated user before decrypting or calling a provider", async () => {
  const previous = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    encryption: process.env.TOKEN_ENCRYPTION_KEY,
    fetch: global.fetch,
  };
  const alice = "2d6e5aa1-e202-4aa7-b65e-125710626863",
    bob = "2d6e5aa1-e202-4aa7-b65e-125710626864";
  process.env.NEXT_PUBLIC_SUPABASE_URL =
    "https://grlbuiemvkmaflogryta.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fictional-service-role";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "fictional-public";
  process.env.TOKEN_ENCRYPTION_KEY = "a".repeat(64);
  const encrypted = encrypt("fixture-mail-token");
  let providerCalls = 0;
  global.fetch = async (input, init) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url,
    );
    if (url.hostname !== "grlbuiemvkmaflogryta.supabase.co") {
      providerCalls++;
      throw new Error("Unexpected provider call");
    }
    if (url.pathname.endsWith("/user"))
      return Response.json({
        id: new Headers(init?.headers).get("authorization")?.includes("alice")
          ? alice
          : bob,
        aud: "authenticated",
        role: "authenticated",
      });
    if (url.pathname.includes("/rpc/")) return Response.json(true);
    assert.equal(url.searchParams.get("id"), "eq.account-alice");
    const owner = url.searchParams.get("user_id");
    assert.ok(owner === `eq.${alice}` || owner === `eq.${bob}`);
    return Response.json(
      owner === `eq.${alice}`
        ? [
            {
              id: "account-alice",
              user_id: alice,
              provider: "gmail",
              address: "alice@example.com",
              access_token: encrypted,
              created_at: "2026-11-01",
              expires_at: "2099-01-01T00:00:00Z",
            },
          ]
        : [],
    );
  };
  try {
    const allowed = await connection(
      new Request("http://localhost/api/mail?account=account-alice", {
        headers: { Authorization: "Bearer alice" },
      }),
    );
    assert.equal(allowed.access_token, "fixture-mail-token");
    await assert.rejects(
      connection(
        new Request("http://localhost/api/mail?account=account-alice", {
          headers: { Authorization: "Bearer bob" },
        }),
      ),
      /No email provider connected/,
    );
    assert.equal(providerCalls, 0);
  } finally {
    global.fetch = previous.fetch;
    for (const [key, value] of [
      ["NEXT_PUBLIC_SUPABASE_URL", previous.url],
      ["SUPABASE_SERVICE_ROLE_KEY", previous.key],
      ["NEXT_PUBLIC_SUPABASE_ANON_KEY", previous.anon],
      ["TOKEN_ENCRYPTION_KEY", previous.encryption],
    ]) {
      if (value === undefined) delete process.env[key!];
      else process.env[key!] = value;
    }
  }
});
