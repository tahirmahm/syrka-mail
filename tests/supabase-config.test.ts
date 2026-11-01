import test from "node:test";
import assert from "node:assert/strict";
import { publicSupabaseConfig, MAIL_PROJECT_REF } from "../lib/supabase/config";
import { configurationStatus } from "../lib/config";
import { createClient } from "@supabase/supabase-js";
const url = "https://grlbuiemvkmaflogryta.supabase.co";
test("dedicated Mail project is pinned and publishable/legacy aliases remain compatible", () => {
  assert.equal(
    publicSupabaseConfig({
      NEXT_PUBLIC_SUPABASE_URL: url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture",
    }).projectRef,
    MAIL_PROJECT_REF,
  );
  assert.equal(
    publicSupabaseConfig({
      NEXT_PUBLIC_SUPABASE_URL: url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "legacy-fixture",
    }).key,
    "legacy-fixture",
  );
  assert.throws(
    () =>
      publicSupabaseConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://unrelated.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "fixture",
      }),
    /project mismatch/,
  );
});
test("public config rejects accidental service secret exposure", () => {
  for (const key of [
    "sb_secret_private-fixture",
    `header.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.signature`,
  ]) {
    assert.throws(
      () =>
        publicSupabaseConfig({
          NEXT_PUBLIC_SUPABASE_URL: url,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: key,
        }),
      /cannot be used/,
    );
    const status = configurationStatus({
      NEXT_PUBLIC_SUPABASE_URL: url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: key,
    });
    assert.equal(status.auth.configured, false);
    assert.ok(!JSON.stringify(status).includes(key));
  }
});
test("installed Supabase SDK accepts publishable format and sends it as apikey without treating it as a user JWT", async () => {
  let called = false;
  const client = createClient(url, "sb_publishable_fixture", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (_url, init) => {
        called = true;
        const h = new Headers(init?.headers);
        assert.equal(h.get("apikey"), "sb_publishable_fixture");
        assert.notEqual(
          h.get("authorization"),
          "Bearer sb_publishable_fixture",
        );
        return Response.json({ id: "2d6e5aa1-e202-4aa7-b65e-125710626863" });
      },
    },
  });
  const { error } = await client.auth.getUser("fixture-user-jwt");
  assert.equal(error, null);
  assert.ok(called);
});
