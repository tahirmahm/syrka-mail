import nextEnv from "@next/env";
import { spawnSync } from "node:child_process";
nextEnv.loadEnvConfig(process.cwd());
const guard = spawnSync(
  process.execPath,
  ["scripts/check-backend.mjs", "--require-linked"],
  { stdio: "inherit" },
);
if (guard.status !== 0) process.exit(guard.status || 1);
const dryRun = process.argv.includes("--dry-run");
const result = spawnSync(
  "npx",
  [
    "--yes",
    "supabase@2.122.0",
    "db",
    "push",
    "--linked",
    ...(dryRun ? ["--dry-run"] : []),
  ],
  { stdio: "inherit", env: process.env },
);
process.exit(result.status ?? 1);
