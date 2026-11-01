import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { database, failure } from "@/lib/server";
import { oauthConfig } from "@/lib/oauth";
import { decrypt, encrypt } from "@/lib/crypto";
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const provider = z
      .enum(["gmail", "microsoft", "zoho"])
      .parse((await params).provider);
    const cookie = req.cookies.get("syrka_oauth")?.value;
    if (!cookie) throw new Error("OAuth session expired. Start again.");
    const saved = JSON.parse(decrypt(cookie));
    const state = req.nextUrl.searchParams.get("state") || "";
    if (
      saved.provider !== provider ||
      saved.expires < Date.now() ||
      state.length !== saved.state.length ||
      !timingSafeEqual(Buffer.from(state), Buffer.from(saved.state))
    )
      throw new Error("Invalid OAuth state");
    const code = req.nextUrl.searchParams.get("code");
    if (!code) throw new Error("Provider authorization was not completed");
    const cfg = oauthConfig(provider);
    const r = await fetch(cfg.token, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: cfg.redirect,
        grant_type: "authorization_code",
        code,
        ...(provider !== "zoho" ? { code_verifier: saved.verifier } : {}),
      }),
    });
    if (!r.ok) throw new Error("Provider token exchange failed");
    const t = await r.json();
    if (!t.access_token) throw new Error("Provider did not grant access");
    let address = "",
      accountId = "";
    let domain: string | undefined;
    if (provider === "zoho") {
      domain = process.env.ZOHO_MAIL_URL || "https://mail.zoho.com";
      const { zohoDomain } = await import("@/lib/providers");
      domain = zohoDomain(domain);
      const a = await fetch(`${domain}/api/accounts`, {
        headers: { Authorization: `Zoho-oauthtoken ${t.access_token}` },
      });
      if (!a.ok) throw new Error("Unable to read Zoho account");
      const d = await a.json();
      accountId = d.data?.[0]?.accountId;
      address = d.data?.[0]?.primaryEmailAddress;
      if (!accountId || !address)
        throw new Error("No Zoho mailbox was authorized");
    } else {
      const endpoint =
        provider === "gmail"
          ? "https://gmail.googleapis.com/gmail/v1/users/me/profile"
          : "https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName";
      const a = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${t.access_token}` },
      });
      if (!a.ok) throw new Error("Unable to identify authorized mailbox");
      const d = await a.json();
      address = d.emailAddress || d.mail || d.userPrincipalName;
      accountId = d.id || address;
    }
    const db = database();
    const { error } = await db.from("mail_connections").upsert(
      {
        user_id: saved.user,
        provider,
        address,
        account_id: accountId,
        api_domain: domain,
        access_token: encrypt(t.access_token),
        refresh_token: t.refresh_token ? encrypt(t.refresh_token) : null,
        expires_at: new Date(
          Date.now() + Number(t.expires_in || 3600) * 1000,
        ).toISOString(),
      },
      { onConflict: "user_id,provider,address" },
    );
    if (error) throw new Error("Unable to save account connection");
    const response = NextResponse.redirect(
      new URL("/?connected=1", cfg.redirect),
    );
    response.cookies.set("syrka_oauth", "", {
      path: "/api/oauth",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
    });
    return response;
  } catch (e) {
    if (process.env.APP_URL) {
      const url = new URL("/", process.env.APP_URL);
      url.searchParams.set(
        "connection_error",
        e instanceof Error ? e.message : "Provider authorization failed",
      );
      url.searchParams.set("connection_provider", (await params).provider);
      const response = NextResponse.redirect(url);
      response.cookies.set("syrka_oauth", "", {
        path: "/api/oauth",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
      });
      return response;
    }
    return failure(e);
  }
}
