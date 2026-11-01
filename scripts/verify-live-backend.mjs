// Authorized dedicated-project integration probe. Creates/removes two temporary Auth users.
// Never sends email, creates provider accounts, imports demo mail or invokes AI.
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
nextEnv.loadEnvConfig(process.cwd());
const ref = "grlbuiemvkmaflogryta";
if (
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://" + ref + ".supabase.co" ||
  (process.env.SUPABASE_PROJECT_REF && process.env.SUPABASE_PROJECT_REF !== ref)
)
  throw new Error("Refusing integration probe: project mismatch");
const publicKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secret =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!publicKey || !secret)
  throw new Error(
    "Live probe not run: bind the dedicated project public and server keys securely first.",
  );
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(base, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const users = [];
const clients = [];
function check(condition, message) {
  if (!condition) throw new Error(message);
}
try {
  for (let i = 0; i < 2; i++) {
    const email =
      "syrka-rls-" + randomBytes(12).toString("hex") + "@example.com";
    const password = randomBytes(32).toString("base64url");
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { purpose: "temporary Syrka Mail RLS integration probe" },
    });
    check(
      !error && data.user,
      "Cannot create authorized temporary test identity",
    );
    users.push(data.user.id);
    const client = createClient(base, publicKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const signed = await client.auth.signInWithPassword({ email, password });
    check(
      !signed.error && signed.data.session,
      "Temporary identity could not establish a real signed session",
    );
    clients.push(client);
  }
  const [a, b] = clients;
  const saved = await a
    .from("mail_drafts")
    .insert({
      user_id: users[0],
      to: "probe@example.com",
      subject: "Temporary RLS probe",
      text: "Synthetic test row; automatically removed.",
    })
    .select("id")
    .single();
  check(!saved.error && saved.data, "User A could not save a draft");
  const recovered = await a
    .from("mail_drafts")
    .select("id")
    .eq("id", saved.data.id);
  check(
    !recovered.error && recovered.data.length === 1,
    "User A draft was not persisted",
  );
  const hidden = await b
    .from("mail_drafts")
    .select("id")
    .eq("id", saved.data.id);
  check(
    !hidden.error && hidden.data.length === 0,
    "Cross-user draft read was not denied",
  );
  const overwritten = await b
    .from("mail_drafts")
    .update({ text: "forbidden cross-user edit" })
    .eq("id", saved.data.id)
    .select("id");
  check(
    !overwritten.error && overwritten.data.length === 0,
    "Cross-user draft modification was not denied",
  );
  const denied = await b.from("mail_connections").select("access_token");
  check(!!denied.error, "Authenticated clients can read encrypted credentials");
  const action = await admin
    .from("proposed_actions")
    .insert({
      user_id: users[0],
      payload: { version: "syrka.test/1", purpose: "temporary RLS probe" },
      idempotency_key: "rls-" + randomBytes(12).toString("hex"),
    })
    .select("id")
    .single();
  check(!action.error && action.data, "Cannot create temporary action probe");
  const otherActions = await b
    .from("proposed_actions")
    .select("id")
    .eq("id", action.data.id);
  check(
    !otherActions.error && otherActions.data.length === 0,
    "Cross-user action read was not denied",
  );
  const forbiddenApproval = await b
    .from("proposed_actions")
    .update({ state: "approved" })
    .eq("id", action.data.id);
  check(!!forbiddenApproval.error, "Direct action approval was not denied");
  const pref = await a
    .from("mail_preferences")
    .upsert({ user_id: users[0], theme: "dark" });
  check(!pref.error, "Private preference save failed");
  const otherPref = await b
    .from("mail_preferences")
    .select("theme")
    .eq("user_id", users[0]);
  check(
    !otherPref.error && otherPref.data.length === 0,
    "Cross-user preferences were not denied",
  );
  console.log(
    JSON.stringify(
      {
        projectRef: ref,
        realTemporarySessions: 2,
        draftPersistence: true,
        crossUserDraftReadDenied: true,
        crossUserDraftWriteDenied: true,
        credentialReadDenied: true,
        crossUserActionsDenied: true,
        directActionApprovalDenied: true,
        privatePreferencesIsolated: true,
        magicLinkDelivery: "not tested by this script",
      },
      null,
      2,
    ),
  );
} finally {
  let cleanupFailed = false;
  for (const id of users) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) cleanupFailed = true;
  }
  if (cleanupFailed)
    throw new Error(
      "Temporary identity cleanup failed. Inspect only the dedicated Mail project before further tests.",
    );
}
