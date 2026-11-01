import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { authenticated, failure, rateLimit } from "@/lib/server";
import { oauthConfig } from "@/lib/oauth";
import { encrypt } from "@/lib/crypto";
import { z } from "zod";
export async function POST(req: Request) {
  try {
    const { db, user } = await authenticated(req);
    await rateLimit(db, user.id, "oauth", 10);
    const provider = z
      .enum(["gmail", "microsoft", "zoho"])
      .parse((await req.json()).provider);
    const cfg = oauthConfig(provider);
    const state = randomBytes(32).toString("base64url"),
      verifier = randomBytes(48).toString("base64url");
    const url = new URL(cfg.authorize);
    url.search = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: cfg.redirect,
      response_type: "code",
      scope: cfg.scopes,
      state,
      access_type: "offline",
      prompt: "consent",
      ...(provider !== "zoho"
        ? {
            code_challenge: createHash("sha256")
              .update(verifier)
              .digest("base64url"),
            code_challenge_method: "S256",
          }
        : {}),
    }).toString();
    const response = NextResponse.json({ url: url.toString() });
    response.cookies.set(
      "syrka_oauth",
      encrypt(
        JSON.stringify({
          state,
          verifier,
          provider,
          user: user.id,
          expires: Date.now() + 600000,
        }),
      ),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 600,
        path: "/api/oauth",
      },
    );
    return response;
  } catch (e) {
    return failure(e);
  }
}
