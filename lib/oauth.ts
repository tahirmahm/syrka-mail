import type { Provider } from "./providers";
export function oauthConfig(provider: Provider) {
  const origin = process.env.APP_URL;
  if (
    !origin ||
    (!origin.startsWith("https://") && process.env.NODE_ENV === "production")
  )
    throw new Error("APP_URL must be an approved HTTPS application URL");
  const redirect = `${origin}/api/oauth/${provider}/callback`;
  const prefix = provider.toUpperCase();
  const clientId = process.env[`${prefix}_CLIENT_ID`],
    clientSecret = process.env[`${prefix}_CLIENT_SECRET`];
  if (!clientId || !clientSecret)
    throw new Error(`${provider} OAuth is not configured`);
  if (provider === "gmail" && process.env.GMAIL_ENABLED !== "true")
    throw new Error("Gmail is awaiting OAuth approval");
  const zoho = process.env.ZOHO_ACCOUNTS_URL || "https://accounts.zoho.com";
  if (
    ![
      "https://accounts.zoho.com",
      "https://accounts.zoho.eu",
      "https://accounts.zoho.in",
      "https://accounts.zoho.com.au",
    ].includes(zoho)
  )
    throw new Error("Unsupported Zoho accounts region");
  return {
    clientId,
    clientSecret,
    redirect,
    authorize:
      provider === "gmail"
        ? "https://accounts.google.com/o/oauth2/v2/auth"
        : provider === "microsoft"
          ? "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
          : `${zoho}/oauth/v2/auth`,
    token:
      provider === "gmail"
        ? "https://oauth2.googleapis.com/token"
        : provider === "microsoft"
          ? "https://login.microsoftonline.com/common/oauth2/v2.0/token"
          : `${zoho}/oauth/v2/token`,
    scopes:
      provider === "gmail"
        ? "https://www.googleapis.com/auth/gmail.modify"
        : provider === "microsoft"
          ? "offline_access User.Read Mail.ReadWrite Mail.Send"
          : "ZohoMail.accounts.READ ZohoMail.messages.ALL ZohoMail.folders.ALL",
  };
}
