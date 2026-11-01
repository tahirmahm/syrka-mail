import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const ref = "grlbuiemvkmaflogryta";
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token)
  throw new Error(
    "SUPABASE_ACCESS_TOKEN is required through a secure binding; never put it in command arguments.",
  );
const arg = process.argv.find((a) => a.startsWith("--preview-origin="));
if (!arg)
  throw new Error(
    "Supply the exact verified Preview origin using --preview-origin=https://...",
  );
const origin = new URL(arg.split("=").slice(1).join("="));
if (
  origin.protocol !== "https:" ||
  !origin.hostname.endsWith(".vercel.app") ||
  !origin.hostname.startsWith("syrka-mail") ||
  origin.username ||
  origin.password ||
  origin.pathname !== "/" ||
  origin.search ||
  origin.hash
)
  throw new Error("Only the exact Syrka Mail HTTPS Preview origin is accepted");
async function api(path, options = {}) {
  const response = await fetch("https://api.supabase.com" + path, {
    ...options,
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw new Error("Supabase Management API returned " + response.status);
  return response.json();
}
const project = await api("/v1/projects/" + ref);
if (
  project.id !== ref ||
  (project.name || "").trim().toLowerCase() !== "syrka mail"
)
  throw new Error(
    "Project identity does not match the authorized Syrka Mail project",
  );
const current = await api("/v1/projects/" + ref + "/config/auth");
const existing = (current.uri_allow_list || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const patch = {
  site_url: "https://syrka-mail.vercel.app",
  uri_allow_list: [
    ...new Set([
      ...existing,
      "https://syrka-mail.vercel.app/auth/callback",
      origin.origin + "/auth/callback",
    ]),
  ].join(","),
};
console.log(
  JSON.stringify(
    { projectRef: ref, patch, apply: process.argv.includes("--apply") },
    null,
    2,
  ),
);
if (process.argv.includes("--apply")) {
  await api("/v1/projects/" + ref + "/config/auth", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  const saved = await api("/v1/projects/" + ref + "/config/auth");
  if (
    saved.site_url !== patch.site_url ||
    !(saved.uri_allow_list || "").includes(origin.origin + "/auth/callback")
  )
    throw new Error("Auth URL settings did not verify");
  console.log(
    "Verified dedicated Mail Auth URL settings. No SMTP settings or other projects changed.",
  );
}
