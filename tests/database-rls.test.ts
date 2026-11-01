import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const alice = "2d6e5aa1-e202-4aa7-b65e-125710626863",
  bob = "2d6e5aa1-e202-4aa7-b65e-125710626864";
test("real local PostgreSQL migrations enforce private drafts/preferences, denied token access and action writes across two identities", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to anon,authenticated,service_role;insert into auth.users values ('${alice}'),('${bob}');`,
    );
    for (const file of [
      "20261101000100_initial.sql",
      "20261101000200_inline_reply_drafts.sql",
      "20261101000300_least_privilege.sql",
    ])
      await db.exec(
        await readFile(
          new URL("../supabase/migrations/" + file, import.meta.url),
          "utf8",
        ),
      );
    await db.exec(
      `insert into public.mail_connections(id,user_id,provider,address,access_token) values('11111111-1111-4111-8111-111111111111','${alice}','gmail','alice@example.com','ciphertext-only');insert into public.proposed_actions(id,user_id,payload,idempotency_key) values('22222222-2222-4222-8222-222222222222','${alice}','{}','fixture-action');set role authenticated;select set_config('request.jwt.claim.sub','${alice}',false);`,
    );
    const saved = await db.query<{ id: string }>(
      `insert into public.mail_drafts(user_id,"to",subject,text) values($1,'recipient@example.com','Private subject','Private body') returning id`,
      [alice],
    );
    assert.equal(saved.rows.length, 1);
    await db.query(
      "insert into public.mail_preferences(user_id,theme) values($1,$2)",
      [alice, "dark"],
    );
    assert.equal(
      (
        await db.query<{ theme: string }>(
          "select theme from public.mail_preferences",
        )
      ).rows[0].theme,
      "dark",
    );
    assert.equal(
      (
        await db.query<{ owned: boolean }>(
          `select public.owns_mail_account('11111111-1111-4111-8111-111111111111') as owned`,
        )
      ).rows[0].owned,
      true,
    );
    assert.equal(
      (await db.query("select id from public.proposed_actions")).rows.length,
      1,
    );
    await assert.rejects(
      db.query("select access_token from public.mail_connections"),
      /permission denied/,
    );
    await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [
      bob,
    ]);
    assert.equal(
      (await db.query("select * from public.mail_drafts")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.mail_preferences")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select id from public.proposed_actions")).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "update public.mail_drafts set text=$1 where id=$2 returning id",
          ["attack", saved.rows[0].id],
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      db.query(
        `insert into public.mail_drafts(user_id,"to",subject,text) values($1,'x@y.example','x','x')`,
        [alice],
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.query(
        `insert into public.mail_drafts(user_id,"to",subject,text,reply_context) values($1,'x@y.example','spoof','x',$2::jsonb)`,
        [
          bob,
          JSON.stringify({
            accountId: "11111111-1111-4111-8111-111111111111",
            sourceMessageId: "alice-message",
            kind: "reply",
          }),
        ],
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.query(
        `update public.proposed_actions set state='approved' where id='22222222-2222-4222-8222-222222222222'`,
      ),
      /permission denied/,
    );
    assert.equal(
      (
        await db.query<{ owned: boolean }>(
          `select public.owns_mail_account('11111111-1111-4111-8111-111111111111') as owned`,
        )
      ).rows[0].owned,
      false,
    );
    await db.exec("reset role;set role anon;");
    await assert.rejects(
      db.query("select * from public.mail_drafts"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select * from public.mail_connections"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select * from public.proposed_actions"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
