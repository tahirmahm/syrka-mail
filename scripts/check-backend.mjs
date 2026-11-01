import nextEnv from "@next/env";
import { readFileSync, existsSync } from "node:fs";
nextEnv.loadEnvConfig(process.cwd());
const expected = "grlbuiemvkmaflogryta";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
let host = "missing";
try {
  host = new URL(url).hostname;
} catch {}
if (
  host !== expected + ".supabase.co" ||
  (process.env.SUPABASE_PROJECT_REF &&
    process.env.SUPABASE_PROJECT_REF !== expected)
)
  throw new Error(
    "Refusing backend operation: dedicated Syrka Mail project does not match",
  );
const linked = existsSync("supabase/.temp/project-ref")
  ? readFileSync("supabase/.temp/project-ref", "utf8").trim()
  : null;
if (linked && linked !== expected)
  throw new Error(
    "Refusing backend operation: Supabase CLI links to a different project",
  );
if (process.argv.includes("--require-linked") && linked !== expected)
  throw new Error(
    "CLI is not linked to the dedicated Mail project. Authenticate securely, then link only grlbuiemvkmaflogryta.",
  );
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
console.log(
  JSON.stringify(
    {
      projectRef: expected,
      host,
      publishableKeyConfigured: !!key,
      publishableKeyFormat: key?.startsWith("sb_publishable_")
        ? "publishable"
        : "legacy-or-missing",
      serverKeyConfigured: !!(
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
      ),
      localEncryptionConfigured: !!process.env.TOKEN_ENCRYPTION_KEY,
      managementTokenConfigured: !!process.env.SUPABASE_ACCESS_TOKEN,
      databasePasswordConfigured: !!process.env.SUPABASE_DB_PASSWORD,
      linkedProject: linked,
    },
    null,
    2,
  ),
);
