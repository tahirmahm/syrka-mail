import { publicSupabaseConfig, MAIL_PROJECT_REF } from "./supabase/config";
export function configurationStatus(
  env: Record<string, string | undefined> = process.env,
) {
  const missing: string[] = [];
  if (!env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (
    !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    !env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
    missing.push(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or legacy NEXT_PUBLIC_SUPABASE_ANON_KEY)",
    );
  let issue = "";
  try {
    publicSupabaseConfig(env);
  } catch (e) {
    issue = (e as Error).message;
  }
  const serverReady = !!(
    env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY
  );
  const providers = Object.fromEntries(
    ["gmail", "microsoft", "zoho"].map((p) => {
      const required = [
        `${p.toUpperCase()}_CLIENT_ID`,
        `${p.toUpperCase()}_CLIENT_SECRET`,
        "APP_URL",
        "TOKEN_ENCRYPTION_KEY",
      ];
      const needs = required.filter((n) => !env[n]);
      if (!serverReady)
        needs.push("SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)");
      needs.push(...missing);
      if (issue && !missing.length) needs.push(issue);
      if (
        env.TOKEN_ENCRYPTION_KEY &&
        !/^[a-f0-9]{64}$/i.test(env.TOKEN_ENCRYPTION_KEY)
      )
        needs.push("TOKEN_ENCRYPTION_KEY (must be 64 hex characters)");
      if (env.APP_URL) {
        try {
          const u = new URL(env.APP_URL);
          if (env.NODE_ENV === "production" && u.protocol !== "https:")
            needs.push("APP_URL (HTTPS required)");
        } catch {
          needs.push("APP_URL (valid origin required)");
        }
      }
      const approval = p === "gmail" && env.GMAIL_ENABLED !== "true";
      return [
        p,
        {
          status: needs.length || approval ? "not-configured" : "ready",
          missing: needs,
          approvalRequired: approval,
          message: needs.length
            ? "Missing server configuration: " + needs.join(", ") + "."
            : approval
              ? "Gmail is disabled pending consent-screen and scope approval."
              : "Ready for provider authorization; institutional administrator consent may be required.",
        },
      ];
    }),
  );
  return {
    projectRef: MAIL_PROJECT_REF,
    auth: {
      configured: !issue,
      missing,
      message: issue
        ? `Sign-in setup required: ${missing.length ? missing.join(", ") : issue}. Configure the dedicated Syrka Mail project.`
        : "Dedicated Syrka Mail public client configured. Real email delivery and authorized redirect settings still require verification.",
    },
    backend: {
      serverKeyConfigured: serverReady,
      message: serverReady
        ? "Server operations configured; database migrations and permissions must be verified."
        : "Provider token operations and action writes require the dedicated server key. Private drafts/preferences use user JWTs and RLS.",
    },
    providers,
    ai: {
      enabled:
        env.QWEN_ENABLED === "true" &&
        env.QWEN_FREE_QUOTA_VERIFIED === "true" &&
        !!env.QWEN_MODEL &&
        !!env.QWEN_API_KEY &&
        Date.parse(env.QWEN_QUOTA_VERIFICATION_EXPIRES_AT || "") > Date.now() &&
        Date.parse(env.QWEN_QUOTA_VERIFIED_AT || "") <= Date.now(),
      message:
        "Live AI requires explicit consent and current Free Quota Only verification. No paid fallback.",
    },
  };
}
