export function configurationStatus(
  env: Record<string, string | undefined> = process.env,
) {
  const authNames = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ];
  const authMissing = authNames.filter((n) => !env[n]);
  const providers = Object.fromEntries(
    ["gmail", "microsoft", "zoho"].map((p) => {
      const required = [
        `${p.toUpperCase()}_CLIENT_ID`,
        `${p.toUpperCase()}_CLIENT_SECRET`,
        "APP_URL",
        "TOKEN_ENCRYPTION_KEY",
        ...authNames,
        "SUPABASE_SERVICE_ROLE_KEY",
      ];
      const missing = required.filter((n) => !env[n]);
      if (
        env.TOKEN_ENCRYPTION_KEY &&
        !/^[a-f0-9]{64}$/i.test(env.TOKEN_ENCRYPTION_KEY)
      )
        missing.push("TOKEN_ENCRYPTION_KEY (must be 64 hex characters)");
      if (env.APP_URL) {
        try {
          const u = new URL(env.APP_URL);
          if (u.protocol !== "https:" && env.NODE_ENV === "production")
            missing.push("APP_URL (HTTPS required)");
        } catch {
          missing.push("APP_URL (valid origin required)");
        }
      }
      const approval = p === "gmail" && env.GMAIL_ENABLED !== "true";
      return [
        p,
        {
          status: missing.length || approval ? "not-configured" : "ready",
          missing,
          approvalRequired: approval,
          message: missing.length
            ? `Missing server configuration: ${missing.join(", ")}.`
            : approval
              ? "Gmail is disabled pending consent-screen and scope approval. Set GMAIL_ENABLED only after authorization."
              : "Ready for your provider authorization. University accounts may require administrator consent.",
        },
      ];
    }),
  );
  return {
    auth: {
      configured: authMissing.length === 0,
      missing: authMissing,
      message: authMissing.length
        ? `Sign-in setup required: ${authMissing.join(", ")}. Configure the dedicated Syrka Mail project for this deployment.`
        : "Email-link sign-in is configured. Delivery and authorized redirect settings must be verified with your Supabase project.",
    },
    providers,
    ai: {
      enabled:
        env.QWEN_ENABLED === "true" &&
        env.QWEN_FREE_QUOTA_VERIFIED === "true" &&
        !!env.QWEN_MODEL &&
        !!env.QWEN_API_KEY &&
        Date.parse(env.QWEN_QUOTA_VERIFICATION_EXPIRES_AT || "") > Date.now(),
      message:
        "Live AI requires explicit selected-content consent and current Free Quota Only verification. Demo suggestions never call a model.",
    },
  };
}
